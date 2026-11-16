// NBA Schedine - mia.js (parte dell'app: i file si caricano in ordine da index.html, vedi CLAUDE.md)
"use strict";
// ---------- LA MIA SCHEDINA: si compone con i consigli dell'app o con giocate scritte a mano
const PM = new Map(); // consigli visibili -> giocata
const miaLeggi = () => ls.get("mia", []);
function legDa(x) {
  const m = /(over|under) ([\d.]+)/.exec(x.testo || "");
  const k = x.tipo === "Punti" ? "pts" : x.tipo === "Rimbalzi" ? "reb" : x.tipo === "Assist" ? "ast" : x.tipo === "Totale" ? "tot" : x.tipo === "Squadra" ? "sq" : "win";
  return { id: x.id, chiave: chiaveGiocata(x), testo: x.testo, prob: x.prob, partita: x.partita, g: x.g, pid: x.pid || null, sq: x.squadra || null, k, dir: m ? m[1] : "over", soglia: m ? +m[2] : null, nome: k === "pts" || k === "reb" || k === "ast" ? String(x.testo).split(/ (over|under) /)[0] : null };
}
function addBtn(x) { PM.set(x.id, legDa(x)); const on = miaLeggi().some((l) => l.id === x.id); return `<button class="addl${on ? " on" : ""}" data-add="${esc(x.id)}" aria-label="Aggiungi alla mia schedina">${on ? "✓" : "+"}</button>`; }
function barraMia() {
  const el = document.getElementById("miabar"); if (!el) return;
  const L = miaLeggi(); if (location.hash.startsWith("#/mia")) { el.style.display = "none"; return; }
  const q = L.reduce((a, l) => a / Math.max(0.05, l.prob), 1);
  el.style.display = "flex"; el.innerHTML = L.length ? `<a href="#/mia" aria-label="La mia schedina: ${L.length} giocate, quota giusta ${q.toFixed(2)}"><i class="ti ti-ticket"></i><b>${L.length}</b></a>` : `<a href="#/mia" class="vuota" aria-label="Componi la tua schedina"><i class="ti ti-ticket"></i><b>Schedina</b></a>`;
}
// Raggruppa per giornata (la più recente aperta, le altre chiuse) con il conteggio di quelle centrate
const nomeGiorno = (d) => { const x = new Date(d + "T12:00:00"); return isNaN(x) ? String(d || "Senza data") : x.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "long" }); };
function perGiornata(voci, disegna) {
  const m = new Map();
  for (const v of voci) { const d = String(v.r.data || "").slice(0, 10) || "—"; if (!m.has(d)) m.set(d, []); m.get(d).push(v); }
  return [...m].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([d, l], i) => {
    const ch = l.filter((v) => v.r.esito === 0 || v.r.esito === 1), ok = ch.filter((v) => v.r.esito === 1).length;
    const col = !ch.length ? MU : ok / ch.length >= 0.6 ? GR : ok / ch.length >= 0.4 ? AM : RD;
    return `<details class="dt giorno"${i === 0 ? " open" : ""}><summary><span style="text-transform:capitalize">${esc(nomeGiorno(d))}</span><span style="color:${col};margin-left:auto">${ch.length ? `${ok} su ${ch.length} · ${Math.round(ok / ch.length * 100)}%` : `${l.length} in attesa`}</span></summary>${l.map(disegna).join("")}</details>`;
  }).join("");
}
const segStorico = (att) => `<div class="seg">${[["c", "conto", "Conto"], ["r", "registro", "Registro"], ["s", "storico", "Modello"], ["e", "esiti", "Esiti"]].map(([k, h, n]) => `<a href="#/${h}"${att === k ? ' class="on"' : ""}>${n}</a>`).join("")}</div>`;
const tabelliniCache = {};
// elenco delle partite finite toccabili: ognuna apre il suo tabellino
function riquadroTabellini(righe) {
  const m = new Map(); for (const r of righe) { const id = String(r.g ?? r.event_id ?? ""); if (/^\d+$/.test(id) && r.tipo !== "Schedina" && !m.has(id)) m.set(id, r.partita); }
  if (!m.size) return "";
  return `<h2>Tabellini delle partite</h2><div class="cap" style="margin-top:0">Tocca una partita per vedere formazioni, punti, rimbalzi e assist.</div>` + [...m].slice(0, 12).map(([id, n]) => `<div class="card riga" data-tab="${id}" style="cursor:pointer;padding:10px 12px"><b>${esc(n || "Partita")}</b><span class="s">Tabellino <i class="ti ti-chevron-down"></i></span></div><div class="tabl" id="tb${id}" hidden></div>`).join("");
}
document.addEventListener("click", async (e) => {
  const fv = e.target.closest("[data-fav]");
  if (fv) {
    e.preventDefault(); e.stopPropagation();
    const [t, id, nome, sq] = fv.dataset.fav.split("|"), P = pref();
    if (t === "gm") P.gm = P.gm.includes(id) ? P.gm.filter((x) => x !== id) : [...P.gm, id].slice(-40);
    else if (t === "sq") P.sq = P.sq.includes(id) ? P.sq.filter((x) => x !== id) : [...P.sq, id];
    else P.pl = P.pl.some((x) => x.pid === id) ? P.pl.filter((x) => x.pid !== id) : [...P.pl, { pid: id, nome, sq }];
    ls.set("pref", P); sincPref();
    if ((location.hash || "#/") === "#/" && ultimoD) { clearTimeout(timer); const y = window.scrollY; disegnaPartite(ultimoD, true); window.scrollTo(0, y); }
    else { const on = siSegue(t, id); fv.classList.toggle("on", on); if (t === "gm") fv.textContent = on ? "🔔" : "🔕"; else fv.textContent = on ? "★" : "☆"; }
    if (t === "gm" && siSegue("gm", id)) avvisoNotifiche();
    return;
  }
  const lv = e.target.closest("[data-lv]");
  if (lv) { // nel Live i dettagli si aprono solo toccando la partita
    const id = lv.dataset.lv, det = document.getElementById("lvd" + id); if (!det) return;
    const apri = det.hidden; det.hidden = !apri; apri ? liveAperte.add(id) : liveAperte.delete(id);
    try { sessionStorage.setItem("liveAp", JSON.stringify([...liveAperte])); } catch {}
    const ch = lv.querySelector(".ti-chevron-down,.ti-chevron-up"); if (ch) { ch.classList.toggle("ti-chevron-up", apri); ch.classList.toggle("ti-chevron-down", !apri); }
    if (ultimoLive) ultimoLive.html = APP.innerHTML;
    return;
  }
  const tb = e.target.closest("[data-tab]");
  if (tb) {
    const id = tb.dataset.tab, box = document.getElementById("tb" + id), ch = tb.querySelector(".ti-chevron-down,.ti-chevron-up"); if (!box) return;
    if (!box.hidden) { box.hidden = true; ch && ch.classList.replace("ti-chevron-up", "ti-chevron-down"); return; }
    box.hidden = false; ch && ch.classList.replace("ti-chevron-down", "ti-chevron-up");
    if (!tabelliniCache[id]) {
      box.innerHTML = skel();
      try {
        const R = await api("/api/tabellino?id=" + id, 120);
        tabelliniCache[id] = formazioniLive(ultimoD || { squadre: {} }, { giocatori: R.giocatori || [], casa: tb.dataset.casa || R.casa, trasf: tb.dataset.trasf || R.trasf }) + `<a class="btn" style="display:block;text-align:center" href="#/partita/${id}">Apri lo studio di questa partita</a>`;
      } catch { box.innerHTML = `<div class="vuoto">Tabellino non disponibile, riprova tra poco.</div>`; return; }
    }
    box.innerHTML = tabelliniCache[id]; return;
  }
  const d = e.target.closest("[data-delm]");
  if (d) { // doppio tocco per confermare
    if (d.dataset.sicuro) { ls.set("registro", ls.get("registro", []).filter((r) => r.id !== d.dataset.delm)); if (location.hash.startsWith("#/live")) { clearTimeout(timer); vistaLive(false); } return; }
    d.dataset.sicuro = "1"; d.textContent = "Tocca ancora per togliere"; setTimeout(() => { if (d.isConnected) { delete d.dataset.sicuro; d.textContent = "Rimuovi"; } }, 3500); return;
  }
  const b = e.target.closest("[data-add]"); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const l = PM.get(b.dataset.add); if (!l) return;
  let L = miaLeggi(); const i = L.findIndex((x) => x.id === l.id);
  if (i >= 0) L.splice(i, 1); else L.push(l);
  ls.set("mia", L); b.classList.toggle("on", i < 0); b.textContent = i < 0 ? "✓" : "+"; barraMia(); if (location.hash.startsWith("#/mia") && window.__miaAgg) window.__miaAgg();
}, true);
function cardPick(x) { return `<div class="card cardp"><div style="min-width:0"><div class="s">${esc(x.partita)} · ${esc(x.tipo)}</div><div style="font-weight:500">${esc(x.testo)}${x.dubbio ? ` <span class="s" style="color:${AM}">· in dubbio ${Math.round(x.dubbio * 100)}%</span>` : ""}</div></div><div><div class="v" style="color:${colProb(x.prob)}">${pct(x.prob)}</div><div class="e">stima ${esc(x.stima)}</div></div>${addBtn(x)}</div>`; }
function rigaPick(D, x) {
  const vis = x.pid ? foto(x.pid, 34) : x.squadra ? logo(x.squadra, 30) : `<span class="ph" style="width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center"><i class="ti ti-chart-bar" style="color:${OR}"></i></span>`;
  return `<div class="pick">${anello(x.prob * 100, colProb(x.prob), 48)}${vis}<div style="min-width:0"><div class="t">${esc(x.testo)}</div><div class="s">${esc(x.partita)}${x.dubbio ? ` · <span style="color:${AM}">in dubbio (gioca col ${Math.round(x.dubbio * 100)}%)</span>` : ""}</div></div>${addBtn(x)}</div>`;
}
function topBar(D) {
  const ora = D && D.aggiornato ? new Date(D.aggiornato).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";
  return `<div class="top"><img class="logo" src="/icon-192.png" alt=""><div><div class="nome">NBA Schedine</div><div class="s">Studio e consigli sul basket${ora ? " · agg. " + ora : ""}</div></div></div>`;
}
const GS = ["DOM", "LUN", "MAR", "MER", "GIO", "VEN", "SAB"], MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const fmtET = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" });
function etGiorno(off) {
  const [y, m, d] = fmtET.format(new Date(Date.now() + off * 86400000)).split("-").map(Number);
  return { ymd: `${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}`, y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}
function giorniChips() {
  const sel = typeof giorno === "string" ? giorno : etGiorno(giorno).ymd;
  const selM = +sel.slice(4, 6), selY = sel.slice(0, 4);
  const celle = [];
  for (let o = -3; o <= 7; o++) celle.push([o, etGiorno(o)]);
  const fuori = !celle.some(([, g]) => g.ymd === sel);
  const extra = fuori ? `<button class="dd on" data-d="${sel}"><span class="dw">${GS[new Date(Date.UTC(+selY, selM - 1, +sel.slice(6, 8))).getUTCDay()]}</span><b>${+sel.slice(6, 8)}</b><span class="oo"></span></button>` : "";
  return `<div class="riga" style="margin:2px 0 8px"><b style="font-size:15px">${MESI[selM - 1]} ${selY}</b><label class="cal chipbtn"><i class="ti ti-calendar"></i> Calendario<input type="date" id="cal" value="${selY}-${String(selM).padStart(2, "0")}-${sel.slice(6, 8)}"></label></div>
  <div class="strip" id="strip">${extra}${celle.map(([o, g]) => `<button class="dd${g.ymd === sel ? " on" : ""}${o === 0 ? " today" : ""}" data-g="${o}"><span class="dw">${GS[g.dow]}</span><b>${g.d}</b><span class="oo">${o === 0 ? "Oggi" : ""}</span></button>`).join("")}</div>`;
}
function bindGiorni() {
  APP.querySelectorAll("[data-g]").forEach((b) => b.onclick = () => { giorno = +b.dataset.g; ls.set("giorno", giorno); route(); });
  APP.querySelectorAll("[data-d]").forEach((b) => b.onclick = () => { giorno = b.dataset.d; ls.set("giorno", giorno); route(); });
  const c = $("#cal"); if (c) c.onchange = () => { if (c.value) { giorno = c.value.replaceAll("-", ""); ls.set("giorno", giorno); route(); } };
  const st = $("#strip"), on = st && st.querySelector(".dd.on");
  if (on) st.scrollLeft = on.offsetLeft - st.clientWidth / 2 + on.offsetWidth / 2;
}
const skel = () => `<div class="skel"></div><div class="skel"></div><div class="skel"></div>`;
const errBox = (e) => `<div class="err"><b>Non riesco a caricare i dati.</b><br>${esc(e.message || e)}<br><button class="btn" style="margin-top:10px" onclick="route(true)">Riprova</button></div>`;


// parziali per quarto
function tabQuarti(p, D) {
  const a = p.qTr || [], b = p.qCasa || []; if (!a.length && !b.length) return "";
  const n = Math.max(a.length, b.length, 4), cur = p.stato === "in" ? (p.periodo || 0) : 0;
  const nm = (i) => (i < 4 ? "Q" + (i + 1) : i === 4 ? "OT" : "OT" + (i - 3));
  const riga = (ab, q, tot) => `<tr><td><b>${esc(ab)}</b></td>${Array.from({ length: n }, (_, i) => `<td class="${cur === i + 1 ? "cur" : ""}">${q[i] ?? "–"}</td>`).join("")}<td class="tot">${tot ?? 0}</td></tr>`;
  return `<table class="qt"><tr><th></th>${Array.from({ length: n }, (_, i) => `<th>${nm(i)}</th>`).join("")}<th>TOT</th></tr>${riga(p.casa, b, p.ptCasa)}${riga(p.trasf, a, p.ptTr)}</table>`;
}
// illumina la squadra che ha appena segnato (confronta con l'ultimo punteggio visto)
const ultimiPt = {};
function illumina(card, id, ptTr, ptCasa) {
  const prima = ultimiPt[id]; ultimiPt[id] = [ptTr, ptCasa]; if (!prima || !card) return;
  [[0, ptTr, "t"], [1, ptCasa, "c"]].forEach(([i, v, lato]) => {
    const d = v - prima[i]; if (!(d > 0)) return;
    const tm = card.querySelector(`.tm[data-l="${lato}"]`) || card.querySelectorAll(".tm")[lato === "t" ? 0 : 1]; if (!tm) return;
    tm.dataset.plus = "+" + d; tm.classList.remove("glow"); void tm.offsetWidth; tm.classList.add("glow");
  });
}
function schedaPartita(D, p, topPick, cliccabile) {
  const t = T(D, p.casa), v = T(D, p.trasf), r = p.r;
  let chip, col = MU;
  if (p.stato === "post") { chip = "Finale"; col = GR; } else if (p.stato === "in") { chip = `<span class="dot"></span>Live · ${esc(p.dettaglio)}`; col = OR; } else chip = esc(p.ora);
  const fav = r.margine > 0 ? p.casa : p.trasf;
  const cc = t.c, ct = v.c.toLowerCase() === cc.toLowerCase() ? "#5a6378" : v.c;
  const team = (ab, ruolo, stima, l) => `<div class="tm" data-l="${l}">${cliccabile ? logo(ab, 54) : `<a href="#/squadra/${esc(ab)}" aria-label="Pagina ${esc(ab)}" style="display:block;position:relative">${logo(ab, 54)}<span class="nwb"><i class="ti ti-chevron-right"></i></span></a>`}<div class="tn">${esc(T(D, ab).b)}</div><div class="s">${ruolo}</div><div class="st">${stima.toFixed(0)} <span>stimati</span></div></div>`;
  const centro = p.stato === "pre"
    ? `<div class="mid"><div class="ora">${esc(String(p.ora).slice(-5))}</div><div class="s">${esc(String(p.ora).slice(0, 5))}</div></div>`
    : `<div class="mid"><div class="sc"><span class="big${p.stato === "in" ? " liveN" : ""}" data-sc="c">${p.ptCasa ?? 0}</span><i>-</i><span class="big${p.stato === "in" ? " liveN" : ""}" data-sc="t">${p.ptTr ?? 0}</span></div></div>`;
  let chips = `<span class="chip">Totale ${r.totale.toFixed(0)}</span>`;
  if (topPick) chips += `<span class="chip" style="color:${GR}">${esc(topPick.testo)} · ${pct(topPick.prob)}</span>`;
  for (const s of [p.casa, p.trasf]) if ((D.b2b || []).includes(s)) chips += `<span class="chip" style="color:${AM}">${esc(T(D, s).b)} back-to-back</span>`;
  if (cliccabile) {
    const favC = r.pw >= 0.5, lato = (ab, ruolo, n) => `<div class="cl ${ruolo}">${logo(ab, 34)}<div class="tn"><b class="n12${p.stato === "pre" && (n === 1) === favC ? " fv" : ""}">${n}</b>${esc(ab)}${stella("sq", ab)}</div></div>`;
    const mezzo = p.stato === "pre"
      ? `<div class="cm"><span class="w">${pct(r.pw)}</span><i>-</i><span class="w">${pct(1 - r.pw)}</span></div>`
      : `<div class="cm"><span class="big${p.stato === "in" ? " liveN" : ""}" data-sc="c">${p.ptCasa ?? 0}</span><i>-</i><span class="big${p.stato === "in" ? " liveN" : ""}" data-sc="t">${p.ptTr ?? 0}</span></div>`;
    const q = (p.qTr || []).length ? `<div class="qr" data-qt>${(p.qTr || []).map((v, i) => `<span class="${p.stato === "in" && p.periodo === i + 1 ? "cur" : ""}">Q${i + 1} ${(p.qCasa || [])[i] ?? 0}-${v}</span>`).join("")}</div>` : "";
    const fin = p.stato === "post";
    return `<${fin ? "div" : "a"} class="card gm cmp${p.stato === "in" ? " inlive" : ""}"${fin ? ` data-tab="${p.id}" data-casa="${p.casa}" data-trasf="${p.trasf}"` : ` href="#/partita/${p.id}"`} data-gid="${p.id}" data-st="${p.stato}" style="--ca:${ct};--cb:${cc}${fin ? ";cursor:pointer" : ""}">
  <div class="riga" style="margin-bottom:4px"><span style="display:flex;align-items:center;gap:4px"><span class="pill" data-pill style="color:${col}">${chip}</span>${p.stato === "post" ? "" : campana(p.id)}</span><span class="s">${p.stato === "pre" ? `stimati ${r.ptCasa.toFixed(0)}-${r.ptTr.toFixed(0)}` : fin ? "Tabellino" : "Studia"} <i class="ti ${fin ? "ti-chevron-down" : "ti-chevron-right"}"></i></span></div>
  <div class="cg"><div class="tm cr" data-l="c">${lato(p.casa, "ca", 1)}</div>${mezzo}<div class="tm cr" data-l="t">${lato(p.trasf, "tr", 2)}</div></div>${q}
  <div class="bar" style="margin:6px 0 6px"><div style="width:${(r.pw * 100).toFixed(0)}%;background:${cc}"></div><div style="flex:1;background:${ct}"></div></div>${chips}</${fin ? "div" : "a"}>${fin ? `<div class="tabl" id="tb${p.id}" hidden></div>` : ""}`;
  }
  const tag = cliccabile ? "a" : "div", href = cliccabile ? ` href="#/partita/${p.id}"` : "";
  return `<${tag} class="card gm${p.stato === "in" ? " inlive" : ""}"${href} data-gid="${p.id}" data-st="${p.stato}" style="--ca:${ct};--cb:${cc}">
  <div class="riga" style="margin-bottom:10px"><span style="display:flex;align-items:center;gap:4px"><span class="pill" data-pill style="color:${col}">${chip}</span>${p.stato === "post" ? "" : campana(p.id)}</span>${cliccabile ? `<span class="s">Studia <i class="ti ti-chevron-right"></i></span>` : ""}</div>
  <div class="mu">${team(p.casa, "casa", r.ptCasa, "c")}${centro}${team(p.trasf, "trasferta", r.ptTr, "t")}</div>${p.stato !== "pre" ? `<div data-qt>${tabQuarti(p, D)}</div>` : ""}
  <div class="bar"><div style="width:${(r.pw * 100).toFixed(0)}%;background:${cc}"></div><div style="flex:1;background:${ct}"></div></div>
  <div class="riga s" style="margin:4px 0 8px"><b style="color:#e8eaf0">1 · ${pct(r.pw)}</b><b style="color:#e8eaf0">${pct(1 - r.pw)} · 2</b></div>${chips}</${tag}>`;
}
const raggruppa = (picks) => [["Molto probabili (80% o più)", picks.filter((x) => x.prob >= 0.8)], ["Probabili (70-80%)", picks.filter((x) => x.prob >= 0.7 && x.prob < 0.8)], ["Da valutare (sotto il 70%)", picks.filter((x) => x.prob < 0.7)]];

function confrontoMercato(D) {
  if (!D.partite.length) return "";
  if (!D.valore || !D.valore.length) return "";
  return `<h2>Modello contro bookmaker</h2><div class="cap" style="margin-top:0">Giocatori dove il nostro calcolo, unito al mercato, vede più probabilità di quelle dei bookmaker. Il mercato di solito è più preciso: usalo come segnale da verificare, non come certezza.</div>` +
    D.valore.slice(0, 8).map((v) => `<div class="card riga" style="gap:10px;padding:10px 12px"><div class="lg" style="flex:1;min-width:0">${foto(v.pid, 36)}<div style="min-width:0"><div style="font-weight:600">${esc(v.nome)} ${v.lato} ${v.linea}</div><div class="s">${esc(v.mercato)} · ${esc(v.partita)} · ${divTag(v.div)}</div></div></div><div style="text-align:right"><div style="font-size:19px;font-weight:600;color:${colProb(v.pFin)}">${pct(v.pFin)}</div><div class="s">mercato ${pct(v.pMk)} · modello ${pct(v.pMod)}</div></div></div>`).join("");
}
function migliori(D) {
  const viste = new Set(), scelte = [];
  for (const x of D.picks) {
    if (x.prob < 0.74) break;
    const k = x.g + x.tipo;
    if (viste.has(k)) continue;
    viste.add(k); scelte.push(x);
    if (scelte.length >= 8) break;
  }
  if (!scelte.length) return "";
  return `<div class="riga" style="margin:14px 0 8px"><h2 style="margin:0">Migliori giocate</h2><a class="s" href="#/combo" style="color:var(--or)">Vedi tutte <i class="ti ti-chevron-right"></i></a></div>
  <div class="strip hscroll">${scelte.map((x, i) => `<a class="best${i === 0 ? " top" : ""}" href="#/partita/${x.g}">
    <div class="riga"><span class="tag">${i === 0 ? "★ La più forte" : esc(x.tipo)}</span>${anello(x.prob * 100, colProb(x.prob), 46)}</div>
    <div class="lg" style="margin:10px 0 4px">${x.pid ? foto(x.pid, 40) : x.squadra ? logo(x.squadra, 36) : `<span class="ph" style="width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center"><i class="ti ti-chart-bar" style="color:${OR}"></i></span>`}<div class="bt" style="margin:0">${esc(x.testo)}</div></div><div class="s">${esc(x.partita)}</div><div class="s" style="margin-top:6px">Stima ${esc(x.stima)}</div></a>`).join("")}</div>`;
}

