(function () {
  // --- identify client from URL: /client.html?client=A ---
  const params = new URLSearchParams(location.search);
  const client = params.get("client") || "A"; // open second tab with ?client=B
  document.getElementById("clientLabel").textContent = client;

  // --- UI helpers ---
  const logEl = document.getElementById("log");
  const msgEl = document.getElementById("msg");
  const sendBtn = document.getElementById("sendBtn");

  function log(line) {
    const ts = new Date().toLocaleTimeString();
    logEl.textContent += `[${ts}] ${line}\n`;
    logEl.scrollTop = logEl.scrollHeight;
  }

  function currentMode() {
    return document.querySelector('input[name="mode"]:checked').value;
  }

  // --- state for switching modes cleanly ---
  let pollTimer = null;
  let longPollActive = false;
  let longPollXhr = null;
  let ws = null;

  function stopAllReceiving() {
    // stop polling interval
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }

    // stop long-poll (abort current request + stop loop)
    longPollActive = false;
    if (longPollXhr) {
      try { longPollXhr.abort(); } catch {}
      longPollXhr = null;
    }

    // close websocket
    if (ws) {
      try { ws.close(); } catch {}
      ws = null;
    }
  }

  // --- XHR helper ---
  function xhr(method, url, body, onDone) {
    const r = new XMLHttpRequest();
    r.open(method, url, true);
    r.setRequestHeader("Content-Type", "application/json");
    r.onreadystatechange = function () {
      if (r.readyState !== 4) return;
      onDone(r);
    };
    r.send(body ? JSON.stringify(body) : null);
    return r;
  }

  // --- receiving modes ---
  function startPolling() {
    // poll every 1s (adjust as you like)
    pollTimer = setInterval(() => {
      xhr("GET", `/poll?client=${encodeURIComponent(client)}`, null, (r) => {
        if (r.status === 200) {
          const m = JSON.parse(r.responseText);
          log(`${m.from} → ${m.to}: ${m.text}`);
        } else if (r.status === 204) {
          // no message, ignore
        }
      });
    }, 1000);
    log("Primanje: Polling (svakih 1s)");
  }

  function startLongPolling() {
    longPollActive = true;

    function loop() {
      if (!longPollActive) return;

      longPollXhr = new XMLHttpRequest();
      longPollXhr.open("GET", `/longpoll?client=${encodeURIComponent(client)}`, true);
      longPollXhr.setRequestHeader("Cache-Control", "no-store");

      longPollXhr.onreadystatechange = function () {
        if (longPollXhr.readyState !== 4) return;

        const status = longPollXhr.status;

        // 200 = got a message
        if (status === 200) {
          const m = JSON.parse(longPollXhr.responseText);
          log(`${m.from} → ${m.to}: ${m.text}`);
        }
        // 204 = timeout, just reconnect
        // 409 = server says "already waiting" (mode switching / duplicates), just retry
        // 0   = aborted, stop
        if (status !== 0 && longPollActive) {
          // immediately re-connect
          loop();
        }
      };

      longPollXhr.send(null);
    }

    loop();
    log("Primanje: Long polling (server drži vezu do poruke/timeouta)");
  }

  function startWebSocket() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${proto}://${location.host}/ws?client=${encodeURIComponent(client)}`);

    ws.onopen = () => log("Primanje: WebSocket (spojen)");
    ws.onclose = () => log("WebSocket (zatvoren)");
    ws.onerror = () => log("WebSocket (greška)");

    ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch { m = { text: String(ev.data) }; }
      if (m.type === "message") {
        log(`${m.from} → ${m.to}: ${m.text}`);
      } else {
        log(`WS: ${ev.data}`);
      }
    };
  }

  function startReceivingForMode(mode) {
    stopAllReceiving();
    if (mode === "poll") startPolling();
    else if (mode === "longpoll") startLongPolling();
    else startWebSocket();
  }

  // --- sending (always POST /message) ---
  function sendMessage() {
    const text = msgEl.value.trim();
    if (!text) return;

    xhr("POST", `/message?from=${encodeURIComponent(client)}`, { text }, (r) => {
      if (r.status === 200) {
        log(`JA (${client}) → ${client === "A" ? "B" : "A"}: ${text}`);
        msgEl.value = "";
        msgEl.focus();
      } else {
        log(`Greška slanja: ${r.status} ${r.responseText || ""}`);
      }
    });
  }

  sendBtn.addEventListener("click", sendMessage);
  msgEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // mode switching
  document.querySelectorAll('input[name="mode"]').forEach((el) => {
    el.addEventListener("change", () => startReceivingForMode(currentMode()));
  });

  // start default
  startReceivingForMode(currentMode());
})();
