import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const CLIENTS = ["A", "B"];

const lastUndelivered = { A: null, B: null };
const pendingLongPolls = { A: null, B: null };
const wsConnections = { A: null, B: null };

function other(client) {
    return client === "A" ? "B" : "A";
}

function normalizeClient(client) {
    return CLIENTS.includes(client) ? client : null;
}

function deliverOrStore(recipient, message) {
    // WebSocket
    const ws = wsConnections[recipient];
    if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: "message", ...message }));
        return;
    }
    // long-polling
    const res = pendingLongPolls[recipient];
    if (res) {
        pendingLongPolls[recipient] = null;
        res.json({ type: "message", ...message });
        return;
    }
    lastUndelivered[recipient] = message;
}

// HTTP send message
app.post("/message", (req, res) => {
    const from = normalizeClient(req.query.from);
    if (!from) {
        return res.status(400).json({ error: "Invalid 'from' parameter" });
    }

    const text = (req.body?.text ?? "").toString();
    if (!text.trim()) {
        return res.status(400).json({ error: "Text is required" });
    }
    const msg = { from, to: other(from), text, timestamp: Date.now() };
    deliverOrStore(msg.to, msg);
    res.json({ ok: true });
});

function takeStored(client) {
    const msg = lastUndelivered[client];
    lastUndelivered[client] = null;
    return msg;
}

// HTTP polling
app.get("/poll", (req, res) => {
    const client = normalizeClient(req.query.client);
    if (!client) {
        return res.status(400).json({ error: "Invalid 'client' parameter" });
    }

    const msg = takeStored(client);
    if (!msg) {
        return res.sendStatus(204);
    }
    res.json(msg);
});

// HTTP long-polling
app.get("/longpoll", (req, res) => {
    const client = normalizeClient(req.query.client);
    if (!client) {
        return res.status(400).json({ error: "Invalid 'client' parameter" });
    }

    const msg = takeStored(client);
    if (msg) {
        return res.json(msg);
    }

    if (pendingLongPolls[client]) {
        try { pendingLongPolls[client].sendStatus(409); } catch {}
        pendingLongPolls[client] = null;
    }

    pendingLongPolls[client] = res;
    res.set("Cache-Control", "no-store");

    // timeout, client will reconnect
    req.on("close", () => {
        if (pendingLongPolls[client] === res) {
            pendingLongPolls[client] = null;
        }
    });

    setTimeout(() => {
        if (pendingLongPolls[client] === res) {
            pendingLongPolls[client] = null;
            res.sendStatus(204);
        }
    }, 30000);
});

// WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws"});

wss.on("connection", (ws, req) => {

    const url = new URL(req.url, "http://localhost");
    const client = normalizeClient(url.searchParams.get("client"));

    if (!client) {
        ws.close(1008, "Invalid 'client' parameter");
        return;
    }
    
    if (wsConnections[client] && wsConnections[client].readyState === ws.OPEN) {
        try { wsConnections[client].close(1012, "replaced"); } catch {}
    }

    wsConnections[client] = ws;

    const stored = takeStored(client);
    if (stored) {
        ws.send(JSON.stringify({type: "message", ...stored }));
    }

    ws.on("message", (data) => {
        let payload;
        try {
            payload = JSON.parse(data.toString());
        } catch {
            payload = { text: data.toString() };
        }
        const text = (payload.text ?? "").toString();
        if (!text.trim()) {
            return;
        }
        const msg = { from: client, to: other(client), text: text, timestamp: Date.now() };
        deliverOrStore(msg.to, msg);
    });

    ws.on("close", () => {
        if (wsConnections[client] === ws) {
            wsConnections[client] = null;
        }
    });
});

server.listen(3000, () => {
    console.log("Server listening on http://localhost:3000");
});
