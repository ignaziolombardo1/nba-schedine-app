// NBA Schedine - partite.js (parte dell'app: i file si caricano in ordine da index.html, vedi CLAUDE.md)
"use strict";
// ---------- PARTITE
function avvisiDati(D, daCache) {
  let h = "";
  const eta = D.aggiornato ? Math.round((Date.now() - Date.parse(D.aggiornato)) / 60000) : null;
  if (daCache) h += `<div class="avv"><i class="ti ti-refresh"></i> Dati salvati sul telefono${eta != null ? " (di " + (eta < 60 ? eta + " minuti" : Math.round(eta / 60) + " ore") + " fa)" : ""}: aggiorno…</div>`;
  else if (eta != null && eta > 60 && giorno === 0) h += `<div class="avv warn"><i class="ti ti-clock-exclamation"></i> Dati di ${Math.round(eta / 60)} ${Math.round(eta / 60) === 1 ? "ora" : "ore"} fa: non riesco ad aggiornarli. <a href="#/diag" style="text-decoration:underline">Dettagli</a></div>`;
  for (const x of D.salute || []) h += `<div class="avv ${x.liv === "err" ? "err" : "warn"}"><i class="ti ti-alert-triangle"></i> ${esc(x.t)} <a href="#/diag" style="text-decoration:underline">Dettagli</a></div>`;
  return h;
}
// la giocata più probabile tra quelle delle partite ancora da giocare (o la migliore in assoluto)
// riepilogo in cima alla Home: schedine aperte e quando parte la prima
function riepilogoAperte(D) {
  const aperte = ls.get("registro", []).filter((r) => r.esito == null); if (!aperte.length) return "";
  const ids = new Set(); for (const r of aperte) for (const l of r.legs || []) ids.add(String(l.g));
  const pre = D.partite.filter((p) => ids.has(String(p.id)) && p.stato === "pre").sort((a, b) => (a.iso < b.iso ? -1 : 1)), live = D.partite.filter((p) => ids.has(String(p.id)) && p.stato === "in").length;
  const t = live ? `${live} ${live === 1 ? "partita è" : "partite sono"} in corso` : pre.length ? `la prima parte alle ${String(pre[0].ora).slice(-5)}` : "controlla l'esito nel registro";
  return `<a class="card riga" href="#/registro" style="padding:10px 14px;color:inherit;margin-bottom:10px;border-color:rgba(255,138,42,.4)"><div class="lg"><i class="ti ti-ticket" style="font-size:22px;color:var(--or)"></i><div><b>${aperte.length} ${aperte.length === 1 ? "schedina aperta" : "schedine aperte"}</b><div class="s">${t}</div></div></div><i class="ti ti-chevron-right" style="color:var(--mut)"></i></a>`;
}
function giocataDelGiorno(D) {
  const n = D.partite.length; if (!n) return "";
  const live = D.partite.filter((p) => p.stato === "in").length, fin = D.partite.filter((p) => p.stato === "post").length, pre = n - live - fin;
  const cand = D.picks.filter((x) => D.partite.find((p) => p.id === x.g && p.stato === "pre")), top = [...(cand.length ? cand : [])].sort((a, b) => b.prob - a.prob)[0];
  const riep = `<div class="riep">${n} ${n === 1 ? "partita" : "partite"}${live ? ` · <span style="color:${OR}">${live} in corso</span>` : ""}${pre ? ` · ${pre} da giocare` : ""}${fin ? ` · ${fin} finite` : ""}</div>`;
  if (!top) return riep;
  return riep + `<a class="gdg" href="#/partita/${top.g}"><div class="gt">Giocata del giorno</div><div class="gx">${esc(top.testo)}</div><div class="gp"><b>${Math.round(top.prob * 100)}%</b><span class="s">${esc(top.partita)}</span></div><div class="gb"><i style="width:${Math.round(top.prob * 100)}%"></i></div></a>`;
}
function hero(D) {
  const n = D.partite.length; if (!n) return "";
  const live = D.partite.filter((p) => p.stato === "in").length, fin = D.partite.filter((p) => p.stato === "post").length, pre = n - live - fin;
  const top = D.picks.find((x) => D.partite.find((p) => p.id === x.g && p.stato === "pre")) || D.picks[0];
  return `<div class="hero"><div class="hn">${n}</div><div style="min-width:0"><div class="ht">${n === 1 ? "partita" : "partite"} in programma</div><div class="s">${live ? `<span class="dot"></span>${live} in corso · ` : ""}${pre} da giocare · ${fin} finite</div></div></div>`;
}
// punteggi che si aggiornano da soli (ogni 10 secondi) quando ci sono partite in corso o vicine all'inizio
function seguiPunteggi(D) {
  const ora = Date.now(), vicine = D.partite.some((p) => p.stato === "pre" && p.iso && Date.parse(p.iso) - ora < 15 * 60000);
  if (!D.partite.some((p) => p.stato === "in") && !vicine) return;
  for (const p of D.partite) if (p.stato === "in") ultimiPt[p.id] = [p.ptTr, p.ptCasa];
  const giro = async () => {
    if (location.hash !== "" && location.hash !== "#/") return;
    try {
      const L = await (await fetch("/api/live")).json(); if (L.errore) throw 0;
      const vive = new Set(L.partite.map((x) => x.id)); let cambio = false;
      for (const x of L.partite) {
        const c = APP.querySelector(`[data-gid="${x.id}"]`); if (!c) continue;
        if (c.dataset.st !== "in") { cambio = true; continue; }
        const t = c.querySelector('[data-sc="t"]'), k = c.querySelector('[data-sc="c"]'), pl = c.querySelector("[data-pill]");
        if (t && String(t.textContent) !== String(x.ptTr)) { t.textContent = x.ptTr; t.classList.remove("flash"); void t.offsetWidth; t.classList.add("flash"); }
        if (k && String(k.textContent) !== String(x.ptCasa)) { k.textContent = x.ptCasa; k.classList.remove("flash"); void k.offsetWidth; k.classList.add("flash"); }
        if (pl) pl.innerHTML = `<span class="dot"></span>Live · ${esc(x.dettaglio)}`;
        illumina(c, x.id, x.ptTr, x.ptCasa);
        const qe = c.querySelector("[data-qt]"); if (qe) qe.innerHTML = qe.classList.contains("qr") ? (x.qTr || []).map((v, i) => `<span class="${x.periodo === i + 1 ? "cur" : ""}">Q${i + 1} ${(x.qCasa || [])[i] ?? 0}-${v}</span>`).join("") : tabQuarti(x, D);
      }
      for (const p of D.partite) if (p.stato === "in" && !vive.has(p.id)) cambio = true;
      if (cambio) return route(true);
    } catch {}
    timer = setTimeout(giro, 10000);
  };
  timer = setTimeout(giro, 10000);
}
async function vistaPartite(force) {
  // mostra subito l'ultimo giorno salvato sul telefono, poi lo aggiorna
  const haGia = force && ultimoD && APP.querySelector("[data-gid]"), salvato = haGia ? null : cacheLocale("/api/giorno?" + qs());
  if (salvato) disegnaPartite(applicaImp(salvato), false, true); else if (!haGia) { APP.innerHTML = topBar() + giorniChips() + skel(); bindGiorni(); }
  let D; try { D = await dati(force); } catch (e) { if (!salvato) { APP.innerHTML = topBar() + giorniChips() + errBox(e); bindGiorni(); } return; }
  if (!location.hash.replace(/^#/, "").replace(/^\//, "")) { const y = window.scrollY; disegnaPartite(D, true); if (salvato) window.scrollTo(0, y); }
}

// accesso rapido ai consigli divisi per tipo, con il numero di giocate
function riquadriConsigli(D) {
  const P = applicaImp(D).picks || []; if (!P.length) return "";
  return `<div class="sub" style="margin-top:6px">Scegli un tipo di giocata</div><div class="grid2">` + SC.map(([t, ic, tipi], i) => {
    const l = P.filter((x) => tipi.includes(x.tipo)); if (!l.length) return "";
    return `<a class="card" href="#/categoria/${i}" style="padding:12px;display:block"><div class="s"><i class="ti ${ic}" style="color:var(--or)"></i> ${esc(t)}</div><div style="font-size:22px;font-weight:700;margin-top:2px">${l.length}</div><div class="s">migliore ${pct(l[0].prob)}</div></a>`;
  }).join("") + `</div>`;
}
// ---------- PREFERITI (squadre e giocatori seguiti, salvati sul telefono)
const pref = () => { const v = ls.get("pref", null); return v && v.sq && v.pl ? { sq: v.sq, pl: v.pl, gm: v.gm || [] } : { sq: [], pl: [], gm: [] }; };
const siSegue = (t, id) => pref()[t].some((x) => (t === "sq" || t === "gm" ? x : x.pid) === id);
// campanella: avviso di inizio e fine per questa partita
const campana = (id) => { const on = siSegue("gm", String(id)); return `<button class="star bell${on ? " on" : ""}" data-fav="gm|${esc(id)}||" aria-label="${on ? "Non avvisarmi" : "Avvisami per questa partita"}">${on ? "🔔" : "🔕"}</button>`; };
const stella = (t, id, nome = "", sq = "") => { const on = siSegue(t, id); return `<button class="star${on ? " on" : ""}" data-fav="${t}|${esc(id)}|${esc(nome)}|${esc(sq)}" aria-label="${on ? "Non seguire più" : "Segui"}">${on ? "★" : "☆"}</button>`; };
const partitaPreferita = (p) => { const P = pref(); return P.sq.includes(p.casa) || P.sq.includes(p.trasf) || P.pl.some((x) => x.sq === p.casa || x.sq === p.trasf); };
function riquadroPreferiti(D) {
  const P = pref(); if (!P.sq.length && !P.pl.length) { const nv = ls.get("hintStella", 0); if (nv >= 4) return ""; ls.set("hintStella", nv + 1); } if (!P.sq.length && !P.pl.length) return `<div class="cap" style="margin-top:0">Tocca la ☆ accanto a una squadra o a un giocatore per seguirlo: le sue partite salgono in alto.</div>`;
  const righe = [];
  for (const ab of P.sq) { const g = D.partite.find((p) => p.casa === ab || p.trasf === ab); righe.push(`<a class="riga rg" ${g ? `href="#/partita/${g.id}"` : ""} style="color:inherit"><div class="lg">${logo(ab, 24)}<b>${esc(T(D, ab).n)}</b></div><span class="s">${g ? (g.stato === "pre" ? esc(String(g.ora).slice(-5)) : g.stato === "in" ? esc(g.dettaglio) + " · " + g.ptTr + "-" + g.ptCasa : "Finale " + g.ptTr + "-" + g.ptCasa) : "non gioca"}</span></a>`); }
  for (const f of P.pl) { let x = null, g = null; for (const q of D.partite) { const t = q.giocatori.find((y) => String(y.pid) === String(f.pid)); if (t) { x = t; g = q; break; } }
    righe.push(`<a class="riga rg" ${x ? `href="#/giocatore/${esc(f.pid)}"` : ""} style="color:inherit"><div class="lg">${foto(f.pid, 24)}<b>${esc(f.nome)}</b></div><span class="s">${x ? `stima ${x.pts.v.toFixed(0)} pt · ${x.reb.v.toFixed(0)} rb · ${x.ast.v.toFixed(0)} as` : "non gioca"}</span></a>`); }
  return `<div class="card"><div class="s" style="margin-bottom:4px">I tuoi preferiti oggi</div>${righe.join("")}</div>`;
}
// manda al server i preferiti di questo telefono (solo se le notifiche sono attive) per avvisare di ciò che segui
// se il telefono non è ancora collegato alle notifiche, lo dice (una volta per apertura)
async function avvisoNotifiche() {
  try {
    const reg = "serviceWorker" in navigator && "PushManager" in window ? await navigator.serviceWorker.ready : null, sb = reg ? await reg.pushManager.getSubscription() : null;
    if (sb) return;
    if (document.getElementById("avnot")) return;
    const d = document.createElement("div"); d.id = "avnot"; d.className = "toastn";
    d.innerHTML = `Per ricevere l'avviso attiva le notifiche: <a href="#/impostazioni" style="color:var(--or)">Impostazioni</a>`; document.body.appendChild(d); setTimeout(() => d.remove(), 6000);
  } catch {}
}

// ---------- sincronizzazione di registro e conto sul server (codice per telefono, condivisibile tra più telefoni)
function codiceSync() { let c = ls.get("codice", ""); if (!/^[a-z0-9]{8,16}$/.test(c)) { const a = crypto.getRandomValues(new Uint8Array(10)); c = [...a].map((x) => "abcdefghijkmnpqrstuvwxyz23456789"[x % 32]).join(""); ls.set("codice", c); } return c; }
let sincInCorso = false;
async function sincReg() {
  if (sincInCorso) return; sincInCorso = true;
  try {
    const inv = { registro: localStorage.getItem("registro") || "[]", mov: localStorage.getItem("mov") || "[]", del: localStorage.getItem("delIds") || "[]" };
    const r = await fetch("/api/sync", { method: "POST", body: JSON.stringify({ codice: codiceSync(), registro: JSON.parse(inv.registro), mov: JSON.parse(inv.mov), del: JSON.parse(inv.del) }) }); if (!r.ok) return;
    const d = await r.json();
    if ((localStorage.getItem("registro") || "[]") !== inv.registro || (localStorage.getItem("mov") || "[]") !== inv.mov) return; // nel frattempo è cambiato qualcosa: si riprova al prossimo giro
    const nuovo = JSON.stringify(d.registro), cambiato = nuovo !== inv.registro || JSON.stringify(d.mov) !== inv.mov;
    localStorage.setItem("registro", nuovo); localStorage.setItem("mov", JSON.stringify(d.mov)); localStorage.setItem("delIds", JSON.stringify(d.del || [])); aggiornaBadge();
    if (cambiato && /^#\/(registro|conto|live)/.test(location.hash)) route(true);
  } catch {} finally { sincInCorso = false; }
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) sincReg(); });
async function sincPref() {
  try { if (!("serviceWorker" in navigator) || !("PushManager" in window)) return; const reg = await navigator.serviceWorker.ready, sb = await reg.pushManager.getSubscription(); if (!sb) return;
    await fetch("/api/push-pref", { method: "POST", body: JSON.stringify({ endpoint: sb.endpoint, pref: pref(), codice: codiceSync() }) }); } catch {}
}
let firmaHome = "", ultimoD = null;
const firmaDati = (D) => (D.erroreAgg ? "E" : "") + D.partite.map((p) => p.id + p.stato + p.ptTr + p.ptCasa).join(",");
function disegnaPartite(D, conPoll, daCache) {
  firmaHome = firmaDati(D); ultimoD = D;
  const top = (id) => D.picks.find((x) => x.g === id);
  let h = topBar(D) + rigaEsplora() + giorniChips();
  if (!D.partite.length) h += `<div class="vuoto">Nessuna partita trovata per questo giorno. Prova un altro giorno.</div>`;
  h += avvisiDati(D, daCache);
  h += bannerErrore(D) + avvisoBudget() + riepilogoAperte(D) + giocataDelGiorno(D);
  { const m = confrontoMercato(D); if (m) h += `<details class="dt"><summary>Confronto con i bookmaker</summary>${m}</details>`; }
  if (D.partite.length) h += riquadroPreferiti(D);
  h += `<div id="hnews"></div>`;
  for (const [t, st] of [["In corso", "in"], ["Da giocare", "pre"], ["Finite", "post"]]) {
    const l = D.partite.filter((p) => p.stato === st).sort((a, b) => partitaPreferita(b) - partitaPreferita(a)); if (!l.length) continue;
    h += `<h2 class="sez${st === "in" ? " live" : ""}">${st === "in" ? '<span class="dot"></span>' : ""}${t}<span class="n">${l.length}</span></h2>` + l.map((p) => schedaPartita(D, p, top(p.id), true)).join("");
  }
  if (D.ieri.length) {
    h += `<details class="dt"><summary>Risultati di ieri (${D.ieri.length})</summary>` + D.ieri.map((p) => `<div class="card"><div class="riga"><div class="lg">${logo(p.trasf, 28)}<b>${esc(p.trasf)}</b></div><b style="font-size:18px">${p.ptTr} - ${p.ptCasa}</b><div class="lg"><b>${esc(p.casa)}</b>${logo(p.casa, 28)}</div></div></div>`).join("") + `</details>`;
  }
  h += `<button class="btn" id="agg"><i class="ti ti-refresh"></i> Aggiorna ora</button>`;
  APP.innerHTML = h; bindGiorni(); $("#agg").onclick = () => route(true); notizieHome(); coloraGiocatoriHome(D);
  if (conPoll) seguiPunteggi(D);
  if (D.erroreAgg) { clearTimeout(timer); timer = setTimeout(() => { if ((location.hash.replace(/^#/, "") || "/") === "/") route(true); }, 25000); }
}


