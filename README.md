# APUW Lab 2 — Simple Chat (Polling / Long-Polling / WebSocket)

Ovaj projekt implementira jednostavnu web uslugu za razmjenu poruka između  
**dva klijenta (A i B)** preko **posredničkog poslužitelja**.

Podržana su 3 načina primanja poruka:
1. **Polling** (XMLHttpRequest)
2. **Long polling** (XMLHttpRequest)
3. **WebSocket** (browser WebSocket API)

Server pamti **samo zadnju neisporučenu poruku po klijentu** (ako je primatelj offline).

---

## Preduvjeti
- **Node.js** (preporuka: LTS verzija)
- Web preglednik (Chrome / Firefox / Safari) — bez dodataka

Provjera instalacije:
```bash
node -v
npm -v
````

---

## Instalacija

U root direktoriju projekta pokreni:

```bash
npm init -y
npm install express ws
```

---

## Struktura projekta (minimalno)

```text
.
├── server.js
└── public
    ├── client.html
    └── client.js
```

* `server.js` — Express + WebSocket server, HTTP rute `/message`, `/poll`, `/longpoll`
* `public/client.html` + `public/client.js` — klijent u browseru (UI + izbor načina komunikacije)

---

## Pokretanje servera

U root direktoriju pokreni:

```bash
node server.js
```

Ako je sve u redu, u terminalu će se ispisati:

```text
Server listening on http://localhost:3000
```

---

## Pokretanje klijenata (2 taba)

Otvori **dva taba** u web pregledniku:

* Klijent A: `http://localhost:3000/client.html?client=A`
* Klijent B: `http://localhost:3000/client.html?client=B`

U svakom tabu:

* odaberi način primanja poruka (**Polling / Long polling / WebSocket**)
* pošalji poruku u input polje

---

## Kako testirati zahtjeve iz zadatka

### 1) Oba klijenta “spojena”

* Ostavi oba taba otvorena
* Pošalji poruku s A na B

* Ako je B na **WebSocketu** ili **long-pollingu**, poruka dolazi gotovo odmah
* Ako je B na **pollingu**, poruka dolazi na sljedeći poll (ovisno o intervalu)

---

### 2) Primatelj offline → server pamti poruku

* Zatvori tab B (ili ga refreshaj tako da se “odspoji”)
* Pošalji više poruka iz A
* Ponovno otvori tab B (`?client=B`)

* B dobije **samo zadnju** poruku poslanu dok je bio offline

---

### 3) Miješanje tehnika (neovisno po klijentu)

Primjeri:

* A = WebSocket, B = Polling
* A = Polling, B = Long polling
* A = Long polling, B = WebSocket

---

## Troubleshooting

### Port je zauzet

Ako dobiješ grešku tipa `EADDRINUSE`, promijeni port u `server.listen(...)`
ili ugasi proces koji koristi taj port.

---

### Ne rade `import` naredbe u Node.js

Provjeri da u `package.json` imaš:

```json
{ "type": "module" }
```

Ili prepiši server u `require(...)` sintaksu.

---

### Long-polling se stalno reconnecta

To je očekivano ponašanje:
server nakon timeouta vraća `204`, a klijent automatski šalje novi request.

---
