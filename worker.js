import { info, nome, SQUADRE } from "./squadre.js";
import { proiettaPartita, proiettaGiocatori, consigli, proposte, proposteQuota, valuta, phi, STD, frazioneGara, probLive, segnaliLive } from "./modello.js";
import { aggiornaQuote, chiaveGara } from "./quote.js";
import { romaYMD, caricaGiorno, caricaStatistiche, caricaInfortuni, caricaBoxscore, caricaCronaca, caricaUltime, caricaEsitoPartita, caricaQuintetti, caricaAtleta, testaATesta, caricaGamelog, dataUS, get, caricaClassifica, caricaCalendarioSquadra, caricaCalendario, caricaListaInfortuni, caricaNews } from "./espn.js";

const arr = (k, v) => (typeof v === "number" && !Number.isInteger(v) ? Math.round(v * 1000) / 1000 : v);
const J = (o, ttl = 0) => new Response(JSON.stringify(o, arr), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": ttl ? `public, max-age=${ttl}` : "no-store", "access-control-allow-origin": "*" } });
const ERR = (m, s = 500) => new Response(JSON.stringify({ errore: m }), { status: s, headers: { "content-type": "application/json" } });

// ---- Supabase (secrets SUPABASE_URL e SUPABASE_KEY)
const dbOk = (env) => !!(env.SUPABASE_URL && env.SUPABASE_KEY);
async function db(env, metodo, { params, corpo, prefer, tabella = "nba_consigli" } = {}) {
  const u = new URL(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${tabella}`);
  for (const [k, v] of Object.entries(params || {})) u.searchParams.set(k, v);
  const h = { apikey: env.SUPABASE_KEY, Authorization: `Bearer ${env.SUPABASE_KEY}`, "Content-Type": "application/json" };
  if (prefer) h.Prefer = prefer;
  const r = await fetch(u.toString(), { method: metodo, headers: h, body: corpo ? JSON.stringify(corpo) : undefined });
  if (!r.ok) throw new Error(`Supabase ${r.status} ${(await r.text()).slice(0, 120)}`);
  const t = await r.text(); return t ? JSON.parse(t) : [];
}

const chiaveGiocata = (x) => `${x.g}|${x.tipo}|${x.pid || x.squadra || (x.tipo === "Totale" ? x.testo : "")}`;
// Forma delle squadre: stagione 65-70%, ultime 10 partite, e (se ci sono almeno 3 gare) rendimento in casa/in trasferta
function teamsConForma(teams, fs, casa, trasf) {
  const out = { ...teams };
  for (const [sq, v] of [[casa, "c"], [trasf, "t"]]) {
    const f = fs && fs[sq], T = teams[sq]; if (!f || f.n < 5 || !T) continue;
    const ven = f["n" + v] >= 3 ? { pf: f["pf" + v], pa: f["pa" + v] } : null, pe = ven ? [0.65, 0.25, 0.10] : [0.70, 0.30, 0];
    out[sq] = { pf: pe[0] * T.pf + pe[1] * f.pf + (ven ? pe[2] * ven.pf : 0), pa: pe[0] * T.pa + pe[1] * f.pa + (ven ? pe[2] * ven.pa : 0) };
  }
  return out;
}
function costruisci(partite, teams0, players, infortuni, b2b, forma = {}, quote = null, linee = {}, fsq = null) {
  const out = [];
  for (const p of partite) {
    if (!teams0[p.casa] || !teams0[p.trasf]) continue;
    const teams = teamsConForma(teams0, fsq, p.casa, p.trasf);
    // le quote prepartita si usano solo per le partite non ancora iniziate
    const k = chiaveGara(p.casa, p.trasf), usa = quote && p.stato === "pre";
    let qg = usa ? (quote.giochi || {})[k] : null; const qp = usa ? (quote.props || {})[k] : null;
    // senza Odds API: si usa la linea di ESPN (un solo bookmaker, nessun prezzo: vale come mediana del mercato, cioè 50%)
    if (!qg && p.stato === "pre" && (linee["tot_" + p.casa] != null || linee["spr_" + p.casa] != null)) {
      const lt = linee["tot_" + p.casa], ls = linee["spr_" + p.casa];
      qg = { tot: lt != null ? { linea: lt, pOver: 0.5, n: 1, libri: [{ b: "ESPN", o: "-", u: "-" }] } : null, spr: ls != null ? { linea: ls, pCasa: 0.5, n: 1, libri: [{ b: "ESPN", o: "-", u: "-" }] } : null };
    }
    const r = proiettaPartita(p.casa, p.trasf, teams, b2b, qg);
    const giocatori = players.length ? [...proiettaGiocatori(p.casa, p.trasf, teams, players, infortuni, forma, r.margine, qp), ...proiettaGiocatori(p.trasf, p.casa, teams, players, infortuni, forma, -r.margine, qp)] : [];
    const inf = players.filter((q) => (q.sq === p.casa || q.sq === p.trasf) && q.min >= 20 && infortuni[q.nome.trim().toLowerCase()])
      .map((q) => ({ nome: q.nome, sq: q.sq, ...infortuni[q.nome.trim().toLowerCase()] }));
    out.push({ ...p, r, giocatori, inf, fs: fsq ? { casa: fsq[p.casa] || null, trasf: fsq[p.trasf] || null } : null });
  }
  return out;
}

// Dove il modello e il mercato si discostano di più (sulle linee reali dei bookmaker)
function dovePiuDiverso(gare) {
  const l = [];
  const nomi = { pts: "Punti", reb: "Rimbalzi", ast: "Assist" };
  for (const g of gare) for (const x of g.giocatori) for (const k of ["pts", "reb", "ast"]) {
    const m = x[k] && x[k].mk; if (!m) continue;
    const over = m.pFin >= 0.5, pF = over ? m.pFin : 1 - m.pFin, pM = over ? m.pMk : 1 - m.pMk, pMod = over ? m.pMod : 1 - m.pMod;
    l.push({ g: g.id, partita: `${g.casa} - ${g.trasf}`, pid: x.pid, nome: x.nome, sq: x.sq, mercato: nomi[k], lato: over ? "over" : "under", linea: m.linea, pMk: pM, pMod, pFin: pF, edge: pF - pM, div: m.div, n: m.n });
  }
  return l.sort((a, b) => b.edge - a.edge).slice(0, 12);
}

async function leggiForma(env) {
  if (!dbOk(env)) return { mappa: {}, stato: null };
  try {
    const righe = await db(env, "GET", { tabella: "nba_forma", params: { select: "pid,dati,agg", limit: "3000" } });
    const mappa = {}; let stato = null, quote = null, calib = null, avvisi = null, squadre = null;
    for (const r of righe) { if (r.pid === "_stato") stato = r.dati; else if (r.pid === "_quote") quote = r.dati; else if (r.pid === "_calib") calib = r.dati; else if (r.pid === "_avvisi") avvisi = r.dati; else if (r.pid === "_squadre") squadre = r.dati; else if (!r.pid.startsWith("_")) mappa[r.pid] = r.dati; }
    return { mappa, stato, quote, calib, avvisi, squadre, n: Object.keys(mappa).length };
  } catch (e) { return { mappa: {}, stato: null, errore: e.message }; }
}

// Ogni 30 minuti (cron): aggiorna la forma recente dei giocatori che giocano oggi e domani. Pochi per volta per restare nei limiti.
async function aggiornaForma(env, max = 8) {
  if (!dbOk(env)) return;
  const [stat, g0, g1] = await Promise.all([caricaStatistiche(), caricaGiorno(0), caricaGiorno(1)]);
  const squadre = []; for (const p of [...g0.partite, ...g1.partite]) { if (p.stato === "post") continue; squadre.push(p.casa, p.trasf); }
  const elenco = {}; let errore = null;
  try { for (const r of await db(env, "GET", { tabella: "nba_forma", params: { select: "pid,agg", limit: "3000" } })) elenco[r.pid] = r.agg; } catch (e) { errore = e.message; }
  const vecchio = Date.now() - 18 * 3600e3;
  const candidati = [];
  for (const sq of [...new Set(squadre)]) {
    const gs = stat.players.filter((q) => q.sq === sq && q.min >= 20 && q.pid).sort((a, b) => b.min - a.min).slice(0, 9);
    for (const q of gs) if (!elenco[q.pid] || Date.parse(elenco[q.pid]) < vecchio) candidati.push(q);
  }
  // Cloudflare (piano gratuito) permette 50 richieste per esecuzione: lotti piccoli, e se la prima fallisce ci si ferma subito
  const lotto = candidati.slice(0, max), righe = []; let falliti = 0, ultimoErr = errore;
  const una = async (q) => { try { righe.push({ pid: q.pid, nome: q.nome, sq: q.sq, dati: await caricaGamelog(q.pid), agg: new Date().toISOString() }); return true; } catch (e) { falliti++; ultimoErr = e.message; return false; } };
  if (lotto.length) { const ok = await una(lotto[0]); if (ok) await Promise.all(lotto.slice(1).map(una)); }
  righe.push({ pid: "_stato", nome: "stato", sq: "", dati: { ultimo: new Date().toISOString(), ok: righe.length, falliti, da_fare: Math.max(0, candidati.length - lotto.length), errore: ultimoErr }, agg: new Date().toISOString() });
  await db(env, "POST", { tabella: "nba_forma", params: { on_conflict: "pid" }, corpo: righe, prefer: "resolution=merge-duplicates" });
}

// Ogni 30 minuti (cron): aggiorna le quote dei bookmaker se serve (rispettando il limite dei crediti)
async function cronQuote(env, forza = false) {
  if (!dbOk(env) || !env.ODDS_API_KEY) return { saltato: true };
  const [g0, g1, f] = await Promise.all([caricaGiorno(0, null, 60), caricaGiorno(1, null, 60), leggiForma(env)]);
  const partite = [...g0.partite, ...g1.partite].filter((p) => p.stato !== "post");
  const nuovo = await aggiornaQuote(env, f.quote, partite, forza);
  if (nuovo) await db(env, "POST", { tabella: "nba_forma", params: { on_conflict: "pid" }, corpo: [{ pid: "_quote", nome: "quote", sq: "", dati: nuovo, agg: new Date().toISOString() }], prefer: "resolution=merge-duplicates" });
  return { aggiornato: !!nuovo, crediti: nuovo?.crediti ?? f.quote?.crediti ?? null, errore: nuovo?.errore || null };
}

// Ogni 30 minuti (cron): aggiorna la forma delle squadre che giocano oggi e domani (ultime 10 partite, in casa e in trasferta)
async function aggiornaSquadre(env) {
  if (!dbOk(env)) return;
  const [g0, g1, f] = await Promise.all([caricaGiorno(0, null, 60), caricaGiorno(1, null, 60), leggiForma(env)]);
  const dati = { ...(f.squadre || {}) }, sigle = [...new Set([...g0.partite, ...g1.partite].filter((p) => p.stato !== "post").flatMap((p) => [p.casa, p.trasf]))];
  const vecchie = sigle.filter((s) => !dati[s] || Date.now() - Date.parse(dati[s].agg || 0) > 6 * 3600e3).slice(0, 14);
  if (!vecchie.length) return;
  await Promise.all(vecchie.map(async (s) => {
    try {
      const u = await caricaUltime(s, 10), m = (l, k) => (l.length ? l.reduce((a, x) => a + x[k], 0) / l.length : 0), c = u.filter((x) => x.casa), t = u.filter((x) => !x.casa);
      dati[s] = { n: u.length, pf: m(u, "pf"), pa: m(u, "pa"), nc: c.length, pfc: m(c, "pf"), pac: m(c, "pa"), nt: t.length, pft: m(t, "pf"), pat: m(t, "pa"), v: u.filter((x) => x.vinta).length, agg: new Date().toISOString() };
    } catch {}
  }));
  await db(env, "POST", { tabella: "nba_forma", params: { on_conflict: "pid" }, corpo: [{ pid: "_squadre", nome: "forma squadre", sq: "", dati, agg: new Date().toISOString() }], prefer: "resolution=merge-duplicates" });
}

// ---- Taratura automatica: confronta le percentuali previste con i risultati reali dello Storico (almeno 25 esiti per categoria)
// la taratura usa solo le giocate fatte col modello attuale (dal 14/11/2026, quando sono state allargate le dispersioni e aggiunte le ultime partite)
const MODELLO_DAL = "2026-11-14T12:00:00Z";
function calcolaCalib(righe) {
  const per = {};
  for (const r of righe) { if (r.esito !== 0 && r.esito !== 1) continue; if (r.creato && String(r.creato) < MODELLO_DAL) continue; const c = (per[r.tipo] ||= { n: 0, hit: 0, pred: 0 }); c.n++; c.hit += r.esito; c.pred += r.prob; }
  const out = {};
  for (const [t, c] of Object.entries(per)) {
    if (c.n < 25) continue;
    const K = 20, predM = c.pred / c.n, oss = (c.hit + K * predM) / (c.n + K); // pochi dati: ci si fida del modello
    out[t] = { n: c.n, fattore: Math.max(0.8, Math.min(1.05, oss / predM)), previsto: predM, reale: c.hit / c.n };
  }
  // correzione per singolo giocatore: pochi dati -> ci si fida del modello (K=8), correzione limitata
  const pg = {};
  for (const r of righe) {
    if (r.esito !== 0 && r.esito !== 1) continue; if (r.creato && String(r.creato) < MODELLO_DAL) continue;
    if (!["Punti", "Rimbalzi", "Assist", "Giocatore"].includes(r.tipo) && !/^\d+$/.test(String(r.chiave || "").split("|")[2] || "")) continue;
    const pid = String(r.chiave || "").split("|")[2]; if (!pid || !/^\d+$/.test(pid)) continue;
    const c = (pg[pid] ||= { n: 0, hit: 0, pred: 0 }); c.n++; c.hit += r.esito; c.pred += r.prob;
  }
  const gi = {};
  for (const [pid, c] of Object.entries(pg)) {
    if (c.n < 5) continue;
    const predM = c.pred / c.n, oss = (c.hit + 8 * predM) / (c.n + 8);
    const f = Math.max(0.85, Math.min(1.08, oss / predM)); if (Math.abs(f - 1) >= 0.02) gi[pid] = { n: c.n, f, previsto: predM, reale: c.hit / c.n };
  }
  if (Object.keys(gi).length) out._giocatori = gi;
  return out;
}
function applicaCalib(picks, calib) {
  if (!calib || !Object.keys(calib).length) return picks;
  return picks.map((p) => { const c = calib[p.tipo], g = p.pid && calib._giocatori ? calib._giocatori[p.pid] : null, ct = c && Math.abs(c.fattore - 1) >= 0.01 ? c : null; if (!ct && !g) return p;
    let prob = p.prob, nota = "";
    if (ct) { prob *= ct.fattore; nota += ` (Percentuale tarata sullo Storico: finora ${p.tipo} previsti al ${Math.round(ct.previsto * 100)}%, centrati al ${Math.round(ct.reale * 100)}%.)`; }
    if (g) { prob *= g.f; nota += ` (Correzione sul giocatore: in ${g.n} giocate passate previsto ${Math.round(g.previsto * 100)}%, centrato ${Math.round(g.reale * 100)}%.)`; }
    return { ...p, probGrezza: p.prob, prob: Math.min(0.97, prob), motivo: p.motivo + nota }; }).sort((a, b) => b.prob - a.prob);
}
async function salvaCalib(env, righe) {
  const c = calcolaCalib(righe);
  await db(env, "POST", { tabella: "nba_forma", params: { on_conflict: "pid" }, corpo: [{ pid: "_calib", nome: "calibrazione", sq: "", dati: c, agg: new Date().toISOString() }], prefer: "resolution=merge-duplicates" });
}

// ---- Notifiche sul telefono (Web Push, funzionano con l'app aggiunta alla schermata Home di iPhone con iOS 16.4 o più recente)
// Le chiavi VAPID si creano da sole al primo uso e restano su Supabase (riga "_vapid"); gli iscritti stanno nella riga "_push".
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const daB64u = (t) => Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
async function rigaForma(env, pid) { const r = await db(env, "GET", { tabella: "nba_forma", params: { select: "dati", pid: "eq." + pid } }); return r[0] ? r[0].dati : null; }
async function salvaRigaForma(env, pid, dati) { await db(env, "POST", { tabella: "nba_forma", params: { on_conflict: "pid" }, corpo: [{ pid, nome: pid.replace("_", ""), sq: "", dati, agg: new Date().toISOString() }], prefer: "resolution=merge-duplicates" }); }
async function chiaviVapid(env) {
  let k = await rigaForma(env, "_vapid");
  if (!k) {
    const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    k = { pub: b64u(await crypto.subtle.exportKey("raw", kp.publicKey)), jwk: await crypto.subtle.exportKey("jwk", kp.privateKey) };
    await salvaRigaForma(env, "_vapid", k);
  }
  return k;
}
async function inviaUnPush(env, sub, k) {
  const aud = new URL(sub.endpoint).origin, exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const te = new TextEncoder(), parte = (o) => b64u(te.encode(JSON.stringify(o)));
  const dati = parte({ typ: "JWT", alg: "ES256" }) + "." + parte({ aud, exp, sub: env.APP_URL && /^https:/.test(env.APP_URL) ? env.APP_URL : "mailto:nba-schedine@example.com" });
  const chiave = await crypto.subtle.importKey("jwk", k.jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const firma = b64u(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, chiave, te.encode(dati)));
  const r = await fetch(sub.endpoint, { method: "POST", headers: { TTL: "43200", Urgency: "high", Authorization: `vapid t=${dati}.${firma}, k=${k.pub}` } });
  return r.status;
}
// manda a tutti gli iscritti un avviso senza testo; il telefono scarica il testo da /api/ultimo-avviso e lo mostra
const idSub = async (ep) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ep)))].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
// mette l'avviso nella coda dei dispositivi scelti e manda a ognuno un push senza testo: il telefono ritira il suo messaggio da /api/ultimo-avviso?id=...
const vuole = (sb, cat) => !cat || !sb.pref || !sb.pref.nt || sb.pref.nt[cat] !== 0;
// silenzio durante il turno di lavoro: gli avvisi non partono, si raccolgono e arrivano in un solo messaggio a fine turno
const minRoma = () => { const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date()); return (+p.find((x) => x.type === "hour").value % 24) * 60 + +p.find((x) => x.type === "minute").value; };
const inSilenzio = (sb) => { const s = sb.pref && sb.pref.sil; if (!s) return false; const m = (t) => +t.slice(0, 2) * 60 + +t.slice(3), a = m(s.da), b = m(s.a), n = minRoma(); return a === b ? false : a < b ? n >= a && n < b : n >= a || n < b; };
async function accodaPush(env, msg, filtro = () => true) {
  if (!dbOk(env)) return { inviati: 0 };
  const el = (await rigaForma(env, "_push")) || { subs: [] };
  if (!el.subs.length) return { inviati: 0 };
  const dest = []; let tenuti = 0;
  for (const sb of el.subs) { sb.id ||= await idSub(sb.endpoint); if (filtro(sb) && vuole(sb, msg.cat)) { if (!msg.forza && inSilenzio(sb)) { sb.dig = [...(sb.dig || []), { titolo: msg.titolo, testo: msg.testo, t: new Date().toISOString() }].slice(-12); tenuti++; } else dest.push(sb); } }
  if (tenuti) await salvaRigaForma(env, "_push", el);
  if (!dest.length) return { inviati: 0, tenuti };
  const m = { ...msg, t: new Date().toISOString() }, lim = Date.now() - 6 * 3600e3, coda = (await rigaForma(env, "_coda")) || {};
  for (const sb of dest) coda[sb.id] = [...(coda[sb.id] || []).filter((x) => Date.parse(x.t) > lim), m].slice(-8);
  await salvaRigaForma(env, "_coda", coda);
  await salvaRigaForma(env, "_ultimoavviso", m);
  const k = await chiaviVapid(env), morti = new Set(), esiti = [];
  for (const sb of dest) { let st = 0; try { st = await inviaUnPush(env, sb, k); } catch { st = 0; } esiti.push(st); if (st === 404 || st === 410) morti.add(sb.endpoint); }
  el.subs = el.subs.filter((x) => !morti.has(x.endpoint)); await salvaRigaForma(env, "_push", el);
  return { inviati: esiti.filter((x) => x >= 200 && x < 300).length, esiti };
}
const pushATutti = (env, titolo, testo, url = "/#/schedine", cat) => accodaPush(env, { titolo, testo, url, cat });
async function iscriviPush(env, sub) {
  if (!sub || !/^https:\/\//.test(sub.endpoint || "")) throw new Error("iscrizione non valida");
  const el = (await rigaForma(env, "_push")) || { subs: [] }, vecchio = el.subs.find((x) => x.endpoint === sub.endpoint);
  el.subs = el.subs.filter((x) => x.endpoint !== sub.endpoint).concat([{ endpoint: sub.endpoint, id: await idSub(sub.endpoint), pref: vecchio ? vecchio.pref : undefined }]).slice(-8);
  await salvaRigaForma(env, "_push", el);
}
// i preferiti di ogni telefono, per avvisare solo di quello che segue
async function salvaPrefPush(env, d) {
  const el = (await rigaForma(env, "_push")) || { subs: [] }, sb = el.subs.find((x) => x.endpoint === (d || {}).endpoint); if (!sb) return false;
  const P = d.pref || {}; sb.pref = { gm: (P.gm || []).slice(0, 40).filter((x) => /^\d+$/.test(String(x))).map(String), sq: (P.sq || []).slice(0, 30).map(String), pl: (P.pl || []).slice(0, 30).map((x) => ({ pid: String(x.pid), nome: String(x.nome || ""), sq: String(x.sq || "") })), nt: { gg: (P.nt || {}).gg === 0 ? 0 : 1, pr: (P.nt || {}).pr === 0 ? 0 : 1, sc: (P.nt || {}).sc === 0 ? 0 : 1 }, sil: P.sil && P.sil.on && /^\d\d:\d\d$/.test(String(P.sil.da)) && /^\d\d:\d\d$/.test(String(P.sil.a)) ? { da: String(P.sil.da), a: String(P.sil.a) } : null };
  if (codiceOk(d.codice)) sb.codice = d.codice;
  await salvaRigaForma(env, "_push", el); return true;
}

// ---- Schedine personali sul server: ogni telefono ha un codice (si può inserire su un altro telefono per condividere registro e conto)
const codiceOk = (c) => /^[a-z0-9]{8,16}$/.test(String(c || ""));
const fondiReg = (o, r) => { const m = { ...o, ...r }; if (r.esito == null && o.esito != null) { m.esito = o.esito; m.nota = o.nota ?? r.nota; } const eo = (o.es || []).filter((x) => x.esito != null).length, er = (r.es || []).filter((x) => x.esito != null).length; if (eo > er) m.es = o.es; return m; };
async function sincronizza(env, d) {
  if (!codiceOk(d.codice)) throw new Error("codice non valido");
  const pid = "_reg_" + d.codice, S = (await rigaForma(env, pid)) || { registro: [], mov: [], del: [], avv: {} };
  const del = new Set([...(S.del || []), ...(Array.isArray(d.del) ? d.del : []).map(String)]);
  const unisci = (a, b) => { const m = new Map(); for (const r of Array.isArray(a) ? a : []) if (r && r.id != null) m.set(String(r.id), r); for (const r of Array.isArray(b) ? b : []) if (r && r.id != null) { const o = m.get(String(r.id)); m.set(String(r.id), o ? fondiReg(o, r) : r); } return [...m.values()].filter((r) => !del.has(String(r.id))); };
  // le righe del telefono vengono per prime (sono le più recenti); poi quelle che c'erano solo sul server
  const registro = unisci(S.registro, d.registro).sort((a, b) => (String(a.data) < String(b.data) ? 1 : String(a.data) > String(b.data) ? -1 : 0)).slice(0, 600), mov = unisci(S.mov, d.mov).slice(0, 600);
  const nuovo = { registro, mov, del: [...del].slice(-400), avv: S.avv || {}, sera: S.sera || {}, bk: S.bk || [] };
  // copia di sicurezza automatica: una a settimana (le ultime 3), se il registro non è enorme
  if (registro.length >= 3 && JSON.stringify(registro).length < 150000 && (!nuovo.bk.length || Date.now() - Date.parse(nuovo.bk[0].t) > 7 * 86400e3)) nuovo.bk = [{ t: new Date().toISOString(), registro }, ...nuovo.bk].slice(0, 3);
  if (JSON.stringify(nuovo).length < 900000) await salvaRigaForma(env, pid, nuovo);
  return { registro, mov, del: nuovo.del };
}
// avvisi sulle proprie schedine: "quasi presa" (manca una giocata), "presa", "persa"; e prima della partita se un giocatore scelto è fuori o in dubbio
async function avvisiSchedine(env, g) {
  const el = (await rigaForma(env, "_push").catch(() => null)) || { subs: [] }, subs = el.subs.filter((x) => codiceOk(x.codice));
  const haLive = g.partite.some((p) => p.stato !== "pre"), preIds = new Set(g.partite.filter((p) => p.stato === "pre").map((p) => String(p.id)));
  if (!subs.length || (!haLive && !preIds.size)) return [];
  const out = [], cache = {}, lim = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10); let budget = 8, inf = null;
  for (const cod of [...new Set(subs.map((x) => x.codice))]) {
    const pid = "_reg_" + cod, S = await rigaForma(env, pid); if (!S || !Array.isArray(S.registro)) continue;
    S.avv ||= {}; let cambiato = false;
    for (const r of S.registro) {
      if (r.esito != null || !r.legs || !r.legs.length || String(r.data) < lim) continue;
      const a = (S.avv[r.id] ||= {}), n = r.legs.length, nomeS = r.nome || "La tua schedina";
      // 1) giocatore fuori o in dubbio prima che la partita inizi
      if (preIds.size && r.legs.some((l) => l.nome && l.pid && preIds.has(String(l.g)))) {
        inf ||= await caricaInfortuni().catch(() => ({}));
        for (const l of r.legs) {
          if (!l.nome || !l.pid || !preIds.has(String(l.g))) continue;
          const i = inf[l.nome.trim().toLowerCase()];
          if (!i || i.grado > 0.5) { // era segnalato fuori o in dubbio e ora non lo è più: avviso di rientro (solo se l'elenco infortuni è stato letto)
            const ks = Object.keys(a.i || {}).filter((k) => k.startsWith(l.pid + ":"));
            if (ks.length && Object.keys(inf).length) { ks.forEach((k) => delete a.i[k]); cambiato = true;
              await accodaPush(env, { cat: "sc", titolo: "✅ Giocatore disponibile", testo: `${l.nome} non risulta più fuori o in dubbio: è nella schedina «${nomeS}»`, url: "/#/registro" }, (sb) => sb.codice === cod); out.push("rientro " + l.nome); }
            continue; }
          const k = `${l.pid}:${i.stato}`; a.i ||= {}; if (a.i[k]) continue; a.i[k] = 1; cambiato = true;
          await accodaPush(env, { cat: "sc", titolo: i.stato === "out" ? "⚠️ Giocatore fuori" : "⚠️ Giocatore in dubbio", testo: `${l.nome} è ${i.stato === "out" ? "fuori" : "in dubbio"}${i.etichetta ? " (" + i.etichetta + ")" : ""}: è nella schedina «${nomeS}»`, url: "/#/registro" }, (sb) => sb.codice === cod); out.push("infortunio " + l.pid);
        }
      }
      // 1b) promemoria: la prima partita della schedina inizia tra 20 e 40 minuti
      if (!a.r && preIds.size) {
        const tra = r.legs.map((l) => g.partite.find((p) => p.stato === "pre" && String(p.id) === String(l.g))).filter(Boolean).map((p) => (Date.parse(p.iso) - Date.now()) / 60000).filter((m) => m > 0);
        const m = tra.length ? Math.min(...tra) : null;
        if (m != null && m >= 18 && m <= 42) { a.r = 1; cambiato = true; await accodaPush(env, { cat: "sc", titolo: "⏰ Si parte tra poco", testo: `«${nomeS}» (${n} giocat${n === 1 ? "a" : "e"}): la prima partita inizia tra ${Math.round(m)} minuti. Controlla infortuni e quintetti.`, url: "/#/registro" }, (sb) => sb.codice === cod); out.push("promemoria " + r.id); }
      }
      // 1c) formazione ufficiale: quando ESPN pubblica i quintetti (entro 90 minuti dall'inizio), si avvisa per i giocatori della schedina
      if (preIds.size && r.legs.some((l) => l.pid && preIds.has(String(l.g)))) {
        a.f ||= {};
        for (const gid of [...new Set(r.legs.filter((l) => l.pid && preIds.has(String(l.g))).map((l) => String(l.g)))]) {
          if (a.f[gid]) continue;
          const pp = g.partite.find((p) => String(p.id) === gid), m = pp ? (Date.parse(pp.iso) - Date.now()) / 60000 : null; if (m == null || m > 90 || m < -5) continue;
          const Q = (cache["q" + gid] ||= await caricaQuintetti(gid).catch(() => null)); if (!Q || !Q.pubblicato) continue;
          const mie = r.legs.filter((l) => l.pid && String(l.g) === gid && l.nome), visti = new Set();
          const righe = mie.filter((l) => !visti.has(l.pid) && visti.add(l.pid)).map((l) => (Q.titolari[l.pid] ? `✅ ${l.nome} titolare` : Q.presenti[l.pid] ? `⚠️ ${l.nome} parte dalla panchina` : `❓ ${l.nome} non è nell'elenco`));
          a.f[gid] = 1; cambiato = true;
          await accodaPush(env, { cat: "sc", titolo: "📋 Quintetti ufficiali", testo: `${pp.casa}-${pp.trasf}: ${righe.join(" · ")} (schedina «${nomeS}»)`.slice(0, 230), url: "/#/registro" }, (sb) => sb.codice === cod); out.push("quintetti " + gid);
        }
      }
      // 2) schedina in corso: quasi presa / presa / persa
      if (!haLive || budget <= 0) continue;
      budget--;
      const es = await valutaGiocate(r.legs, cache);
      const perse = es.map((e, i) => (e.esito === 0 ? i : -1)).filter((i) => i >= 0), aperte = es.map((e, i) => (e.esito == null ? i : -1)).filter((i) => i >= 0), prese = es.filter((e) => e.esito === 1).length;
      const det = (i) => `${r.legs[i].testo}${es[i].cur != null ? ` (ora ${es[i].cur})` : ""}`;
      let m = null;
      if (perse.length && !a.p) { a.p = 1; m = { titolo: "❌ Schedina persa", testo: `${nomeS}: sbagliata ${det(perse[0])}`, url: "/#/registro" }; r.esito = 0; }
      else if (!perse.length && !aperte.length && prese > 0 && !a.v) { a.v = 1; m = { titolo: "✅ Schedina presa!", testo: `${nomeS}: tutte le ${n} giocate centrate`, url: "/#/registro" }; r.esito = 1; }
      else if (!perse.length && aperte.length === 1 && n > 1 && !a.q && !a.v) { a.q = 1; m = { titolo: "🔥 Schedina quasi presa", testo: `${nomeS}: manca solo ${det(aperte[0])}`, url: "/#/live" }; }
      if (m) { cambiato = true; await accodaPush(env, { ...m, cat: "sc" }, (sb) => sb.codice === cod); out.push("schedina " + r.id); }
      // 3) partita decisa: nell'ultimo quarto con almeno 20 punti di scarto i titolari possono uscire; avviso una volta per partita se ci sono giocate ancora aperte
      if (!m && aperte.length && !perse.length) {
        a.d ||= {};
        for (const gid of [...new Set(aperte.map((i) => String(r.legs[i].g)))]) {
          if (a.d[gid]) continue;
          const pp = g.partite.find((p) => String(p.id) === gid); if (!pp || pp.stato !== "in" || (pp.periodo || 0) < 4) continue;
          const sc = Math.abs((pp.ptCasa || 0) - (pp.ptTr || 0)), min = parseInt(String(pp.orologio).split(":")[0], 10); if (!(sc >= 20 && min <= 7)) continue;
          const mie = aperte.filter((i) => String(r.legs[i].g) === gid); a.d[gid] = 1; cambiato = true;
          await accodaPush(env, { cat: "sc", titolo: "🏁 Partita ormai decisa", testo: `${pp.casa}-${pp.trasf} ${pp.ptCasa}-${pp.ptTr}: i titolari possono uscire. Ancora aperte: ${mie.map(det).join(" · ")} (schedina «${nomeS}»)`.slice(0, 230), url: "/#/live" }, (sb) => sb.codice === cod); out.push("decisa " + gid);
        }
      }
    }
    if (cambiato) await salvaRigaForma(env, pid, S);
  }
  return out;
}
// riepilogo serale per ogni telefono: come sono andate le schedine di oggi e il saldo
async function riepilogoSera(env, g, ymd) {
  const el = (await rigaForma(env, "_push").catch(() => null)) || { subs: [] }, out = [], cache = {}, data = ymd.slice(0, 4) + "-" + ymd.slice(4, 6) + "-" + ymd.slice(6, 8);
  for (const cod of [...new Set(el.subs.filter((x) => codiceOk(x.codice)).map((x) => x.codice))]) {
    const pid = "_reg_" + cod, S = await rigaForma(env, pid); if (!S || !Array.isArray(S.registro)) continue;
    S.sera ||= {}; if (S.sera[ymd]) continue;
    const oggi = S.registro.filter((r) => String(r.data) === data); if (!oggi.length) continue;
    for (const r of oggi) if (r.esito == null && r.legs && r.legs.length) { const es = await valutaGiocate(r.legs, cache); if (es.some((e) => e.esito === 0)) r.esito = 0; else if (es.every((e) => e.esito === 1)) r.esito = 1; }
    const chiuse = oggi.filter((r) => r.esito === 0 || r.esito === 1); if (!chiuse.length) continue;
    const ok = chiuse.filter((r) => r.esito === 1).length, saldo = chiuse.reduce((t, r) => t + (r.esito === 1 ? (r.puntata || 0) * ((r.quota || 1) - 1) : -(r.puntata || 0)), 0), fm = (x) => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(2).replace(".", ",") + " €";
    const aperte = oggi.length - chiuse.length;
    await accodaPush(env, { cat: "sc", titolo: `🌙 Oggi: ${ok} su ${chiuse.length} prese`, testo: `Saldo ${fm(saldo)}${aperte ? ` · ${aperte} ancora da chiudere` : ""}. ` + chiuse.slice(0, 3).map((r) => `${r.esito === 1 ? "✅" : "❌"} ${r.nome || "Schedina"}`).join(" · "), url: "/#/conto" }, (sb) => sb.codice === cod);
    S.sera[ymd] = 1; for (const k of Object.keys(S.sera)) if (k < romaYMD(Date.now() - 7 * 86400e3)) delete S.sera[k];
    await salvaRigaForma(env, pid, S); out.push("sera " + cod.slice(0, 4));
  }
  return out;
}
async function ritiraAvviso(env, id) {
  const base = { titolo: "NBA Schedine", testo: "Apri l'app per vedere le giocate", url: "/#/" };
  if (!dbOk(env)) return base;
  if (!id) return (await rigaForma(env, "_ultimoavviso")) || base;
  const coda = (await rigaForma(env, "_coda")) || {}, l = coda[id] || [];
  if (!l.length) return (await rigaForma(env, "_ultimoavviso")) || base;
  const m = l.shift(); coda[id] = l; await salvaRigaForma(env, "_coda", coda); return m;
}
async function avvisa(env, titolo, testo, breve) {
  const out = [];
  if (env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT_ID) { await telegram(env, testo); out.push("telegram"); }
  try { const r = await pushATutti(env, titolo, breve || testo.slice(0, 160), "/#/schedine", "gg"); if (r.inviati) out.push("push"); } catch {}
  return out;
}

// ---- Avvisi su Telegram (facoltativi: segreti TELEGRAM_TOKEN e TELEGRAM_CHAT_ID)
async function telegram(env, testo) {
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: testo.slice(0, 4000), disable_web_page_preview: true }) });
  if (!r.ok) throw new Error(`Telegram ${r.status} ${(await r.text()).slice(0, 100)}`);
}
const pc = (x) => Math.round(x * 100) + "%";
// ultimo giro del cron: lo legge la pagina di controllo per dire se gira davvero
async function segnaCron(env, nome, esito) {
  if (!dbOk(env)) return;
  const S = (await rigaForma(env, "_cron").catch(() => null)) || {};
  S[nome] = { t: new Date().toISOString(), esito: JSON.stringify(esito ?? "ok").slice(0, 160) };
  await salvaRigaForma(env, "_cron", S);
}
// Riepilogo delle giocate (oggi: off 0, domani: off 1): migliori giocate, giocata del giorno e schedine
async function inviaRiepilogo(env, off) {
  const D = await apiGiorno(env, { waitUntil: (p) => p.catch(() => {}) }, off);
  const pre = D.partite.filter((p) => p.stato === "pre").sort((a, b) => (a.iso < b.iso ? -1 : 1));
  const prePick = D.picks.filter((x) => pre.some((p) => p.id === x.g)).slice(0, 6);
  const h0 = +pre[0].ora.slice(-5, -3), quando = off === 0 ? "oggi" : h0 < 9 ? "stanotte" : "domani";
  let t = `🏀 NBA ${quando === "oggi" ? "di oggi" : quando === "stanotte" ? "stanotte" : "di domani"}: ${D.partite.length} partite, la prima alle ${pre[0].ora.slice(-5)}\n`;
  const gdg = [...prePick].sort((a, b) => b.prob - a.prob)[0];
  if (gdg) t += `\n⭐ Giocata del giorno: ${gdg.testo} (${gdg.partita}) ${pc(gdg.prob)}\n`;
  if (prePick.length) t += `\nMigliori giocate\n` + prePick.map((x) => `• ${x.testo} (${x.partita}) ${pc(x.prob)}`).join("\n");
  const sch = (D.schedine || []).filter((x) => /^q\d+$/.test(x.id));
  for (const s of sch.length ? sch : [(D.schedine || []).find((x) => x.id === "sicura") || (D.schedine || [])[0]].filter(Boolean))
    t += `\n\n${s.id === "q20" ? "💣" : "🎟"} ${s.nome} · quota giusta ${s.quotaEqua.toFixed(2)} · si centra il ${pc(s.prob)}\n` + s.legs.map((l) => `• ${l.testo} (${l.partita}) ${pc(l.prob)}`).join("\n");
  t += `\n\nLa quota giusta è calcolata dalle probabilità: i bookmaker pagano un po' meno.`;
  t += `\n\nSono stime del modello, non certezze.${env.APP_URL ? "\n" + env.APP_URL : ""}`;
  await avvisa(env, `🏀 Le giocate di ${quando}`, t, `${gdg ? "⭐ " + gdg.testo + " " + pc(gdg.prob) + " · " : ""}${pre.length} partite · ${sch.length ? "schedine quota " + sch.map((x) => x.obiettivo).join(", ") + " pronte" : "migliori giocate pronte"}`);
}

// a fine turno: un solo messaggio con quello che è successo mentre il telefono era in silenzio
async function consegnaDigest(env) {
  const el = await rigaForma(env, "_push"); if (!el || !el.subs) return;
  const pronti = el.subs.filter((sb) => sb.dig && sb.dig.length && !inSilenzio(sb)); if (!pronti.length) return;
  const dig = new Map(pronti.map((sb) => [sb.id, sb.dig])); for (const sb of pronti) sb.dig = [];
  await salvaRigaForma(env, "_push", el);
  for (const [id, l] of dig) {
    const righe = l.slice(-3).map((x) => x.testo || x.titolo), piu = l.length > 3 ? ` (+${l.length - 3} altri)` : "";
    await accodaPush(env, { titolo: `Mentre eri al lavoro: ${l.length} ${l.length === 1 ? "avviso" : "avvisi"}`, testo: righe.join(" · ") + piu, url: "/#/live", forza: true }, (sb) => sb.id === id);
  }
}
async function cronAvvisi(env) {
  if (!dbOk(env)) return { saltato: "serve Supabase" };
  const conTelegram = env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT_ID, conPush = ((await rigaForma(env, "_push").catch(() => null)) || { subs: [] }).subs.length > 0;
  if (!conTelegram && !conPush) return { saltato: "nessun canale attivo: attiva le notifiche nell'app o imposta Telegram" };
  await consegnaDigest(env).catch(() => {});
  const g = await caricaGiorno(0, null, 60), ymd = romaYMD(Date.now()), ora = Date.now();
  if (!g.partite.length) return { saltato: "nessuna partita" };
  const f = await leggiForma(env), stato = f.avvisi || {}, oggi = stato[ymd] || {}, fatto = [];
  const pre = g.partite.filter((p) => p.stato === "pre"), prima = pre.map((p) => Date.parse(p.iso)).sort((a, b) => a - b)[0];
  // 1) riepilogo della giornata: una volta, dalle 9 del mattino (ora italiana) in poi; oppure, se non è partito, nelle 4 ore prima della prima partita
  const oraRoma = +new Date(ora).toLocaleString("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", hour12: false });
  if (!oggi.d && pre.length && ((oraRoma >= 9 && oraRoma < 23) || (prima && prima - ora < 4 * 3600e3))) {
    await inviaRiepilogo(env, 0); oggi.d = 1; fatto.push("riepilogo");
  }
  // 1a) riepilogo di domani (in Italia le partite sono di notte): alle 9 del mattino, una volta sola
  const ymd1 = romaYMD(ora + 86400e3), dom = stato[ymd1] || {};
  if (!dom.d && oraRoma >= 9 && oraRoma < 23) {
    const g1 = await caricaGiorno(1, null, 60).catch(() => null);
    if (g1) {
      const n1 = g1.partite.filter((p) => p.stato === "pre").length;
      if (n1) { await inviaRiepilogo(env, 1); dom.d = 1; fatto.push("riepilogo domani"); } else dom.d = 2; // 2 = nessuna partita, non ricontrollare
      stato[ymd1] = dom; fatto.length || fatto.push("domani senza partite");
    }
  }
  // 1b) preferiti: inizio e fine delle partite delle squadre (o dei giocatori) che ogni telefono segue
  {
    const subs = ((await rigaForma(env, "_push").catch(() => null)) || { subs: [] }).subs.filter((x) => x.pref && ((x.pref.sq || []).length || (x.pref.pl || []).length || (x.pref.gm || []).length));
    const segue = (sb, p) => (sb.pref.gm || []).includes(String(p.id)) || (sb.pref.sq || []).includes(p.casa) || (sb.pref.sq || []).includes(p.trasf) || (sb.pref.pl || []).some((x) => x.sq === p.casa || x.sq === p.trasf);
    oggi.i ||= {}; oggi.f ||= {}; let inf = null;
    for (const p of g.partite) {
      if (!subs.some((sb) => segue(sb, p))) continue;
      if (p.stato === "pre") { // promemoria 20-40 minuti prima dell'inizio e quintetti ufficiali, per le partite che segui
        const m = (Date.parse(p.iso) - ora) / 60000; oggi.p ||= {}; oggi.q ||= {};
        if (m >= 20 && m <= 40 && !oggi.p[p.id]) { await accodaPush(env, { cat: "pr", titolo: `⏰ Tra poco ${p.casa} - ${p.trasf}`, testo: `Inizia alle ${p.ora.slice(-5)}. Tocca per vedere stime e giocate.`, url: `/#/partita/${p.id}` }, (sb) => sb.pref && segue(sb, p)); oggi.p[p.id] = 1; fatto.push("promemoria " + p.id); }
        if (m > 0 && m <= 240) { // infortuni: giocatore che segui fuori o in dubbio (una notifica per giocatore e stato)
          oggi.n ||= {}; inf ||= await caricaInfortuni().catch(() => ({}));
          for (const sb of subs.filter((x) => segue(x, p))) for (const x of (sb.pref.pl || []).filter((y) => y.sq === p.casa || y.sq === p.trasf)) {
            const i = inf[String(x.nome || "").trim().toLowerCase()], k = x.pid + "|" + (i ? i.stato : "ok") + "|" + String(sb.endpoint).slice(-12);
            if (!i || oggi.n[k]) continue;
            await accodaPush(env, { cat: "pr", titolo: i.stato === "out" ? `⚠️ ${x.nome} è fuori` : `⚠️ ${x.nome} è in dubbio`, testo: `${p.casa} - ${p.trasf}${i.etichetta ? " · " + i.etichetta : ""}${i.dettaglio ? "\n" + i.dettaglio : ""}`.slice(0, 250), url: `/#/partita/${p.id}` }, (y) => y.endpoint === sb.endpoint);
            oggi.n[k] = 1; fatto.push("infortunio " + x.nome);
          }
        }
        if (m > 0 && m <= 90 && !oggi.q[p.id]) { // quando ESPN pubblica i quintetti: una notifica per partita, con i giocatori che segui in evidenza
          const Q = await caricaQuintetti(p.id, 60).catch(() => null);
          if (Q && Q.pubblicato) {
            const riga = (ab) => `${ab}: ${(Q.squadre[ab] || []).join(", ")}`;
            for (const sb of subs.filter((x) => segue(x, p))) {
              const mie = (sb.pref.pl || []).filter((x) => x.sq === p.casa || x.sq === p.trasf).map((x) => (Q.titolari[x.pid] ? `✅ ${x.nome} titolare` : Q.presenti[x.pid] ? `⚠️ ${x.nome} parte dalla panchina` : `❓ ${x.nome} non è nell'elenco`));
              await accodaPush(env, { cat: "pr", titolo: `📋 Quintetti ${p.casa} - ${p.trasf}`, testo: [...mie, riga(p.casa), riga(p.trasf)].join("\n").slice(0, 300), url: `/#/partita/${p.id}` }, (x) => x.endpoint === sb.endpoint);
            }
            oggi.q[p.id] = 1; fatto.push("quintetti " + p.id);
          }
        }
      }
      if (p.stato === "in" && !oggi.i[p.id]) { await accodaPush(env, { cat: "pr", titolo: `🏀 ${p.casa} - ${p.trasf}`, testo: "La partita è iniziata. Tocca per seguirla in diretta.", url: "/#/live" }, (sb) => sb.pref && segue(sb, p)); oggi.i[p.id] = 1; fatto.push("inizio " + p.id); }
      if (p.stato === "in") {
        const diff = Math.abs((p.ptCasa ?? 0) - (p.ptTr ?? 0)), minuti = /:/.test(p.orologio || "") ? parseInt(p.orologio) : 0, punteggio = `${p.casa} ${p.ptCasa} - ${p.ptTr} ${p.trasf}`;
        oggi.h ||= {}; oggi.c ||= {};
        if (/half|interval/i.test(p.dettaglio || "") && !oggi.h[p.id]) { await accodaPush(env, { cat: "pr", titolo: `⏸ Intervallo ${p.casa} - ${p.trasf}`, testo: punteggio, url: "/#/live" }, (sb) => sb.pref && segue(sb, p)); oggi.h[p.id] = 1; fatto.push("intervallo " + p.id); }
        if ((p.periodo || 0) >= 4 && minuti < 5 && diff <= 6 && !oggi.c[p.id]) { await accodaPush(env, { cat: "pr", titolo: `🔥 Finale punto a punto`, testo: `${punteggio} · ${p.dettaglio || ""}`, url: "/#/live" }, (sb) => sb.pref && segue(sb, p)); oggi.c[p.id] = 1; fatto.push("finale " + p.id); }
      }
      if (p.stato === "post" && !oggi.f[p.id]) {
        let box = {}; try { box = await caricaBoxscore(p.id, 600); } catch {}
        const finale = `Finale: ${p.casa} ${p.ptCasa} - ${p.ptTr} ${p.trasf}`;
        for (const sb of subs.filter((x) => segue(x, p))) {
          const righe = (sb.pref.pl || []).filter((x) => x.sq === p.casa || x.sq === p.trasf).map((x) => { const b = box[x.pid]; return b ? `${x.nome}: ${b.pts ?? 0} pt, ${b.reb ?? 0} rb, ${b.ast ?? 0} as` : null; }).filter(Boolean);
          await accodaPush(env, { cat: "pr", titolo: `🏁 ${p.casa} - ${p.trasf}`, testo: [finale, ...righe].join("\n"), url: `/#/partita/${p.id}` }, (x) => x.endpoint === sb.endpoint);
        }
        oggi.f[p.id] = 1; fatto.push("fine " + p.id);
      }
    }
  }
  // 1c) schedine personali: quasi presa / presa / persa
  try { fatto.push(...(await avvisiSchedine(env, g))); } catch {}
  // 1d) riepilogo serale personale, a fine giornata
  if (g.partite.every((p) => p.stato === "post")) { try { fatto.push(...(await riepilogoSera(env, g, ymd))); } catch {} }
  // 2) risultati: una volta, quando tutte le partite del giorno sono finite
  if (!oggi.e && g.partite.every((p) => p.stato === "post")) {
    const S = await apiStorico(env), ids = new Set(g.partite.map((p) => p.id));
    const r = (S.righe || []).filter((x) => ids.has(String(x.event_id)) && (x.esito === 0 || x.esito === 1));
    if (r.length) {
      const ok = r.filter((x) => x.esito === 1).length, per = {};
      for (const x of r) { const c = (per[x.tipo] ||= [0, 0]); c[1]++; if (x.esito === 1) c[0]++; }
      let t = `📊 Risultati di oggi: ${ok} giocate su ${r.length} centrate (${pc(ok / r.length)})\n\n` + Object.entries(per).map(([k, [a, b]]) => `• ${k}: ${a}/${b}`).join("\n");
      const best = r.filter((x) => x.esito === 1).sort((a, b) => b.prob - a.prob).slice(0, 3);
      if (best.length) t += `\n\nCentrate: ` + best.map((x) => x.testo).join("; ");
      await avvisa(env, "📊 Risultati di oggi", t, `${ok} giocate su ${r.length} centrate (${pc(ok / r.length)})`); oggi.e = 1; fatto.push("risultati");
    }
  }
  if (fatto.length) {
    stato[ymd] = oggi; for (const k of Object.keys(stato)) if (k < romaYMD(ora - 3 * 86400e3)) delete stato[k];
    await db(env, "POST", { tabella: "nba_forma", params: { on_conflict: "pid" }, corpo: [{ pid: "_avvisi", nome: "avvisi", sq: "", dati: stato, agg: new Date().toISOString() }], prefer: "resolution=merge-duplicates" });
  }
  return { inviati: fatto };
}


// ---- Traduzione dei titoli delle notizie (MyMemory, gratuita): ogni titolo si traduce una volta sola e resta salvato
async function traduciUno(env, testo) {
  // 1) traduttore pubblico di Google (senza chiave), 2) MyMemory se il primo non risponde
  try {
    const u = new URL("https://translate.googleapis.com/translate_a/single"); u.searchParams.set("client", "gtx"); u.searchParams.set("sl", "en"); u.searchParams.set("tl", "it"); u.searchParams.set("dt", "t"); u.searchParams.set("q", testo);
    const res = await fetch(u.toString()); if (res.ok) { const j = await res.json(), t = ((j && j[0]) || []).map((x) => (x && x[0]) || "").join("").trim(); if (t) return t; }
  } catch {}
  try {
    const u = new URL("https://api.mymemory.translated.net/get"); u.searchParams.set("q", testo); u.searchParams.set("langpair", "en|it"); if (env.MYMEMORY_EMAIL) u.searchParams.set("de", env.MYMEMORY_EMAIL);
    const res = await fetch(u.toString()), j = await res.json(), t = String((j.responseData || {}).translatedText || "").trim();
    if (res.ok && t && !/MYMEMORY WARNING|QUERY LENGTH|INVALID/i.test(t) && !j.quotaFinished) return t;
  } catch {}
  return null;
}
// titoli e descrizioni: ogni testo si traduce una volta sola e resta salvato (al massimo 18 nuovi per richiesta, il resto alla prossima)
async function traduciTitoli(env, righe) {
  let C = {}; if (dbOk(env)) C = ((await rigaForma(env, "_trad").catch(() => null)) || {}).m || {};
  const lavori = [];
  for (const r of righe) {
    for (const [campo, dest, testo] of [["t", "titoloIt", r.titolo], ["d", "descIt", r.desc]]) {
      if (!testo) continue; const k = (campo === "d" ? "d|" : "") + testo.slice(0, 180);
      if (C[k]) r[dest] = C[k]; else lavori.push({ r, dest, k, testo: testo.slice(0, 400) });
    }
  }
  const batch = lavori.slice(0, 18); let cambiato = false;
  await Promise.all(batch.map(async (w) => { const t = await traduciUno(env, w.testo); if (t) { C[w.k] = t; w.r[w.dest] = t; cambiato = true; } }));
  if (cambiato && dbOk(env)) { const chiavi = Object.keys(C); if (chiavi.length > 600) for (const x of chiavi.slice(0, chiavi.length - 600)) delete C[x]; await salvaRigaForma(env, "_trad", { m: C }).catch(() => {}); }
  return righe;
}
async function apiDiag(env) {
  const v = [], prova = async (nome, fn) => { try { v.push({ nome, ok: true, dettaglio: String(await fn()) }); } catch (e) { v.push({ nome, ok: false, dettaglio: String(e.message || e) }); } };
  let gg = null, stat = null;
  await prova("Partite di oggi (ESPN)", async () => { gg = await caricaGiorno(0); return `${gg.partite.length} partite, ${gg.ieri.length} finite ieri, ${Object.keys(gg.linee).length} linee`; });
  await prova("Statistiche squadre e giocatori", async () => { stat = await caricaStatistiche(); return stat.diag.join(" · "); });
  await prova("Titolarità dei giocatori (partite da titolare)", async () => { const n = stat.players.filter((q) => q.gs != null && q.gp != null).length; if (!n) throw new Error("ESPN non fornisce le partite da titolare: il quintetto stimato usa i minuti"); return `${n} giocatori con partite da titolare, es. ${stat.players.find((q) => q.gs != null).nome}: ${stat.players.find((q) => q.gs != null).gs}/${stat.players.find((q) => q.gs != null).gp}`; });
  await prova("Quintetti ufficiali (ESPN)", async () => { const pre = gg && gg.partite.find((p) => p.stato !== "pre"); if (!pre) return "nessuna partita iniziata da controllare ora: si verifica a partita iniziata"; const Q = await caricaQuintetti(pre.id, 60); const n = Q ? Object.keys(Q.titolari || {}).length : 0; if (!n) throw new Error(`${pre.casa}-${pre.trasf}: nessun titolare letto dal boxscore`); return `${pre.casa}-${pre.trasf}: ${n} titolari letti`; });
  await prova("Forma recente dei giocatori", async () => { if (!dbOk(env)) throw new Error("serve Supabase"); const f = await leggiForma(env), st = f.stato || {};
    if (f.errore) throw new Error("database: " + f.errore);
    if (!f.n) throw new Error(`nessun giocatore caricato${st.ultimo ? `; ultimo tentativo ${st.ultimo.slice(11, 16)} UTC: ${st.ok || 0} ok, ${st.falliti || 0} falliti, ${st.da_fare || 0} da fare` : "; il caricamento non è ancora partito"}${st.errore ? ". Errore: " + String(st.errore).slice(0, 140) : ""}`);
    return `${f.n} giocatori con forma recente${st.da_fare ? `, ${st.da_fare} ancora da caricare` : ""}`; });
  await prova("Infortuni", async () => `${Object.keys(await caricaInfortuni()).length} segnalati`);
  await prova("Classifica Est/Ovest", async () => { const c = await caricaClassifica(); if (!c.Est.length || !c.Ovest.length) throw new Error(`Est ${c.Est.length} squadre, Ovest ${c.Ovest.length}: una conference è vuota`); const x = c.Est[0]; return `Est ${c.Est.length} · Ovest ${c.Ovest.length} squadre, prima a Est ${x.ab} ${x.v}-${x.p}${x.pf == null ? " (medie punti non fornite)" : ""}`; });
  await prova("Calendario prossimi giorni", async () => { const g = await caricaCalendario(romaYMD(Date.now())); if (!g.length) throw new Error("nessuna partita trovata nei prossimi 7 giorni"); return `${g.reduce((a, x) => a + x.partite.length, 0)} partite in ${g.length} giorni`; });
  await prova("Pagina squadra", async () => { const sg = (gg && gg.partite[0] && gg.partite[0].casa) || "BOS", c = await caricaCalendarioSquadra(sg); return `${sg}: ${c.fatte.length} risultati, ${c.prossime.length} prossime partite`; });
  await prova("Lista infortunati e foto", async () => { const l = await caricaListaInfortuni(), st = stat || (await caricaStatistiche()), nomi = new Set(st.players.map((q) => q.nome.trim().toLowerCase())); const senza = l.filter((x) => !x.pid && !nomi.has(x.nome.trim().toLowerCase())).length; if (!l.length) throw new Error("lista vuota"); return `${l.length} infortunati, ${l.length - senza} con foto${senza ? `, ${senza} senza identificativo` : ""}`; });
  await prova("Schedine sincronizzate", async () => { if (!dbOk(env)) throw new Error("serve Supabase"); const el = (await rigaForma(env, "_push").catch(() => null)) || { subs: [] }; return `${el.subs.length} telefoni con notifiche, ${el.subs.filter((x) => x.codice).length} con codice di sincronizzazione`; });
  await prova("Controllo notifiche (cron ogni 5 minuti)", async () => {
    if (!dbOk(env)) throw new Error("serve Supabase");
    const c = ((await rigaForma(env, "_cron").catch(() => null)) || {}).avvisi;
    if (!c) throw new Error("non ancora eseguito: se il deploy è fresco attendi qualche minuto; se resta così Cloudflare non ha attivato il cron */5 (si torna a ogni 30 minuti)");
    const min = Math.round((Date.now() - Date.parse(c.t)) / 60000);
    if (min > 20) throw new Error(`ultimo giro ${min} minuti fa: il cron non gira ogni 5 minuti (ultimo esito ${c.esito})`);
    return `ultimo giro ${min} minuti fa · ${c.esito}`;
  });
  await prova("Pagine con dati vuoti", async () => {
    const v = [], c = await caricaClassifica().catch(() => null), l = await caricaListaInfortuni().catch(() => null);
    if (!c || !c.Est.length || !c.Ovest.length) v.push("classifica");
    if (!l || !l.length) v.push("infortunati");
    if (stat && !stat.players.length) v.push("giocatori");
    if (gg && !gg.partite.length && !gg.ieri.length) v.push("partite (oggi e ieri vuote)");
    if (v.length) throw new Error("vuote o non leggibili: " + v.join(", "));
    return "tutte le pagine hanno dati";
  });
  await prova("Notizie ESPN", async () => { const n = await caricaNews(null, 5); if (!n.length) throw new Error("nessuna notizia"); return `${n.length} notizie, ultima: ${n[0].titolo.slice(0, 60)}`; });
  await prova("Registro consigli (Supabase)", async () => { if (!dbOk(env)) throw new Error("secrets SUPABASE_URL / SUPABASE_KEY mancanti"); const r = await db(env, "GET", { params: { select: "chiave", limit: "5000" } }); return `${r.length} consigli salvati`; });
  await prova("Forma recente giocatori", async () => { if (!dbOk(env)) throw new Error("serve Supabase"); const f = await leggiForma(env); if (f.errore) throw new Error(f.errore + " (hai creato la tabella nba_forma?)"); const s = f.stato || {}; return `${f.n} giocatori con le ultime 10 partite${s.ultimo ? `, ultimo aggiornamento ${s.ultimo.slice(0, 16)}, ${s.falliti} falliti, ${s.da_fare} da fare` : ", nessun aggiornamento ancora"}${s.errore ? ", errore: " + s.errore : ""}`; });
  await prova("Quote bookmaker (The Odds API)", async () => {
    if (!env.ODDS_API_KEY) return "non attive (facoltative): si usa la linea di ESPN per totale e spread";
    if (!dbOk(env)) throw new Error("serve Supabase");
    const q = (await leggiForma(env)).quote;
    if (!q || !q.t) return "chiave presente, nessuna quota ancora scaricata (parte quando ci sono partite nelle prossime 14 ore)";
    const np = Object.values(q.props || {}).reduce((a, x) => a + Object.keys(x).length, 0);
    if (q.errore) throw new Error(q.errore + ` (crediti rimasti: ${q.crediti ?? "?"})`);
    return `${Object.keys(q.giochi || {}).length} partite con linee, ${np} quote giocatori, aggiornate alle ${q.t.slice(11, 16)} UTC, crediti rimasti ${q.crediti ?? "?"}`;
  });
  await prova("Forma delle squadre", async () => {
    if (!dbOk(env)) throw new Error("serve Supabase");
    const s = (await leggiForma(env)).squadre; if (!s) return "nessun dato ancora (si riempie da solo con il cron ogni 30 minuti)";
    const k = Object.keys(s); return `${k.length} squadre con le ultime 10 partite, ultimo aggiornamento ${k.map((x) => s[x].agg).sort().slice(-1)[0].slice(0, 16)}`;
  });
  await prova("Avvisi Telegram", async () => {
    if (!env.TELEGRAM_TOKEN || !env.TELEGRAM_CHAT_ID) return "non attivi (facoltativi): servono i segreti TELEGRAM_TOKEN e TELEGRAM_CHAT_ID";
    const f = dbOk(env) ? await leggiForma(env) : {}; const a = f.avvisi || {}, k = Object.keys(a).sort().slice(-1)[0];
    return `attivi${k ? `, ultimo giorno con avvisi ${k} (${a[k].d ? "riepilogo" : ""}${a[k].d && a[k].e ? " + " : ""}${a[k].e ? "risultati" : ""})` : ", nessun avviso ancora inviato"}`;
  });
  await prova("Taratura sullo Storico", async () => {
    if (!dbOk(env)) throw new Error("serve Supabase");
    const c = (await leggiForma(env)).calib || {}; const k = Object.keys(c).filter((x) => x !== "_giocatori");
    return k.length ? k.map((t) => `${t} ×${c[t].fattore.toFixed(2)} (${c[t].n} esiti)`).join(" · ") : "non ancora attiva: servono almeno 25 esiti per categoria";
  });
  await prova("Calendario squadra (ultimi incontri)", async () => `${(await caricaUltime("BOS")).length} partite trovate per BOS`);
  return { aggiornato: new Date().toISOString(), voci: v };
}

async function apiGiorno(env, ctx, offset, data = null) {
  const errori = [];
  const lab = (n, pr) => pr.catch((e) => { throw new Error(`${n}: ${e.message}`); }); // l'errore dice quale pezzo non risponde
  const [g, stat, fm] = await Promise.all([lab("Calendario ESPN", caricaGiorno(offset, data)), lab("Statistiche ESPN", caricaStatistiche()), lab("Database", leggiForma(env))]);
  let infortuni = {};
  try { infortuni = await caricaInfortuni(); } catch (e) { errori.push("infortuni: " + e.message); }
  const b2b = [...new Set(g.ieri.flatMap((p) => [p.casa, p.trasf]))];
  const gare = costruisci(g.partite, stat.teams, stat.players, infortuni, b2b, fm.mappa, fm.quote, g.linee, fm.squadre);
  const picks = applicaCalib(consigli(gare), fm.calib);
  const sigle = new Set(); gare.forEach((x) => { sigle.add(x.casa); sigle.add(x.trasf); });
  g.ieri.forEach((x) => { sigle.add(x.casa); sigle.add(x.trasf); });
  let registro = "non configurato";
  if (dbOk(env)) {
    const GIORNO = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
    const righe = {};
    for (const x of picks) {
      const gara = gare.find((q) => q.id === x.g);
      if (!gara || gara.stato !== "pre") continue;
      const chiave = chiaveGiocata(x);
      righe[chiave] = { chiave, event_id: x.g, data: GIORNO, partita: x.partita, tipo: x.tipo, testo: x.testo, squadra: x.squadra, prob: x.prob, stima: String(x.stima) };
    }
    // schedine proposte: salvate per vedere nel tempo quante vengono centrate
    const dayYMD = data || romaYMD(Date.now() + offset * 86400000);
    for (const s of [...proposte(picks, gare), ...proposteQuota(picks, gare)]) {
      const chiave = `sch|${dayYMD}|${s.id}`;
      righe[chiave] = { chiave, event_id: s.legs[0].g, data: GIORNO, partita: s.nome, tipo: "Schedina", testo: `${s.nome}: ` + s.legs.map((l) => l.testo).join(" + "), squadra: s.id, prob: s.prob, stima: JSON.stringify(s.legs.map((l) => chiaveGiocata(l))) };
    }
    const lista = Object.values(righe);
    registro = `${lista.length} consigli da salvare`;
    if (lista.length) ctx.waitUntil(db(env, "POST", { params: { on_conflict: "chiave" }, corpo: lista, prefer: "resolution=ignore-duplicates" }).catch(() => {}));
  }
  // segnali di salute dei dati, mostrati nell'app
  const salute = [];
  if (!stat.players.length) salute.push({ liv: "err", t: "Statistiche dei giocatori non disponibili: mancano giocatori e giocate sui giocatori." });
  if (errori.some((e) => e.startsWith("infortuni"))) salute.push({ liv: "warn", t: "Infortuni non disponibili: controlla gli assenti prima di giocare." });
  if (dbOk(env)) {
    const ultF = fm.stato && fm.stato.ultimo ? Date.parse(fm.stato.ultimo) : 0, errF = fm.stato && fm.stato.errore ? ` Ultimo errore: ${String(fm.stato.errore).slice(0, 110)}.` : "";
    // se la forma manca o è vecchia, si prova a caricarla subito (senza aspettare il cron), al massimo una volta ogni 10 minuti
    if (stat.players.length && (!fm.n || Date.now() - ultF > 3 * 3600e3) && Date.now() - ultF > 10 * 60e3) ctx.waitUntil(aggiornaForma(env, 4).catch(() => {}));
    if (stat.players.length && !fm.n) salute.push({ liv: "warn", t: "Forma recente dei giocatori non ancora caricata: le stime usano la media stagione. Sto provando a caricarla ora, riapri tra un minuto." + errF });
    else if (fm.stato && fm.stato.ultimo && Date.now() - Date.parse(fm.stato.ultimo) > 5 * 3600e3) salute.push({ liv: "warn", t: "Forma recente dei giocatori non aggiornata da più di 5 ore." });
    if (fm.errore) salute.push({ liv: "warn", t: "Database non raggiungibile: Storico e forma potrebbero mancare." });
  } else salute.push({ liv: "warn", t: "Database Supabase non collegato: Storico e forma recente non attivi." });
  const sq = {}; sigle.forEach((s) => { sq[s] = info(s); });
  const finiteNome = new Set();
  return { aggiornato: new Date().toISOString(), offset, squadre: sq, linee: g.linee, ieri: g.ieri, b2b,
    salute,
    schedine: [...proposte(picks, gare), ...proposteQuota(picks, gare)].map((s) => ({ ...s, chiave: `sch|${data || romaYMD(Date.now() + offset * 86400000)}|${s.id}` })), valore: dovePiuDiverso(gare), quote: fm.quote ? { t: fm.quote.t, crediti: fm.quote.crediti, partite: Object.keys(fm.quote.giochi || {}).length } : null,
    partite: gare.map((x) => ({ id: x.id, casa: x.casa, trasf: x.trasf, ora: x.ora, iso: x.iso, fs: x.fs, stato: x.stato, dettaglio: x.dettaglio, ptCasa: x.ptCasa, ptTr: x.ptTr, qCasa: x.qCasa, qTr: x.qTr,
      r: { ...x.r, pw: phi(x.r.margine / STD.Spread) }, giocatori: x.giocatori, inf: x.inf })),
    picks, diag: [...stat.diag, `forma: ${fm.n || 0} giocatori`, `partite: ${gare.length}`, `linee: ${Object.keys(g.linee).length}`, `infortuni: ${Object.keys(infortuni).length}`, `registro: ${registro}`, ...errori] };
}

// partite finite -> consigli ricalcolati e confrontati con i risultati

// esito delle giocate di una schedina scritta dall'utente: 1 centrata, 0 persa, null in attesa, 2 annullata (giocatore che non ha giocato)
async function valutaGiocate(legs, cache = {}) {
  const L = (Array.isArray(legs) ? legs : []).slice(0, 24).filter((l) => /^\d+$/.test(String(l.g)) && ["pts", "reb", "ast", "tot", "sq", "win"].includes(l.k));
  const partite = {};
  await Promise.all([...new Set(L.map((l) => String(l.g)))].slice(0, 10).map(async (g) => { try { partite[g] = await (cache[g] ||= caricaEsitoPartita(g)); } catch { partite[g] = null; } }));
  return L.map((l) => {
    const p = partite[String(l.g)]; if (!p) return { esito: null, nota: "partita non leggibile" };
    const over = l.dir !== "under", sg = +l.soglia; let cur = null;
    if (l.k === "tot") cur = (p.ptCasa ?? 0) + (p.ptTr ?? 0);
    else if (l.k === "sq") cur = l.sq === p.casa ? p.ptCasa : p.ptTr;
    else if (l.k === "win") { if (!p.finita) return { esito: null }; const d = l.sq === p.casa ? p.ptCasa - p.ptTr : p.ptTr - p.ptCasa; return { esito: d > 0 ? 1 : 0, cur: d }; }
    else { const b = p.box[String(l.pid)]; if (!b) return p.finita ? { esito: 2, nota: "giocatore non sceso in campo" } : { esito: null }; if (p.finita && !(b.min > 0)) return { esito: 2, nota: "giocatore non sceso in campo" }; cur = b[l.k]; }
    if (cur == null) return { esito: p.finita ? 2 : null };
    if (over) return { esito: cur > sg ? 1 : p.finita ? 0 : null, cur }; // un over superato resta centrato anche prima della fine
    return { esito: cur > sg ? 0 : p.finita ? 1 : null, cur }; // un under sforato è perso subito
  });
}

async function apiEsiti(offset, data = null) {
  const g = await caricaGiorno(offset, data), stat = await caricaStatistiche();
  const finite = [...g.ieri, ...g.partite.filter((p) => p.stato === "post")];
  const gare = costruisci(finite, stat.teams, stat.players, {}, []);
  const picks = consigli(gare);
  const box = {};
  await Promise.all(gare.filter((x) => picks.some((p) => p.g === x.id && ["Punti", "Rimbalzi", "Assist"].includes(p.tipo))).map(async (x) => {
    try { box[x.id] = await caricaBoxscore(x.id); } catch { box[x.id] = null; }
  }));
  const ris = picks.map((p) => {
    const gara = gare.find((x) => x.id === p.g);
    const [esito, dettaglio] = valuta(p, { casa: gara.casa, trasf: gara.trasf, ptCasa: gara.ptCasa, ptTr: gara.ptTr }, box[p.g]);
    return { ...p, esito, dettaglio };
  });
  return { squadre: Object.fromEntries([...new Set(gare.flatMap((x) => [x.casa, x.trasf]))].map((s) => [s, info(s)])), risultati: ris };
}

async function apiStorico(env) {
  if (!dbOk(env)) return { attivo: false, righe: [] };
  const tutte = await db(env, "GET", { params: { select: "*", order: "creato.desc", limit: "3000" } });
  const righe = tutte.filter((r) => r.tipo !== "Schedina"), schedine = tutte.filter((r) => r.tipo === "Schedina");
  const attesa = righe.filter((r) => r.esito == null);
  if (attesa.length) {
    try {
      const finite = new Map();
      for (const off of [0, -1]) {
        const g = await caricaGiorno(off);
        for (const p of [...g.partite, ...g.ieri]) if (p.stato === "post") finite.set(p.id, p);
      }
      const box = {}, agg = [];
      for (const r of attesa) {
        const gara = finite.get(String(r.event_id)); if (!gara) continue;
        let b = null;
        if (["Punti", "Rimbalzi", "Assist"].includes(r.tipo)) {
          if (!(r.event_id in box)) { try { box[r.event_id] = await caricaBoxscore(r.event_id); } catch { box[r.event_id] = null; } }
          b = box[r.event_id]; if (!b) continue;
        }
        const [esito, dettaglio] = valuta(r, gara, b);
        r.esito = esito; r.dettaglio = dettaglio; agg.push({ chiave: r.chiave, esito, dettaglio });
      }
      if (agg.length) await db(env, "POST", { params: { on_conflict: "chiave" }, corpo: agg, prefer: "resolution=merge-duplicates" });
    } catch {}
  }
  // schedine: centrata solo se tutte le giocate sono centrate; persa appena una è sbagliata
  const perChiave = new Map(righe.map((r) => [r.chiave, r])), aggS = [];
  for (const s of schedine) {
    if (s.esito != null) continue;
    let chiavi = []; try { chiavi = JSON.parse(s.stima || "[]"); } catch {}
    const esiti = chiavi.map((k) => (perChiave.get(k) || {}).esito);
    let e = null;
    if (esiti.includes(0)) e = 0; else if (esiti.length && esiti.every((x) => x === 1)) e = 1; else if (esiti.includes(2) && !esiti.includes(null) && !esiti.includes(undefined)) e = 2;
    if (e != null) { s.esito = e; s.dettaglio = `${esiti.filter((x) => x === 1).length} su ${esiti.length} giocate centrate`; aggS.push({ chiave: s.chiave, esito: e, dettaglio: s.dettaglio }); }
  }
  if (aggS.length) { try { await db(env, "POST", { params: { on_conflict: "chiave" }, corpo: aggS, prefer: "resolution=merge-duplicates" }); } catch {} }
  return { attivo: true, righe, schedine };
}


const MEM_LIVE = new Map(); let MEM_DATI = null;
async function apiLive(env) {
  const [g, gPrima] = await Promise.all([caricaGiorno(0, null, 5), caricaGiorno(-1, null, 5).catch(() => ({ partite: [] }))]);
  const visti = new Set(g.partite.map((p) => p.id));
  g.partite = [...g.partite, ...gPrima.partite.filter((p) => p.stato === "in" && !visti.has(p.id))];
  // nessuna partita in corso: basta l'elenco, senza costruire il modello (evita di superare i limiti di Cloudflare)
  if (!g.partite.some((p) => p.stato === "in")) return { aggiornato: new Date().toISOString(), squadre: {}, partite: [], totali: g.partite.length, finite: g.partite.filter((x) => x.stato === "post").length, prossime: g.partite.filter((x) => x.stato === "pre").map((x) => ({ id: x.id, casa: x.casa, trasf: x.trasf, ora: x.ora })) };
  // modello solo per le partite in corso e conservato in memoria per qualche minuto: così ogni aggiornamento (ogni 6 secondi) costa pochissimo
  const inCorsoP = g.partite.filter((x) => x.stato === "in"), ora0 = Date.now();
  for (const [k, v] of MEM_LIVE) if (ora0 - v.t > 15 * 60000) MEM_LIVE.delete(k);
  const mancanti = inCorsoP.filter((p) => !MEM_LIVE.has(p.id));
  if (mancanti.length || !MEM_DATI || ora0 - MEM_DATI.t > 10 * 60000) {
    const [stat, fm0] = await Promise.all([caricaStatistiche(), leggiForma(env)]);
    let infortuni = {}; try { infortuni = await caricaInfortuni(); } catch {}
    MEM_DATI = { t: ora0, fm: fm0 };
    for (const x of costruisci(mancanti, stat.teams, stat.players, infortuni, [...new Set(g.ieri.flatMap((p) => [p.casa, p.trasf]))], fm0.mappa, fm0.quote, {}, fm0.squadre)) MEM_LIVE.set(x.id, { t: ora0, x });
  }
  const fm = MEM_DATI.fm;
  const gare = inCorsoP.map((p) => MEM_LIVE.has(p.id) ? { ...MEM_LIVE.get(p.id).x, ...p } : null).filter(Boolean);
  const picks = consigli(gare);
  const inCorso = gare.filter((x) => x.stato === "in");
  const out = await Promise.all(inCorso.map(async (x) => {
    let box = {}; try { box = await caricaBoxscore(x.id, 5); } catch {}
    const f = frazioneGara(x.periodo, x.orologio), ga = { ...x, f, finita: false };
    const mie = picks.filter((q) => q.g === x.id).map((q) => { const l = probLive(q, ga, box, x.giocatori); return l ? { ...q, adesso: l.adesso, pLive: l.p, cur: l.cur } : null; }).filter(Boolean);
    const gioc = Object.values(box).filter((b) => b.tit || (b.min != null && b.min > 0)).sort((a, b) => (b.tit - a.tit) || (b.pts || 0) - (a.pts || 0))
      .map((b) => ({ nome: b.nome, sq: b.sq, pts: b.pts, reb: b.reb, ast: b.ast, min: b.min, tit: !!b.tit, stl: b.stl, blk: b.blk, to: b.to, pf: b.pf, pm: b.pm, tre: b.tre, fg: b.fg, pid: b.pid }));
    const proiTot = x.ptCasa + x.ptTr + x.r.totale * (1 - f);
    // linea del bookmaker durante la partita (solo se scaricata dopo l'inizio e non troppo vecchia)
    let mercato = null; const qg = fm.quote && (fm.quote.giochi || {})[chiaveGara(x.casa, x.trasf)];
    if (qg && qg.tot && fm.quote.t && Date.parse(fm.quote.t) > Date.parse(x.iso) && Date.now() - Date.parse(fm.quote.t) < 50 * 60000) {
      const sdT = Math.max(STD.Totale * Math.sqrt(Math.max(0, 1 - f)), 1.5);
      mercato = { linea: qg.tot.linea, pMk: qg.tot.pOver, pNostra: 1 - phi((qg.tot.linea - (x.ptCasa + x.ptTr + x.r.totale * (1 - f))) / sdT), minuti: Math.round((Date.now() - Date.parse(fm.quote.t)) / 60000), n: qg.tot.n };
    }
    const pwLive = phi((x.ptCasa - x.ptTr + x.r.margine * (1 - f)) / Math.max(STD.Spread * Math.sqrt(1 - f), 0.6));
    return { id: x.id, casa: x.casa, trasf: x.trasf, ptCasa: x.ptCasa, ptTr: x.ptTr, qCasa: x.qCasa, qTr: x.qTr, periodo: x.periodo, orologio: x.orologio, dettaglio: x.dettaglio, f, proiTot, pwLive,
      r: x.r, mercato, giocatori: gioc, picks: mie, segnali: segnaliLive(ga, box, x.giocatori).slice(0, 8) };
  }));
  const sq = {}; out.forEach((x) => { sq[x.casa] = info(x.casa); sq[x.trasf] = info(x.trasf); });
  return { aggiornato: new Date().toISOString(), squadre: sq, partite: out, totali: g.partite.length, finite: g.partite.filter((x) => x.stato === "post").length, prossime: g.partite.filter((x) => x.stato === "pre").map((x) => ({ id: x.id, casa: x.casa, trasf: x.trasf, ora: x.ora })) };
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), p = url.pathname;
    if (!p.startsWith("/api/")) return env.ASSETS.fetch(req);
    try {
      const off = Math.max(-2, Math.min(3, parseInt(url.searchParams.get("g") || "0") || 0));
      if (p === "/api/live") { const d = await apiLive(env); for (const q of d.prossime) { d.squadre[q.casa] = info(q.casa); d.squadre[q.trasf] = info(q.trasf); } return J(d, 3); }
      const dp = url.searchParams.get("d"), data = dp && /^\d{8}$/.test(dp) ? dp : null;
      if (p === "/api/diag") return J(await apiDiag(env));
      if (p === "/api/giorno") return J(await apiGiorno(env, ctx, off, data), 45);
      if (p === "/api/cronaca") { const id = url.searchParams.get("id") || ""; if (!/^\d+$/.test(id)) return ERR("partita non valida", 400); return J({ azioni: await caricaCronaca(id, 5) }, 4); }
      if (p === "/api/tabellino") {
        const id = url.searchParams.get("id") || ""; if (!/^\d+$/.test(id)) return ERR("partita non valida", 400);
        const [box, es] = await Promise.all([caricaBoxscore(id, 600), caricaEsitoPartita(id, 600).catch(() => ({}))]);
        const gioc = Object.values(box).filter((b) => b.tit || (b.min != null && b.min > 0)).sort((a, b) => (b.tit - a.tit) || (b.pts || 0) - (a.pts || 0))
          .map((b) => ({ nome: b.nome, sq: b.sq, pts: b.pts, reb: b.reb, ast: b.ast, min: b.min, tit: !!b.tit, stl: b.stl, blk: b.blk, to: b.to, pf: b.pf, pm: b.pm, tre: b.tre, fg: b.fg, pid: b.pid }));
        return J({ giocatori: gioc, casa: es.casa || null, trasf: es.trasf || null, ptCasa: es.ptCasa ?? null, ptTr: es.ptTr ?? null }, 120);
      }
      if (p === "/api/esiti") return J(await apiEsiti(off, data), 120);
      if (p === "/api/storico") return J(await apiStorico(env));
      if (p === "/api/aggiorna-quote") return J(await cronQuote(env, true));
      if (p === "/api/aggiorna-forma") { try { await aggiornaForma(env); const f = await leggiForma(env); return J({ ok: true, giocatori_con_forma: f.n, stato: f.stato || null }); } catch (e) { return J({ errore: e.message }); } }
      if (p === "/api/avviso-prova") { if (!env.TELEGRAM_TOKEN || url.searchParams.get("k") !== String(env.TELEGRAM_CHAT_ID)) return ERR("non autorizzato", 403); await telegram(env, "✅ NBA Schedine è collegata a Telegram: da ora ricevi qui il riepilogo prima delle partite e i risultati a fine giornata."); return J({ ok: true }); }
      if (p === "/api/valuta-giocate" && req.method === "POST") { const b = await req.json(); return J({ esiti: await valutaGiocate(b.legs) }); }
      if (p === "/api/push-chiave") { if (!dbOk(env)) return ERR("serve Supabase", 503); return J({ chiave: (await chiaviVapid(env)).pub }); }
      if (p === "/api/push-iscrivi" && req.method === "POST") { if (!dbOk(env)) return ERR("serve Supabase", 503); await iscriviPush(env, await req.json()); return J({ ok: true }); }
      if (p === "/api/push-prova" && req.method === "POST") { const r = await pushATutti(env, "✅ Notifiche attive", "NBA Schedine ti avviserà con il riepilogo ogni mattina e i risultati a fine giornata."); return J(r); }
      if (p === "/api/ultimo-avviso") return J(await ritiraAvviso(env, url.searchParams.get("id") || ""), 0);
      if (p === "/api/copie") { // elenco delle copie di sicurezza del registro di questo codice
        const cod = url.searchParams.get("codice") || ""; if (!codiceOk(cod) || !dbOk(env)) return ERR("codice non valido", 400);
        const S = await rigaForma(env, "_reg_" + cod); return J({ copie: ((S && S.bk) || []).map((b, i) => ({ i, t: b.t, n: b.registro.length })) }, 0);
      }
      if (p === "/api/copia") {
        const cod = url.searchParams.get("codice") || "", i = +url.searchParams.get("i"); if (!codiceOk(cod) || !dbOk(env)) return ERR("codice non valido", 400);
        const S = await rigaForma(env, "_reg_" + cod), b = S && S.bk && S.bk[i]; if (!b) return ERR("copia non trovata", 404); return J({ t: b.t, registro: b.registro }, 0);
      }
      if (p === "/api/condividi" && req.method === "POST") {
        if (!dbOk(env)) return ERR("serve Supabase", 503);
        const b = await req.json(), cut = (x, n) => String(x ?? "").slice(0, n), legs = (Array.isArray(b.legs) ? b.legs : []).slice(0, 12).map((l) => ({ testo: cut(l.testo, 120), partita: cut(l.partita, 60), g: cut(l.g, 20), k: cut(l.k, 8), pid: cut(l.pid, 20), sq: cut(l.sq, 4), dir: l.dir === "under" ? "under" : "over", soglia: +l.soglia || 0 }));
        if (!legs.length) return ERR("schedina vuota", 400);
        const id = Array.from(crypto.getRandomValues(new Uint8Array(6)), (x) => "abcdefghjkmnpqrstuvwxyz23456789"[x % 31]).join("");
        await salvaRigaForma(env, "_sh_" + id, { nome: cut(b.nome, 60) || "Schedina", data: cut(b.data, 10), quota: +b.quota || 0, puntata: +b.puntata || 0, prob: +b.prob || 0, legs, creata: new Date().toISOString() });
        return J({ id }, 0);
      }
      if (p === "/api/condiviso") {
        const id = (url.searchParams.get("id") || "").replace(/[^a-z0-9]/g, "").slice(0, 12); if (!id || !dbOk(env)) return ERR("non trovata", 404);
        const S = await rigaForma(env, "_sh_" + id); if (!S) return ERR("schedina non trovata", 404);
        try { const ok = (l) => /^\d+$/.test(String(l.g)) && ["pts", "reb", "ast", "tot", "sq", "win"].includes(l.k), es = await valutaGiocate(S.legs.filter(ok), {}); let i = 0; S.legs = S.legs.map((l) => (ok(l) ? { ...l, esito: es[i].esito, cur: es[i++].cur } : l)); } catch {}
        return J(S, 60);
      }
      if (p === "/api/gruppo") { // classifica privata e sfide tra amici: riga _gr_<codice gruppo>, membri riconosciuti da un id corto (mai il codice di sincronizzazione)
        if (!dbOk(env)) return ERR("serve Supabase", 503);
        const gr = (url.searchParams.get("gr") || "").toLowerCase(); let b = null;
        if (req.method === "POST") { b = await req.json(); }
        const g = String((b && b.gr) || gr).toLowerCase(); if (!/^[a-z0-9]{4,16}$/.test(g)) return ERR("codice gruppo non valido", 400);
        const cut = (x, n) => String(x ?? "").slice(0, n), S = (await rigaForma(env, "_gr_" + g)) || { m: {}, p: {}, r: {} };
        if (b && /^[a-f0-9]{8}$/.test(String(b.id))) {
          if (!S.m[b.id] && Object.keys(S.m).length >= 12) return ERR("gruppo pieno (massimo 12)", 400);
          const st = b.stats || {}; S.m[b.id] = { n: cut(b.nome, 20) || "Giocatore", saldo: Math.round((+st.saldo || 0) * 100) / 100, perc: Math.round(+st.perc || 0), n_: Math.round(+st.n || 0), serie: Math.round(+st.serie || 0), t: new Date().toISOString() };
          if (b.pron && /^\d+$/.test(String(b.pron.g)) && /^[A-Za-z]{2,4}$/.test(String(b.pron.s))) { const pr = (S.p[b.pron.g] ||= { y: cut(b.pron.y, 8), s: {} }); pr.s[b.id] = String(b.pron.s).toUpperCase(); const k = Object.keys(S.p); if (k.length > 40) delete S.p[k[0]]; }
          if (b.ris && /^\d+$/.test(String(b.ris.g)) && S.p[b.ris.g] && /^[A-Za-z]{2,4}$/.test(String(b.ris.v))) S.r[b.ris.g] = String(b.ris.v).toUpperCase();
          await salvaRigaForma(env, "_gr_" + g, S);
        } else if (b) return ERR("id non valido", 400);
        return J(S, 0);
      }
      if (p === "/api/sync" && req.method === "POST") { if (!dbOk(env)) return ERR("serve Supabase", 503); return J(await sincronizza(env, await req.json()), 0); }
      if (p === "/api/push-pref" && req.method === "POST") { if (!dbOk(env)) return ERR("serve Supabase", 503); return J({ ok: await salvaPrefPush(env, await req.json()) }); }
      if (p === "/api/infortunati") {
        const [l, st] = await Promise.all([caricaListaInfortuni(), caricaStatistiche().catch(() => ({ players: [] }))]), idDaNome = new Map(st.players.map((q) => [q.nome.trim().toLowerCase(), q.pid]));
        for (const x of l) if (!x.pid) x.pid = idDaNome.get(x.nome.trim().toLowerCase()) || null;
        const perNome = Object.fromEntries(Object.entries(SQUADRE).map(([ab, v]) => [v[0].toLowerCase(), ab])), sq = {};
        for (const x of l) { if (!x.sq) x.sq = perNome[x.nomeSq.toLowerCase()] || null; if (x.sq) sq[x.sq] = info(x.sq); }
        const ord = { out: 0, dubbio: 1, giorno: 2 };
        return J({ giocatori: l.filter((x) => x.sq).sort((a, b) => ord[a.stato] - ord[b.stato] || a.sq.localeCompare(b.sq) || a.nome.localeCompare(b.nome)), squadre: sq }, 600);
      }
      if (p === "/api/news") {
        const sg = (url.searchParams.get("s") || "").toUpperCase(); if (sg && !/^[A-Z]{2,4}$/.test(sg)) return ERR("sigla non valida", 400);
        const n = await traduciTitoli(env, await caricaNews(sg || null)); return J({ s: sg || null, news: n }, 600);
      }
      if (p === "/api/leader") { // giocatori con la produzione più alta (indice = punti + 0.7 rimbalzi + 0.9 assist a partita)
        const st = await caricaStatistiche(), l = st.players.filter((x) => x.min >= 25).map((x) => ({ nome: x.nome, pid: x.pid, sq: x.sq, pts: x.pts, reb: x.reb, ast: x.ast, ind: Math.round((x.pts + 0.7 * x.reb + 0.9 * x.ast) * 10) / 10 })).sort((a, b) => b.ind - a.ind).slice(0, 15), sq = {};
        for (const x of l) sq[x.sq] = info(x.sq); return J({ giocatori: l, squadre: sq }, 1800);
      }
      if (p === "/api/classifica") { const c = await caricaClassifica(), sq = {}; for (const k of ["Est", "Ovest"]) for (const x of c[k]) sq[x.ab] = info(x.ab); return J({ ...c, squadre: sq }, 900); }
      if (p === "/api/calendario") { const da = dp && /^\d{8}$/.test(dp) ? dp : romaYMD(Date.now()), giorni = await caricaCalendario(da), sq = {}; for (const g of giorni) for (const x of g.partite) { sq[x.casa] = info(x.casa); sq[x.trasf] = info(x.trasf); } return J({ da, giorni, squadre: sq }, 600); }
      if (p === "/api/squadra") {
        const s = (url.searchParams.get("s") || "").toUpperCase(); if (!/^[A-Z]{2,4}$/.test(s)) return ERR("sigla non valida", 400);
        const [cal, cla, stat, inf] = await Promise.all([caricaCalendarioSquadra(s), caricaClassifica().catch(() => null), caricaStatistiche().catch(() => ({ players: [], teams: {} })), caricaInfortuni().catch(() => ({}))]);
        let conf = null, riga = null, pos = null; if (cla) for (const k of ["Est", "Ovest"]) { const i = cla[k].findIndex((x) => x.ab === s); if (i >= 0) { conf = k; riga = cla[k][i]; pos = i + 1; } }
        const gioc = stat.players.filter((x) => x.sq === s).sort((a, b) => b.pts - a.pts).slice(0, 9).map((x) => ({ ...x, inf: inf[x.nome.trim().toLowerCase()] ? { stato: inf[x.nome.trim().toLowerCase()].stato, e: inf[x.nome.trim().toLowerCase()].etichetta } : null }));
        const sq = { [s]: info(s) }; for (const x of [...cal.fatte, ...cal.prossime]) sq[x.avv] = info(x.avv);
        return J({ s, conf, pos, riga, ...cal, giocatori: gioc, squadre: sq }, 600);
      }
      if (p === "/api/giocatore") {
        const pid = url.searchParams.get("pid") || ""; if (!/^\d+$/.test(pid)) return ERR("giocatore non valido", 400);
        const [st, gl, inf] = await Promise.all([caricaStatistiche(), caricaGamelog(pid, 10).catch(() => null), caricaInfortuni().catch(() => ({}))]);
        let x = st.players.find((q) => q.pid === pid), senza = false;
        if (!x) { // fuori dall'elenco (panchinari): nome e squadra dalla scheda ESPN, medie dalle ultime partite
          const at = await caricaAtleta(pid).catch(() => null); if (!at) return ERR("giocatore non trovato", 404);
          const m = (v) => (v && v.length ? v.reduce((p, q) => p + q, 0) / v.length : 0);
          x = { pid, nome: at.nome, sq: at.sq || "", min: gl ? m(gl.min) : 0, pts: gl ? m(gl.pts) : 0, reb: gl ? m(gl.reb) : 0, ast: gl ? m(gl.ast) : 0 }; senza = true;
        }
        const i = inf[x.nome.trim().toLowerCase()];
        return J({ pid, nome: x.nome, sq: x.sq, min: x.min, pts: x.pts, reb: x.reb, ast: x.ast, ult: gl ? { pts: [...gl.pts].reverse(), reb: [...gl.reb].reverse(), ast: [...gl.ast].reverse(), min: [...gl.min].reverse() } : null, inf: i ? { stato: i.stato, e: i.etichetta, d: i.dettaglio } : null, par: gl && gl.par ? gl.par.map((q) => ({ ...q, ai: q.a ? info(q.a) : null })) : [], senzaStat: senza, squadre: { [x.sq]: info(x.sq) } }, 600);
      }
      if (p === "/api/cerca") { const q = (url.searchParams.get("q") || "").trim().toLowerCase(); if (q.length < 2) return J({ giocatori: [] }, 60); const st = await caricaStatistiche(); return J({ giocatori: st.players.filter((x) => x.nome.toLowerCase().includes(q)).sort((a, b) => b.pts - a.pts).slice(0, 15).map((x) => ({ pid: x.pid, nome: x.nome, sq: x.sq, pts: x.pts, reb: x.reb, ast: x.ast })) }, 600); }
      if (p === "/api/quintetti") { const id = url.searchParams.get("id") || ""; if (!/^\d+$/.test(id)) return ERR("partita non valida", 400); const Q = await caricaQuintetti(id, 60).catch(() => null); return J({ id, pubblicato: !!(Q && Q.pubblicato), titolari: Q ? Q.titolari : {} }, 60); }
      if (p === "/api/h2h") { const x = (url.searchParams.get("a") || "").toUpperCase(), y = (url.searchParams.get("b") || "").toUpperCase(); if (!/^[A-Z]{2,4}$/.test(x) || !/^[A-Z]{2,4}$/.test(y)) return ERR("sigla non valida", 400); return J({ a: x, b: y, partite: await testaATesta(x, y) }, 1800); }
      if (p === "/api/ultime") { const s = (url.searchParams.get("s") || "").toUpperCase(); if (!/^[A-Z]{2,4}$/.test(s)) return ERR("sigla non valida", 400); return J({ s, ultime: await caricaUltime(s) }, 600); }
      return ERR("non trovato", 404);
    } catch (e) { return ERR(String(e.message || e)); }
  },
  // ogni 30 minuti: salva i consigli delle partite che non sono iniziate e verifica quelle finite
  async scheduled(event, env, ctx) {
    if (event.cron === "*/5 * * * *") { ctx.waitUntil(cronAvvisi(env).then((r) => segnaCron(env, "avvisi", r), (e) => segnaCron(env, "avvisi", { errore: String(e.message || e) })).catch(() => {})); return; }
    if (event.cron === "20,50 * * * *") { ctx.waitUntil(cronQuote(env).catch(() => {})); ctx.waitUntil(aggiornaSquadre(env).catch(() => {})); return; }
    if (event.cron === "*/10 * * * *") { ctx.waitUntil(aggiornaForma(env).catch(() => {})); return; }
    ctx.waitUntil((async () => {
      try { await apiGiorno(env, ctx, 0); } catch {}
      try { await apiGiorno(env, ctx, 1); } catch {}
      try { const S = await apiStorico(env); if (S.attivo) await salvaCalib(env, S.righe); } catch {}
    })());
  },
};
