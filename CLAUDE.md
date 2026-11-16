# NBA Schedine - note per chi continua a lavorare sull'app

App (PWA) italiana per pronostici NBA: partite e live, giocate con probabilità, schedine, conto personale, notifiche.

## Struttura
- `worker.js` Cloudflare Worker: API `/api/*`, cron (riepilogo mattutino, esiti, avvisi preferiti), Web Push (chiavi VAPID in Supabase).
- `espn.js` lettura dati ESPN (scoreboard, boxscore, infortuni). `modello.js` modello probabilistico, consigli e schedine. `quote.js` quote (dormiente senza chiave).
- `public/` app (JS puro, script classici caricati in ordine da `index.html`): `core.js` (utilità, api, dati), `mia.js` (schedina personale, click), `partite.js` (Home, preferiti, sincronizzazione), `conto.js` (calcolatore, impostazioni, registro, conto, mese), `giocatore.js` (giocatore, schedine, categorie, studio partita), `live.js` (Live, esiti, storico), `statistiche.js` (statistiche del registro, schedine condivise con link), `esplora.js` (aspetto, classifica, squadra, stasera), `app.js` (router e avvio; qui c'è `VERSIONE`). Se aggiungi un file va messo in `index.html` e in `SHELL` di `sw.js`. Poi `style.css` e `sw.js` (service worker: cache e push).
- Deploy: push su `main` -> Cloudflare pubblica da solo. `wrangler.toml`: asset da `public/`, worker per `/api/*`.
- Segreti Cloudflare: `SUPABASE_URL`, `SUPABASE_KEY` (obbligatori); `TELEGRAM_*`, `ODDS_*` facoltativi.
- Supabase: tabelle `nba_consigli` (giocate e storico) e `nba_forma` (forma giocatori, righe di servizio che iniziano con `_`: `_push`, `_coda`, `_vapid`, `_calib`). Non toccare altre tabelle del progetto.

## Regole pratiche
- A ogni modifica a `public/` alza `VERSIONE` in `app.js` (ultimo file) e il nome cache in `sw.js` (`nba-vNN`): si vede in `/#/diag`.
- Attenzione a `sw.js`: non riscriverlo con `open(..., "w")` prima di leggerlo (in passato si è svuotato).
- Ordine partite all'italiana: casa a sinistra (1), trasferta a destra (2).
- I dati locali (registro, movimenti, preferiti, scelte) stanno nel `localStorage` del telefono.
- ESPN non è raggiungibile dal sandbox di sviluppo: i test si fanno con dati finti (Playwright). `node --check` non basta per ESM: provare anche `import()` del worker.
- Le notifiche sono ritardate di circa 5 minuti: cron `*/5 * * * *` per `cronAvvisi` (se il piano Cloudflare lo rifiuta, tornare a `5,35 * * * *` in `wrangler.toml` e in `scheduled`).

## Funzioni aggiunte di recente
- Schedine, registro e conto si sincronizzano sul server (`/api/sync`, riga `_reg_<codice>` in `nba_forma`); il codice è per telefono e si può inserire su un altro (Impostazioni). Le eliminazioni passano da `delIds` (tombstone).
- Avvisi sulle proprie schedine nel cron (`avvisiSchedine`): quasi presa / presa / persa e giocatore fuori o in dubbio prima della partita; avvisi intervallo e finale punto a punto per i preferiti.
- Esplora: `#/infortunati` (`/api/infortunati`), `#/classifica`, `#/calendario`, `#/squadra/XXX`, `#/cerca`, scheda giocatore anche senza partita (`/api/giocatore`). Parsing ESPN della classifica non verificato con dati reali: se i nomi dei campi differiscono, guardare `caricaClassifica` in `espn.js`.
- Conto: riepilogo ultimi 7 giorni, «Le tue quote», «Il mio mese» (andamento, per tipo, punti deboli); Modello: taratura per fascia. Impostazioni: codice di sincronizzazione e backup file. Live: grafico dello scarto contro il previsto. `/#/diag` controlla anche le pagine Esplora. Esplora ha anche `#/stasera`. Aspetto (tema chiaro con filtro CSS, testo grande) e badge con le giocate aperte.

- News: `#/news` e `#/news/XXX` (`/api/news?s=`, `caricaNews` in espn.js); i titoli sono tradotti con MyMemory (cache `_trad` in `nba_forma`, `MYMEMORY_EMAIL` facoltativo). Nello studio partita i loghi aprono la pagina squadra (`#/squadra/XXX`), che include una sezione «Ultime notizie».
- Avvisi nel cron (`avvisiSchedine`, `riepilogoSera`): promemoria 18-42 minuti prima della prima partita di una schedina aperta, riepilogo serale con saldo del giorno per telefono (flag `avv.r` e `sera` nella riga `_reg_<codice>`). Esplora: `#/seguiti` (giocatori e squadre con ☆, forma, infortuni); Home: notizie dei preferiti (`notizieHome`); Registro: pulsante «Immagine» (`immagineSchedina`, canvas + condivisione). Tema chiaro vero con variabili (`html.chiaro` in style.css), non più filtro.
- Statistiche: `#/statistiche` (per probabilità, quota, tipo, giorno). Link di condivisione: `/api/condividi` (POST) e `/api/condiviso?id=`, righe `_sh_<id>` in `nba_forma`, pagina pubblica `#/s/<id>` con esito aggiornato.

## Idee aperte
Classifica privata del gruppo (serve un accesso/identità), notifiche per altri eventi, verifica dei dati ESPN reali per classifica, quarti e boxscore.
