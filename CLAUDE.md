# NBA Schedine - note per chi continua a lavorare sull'app

App (PWA) italiana per pronostici NBA: partite e live, giocate con probabilità, schedine, conto personale, notifiche.

## Struttura
- `worker.js` Cloudflare Worker: API `/api/*`, cron (riepilogo mattutino, esiti, avvisi preferiti), Web Push (chiavi VAPID in Supabase).
- `espn.js` lettura dati ESPN (scoreboard, boxscore, infortuni). `modello.js` modello probabilistico, consigli e schedine. `quote.js` quote (dormiente senza chiave).
- `public/` app (JS puro): `app.js` (SPA a rotte con hash), `style.css`, `index.html`, `sw.js` (service worker: cache e push).
- Deploy: push su `main` -> Cloudflare pubblica da solo. `wrangler.toml`: asset da `public/`, worker per `/api/*`.
- Segreti Cloudflare: `SUPABASE_URL`, `SUPABASE_KEY` (obbligatori); `TELEGRAM_*`, `ODDS_*` facoltativi.
- Supabase: tabelle `nba_consigli` (giocate e storico) e `nba_forma` (forma giocatori, righe di servizio che iniziano con `_`: `_push`, `_coda`, `_vapid`, `_calib`). Non toccare altre tabelle del progetto.

## Regole pratiche
- A ogni modifica a `public/` alza `VERSIONE` in `app.js` e il nome cache in `sw.js` (`nba-vNN`): si vede in `/#/diag`.
- Attenzione a `sw.js`: non riscriverlo con `open(..., "w")` prima di leggerlo (in passato si è svuotato).
- Ordine partite all'italiana: casa a sinistra (1), trasferta a destra (2).
- I dati locali (registro, movimenti, preferiti, scelte) stanno nel `localStorage` del telefono.
- ESPN non è raggiungibile dal sandbox di sviluppo: i test si fanno con dati finti (Playwright). `node --check` non basta per ESM: provare anche `import()` del worker.
- Le notifiche sono ritardate di 5-10 minuti (frequenza del cron).

## Idee aperte
Sincronizzare le schedine personali sul server (avvisi sulle proprie giocate), classifiche e calendario, pagine squadra e giocatore, vista della taratura per fasce di probabilità.
