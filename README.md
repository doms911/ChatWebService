````md
# APUW Lab 2 — Simple Chat (Polling / Long-Polling / WebSocket)

Ovaj projekt implementira jednostavnu web uslugu za razmjenu poruka između **dva klijenta (A i B)** preko **posredničkog poslužitelja**.

Podržana su 3 načina primanja poruka:
1. **Polling** (XMLHttpRequest)
2. **Long polling** (XMLHttpRequest)
3. **WebSocket** (browser WebSocket API)

Server pamti **samo zadnju neisporučenu poruku po klijentu** (ako je primatelj offline).

---

## Preduvjeti
- **Node.js** (preporuka: LTS verzija)
- Web preglednik (Chrome/Firefox/Safari) — bez dodataka

Provjera:
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

```
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

Ako je sve ok, vidis:

```
Server listening on http://localhost:3000
```

---

## Pokretanje klijenata (2 taba)

Otvori **dva taba** u browseru:

* Klijent A: `http://localhost:3000/client.html?client=A`
* Klijent B: `http://localhost:3000/client.html?client=B`

U svakom tabu:

* odaberi način primanja poruka (**Polling / Long polling / WebSocket**)
* pošaljite poruku u input polje

---

## Kako testirati zahtjeve iz zadatka

### 1) Oba klijenta “spojena”

* Ostavi oba taba otvorena
* Pošalji poruku s A na B
  ➡️ Ako je B na **WS** ili **long-poll**, poruka dolazi praktički odmah
  ➡️ Ako je B na **polling**, poruka dolazi na sljedeći poll (ovisno o intervalu)

### 2) Primatelj offline → server pamti poruku

* Zatvori tab B (ili refreshaj tako da se “odspoji”)
* Pošalji više poruka iz A
* Ponovno otvori tab B (`?client=B`)
  ➡️ B dobije **samo zadnju** poruku koja je poslana dok je bio offline

### 3) Miješanje tehnika (neovisno po klijentu)

Primjeri:

* A = WebSocket, B = Polling
* A = Polling, B = Long polling
* A = Long polling, B = WebSocket

---

## Napomena o pravilima (FER)

* Klijent mora koristiti:

  * **XMLHttpRequest** za polling i long-polling
  * **WebSocket** API za WebSocket način

---

## Troubleshooting

### Port je zauzet

Ako dobiješ error tipa `EADDRINUSE`, promijeni port u `server.listen(...)` ili ugasi proces koji koristi port.

### Ne rade `import` naredbe u Node-u

Provjeri da u `package.json` imaš:

```json
{ "type": "module" }
```

ili prepiši server na `require(...)` sintaksu.

### Long-polling se stalno reconnecta

To je očekivano ponašanje: server nakon timeouta vraća `204`, a klijent ponovno šalje request.

---