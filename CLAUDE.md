# NBA Schedine - note per chi continua a lavorare sull'app

App (PWA) italiana per pronostici NBA: partite e live, giocate con probabilità, schedine, conto personale, notifiche.

## Struttura
- `worker.js` Cloudflare Worker: API `/api/*`, cron (riepilogo mattutino, esiti, avvisi preferiti), Web Push (chiavi VAPID in Supabase).
- `espn.js` lettura dati ESPN (scoreboard, boxscore, infortuni). `modello.js` modello probabilistico, consigli e schedine. `quote.js` quote (dormiente senza chiave).
- `public/` app (JS puro, script classici caricati in ordine da `index.html`): `core.js` (utilità, api, dati), `mia.js` (schedina personale, click), `partite.js` (Home, preferiti, sincronizzazione), `conto.js` (calcolatore, impostazioni, registro, conto, mese), `giocatore.js` (giocatore, schedine, categorie, studio partita), `live.js` (Live, esiti, storico), `statistiche.js` (statistiche del registro, schedine condivise con link), `strumenti.js` (valore atteso con la quota, Forma, budget mensile, copie automatiche, colori giocatori in Home), `esplora.js` (aspetto, classifica, squadra, stasera), `app.js` (router e avvio; qui c'è `VERSIONE`). Se aggiungi un file va messo in `index.html` e in `SHELL` di `sw.js`. Poi `style.css` e `sw.js` (service worker: cache e push).
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
- Quintetti ufficiali: `caricaQuintetti` (espn.js, `starter` nel boxscore) e blocco 1c di `avvisiSchedine` (notifica una volta per schedina e partita, entro 90 minuti dall'inizio; flag `avv.<id>.f`). Struttura del boxscore pre-partita non verificata con dati reali. Forma recente: se manca o è vecchia, `apiGiorno` lancia `aggiornaForma` in background (al massimo ogni 10 minuti) e l'avviso mostra l'ultimo errore. A fine partita le giocate su squadre e giocatori sono verdi/rosse (`esitoPick`, `ESPL`), i punti «stimati» restano visibili colorati.
- Strumenti: Home colora le giocate sui giocatori a fine partita (`coloraGiocatoriHome`); nelle schede giocata campo «Quota del bookmaker» con valore atteso (`quotaRow`, chiavi `Q_<id>`); `#/forma` (giocatori sopra/sotto la media nelle ultime 5); budget mensile (`budget` in localStorage, avviso in Home all'80% e al 100%); copie settimanali del registro sul server (`bk` nella riga `_reg_<codice>`, `/api/copie`, `/api/copia`) ripristinabili da Impostazioni. `sincronizza` ora conserva anche `sera` e `bk`.
- Schede partita: massimo 3 etichette, le altre dietro «+N» (`comprimi`, `strumenti.js`); le probabilità prima della partita sono neutre, verde/rosso solo per esiti reali. Esiti: blocco «Le tue giocate» del giorno (`bloccoMieGiornata`). Fix v99: la rotta `#/esiti` ora apre davvero `vistaEsiti` (dalla v50 apriva Modello). Statistiche giocatori: due pagine ESPN (circa 400 giocatori).

- v100: barra in basso compatta e agganciata al bordo (blocco finale di style.css); `#miabar` e padding di `main` adeguati.

- v101: Forma con pulsante «+» per aggiungere alla schedina (usa il consiglio Punti del giocatore se esiste); avviso push «giocatore disponibile» in `avvisiSchedine` (blocco 1, svuota `a.i` e notifica una volta). Già presenti da prima: back-to-back (`B2B_PUNTI`) e taratura per tipo (`_calib`).

- v102: gli avvisi dati non gravi (forma non caricata ecc.) non compaiono più in Home, solo quelli rossi; `/#/diag` ha la voce «Forma recente dei giocatori» con ultimo errore.

- v103: toccando una partita finita in Home il riquadro mostra anche i punti per quarto e il grafico dello scarto (`tabQuarti`, `andamentoLive` con `f:1`, nel handler `[data-tab]` di mia.js).

- v104: intestazione bassa su una riga con avatar `.avt` che apre `#/profilo`; Giocata del giorno compatta; schede partita meno dense; riga Esplora con sfumatura. Profilo (`vistaProfilo`, `applicaProfilo` in strumenti.js, chiave `profilo` in localStorage: nome, squadra del cuore, colore): la squadra del cuore cambia `--or` e la costante `OR` (core.js, ora `let`); sul server non si sincronizza.

- v105: la ☆ delle squadre non è più nelle schede della Home ma solo nell'intestazione dello studio partita (`team()` in mia.js, solo se non cliccabile); i giocatori hanno già la ☆ nella loro pagina.

- v106: sigla della squadra in contorno dietro il logo nelle schede Home (`.wmk`, colore `--wc`); pannello «Perché questa linea?» (`perche(x)` in strumenti.js) sotto le giocate dello studio partita, alimentato da `det` (`dettaglio()` in modello.js: media stagione, ultime partite, minuti, difesa, compagni fuori, bookmaker, storico, scala delle linee). Giocate vecchie senza `det` mostrano il solo `motivo`.

- v107: nelle schede Home sparisce il testo della sigla accanto al logo (resta solo la sigla in contorno dietro e il badge 1/2); logo a 42 px.

- v108: schede Home con logo al centro della sua metà, sigla in contorno centrata dietro (`.wmk` dentro `.tm`) e badge 1/2 sull'angolo del logo. Notifiche: riepilogo di domani alle 9 (`inviaRiepilogo(env, off)`, blocco 1a di `cronAvvisi`, flag `stato[ymd+1].d`: 1 inviato, 2 nessuna partita); promemoria 20-40 min prima delle partite seguite (`oggi.p`); interruttori per categoria nel Profilo (`pref.nt.gg/pr/sc`, filtro `vuole` in `accodaPush`, campo `cat` nei messaggi: gg riepilogo, pr partite seguite, sc schedine).

- v109: quintetti ufficiali anche per le partite seguite (blocco 1b di `cronAvvisi`, flag `oggi.q`, una notifica per telefono con i giocatori seguiti in evidenza; `caricaQuintetti` ora restituisce anche `squadre` con i cognomi dei titolari). Struttura `starter` pre-partita ancora non verificata con dati reali.

## Idee aperte
Classifica privata del gruppo (serve un accesso/identità), notifiche per altri eventi, verifica dei dati ESPN reali per classifica, quarti e boxscore.

- v110 (idee 1/6, parte 1): nuovo file `idee1.js` (in index.html e SHELL di sw.js; rotte extra via `window.RIDEE`, controllate all'inizio di `route()`): pagella del modello come grafico (`graficoPagella`, in Statistiche), «minuti a rischio» sulle giocate (`rischioMin`), pulsante «Schedina del giorno» (`btnSchedinaGiorno`, 3 giocate di partite diverse), controllo del limite di perdita prima di salvare (`controllaBudget`), tema «Notte» (`html.notte`, Impostazioni › Aspetto), stima finale e intervallo di probabilità unita per giocate correlate in `vistaMia`; stima finale nelle «Le mie giocate» del Live (`avanzamentoLeg().proj`).

- v111 (idee 2/6, Live): `idee2.js`: cronaca generata dagli aggiornamenti del Live (`aggiornaCronaca`: parziali da 10 punti, sorpassi, traguardi 10/20/30/40, doppie doppie, 4 falli, «momento caldo»; vive solo mentre il Live è aperto), svolta evidenziata nel grafico (`grafLive` ridefinita qui), modalità divano (`#divanoBtn`, `html.divano`), `riassuntoPartita` nel riquadro delle partite finite, falli e stima finale nelle mie giocate; `sw.js`: le notifiche della stessa partita si sostituiscono (tag dall'URL). Non fatta: mappa dei tiri (ESPN non fornisce le zone nei dati che usiamo).

- v112 (idee 3/6, Modello): `idee3.js`: `#/valore` Radar del valore (giocate con la quota scritta ordinate per valore atteso, modello contro mercato, linee che si sono mosse con `tracciaLinee` → `lineeStor` in localStorage; `bannerRadar` in Home), `#/chiedi` (domande in italiano risolte da `rispondi(D, q)` sui dati del giorno, senza server), `chipContesto` nelle schede Home (ritmo alto/basso, altitudine Denver/Utah, fusi: solo informativo). Esplora ha i segmenti Valore e Chiedi. Non fatte: effetto arbitri e scontri diretti (mancano i dati storici in ESPN che leggiamo); il «secondo parere» è il confronto modello da solo contro linea del bookmaker.

- v113 (idee 4/6, Schedine e conto): `idee4.js`: `#/costruisci` (costruttore a passi, `window.__miaAgg` richiamato anche da lì), `cashoutHtml` (probabilità attuale e valore equo di un'uscita, nelle mie giocate del Live), `#/esese` (simulatore), `#/diario` (campo `motivo` nelle righe del registro), `tuVsModello` (Statistiche, usa `l.mia` e `r.es`), `#/portafogli` (campo `ptf` nel registro, `portafoglioAttuale()`), `#/rendiconto` (stampa/PDF con `window.print`, regole `@media print`), `hubStrumenti()` (elenco di scorciatoie in Conto e Profilo).
