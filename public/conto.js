// NBA Schedine - conto.js (parte dell'app: i file si caricano in ordine da index.html, vedi CLAUDE.md)
"use strict";
// ---------- CALCOLATORE (valore, Kelly, multipla)
function vistaCalcolatore() {
  const back = `<a class="back" href="#/storico"><i class="ti ti-chevron-left"></i>Storico</a>`;
  const S = ls.get("calc", { legs: [{ p: "", q: "" }] });
  APP.innerHTML = back + `<h2>Calcolatore</h2><div class="cap" style="margin-top:0">Inserisci per ogni selezione la probabilità che stimi (o quella dell'app) e la quota offerta dal bookmaker. Vedi subito se c'è valore e quanto puntare.</div><div id="legs"></div><button class="btn" id="add" style="margin:6px 0">Aggiungi selezione</button><div id="ris"></div>`;
  const calcola = () => {
    ls.set("calc", S);
    const L = S.legs.map((l) => ({ p: parseFloat(String(l.p).replace(",", ".")) / 100, q: parseFloat(String(l.q).replace(",", ".")) })).filter((l) => l.p > 0 && l.p < 1 && l.q > 1);
    let h = "";
    if (!L.length) { $("#ris").innerHTML = ""; return; }
    L.forEach((l, i) => { if (S.legs.length > 1) h += `<div class="s">Selezione ${i + 1}</div>`; h += rigaValore(valoreGiocata(l.p, l.q)); });
    if (L.length > 1) {
      const p = L.reduce((a, l) => a * l.p, 1), q = L.reduce((a, l) => a * l.q, 1), v = valoreGiocata(p, q);
      h += `<div class="card"><div class="s">Multipla di ${L.length} selezioni</div><div class="row3"><div class="tile"><b>${q.toFixed(2)}</b><span>quota totale</span></div><div class="tile"><b>${(p * 100).toFixed(0)}%</b><span>probabilità</span></div><div class="tile"><b>${(1 / p).toFixed(2)}</b><span>quota giusta</span></div></div>${rigaValore(v)}<div class="cap" style="margin:0">Le selezioni sono considerate indipendenti: se sono della stessa partita (es. squadra e totale) la probabilità reale è diversa.</div></div>`;
    }
    $("#ris").innerHTML = h;
  };
  const disegna = () => {
    $("#legs").innerHTML = S.legs.map((l, i) => `<div class="grid2" style="align-items:center"><input class="linea" inputmode="decimal" placeholder="Probabilità % (es. 72)" data-p="${i}" value="${esc(l.p)}"><input class="linea" inputmode="decimal" placeholder="Quota (es. 1.85)" data-q="${i}" value="${esc(l.q)}"></div>`).join("");
    $("#legs").querySelectorAll("input").forEach((el) => el.oninput = () => { const i = +(el.dataset.p ?? el.dataset.q); S.legs[i][el.dataset.p != null ? "p" : "q"] = el.value; calcola(); });
  };
  $("#add").onclick = () => { S.legs.push({ p: "", q: "" }); disegna(); };
  disegna(); calcola();
}

// ---------- IMPOSTAZIONI (salvate sul telefono)
function vistaImpostazioni() {
  const i = impo();
  const back = `<a class="back" href="#/storico"><i class="ti ti-chevron-left"></i>Storico</a>`;
  let h = back + `<h2>Impostazioni</h2><div class="cap" style="margin-top:0">Valgono solo su questo telefono. Cambiano le giocate che vedi nelle pagine Partite, Studio e Combo; le proposte di schedina usano soglie proprie.</div>`;
  h += `<div class="card"><div class="sub" style="margin-top:0">Probabilità minima delle giocate</div><div class="tabs">${[0.70, 0.75, 0.80, 0.85].map((v) => `<button class="chipbtn${i.soglia === v ? " on" : ""}" data-sg="${v}">${Math.round(v * 100)}%</button>`).join("")}</div></div>`;
  h += `<div class="card"><div class="sub" style="margin-top:0">Quali giocate vedere</div>${Object.keys(IMP0.mercati).map((m) => `<label class="sw"><input type="checkbox" data-mk="${m}" ${i.mercati[m] !== false ? "checked" : ""}> ${esc({ Vincente: "Squadra vincente", Squadra: "Punti di una squadra", Totale: "Totale della partita" }[m] || m)}</label>`).join("")}</div>`;
  const pushOk = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  h += `<div class="card"><div class="sub" style="margin-top:0"><i class="ti ti-bell"></i> Notifiche sul telefono</div>` + (pushOk
    ? `<div class="cap" style="margin:4px 0 8px">Ogni mattina la Giocata del giorno e le schedine quota 2, 5, 10 e 20; a fine giornata i risultati. Per le squadre e i giocatori con la ★ e per le partite con la 🔔 ricevi l'inizio e la fine della partita, con i numeri dei tuoi giocatori.</div><div class="grid2"><button class="btn" id="pushOn" style="margin:0">Attiva</button><button class="btn" id="pushProva" style="margin:0">Invia prova</button></div><div class="cap" id="pushMsg" style="margin-bottom:0">${Notification.permission === "granted" ? "Permesso già concesso: tocca «Attiva» per collegare questo telefono." : Notification.permission === "denied" ? "Le notifiche sono bloccate nelle impostazioni del telefono per questa app." : ""}</div>`
    : `<div class="cap" style="margin:4px 0 0">Per le notifiche su iPhone serve iOS 16.4 o più recente e l'app aperta dalla schermata Home: in Safari tocca Condividi → «Aggiungi alla schermata Home», poi apri l'app da lì e torna qui.</div>`) + `</div>`;
  { const a = ls.get("aspetto", { tema: "scuro", testo: "normale" }), sc = (k, v, n) => `<button class="chipbtn${a[k] === v ? " on" : ""}" data-asp="${k}|${v}">${n}</button>`;
    h += `<div class="card"><div class="sub" style="margin-top:0"><i class="ti ti-palette"></i> Aspetto</div><div class="cap" style="margin:4px 0 6px">Tema</div><div class="tabs" style="margin:0">${sc("tema", "scuro", "Scuro")}${sc("tema", "chiaro", "Chiaro")}${sc("tema", "auto", "Come il telefono")}</div><div class="cap" style="margin:10px 0 6px">Dimensione del testo</div><div class="tabs" style="margin:0">${sc("testo", "normale", "Normale")}${sc("testo", "grande", "Grande")}${sc("testo", "molto", "Molto grande")}</div><div class="cap" style="margin:8px 0 0">Il tema chiaro è una prova: se qualche colore non si legge bene, torna su Scuro.</div></div>`; }
  h += `<div class="card"><div class="sub" style="margin-top:0"><i class="ti ti-refresh"></i> Sincronizzazione</div><div class="cap" style="margin:4px 0 8px">Schedine, registro e conto sono salvati anche sul server: non li perdi se cambi telefono e ricevi gli avvisi «quasi presa», «presa» e «persa». Per usare lo stesso conto su un altro telefono, inserisci lì questo codice.</div><div class="riga"><b style="letter-spacing:2px;font-size:18px">${esc(codiceSync())}</b><button class="btn" id="cpCod" style="margin:0;width:auto;padding:6px 14px">Copia</button></div><input class="linea" id="altroCod" placeholder="Codice di un altro telefono" autocapitalize="none" style="margin-top:10px"><button class="btn" id="colCod" style="margin-top:8px">Collega questo telefono a quel codice</button><div class="cap" id="codMsg" style="margin-bottom:0"></div></div>`;
  h += `<div class="card"><div class="sub" style="margin-top:0"><i class="ti ti-download"></i> Backup</div><div class="cap" style="margin:4px 0 8px">Salva in un file registro, conto, preferiti e impostazioni. Per ripristinarli scegli il file: le schedine già presenti restano, quelle mancanti vengono aggiunte.</div><div class="grid2" style="gap:8px"><button class="btn" id="bkEsp" style="margin:0"><i class="ti ti-file-export"></i> Salva file</button><button class="btn" id="bkImp" style="margin:0"><i class="ti ti-file-import"></i> Ripristina</button></div><input type="file" id="bkFile" accept="application/json,.json" hidden><div class="cap" id="bkMsg" style="margin-bottom:0"></div></div>`;
  h += `<div class="card"><div class="sub" style="margin-top:0">Puntata predefinita nel registro (€)</div><input class="linea" inputmode="decimal" id="pun" value="${i.puntata}" style="margin-top:0"></div>`;
  h += `<div class="card"><div class="sub" style="margin-top:0">Bankroll (€)</div><input class="linea" inputmode="decimal" id="bk" value="${i.bankroll}" style="margin-top:0"><div class="sub">Quanto del consiglio di Kelly seguire</div><div class="tabs">${[[0.1, "10%"], [0.25, "25%"], [0.5, "50%"]].map(([v, t]) => `<button class="chipbtn${i.kelly === v ? " on" : ""}" data-kl="${v}">${t}</button>`).join("")}</div><div class="cap">Il bankroll serve a calcolare la puntata consigliata e la curva nel registro. Meglio una frazione prudente di Kelly: 25% è lo standard dei tipster.</div></div>`;
  h += `<button class="btn" id="ripr">Ripristina le impostazioni iniziali</button>`;
  APP.innerHTML = h;
  const salva = (m) => { ls.set("imp", { ...impo(), ...m }); };
  APP.querySelectorAll("[data-sg]").forEach((b) => b.onclick = () => { salva({ soglia: +b.dataset.sg }); vistaImpostazioni(); });
  APP.querySelectorAll("[data-mk]").forEach((c) => c.onchange = () => { const mk = { ...impo().mercati, [c.dataset.mk]: c.checked }; salva({ mercati: mk }); });
  $("#pun").oninput = (e) => { const v = parseFloat(String(e.target.value).replace(",", ".")); if (v > 0) salva({ puntata: v }); };
  if ($("#pushOn")) {
    const msg = (t) => { $("#pushMsg").textContent = t; };
    $("#pushOn").onclick = async () => {
      try {
        const perm = await Notification.requestPermission(); if (perm !== "granted") return msg("Permesso non concesso: abilita le notifiche per l'app nelle impostazioni del telefono.");
        const reg = await navigator.serviceWorker.ready, k = (await (await fetch("/api/push-chiave")).json()).chiave;
        if (!k) throw new Error("chiave non disponibile (serve Supabase)");
        const raw = atob(k.replace(/-/g, "+").replace(/_/g, "/")), key = Uint8Array.from(raw, (c) => c.charCodeAt(0));
        const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
        const r = await fetch("/api/push-iscrivi", { method: "POST", body: JSON.stringify(sub.toJSON()) }); if (!r.ok) throw new Error("iscrizione non salvata");
        sincPref(); msg("Fatto: questo telefono è collegato. Tocca «Invia prova».");
      } catch (e) { msg("Non riuscito: " + (e.message || e)); }
    };
    $("#pushProva").onclick = async () => { try { const r = await (await fetch("/api/push-prova", { method: "POST" })).json(); msg(r.inviati ? "Prova inviata: dovrebbe arrivare tra pochi secondi." : "Nessun telefono collegato o invio rifiutato (" + JSON.stringify(r.esiti || []) + "): tocca prima «Attiva»."); } catch (e) { msg("Non riuscito: " + (e.message || e)); } };
  }
  $("#bkEsp").onclick = () => { const dati = { app: "nba-schedine", versione: VERSIONE, data: new Date().toISOString(), registro: ls.get("registro", []), mov: ls.get("mov", []), pref: ls.get("pref", null), imp: ls.get("imp", null) }, a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(dati, null, 1)], { type: "application/json" })); a.download = `nba-schedine-backup-${dati.data.slice(0, 10)}.json`; document.body.appendChild(a); a.click(); a.remove(); $("#bkMsg").textContent = `Salvato: ${dati.registro.length} schedine e ${dati.mov.length} movimenti.`; };
  $("#bkImp").onclick = () => $("#bkFile").click();
  $("#bkFile").onchange = async (e) => { const f = e.target.files[0]; if (!f) return; const m = $("#bkMsg");
    try { const d = JSON.parse(await f.text()); if (d.app !== "nba-schedine" || !Array.isArray(d.registro) || !Array.isArray(d.mov)) throw new Error("non è un backup di NBA Schedine");
      const un = (a, b) => { const ids = new Set(a.map((r) => String(r.id))); return [...a, ...b.filter((r) => r && r.id != null && !ids.has(String(r.id)))]; }, r0 = ls.get("registro", []), m0 = ls.get("mov", []), r1 = un(r0, d.registro), m1 = un(m0, d.mov);
      const dl = ls.get("delIds", []).filter((id) => ![...d.registro, ...d.mov].some((r) => String(r.id) === id)); localStorage.setItem("delIds", JSON.stringify(dl));
      ls.set("registro", r1); ls.set("mov", m1); if (d.pref && !ls.get("pref", null)) ls.set("pref", d.pref); if (d.imp && !ls.get("imp", null)) ls.set("imp", d.imp);
      m.textContent = `Ripristinato: ${r1.length - r0.length} schedine e ${m1.length - m0.length} movimenti aggiunti.`; } catch (er) { m.textContent = "Ripristino non riuscito: " + (er.message || er); } e.target.value = ""; };
  APP.querySelectorAll("[data-asp]").forEach((b) => b.onclick = () => { const [k, v] = b.dataset.asp.split("|"), a = ls.get("aspetto", { tema: "scuro", testo: "normale" }); a[k] = v; ls.set("aspetto", a); applicaAspetto(); vistaImpostazioni(); });
  $("#cpCod").onclick = async () => { try { await navigator.clipboard.writeText(codiceSync()); $("#codMsg").textContent = "Codice copiato."; } catch { $("#codMsg").textContent = "Copia non riuscita: scrivilo a mano."; } };
  $("#colCod").onclick = async () => { const c = $("#altroCod").value.trim().toLowerCase(); if (!/^[a-z0-9]{8,16}$/.test(c)) { $("#codMsg").textContent = "Codice non valido."; return; } if (c === codiceSync()) { $("#codMsg").textContent = "È già il codice di questo telefono."; return; } if (!confirm("Il registro e il conto di questo telefono si uniranno a quelli del codice inserito. Continuare?")) return; ls.set("codice", c); await sincReg(); sincPref(); vistaImpostazioni(); };
  $("#bk").oninput = (e) => { const v = parseFloat(String(e.target.value).replace(",", ".")); if (v > 0) salva({ bankroll: v }); };
  APP.querySelectorAll("[data-kl]").forEach((b) => b.onclick = () => { salva({ kelly: +b.dataset.kl }); vistaImpostazioni(); });
  $("#ripr").onclick = () => { ls.set("imp", {}); vistaImpostazioni(); };
}

// ---------- REGISTRO PERSONALE (salvato sul telefono)
const chiaveGiocata = (x) => `${x.g}|${x.tipo}|${x.pid || x.squadra || (x.tipo === "Totale" ? x.testo : "")}`;
const eur = (v) => (v >= 0 ? "+" : "-") + Math.abs(v).toFixed(2).replace(".", ",") + " €";
// valore atteso e puntata di Kelly: p = probabilità stimata, q = quota decimale
function valoreGiocata(p, q) {
  const ev = p * q - 1, b = q - 1, k = b > 0 ? Math.max(0, (p * q - 1) / b) : 0, i = impo();
  return { ev, edge: p - 1 / q, kelly: k, puntata: k * (i.kelly || 0.25) * (i.bankroll || 100) };
}
const rigaValore = (v) => `<div class="s" style="line-height:1.5;margin:2px 0 8px">Valore atteso <b style="color:${v.ev > 0 ? GR : RD}">${v.ev >= 0 ? "+" : ""}${(v.ev * 100).toFixed(1)}%</b> · vantaggio ${v.edge >= 0 ? "+" : ""}${(v.edge * 100).toFixed(1)} punti${v.ev > 0 ? ` · puntata consigliata <b style="color:#f2f2f2">${v.puntata.toFixed(2).replace(".", ",")} €</b> (Kelly ${Math.round((impo().kelly || 0.25) * 100)}% del bankroll)` : " · a questa quota non conviene giocarla"}</div>`;
function btnRegistro(o) {
  const gia = ls.get("registro", []).some((r) => r.id === o.id);
  return `<button class="btn regbtn" data-reg="${esc(JSON.stringify(o))}" style="margin:8px 0 0">${gia ? `<i class="ti ti-check"></i> Nel registro` : `<i class="ti ti-notebook"></i> Ho giocato questa`}</button><div class="regform" style="display:none"></div>`;
}
function bindRegistro() {
  APP.querySelectorAll(".regbtn").forEach((b) => b.onclick = () => {
    const o = JSON.parse(b.dataset.reg), f = b.nextElementSibling;
    if (ls.get("registro", []).some((r) => r.id === o.id)) { location.hash = "#/registro"; return; }
    f.style.display = "block";
    f.innerHTML = `<div class="grid2"><input class="linea" inputmode="decimal" placeholder="Quota (es. 2.10)" data-q><input class="linea" inputmode="decimal" placeholder="Puntata in € (es. 5)" data-p value="${impo().puntata}"></div><div data-val></div><button class="btn" data-ok style="margin:0 0 6px">Salva nel registro</button>`;
    f.querySelector("[data-q]").oninput = (e) => { const q = parseFloat(String(e.target.value).replace(",", ".")); f.querySelector("[data-val]").innerHTML = q > 1 && o.prob > 0 ? rigaValore(valoreGiocata(o.prob, q)) : ""; };
    f.querySelector("[data-ok]").onclick = () => {
      const q = parseFloat(String(f.querySelector("[data-q]").value).replace(",", ".")), p = parseFloat(String(f.querySelector("[data-p]").value).replace(",", "."));
      if (!(q > 1) || !(p > 0)) { f.querySelector("[data-ok]").textContent = "Inserisci quota (maggiore di 1) e puntata"; return; }
      const r = ls.get("registro", []); r.unshift({ ...o, quota: q, puntata: p, data: new Date().toISOString().slice(0, 10), esito: null }); ls.set("registro", r);
      b.innerHTML = `<i class="ti ti-check"></i> Nel registro`; f.style.display = "none";
    };
  });
}

// curva del bankroll, serie e rendimento per tipo di giocata
function statisticheRegistro(chiuse) {
  if (chiuse.length < 2) return "";
  const ord = [...chiuse].reverse(); // il registro è dal più recente: qui dal più vecchio
  const b0 = impo().bankroll || 100; let b = b0, picco = b0, dd = 0; const pt = [b0];
  for (const r of ord) { b += r.esito === 1 ? r.puntata * (r.quota - 1) : -r.puntata; pt.push(b); picco = Math.max(picco, b); dd = Math.max(dd, picco - b); }
  const lo = Math.min(...pt), hi = Math.max(...pt), W = 320, H = 90, sx = (i) => (i / (pt.length - 1)) * W, sy = (v) => H - 6 - ((v - lo) / (hi - lo || 1)) * (H - 12);
  const col = b >= b0 ? GR : RD, d = pt.map((v, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");
  let serie = 0, tipo = ord[ord.length - 1].esito; for (let i = ord.length - 1; i >= 0 && ord[i].esito === tipo; i--) serie++;
  const per = {}; for (const r of chiuse) { const c = (per[r.tipo || "Altro"] ||= { n: 0, ok: 0, pr: 0, pu: 0 }); c.n++; c.ok += r.esito; c.pu += r.puntata; c.pr += r.esito === 1 ? r.puntata * (r.quota - 1) : -r.puntata; }
  const nomi = { Totale: "Totale partita", Squadra: "Punti squadra", Vincente: "Vincente", Punti: "Punti giocatore", Rimbalzi: "Rimbalzi", Assist: "Assist", Schedina: "Schedine" };
  const qm = chiuse.reduce((a, r) => a + r.quota, 0) / chiuse.length, pm = chiuse.reduce((a, r) => a + (r.prob || 0), 0) / chiuse.length;
  const cl = chiuse.filter((r) => r.chiusura > 1), clv = cl.length ? cl.reduce((a, r) => a + (r.quota / r.chiusura - 1), 0) / cl.length : null;
  return `<div class="card"><div class="riga"><div class="s">Bankroll (partendo da ${b0} €)</div><b style="color:${col}">${b.toFixed(2).replace(".", ",")} €</b></div>
  <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:90px;margin-top:6px"><path d="${d} L${W} ${H} L0 ${H} Z" fill="${col}" opacity=".12"/><path d="${d}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/></svg>
  <div class="row3" style="margin-top:8px"><div class="tile"><b style="color:${tipo === 1 ? GR : RD}">${serie}${tipo === 1 ? "V" : "P"}</b><span>serie in corso</span></div><div class="tile"><b>-${dd.toFixed(0)} €</b><span>calo massimo</span></div><div class="tile">${clv != null ? `<b style="color:${clv >= 0 ? GR : RD}">${clv >= 0 ? "+" : ""}${(clv * 100).toFixed(1)}%</b><span>CLV medio (${cl.length})</span>` : `<b>${qm.toFixed(2)}</b><span>quota media</span>`}</div></div>
  <div class="s" style="margin-top:8px">Centrate ${(chiuse.filter((r) => r.esito === 1).length / chiuse.length * 100).toFixed(0)}% · previste in media ${(pm * 100).toFixed(0)}% · quota pareggio ${(1 / Math.max(0.01, chiuse.filter((r) => r.esito === 1).length / chiuse.length)).toFixed(2)}</div></div>
  <div class="sub">Rendimento per tipo di giocata</div>` + Object.entries(per).sort((x, y) => y[1].n - x[1].n).map(([t, c]) => `<div class="card riga" style="padding:9px 12px"><div><div style="font-weight:500">${esc(nomi[t] || t)}</div><div class="s">${c.ok}/${c.n} centrate · ${c.pu.toFixed(0)} € puntati</div></div><b style="color:${c.pr >= 0 ? GR : RD}">${eur(c.pr)} <span class="s">(${(c.pr / c.pu * 100).toFixed(0)}%)</span></b></div>`).join("");
}
// Salva solo esito e nota sul registro attuale: una giocata aggiunta o tolta nel frattempo non si perde mai
function salvaReg(nuovo) {
  const m = new Map(nuovo.map((r) => [r.id, r])), att = ls.get("registro", []);
  const out = att.map((r) => { const n = m.get(r.id); return n ? { ...r, es: n.es, ...(r.esito == null ? { esito: n.esito, nota: n.nota } : {}) } : r; });
  ls.set("registro", out); return out;
}
// Una riga per ogni giocata della schedina: presa o sbagliata, quanto è stato fatto e di quanto
function dettaglioLegs(r) {
  if (!r.legs || !r.es || r.es.length !== r.legs.length) return "";
  return r.legs.map((l, i) => {
    const e = r.es[i], sg = +l.soglia, over = l.dir !== "under", u = { pts: "pt", reb: "reb", ast: "ast", tot: "pt", sq: "pt" }[l.k] || "";
    if (e.esito === 2) return `<div class="s" style="margin-top:4px;color:${AM}"><i class="ti ti-circle-dashed"></i> ${esc(l.testo)} · annullata (non ha giocato)</div>`;
    if (e.esito == null) return `<div class="s" style="margin-top:4px"><i class="ti ti-clock"></i> ${esc(l.testo)} · ancora da giocare</div>`;
    const ok = e.esito === 1, c = ok ? GR : RD;
    let t = "";
    if (e.cur != null && sg) { const d = over ? e.cur - sg : sg - e.cur; t = ` · fatto ${e.cur} ${u} (${d >= 0 ? "+" : ""}${(Math.round(d * 10) / 10).toString().replace(".", ",")} ${ok ? "sopra" : "sotto"} la linea)`; }
    return `<div class="s" style="margin-top:4px;color:${c}"><i class="ti ${ok ? "ti-circle-check-filled" : "ti-circle-x-filled"}"></i> ${esc(l.testo)}${t}</div>`;
  }).join("");
}
let aggiornandoReg = false;
// Controlla da solo le giocate aperte: si chiama all'avvio, al ritorno nell'app, nel Live e nel Registro
async function aggiornaRegistro(reg = ls.get("registro", [])) {
  if (aggiornandoReg) return reg; aggiornandoReg = true;
  try {
  if (reg.some((r) => r.esito == null)) {
    try {
      const S = await api("/api/storico", 0), m = new Map([...(S.schedine || []), ...(S.righe || [])].map((r) => [r.chiave, r.esito]));
      reg = reg.map((r) => {
        if (r.esito != null) return r;
        if (r.legs && r.legs.length && r.legs.every((l) => l.chiave)) { const es = r.legs.map((l) => m.get(l.chiave)); if (es.some((e) => e === 0)) return { ...r, esito: 0 }; if (es.every((e) => e === 1)) return { ...r, esito: 1 }; return r; }
        const e = m.get(r.chiave); return (e === 0 || e === 1) ? { ...r, esito: e } : r; });
      reg = salvaReg(reg);
    } catch {}
  }
  const lim = new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10), conLegs = reg.filter((r) => r.legs && r.legs.length && (r.esito == null || (String(r.data) >= lim && (!r.es || r.es.some((x) => x.esito == null)))));
  if (conLegs.length) {
    try {
      const R = await Promise.all(conLegs.map((r) => fetch("/api/valuta-giocate", { method: "POST", body: JSON.stringify({ legs: r.legs }) }).then((x) => x.json())));
      const mappa = new Map(conLegs.map((r, i) => [r.id, R[i].esiti || []]));
      reg = reg.map((r) => {
        const es0 = mappa.get(r.id); if (!es0 || es0.length !== r.legs.length) return r;
        const es = es0, dett = es0.map((x) => ({ esito: x.esito, cur: x.cur ?? null })); r = { ...r, es: dett };
        if (r.esito != null) return r;
        if (es.some((x) => x.esito === 0)) return { ...r, esito: 0 };
        if (es.some((x) => x.esito === 2)) return { ...r, nota: "una giocata annullata (giocatore non sceso in campo): segna tu l'esito" };
        if (es.every((x) => x.esito === 1)) return { ...r, esito: 1 };
        return r;
      }); reg = salvaReg(reg);
    } catch {}
  }
  } finally { aggiornandoReg = false; }
  return reg;
}
// ---------- IL MIO MESE: andamento del saldo, esito per tipo di giocata, punti deboli
function meseDettaglio(mr, chiuse, incasso) {
  const NK = { pts: "Punti giocatore", reb: "Rimbalzi", ast: "Assist", tot: "Totale partita", sq: "Punti squadra", win: "Vincente" }, ord = [...chiuse].sort((a, b) => String(a.data).localeCompare(String(b.data)) || String(a.id).localeCompare(String(b.id)));
  let h = "";
  if (ord.length >= 2) {
    let cum = 0; const pts = [0, ...ord.map((r) => (cum += incasso(r) - r.puntata))], w = 300, hh = 90, mn = Math.min(...pts, 0), mx = Math.max(...pts, 0), sp = mx - mn || 1, X = (i) => (i / (pts.length - 1) * (w - 8) + 4).toFixed(1), Y = (v) => (hh - 8 - (v - mn) / sp * (hh - 16) + 4).toFixed(1), fin = pts[pts.length - 1], col = fin >= 0 ? GR : RD;
    h += `<h2>Andamento del mese</h2><div class="card"><div class="riga"><div class="s">Risultato schedina dopo schedina</div><b style="color:${col}">${fin >= 0 ? "+" : ""}${euro(fin)}</b></div><svg viewBox="0 0 ${w} ${hh}" style="width:100%;height:auto;margin-top:6px"><line x1="0" x2="${w}" y1="${Y(0)}" y2="${Y(0)}" stroke="${MU}" stroke-dasharray="3 3" stroke-width="1" opacity=".6"/><polyline fill="none" stroke="${col}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="${pts.map((v, i) => X(i) + "," + Y(v)).join(" ")}"/>${pts.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="${i === pts.length - 1 ? 4 : 2.2}" fill="${col}"/>`).join("")}</svg><div class="s">Massimo ${euro(Math.max(...pts))} · minimo ${euro(Math.min(...pts))}</div></div>`;
  }
  const per = {}, dirk = {};
  for (const r of mr) if (r.legs && r.es && r.es.length === r.legs.length) r.legs.forEach((l, i) => { const e = r.es[i]; if (!e || (e.esito !== 0 && e.esito !== 1)) return; const c = (per[l.k] ||= [0, 0]); c[1]++; if (e.esito === 1) c[0]++; const k2 = l.k + "|" + (l.dir === "under" ? "under" : "over"), d = (dirk[k2] ||= [0, 0]); d[1]++; if (e.esito === 1) d[0]++; });
  const tipi = Object.entries(per).sort((a, b) => b[1][1] - a[1][1]);
  if (tipi.length) {
    h += `<h2>Per tipo di giocata</h2><div class="card">` + tipi.map(([k, [ok, n]]) => { const r = ok / n, c = r >= 0.7 ? GR : r >= 0.5 ? AM : RD; return `<div style="margin:6px 0"><div class="riga"><span>${NK[k] || k}</span><span class="s"><b style="color:${c}">${Math.round(r * 100)}%</b> · ${ok}/${n}</span></div><div style="height:6px;border-radius:3px;background:#222a3a;margin-top:3px"><div style="height:6px;border-radius:3px;width:${Math.round(r * 100)}%;background:${c}"></div></div></div>`; }).join("") + `<div class="cap" style="margin:6px 0 0">Percentuale delle singole giocate centrate nelle tue schedine chiuse.</div></div>`;
    const deboli = Object.entries(dirk).filter(([, [ok, n]]) => n >= 3 && ok / n < 0.5).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]).slice(0, 2);
    h += `<div class="card"><div class="sub" style="margin-top:0"><i class="ti ti-target"></i> Punti deboli</div>` + (deboli.length ? deboli.map(([k, [ok, n]]) => { const [t, d] = k.split("|"); return `<div class="s" style="margin-top:4px">Su <b style="color:#fff">${(NK[t] || t).toLowerCase()} ${d}</b> ne prendi poche: <b style="color:${RD}">${ok} su ${n}</b>. Valuta di evitarle o di cercare linee più basse.</div>`; }).join("") : `<div class="s" style="margin-top:4px;color:${GR}">Nessun tipo di giocata sotto il 50% (con almeno 3 giocate).</div>`) + `</div>`;
  }
  return h;
}
// ---------- IL MIO CONTO: ricariche, giocate e risultato mese per mese
const nomeMese = (ym) => { const d = new Date(ym + "-15T12:00:00"); const t = d.toLocaleDateString("it-IT", { month: "long", year: "numeric" }); return t.charAt(0).toUpperCase() + t.slice(1); };
const spostaMese = (ym, n) => { const d = new Date(ym + "-15T12:00:00"); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 7); };
const euro = (v) => v.toFixed(2).replace(".", ",") + " €";
async function vistaConto() {
  APP.innerHTML = topBar() + segStorico("c") + skel();
  const reg = await aggiornaRegistro(ls.get("registro", []));
  const mov = ls.get("mov", []), oggiYM = new Date().toISOString().slice(0, 7); let ym = ls.get("contoMese", oggiYM);
  const incasso = (r) => r.esito === 1 ? r.puntata * r.quota : 0;
  // saldo da sempre: ricariche - prelievi - puntate + vincite
  const dep = mov.filter((m) => m.tipo === "dep").reduce((a, m) => a + m.importo, 0), pre = mov.filter((m) => m.tipo === "prel").reduce((a, m) => a + m.importo, 0);
  const saldo = dep - pre - reg.reduce((a, r) => a + (+r.puntata || 0), 0) + reg.reduce((a, r) => a + incasso(r), 0);
  const disegna = () => {
    ls.set("contoMese", ym);
    const mr = reg.filter((r) => String(r.data).slice(0, 7) === ym), mm = mov.filter((m) => String(m.data).slice(0, 7) === ym);
    const dM = mm.filter((m) => m.tipo === "dep").reduce((a, m) => a + m.importo, 0), pM = mm.filter((m) => m.tipo === "prel").reduce((a, m) => a + m.importo, 0);
    const chiuse = mr.filter((r) => r.esito === 0 || r.esito === 1), vinte = chiuse.filter((r) => r.esito === 1), aperte = mr.filter((r) => r.esito == null);
    const puntato = chiuse.reduce((a, r) => a + r.puntata, 0), incassato = chiuse.reduce((a, r) => a + incasso(r), 0), netto = incassato - puntato, roi = puntato ? netto / puntato * 100 : 0;
    const col = netto >= 0 ? GR : RD;
    let h = topBar() + segStorico("c");
    h += `<div class="card gm" style="--ca:${saldo >= 0 ? "#1c3a2a" : "#3a1c1c"};--cb:transparent"><div class="s">Saldo stimato del conto</div><div style="font-family:'Barlow Condensed',Inter,sans-serif;font-weight:700;font-size:46px;line-height:1.05;color:${saldo >= 0 ? "#fff" : RD}">${euro(saldo)}</div><div class="s">Ricariche meno prelievi, meno le puntate, più le vincite. Si aggiorna da solo con i tuoi esiti.</div></div>`;
    h += `<div class="mese"><button class="chipbtn" data-ms="-1">‹</button><b>${nomeMese(ym)}</b><button class="chipbtn" data-ms="1"${ym >= oggiYM ? " disabled style=\"opacity:.35\"" : ""}>›</button></div>`;
    h += `<div class="row3"><div class="tile"><b>${euro(dM)}</b><span>caricato${pM ? ` · prelevato ${euro(pM)}` : ""}</span></div><div class="tile"><b>${mr.length}</b><span>schedine giocate${aperte.length ? ` · ${aperte.length} aperte` : ""}</span></div><div class="tile"><b style="color:${chiuse.length ? col : "#fff"}">${chiuse.length ? (netto >= 0 ? "+" : "-") + euro(Math.abs(netto)) : "—"}</b><span>${chiuse.length ? `risultato · ROI ${roi >= 0 ? "+" : ""}${roi.toFixed(0)}%` : "nessuna chiusa"}</span></div></div>`;
    if (chiuse.length) h += `<div class="cap" style="margin-top:8px">Puntato ${euro(puntato)} su ${chiuse.length} schedine chiuse, incassato ${euro(incassato)}. Vinte ${vinte.length} su ${chiuse.length} (${Math.round(vinte.length / chiuse.length * 100)}%).</div>`;
    { // qualità delle quote giocate: attese contro risultati reali
      const q = reg.filter((r) => r.prob > 0 && r.quota > 1 && r.puntata > 0);
      if (q.length >= 3) {
        const ch = q.filter((r) => r.esito === 0 || r.esito === 1), buone = q.filter((r) => r.prob * r.quota > 1).length, evMedio = q.reduce((a, r) => a + (r.prob * r.quota - 1), 0) / q.length * 100;
        const att = ch.reduce((a, r) => a + r.puntata * (r.prob * r.quota - 1), 0), reale = ch.reduce((a, r) => a + (r.esito === 1 ? r.puntata * (r.quota - 1) : -r.puntata), 0);
        h += `<h2>Le tue quote</h2><div class="card"><div class="row3"><div class="tile"><b style="color:${evMedio >= 0 ? GR : RD}">${evMedio >= 0 ? "+" : ""}${evMedio.toFixed(0)}%</b><span>valore medio</span></div><div class="tile"><b>${buone}/${q.length}</b><span>con quota giusta</span></div><div class="tile"><b style="color:${reale >= att ? GR : RD}">${reale >= 0 ? "+" : ""}${euro(reale)}</b><span>risultato reale</span></div></div><div class="cap" style="margin:8px 0 0">${ch.length ? `Col modello ti aspettavi ${att >= 0 ? "+" : ""}${euro(att)} sulle ${ch.length} chiuse. ${reale < att - 5 ? "Stai andando peggio del previsto: o è sfortuna o il modello è troppo ottimista su certe giocate (guarda la taratura in Modello)." : reale > att + 5 ? "Stai andando meglio del previsto." : "Sei in linea con le attese."}` : "Quando chiudi qualche schedina vedi il confronto con le attese."} Valore = quanto la quota pagata supera quella giusta del modello.</div></div>`;
      }
    }
    { // riepilogo degli ultimi 7 giorni
      const lim = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), sett = reg.filter((r) => String(r.data) > lim), ch = sett.filter((r) => r.esito === 0 || r.esito === 1);
      if (sett.length) {
        const pu = ch.reduce((a, r) => a + r.puntata, 0), inc = ch.reduce((a, r) => a + incasso(r), 0), net = inc - pu, nomiK = { pts: "punti giocatore", reb: "rimbalzi", ast: "assist", tot: "totale partita", sq: "punti squadra", win: "vincente" }, per = {};
        for (const r of sett) if (r.legs && r.es && r.es.length === r.legs.length) r.legs.forEach((l, i) => { const e = r.es[i]; if (e && (e.esito === 0 || e.esito === 1)) { const c = (per[l.k] ||= [0, 0]); c[1]++; if (e.esito === 1) c[0]++; } });
        const tipi = Object.entries(per).filter(([, c]) => c[1] >= 2).sort((a, b) => b[1][0] / b[1][1] - a[1][0] / a[1][1]), mig = tipi[0], peg = tipi.length > 1 ? tipi[tipi.length - 1] : null;
        const vinta = ch.filter((r) => r.esito === 1).sort((a, b) => incasso(b) - incasso(a))[0];
        h += `<h2>Ultimi 7 giorni</h2><div class="card"><div class="riga"><div><div class="s">${sett.length} schedine · ${ch.filter((r) => r.esito === 1).length} vinte su ${ch.length} chiuse</div><div style="font-family:'Barlow Condensed',Inter,sans-serif;font-size:32px;font-weight:700;color:${ch.length ? (net >= 0 ? GR : RD) : "#fff"}">${ch.length ? (net >= 0 ? "+" : "-") + euro(Math.abs(net)) : "—"}</div></div><div class="s" style="text-align:right">puntati ${euro(pu)}<br>incassati ${euro(inc)}</div></div>` +
          (mig ? `<div class="s" style="margin-top:6px">Giocata che ti rende di più: <b style="color:${GR}">${nomiK[mig[0]] || mig[0]}</b> (${mig[1][0]}/${mig[1][1]})${peg && peg[0] !== mig[0] && peg[1][0] / peg[1][1] < mig[1][0] / mig[1][1] ? ` · peggiore: <b style="color:${RD}">${nomiK[peg[0]] || peg[0]}</b> (${peg[1][0]}/${peg[1][1]})` : ""}</div>` : "") +
          (vinta ? `<div class="s" style="margin-top:4px">Miglior vincita: ${esc(vinta.nome)} · ${euro(incasso(vinta))}</div>` : "") + `</div>`;
      }
    }
    h += `<h2>Movimenti</h2><div class="card"><div class="grid2" style="align-items:center"><input class="linea" id="mImp" inputmode="decimal" placeholder="Importo in €"><div style="display:flex;gap:6px"><button class="btn" id="mDep" style="flex:1">Ricarica</button><button class="btn" id="mPre" style="flex:1">Prelievo</button></div></div>` +
      (mm.length ? mm.map((m) => `<div class="riga rg"><span>${m.tipo === "dep" ? "Ricarica" : "Prelievo"} · ${esc(nomeGiorno(String(m.data).slice(0, 10)))}</span><span><b style="color:${m.tipo === "dep" ? GR : AM}">${m.tipo === "dep" ? "+" : "-"}${euro(m.importo)}</b> <button class="chipbtn" data-dm="${esc(m.id)}" style="padding:2px 9px;font-size:11px">Togli</button></span></div>`).join("") : `<div class="cap" style="margin:8px 0 0">Nessun movimento in questo mese. Scrivi quanto hai caricato sul conto di gioco: il saldo lo calcola l'app.</div>`) + `</div>`;
    if (chiuse.length >= 2 || mr.some((r) => r.es)) h += meseDettaglio(mr, chiuse, incasso);
    h += `<h2>Cosa hai giocato</h2>` + (mr.length ? perGiornata(mr.map((r) => ({ r })), ({ r }) => `<div class="card" style="padding:10px 12px"><div class="riga" style="align-items:flex-start;gap:10px"><div style="min-width:0"><b>${esc(r.nome)}</b><div class="s">quota ${r.quota} · ${euro(+r.puntata)}${r.esito === 1 ? ` · <b style="color:${GR}">vinta ${euro(incasso(r))}</b>` : r.esito === 0 ? ` · <b style="color:${RD}">persa</b>` : " · in corso"}</div></div></div><div class="s" style="line-height:1.4;margin-top:4px">${esc(r.testo || "")}</div>${dettaglioLegs(r)}</div>`) + `<div class="cap" style="text-align:center"><a href="#/registro" style="color:${OR}">Apri il registro per modificare o togliere una giocata</a></div>` : `<div class="vuoto">Nessuna schedina in questo mese. Quando ne giochi una dall'app, la trovi qui con quota, puntata e risultato.</div>`);
    h += `<div class="cap" style="text-align:center;margin-top:14px"><a href="#/calcolatore" style="color:${OR}"><i class="ti ti-calculator"></i> Calcolatore</a> &nbsp;·&nbsp; <a href="#/impostazioni" style="color:${OR}"><i class="ti ti-settings"></i> Impostazioni</a> &nbsp;·&nbsp; <a href="#/diag" style="color:${OR}"><i class="ti ti-stethoscope"></i> Controllo dati</a></div>`;
    APP.innerHTML = h;
    APP.querySelectorAll("[data-ms]").forEach((b) => b.onclick = () => { if (b.disabled) return; ym = spostaMese(ym, +b.dataset.ms); disegna(); });
    const aggiungi = (tipo) => { const v = parseFloat(String($("#mImp").value).replace(",", ".")); if (!(v > 0)) { $("#mImp").focus(); return; } const m = ls.get("mov", []); m.unshift({ id: "m" + Date.now(), data: new Date().toISOString().slice(0, 10), tipo, importo: v }); ls.set("mov", m); ym = oggiYM; vistaConto(); };
    $("#mDep").onclick = () => aggiungi("dep"); $("#mPre").onclick = () => aggiungi("prel");
    APP.querySelectorAll("[data-dm]").forEach((b) => b.onclick = () => { if (!b.dataset.s) { b.dataset.s = 1; b.textContent = "Sicuro?"; setTimeout(() => { if (b.isConnected) { delete b.dataset.s; b.textContent = "Togli"; } }, 3000); return; } ls.set("mov", ls.get("mov", []).filter((m) => m.id !== b.dataset.dm)); vistaConto(); });
  };
  disegna();
}
async function vistaRegistro() {
  const back = topBar() + segStorico("r");
  APP.innerHTML = back + skel();
  let reg = ls.get("registro", []);
  reg = await aggiornaRegistro(reg);
  const per = ls.get("regPer", 0), dal = per ? new Date(Date.now() - per * 86400000).toISOString().slice(0, 10) : "";
  const chiuse = reg.filter((r) => (r.esito === 0 || r.esito === 1) && String(r.data) >= dal), vinte = chiuse.filter((r) => r.esito === 1);
  const prof = chiuse.reduce((a, r) => a + (r.esito === 1 ? r.puntata * (r.quota - 1) : -r.puntata), 0), puntato = chiuse.reduce((a, r) => a + r.puntata, 0);
  let h = back + `<h2>Il mio registro</h2><div class="tabs">${[[0, "Tutto"], [7, "7 giorni"], [30, "30 giorni"]].map(([v, t]) => `<button class="chipbtn${per === v ? " on" : ""}" data-per="${v}">${t}</button>`).join("")}</div>`;
  if (!reg.length) h += `<div class="vuoto">Ancora vuoto. Nelle pagine Schedine e Studio tocca «Ho giocato questa», scrivi quota e puntata: a fine partita l'app calcola da sola guadagno e perdita. Resta salvato solo su questo telefono.</div>`;
  else {
    h += `<div class="card riga" style="gap:14px;justify-content:flex-start"><div><div class="s">Risultato delle giocate chiuse</div><div style="font-family:'Barlow Condensed',Inter,sans-serif;font-size:36px;font-weight:700;color:${prof >= 0 ? GR : RD}">${chiuse.length ? eur(prof) : "–"}</div><div class="s">${vinte.length} centrate su ${chiuse.length}${puntato ? ` · rendimento ${(prof / puntato * 100).toFixed(0)}% su ${puntato.toFixed(2).replace(".", ",")} € puntati` : ""} · ${reg.filter((r) => r.esito == null).length} in attesa</div></div></div>`;
    h += statisticheRegistro(chiuse);
    h += perGiornata(reg.map((r, i) => ({ r, i })), ({ r, i }) => `<div class="card" style="padding:10px 12px"><div class="riga" style="align-items:flex-start;gap:10px"><div style="min-width:0"><div style="font-weight:600">${esc(r.nome)}</div><div class="s" style="line-height:1.4">${esc(r.testo)}</div>${dettaglioLegs(r)}${r.nota ? `<div class="s" style="color:${AM}">${esc(r.nota)}</div>` : ""}<div class="s">${esc(r.data)} · quota ${r.quota} · ${r.puntata} € · prevista ${pct(r.prob)}</div>${confQuota(r)}${r.esito == null ? `<div style="margin-top:6px"><button class="chipbtn" data-es="${i}|1" style="padding:3px 10px;font-size:11px">Vinta</button> <button class="chipbtn" data-es="${i}|0" style="padding:3px 10px;font-size:11px">Persa</button></div>` : ""}</div><div style="text-align:right"><b style="color:${r.esito === 1 ? GR : r.esito === 0 ? RD : MU}">${r.esito === 1 ? eur(r.puntata * (r.quota - 1)) : r.esito === 0 ? eur(-r.puntata) : "in attesa"}</b><div><button class="chipbtn" data-del="${i}" style="padding:3px 10px;font-size:11px;margin-top:6px">Elimina</button></div></div></div><div class="riga" style="margin-top:8px;gap:8px;justify-content:flex-start"><span class="s">Quota di chiusura</span><input class="linea" inputmode="decimal" data-cl="${i}" value="${r.chiusura || ""}" placeholder="es. 1.75" style="margin:0;width:90px;padding:4px 8px">${r.chiusura > 1 ? (() => { const c = r.quota / r.chiusura - 1; return `<b style="color:${c >= 0 ? GR : RD}">CLV ${c >= 0 ? "+" : ""}${(c * 100).toFixed(1)}%</b>`; })() : ""}</div></div>`);
  }
  if (reg.length) h += `<div class="grid2" style="margin-top:6px"><button class="btn" id="csv" style="margin:0">Scarica CSV</button><button class="btn" id="bak" style="margin:0">Copia backup</button></div>`;
  h += `<button class="btn" id="rip" style="margin:8px 0 0">Ripristina da backup incollato</button><div class="cap">Il registro vive solo su questo telefono: ogni tanto copia il backup e conservalo (ad esempio nelle note).</div>`;
  APP.innerHTML = h;
  const csv = $("#csv"); if (csv) csv.onclick = () => {
    const R = ls.get("registro", []), q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const t = ["data;partita;giocata;tipo;quota;puntata;probabilita;esito;guadagno"].concat(R.map((r) => [r.data, r.nome, r.testo, r.tipo, r.quota, r.puntata, r.prob, r.esito == null ? "" : r.esito, r.esito == null ? "" : (r.esito === 1 ? r.puntata * (r.quota - 1) : -r.puntata).toFixed(2)].map(q).join(";"))).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + t], { type: "text/csv" })); a.download = "registro-nba.csv"; a.click();
  };
  const bak = $("#bak"); if (bak) bak.onclick = async () => { try { await navigator.clipboard.writeText(JSON.stringify(ls.get("registro", []))); bak.textContent = "Copiato ✓"; } catch { bak.textContent = "Copia non riuscita"; } };
  $("#rip").onclick = () => { const t = prompt("Incolla qui il backup copiato:"); if (!t) return; try { const a = JSON.parse(t); if (!Array.isArray(a)) throw 0; ls.set("registro", a); vistaRegistro(); } catch { alert("Backup non valido"); } };
  APP.querySelectorAll("[data-per]").forEach((b) => b.onclick = () => { ls.set("regPer", +b.dataset.per); vistaRegistro(); });
  APP.querySelectorAll("[data-es]").forEach((b) => b.onclick = () => { const [i, e] = b.dataset.es.split("|"), r = ls.get("registro", []); r[+i].esito = +e; ls.set("registro", r); vistaRegistro(); });
  APP.querySelectorAll("[data-cl]").forEach((el) => el.onchange = () => { const r = ls.get("registro", []), v = parseFloat(String(el.value).replace(",", ".")); r[+el.dataset.cl].chiusura = v > 1 ? v : null; ls.set("registro", r); vistaRegistro(); });
  APP.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => { const r = ls.get("registro", []); r.splice(+b.dataset.del, 1); ls.set("registro", r); vistaRegistro(); });
}

