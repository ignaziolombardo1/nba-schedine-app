"use strict";
const $ = (s, r = document) => r.querySelector(s);
const APP = $("#app");
const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let OR = "#ff8a2a"; const GR = "#3ddc84", RD = "#ff5d5d", AM = "#ffb066", MU = "#8b93a5";
const ls = { get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set: (k, v) => { try {
  if (k === "registro" || k === "mov") { // ricorda cosa è stato tolto, così la sincronizzazione non lo rimette
    const ids = new Set((v || []).map((r) => String(r.id))), dl = ls.get("delIds", []); for (const r of ls.get(k, [])) if (r && r.id != null && !ids.has(String(r.id))) dl.push(String(r.id));
    localStorage.setItem("delIds", JSON.stringify([...new Set(dl)].slice(-400))); clearTimeout(window._st); window._st = setTimeout(() => sincReg(), 1500);
  }
  localStorage.setItem(k, JSON.stringify(v)); if (k === "registro") setTimeout(() => aggiornaBadge(), 0); } catch {} } };
// blocca lo zoom a pizzico di iOS (che ignora user-scalable)
for (const ev of ["gesturestart", "gesturechange", "gestureend"]) document.addEventListener(ev, (e) => e.preventDefault());
const GIORNI = [["Ieri", -1], ["Oggi", 0], ["Domani", 1], ["Dopodomani", 2]];
const MERC = { Punti: { k: "pts", u: "pt" }, Rimbalzi: { k: "reb", u: "rimb." }, Assist: { k: "ast", u: "ass." } };
const SC = [["Punti giocatori", "ti-target", ["Punti"]], ["Assist", "ti-users", ["Assist"]], ["Rimbalzi", "ti-arrows-up-down", ["Rimbalzi"]], ["Totali partita", "ti-chart-bar", ["Totale"]], ["Punti squadre", "ti-shield", ["Squadra"]], ["Vincente", "ti-trophy", ["Vincente"]]];

// ---------- matematica
function erf(x) { const s = x < 0 ? -1 : 1; x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)); }
const phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
const pct = (p) => Math.round(p * 100) + "%";

// ---------- dati
let giorno = ls.get("giorno", 0);
if (typeof giorno !== "number" && !/^\d{8}$/.test(String(giorno))) giorno = 0;
const IMP0 = { soglia: 0.70, mercati: { Punti: true, Rimbalzi: true, Assist: true, Totale: true, Squadra: true, Vincente: true }, puntata: 5, bankroll: 100, kelly: 0.25, nGioc: 3 };
const impo = () => { const i = ls.get("imp", {}); return { ...IMP0, ...i, mercati: { ...IMP0.mercati, ...(i.mercati || {}) } }; };
function applicaImp(D) { const i = impo(); if (!D || !D.picks) return D; const ok = D.picks.filter((x) => x.prob >= i.soglia && i.mercati[x.tipo] !== false), n = {}, N = i.nGioc || 3;
  // al massimo N giocatori per squadra e per categoria (i più probabili), così si vedono più puntate sui giocatori
  const ord = ok.slice().sort((a, b) => b.prob - a.prob), tieni = new Set();
  for (const x of ord) { if (!x.pid) { tieni.add(x); continue; } const k = x.g + "|" + x.squadra + "|" + x.tipo; if ((n[k] = (n[k] || 0) + 1) <= N) tieni.add(x); }
  return { ...D, picks: ok.filter((x) => tieni.has(x)) }; }
const cache = {};
function salvaLocale(k, d) {
  const val = JSON.stringify({ t: Date.now(), d });
  try { localStorage.setItem("D|" + k, val); } catch { try { Object.keys(localStorage).filter((x) => x.startsWith("D|")).forEach((x) => localStorage.removeItem(x)); localStorage.setItem("D|" + k, val); } catch {} }
}
function cacheLocale(k) { try { const o = JSON.parse(localStorage.getItem("D|" + k) || "null"); return o && Date.now() - o.t < 12 * 3600e3 ? o.d : null; } catch { return null; } }
async function api(path, ttl = 0) {
  const c = cache[path];
  if (c && Date.now() - c.t < ttl) return c.d;
  const r = await fetch(path);
  const txt = await r.text(); let d; try { d = JSON.parse(txt); } catch { throw new Error(/^\s*<(!doctype|html)/i.test(txt) ? `Il server è momentaneamente sovraccarico o non raggiungibile (errore ${r.status}). Riprova tra qualche secondo.` : `Il server ha risposto con un errore (${r.status}): ${String(txt).replace(/\s+/g, " ").slice(0, 120) || "risposta vuota"}`); }
  if (!r.ok || d.errore) throw new Error(d.errore || "Errore " + r.status);
  cache[path] = { t: Date.now(), d };
  if (path.startsWith("/api/giorno")) salvaLocale(path, d);
  return d;
}
const qs = () => "d=" + (typeof giorno === "number" ? etGiorno(giorno).ymd : giorno);
// se i dati nuovi non arrivano si mostrano gli ultimi salvati (con l'avviso) e si riprova da soli
const dati = async (force) => { const D = await datiBase(force); window.__D = D; return D; };
const datiBase = async (force) => {
  if (force) delete cache["/api/giorno?" + qs()];
  try { return applicaImp(await api("/api/giorno?" + qs(), 40000)); }
  catch (e) { const k = "/api/giorno?" + qs(), o = (() => { try { return JSON.parse(localStorage.getItem("D|" + k) || "null"); } catch { return null; } })(); if (o && o.d && Date.now() - o.t < 36 * 3600e3) return applicaImp({ ...o.d, erroreAgg: String(e.message || e), salvatoAlle: o.t }); throw e; }
};
const bannerErrore = (D) => D.erroreAgg ? `<div class="err" style="margin-bottom:10px"><b>Non riesco ad aggiornare.</b> Ti mostro i dati salvati alle ${new Date(D.salvatoAlle).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}.<div class="s" style="margin-top:4px">${esc(D.erroreAgg)}</div><button class="btn" style="margin-top:8px" onclick="route(true)">Riprova ora</button></div>` : "";

// ---------- pezzi grafici
const T = (D, ab) => (D.squadre && D.squadre[ab]) || { n: ab, b: ab, c: "#4a5060" };
const logo = (ab, s = 38) => { const a = esc(String(ab)); return `<img class="tl" style="width:${s}px;height:${s}px" loading="lazy" alt="" src="https://a.espncdn.com/i/teamlogos/nba/500/${a.toLowerCase()}.png" data-ab="${a}" onerror="this.outerHTML='<span class=tlf style=width:${s}px;height:${s}px;font-size:${Math.max(9, Math.round(s / 3.4))}px>'+this.dataset.ab.slice(0,3)+'</span>'">`; };
const foto = (pid, s = 46) => pid ? `<img class="ph" style="width:${s}px;height:${s}px" loading="lazy" alt="" src="https://a.espncdn.com/i/headshots/nba/players/full/${esc(pid)}.png" onerror="this.style.visibility='hidden'">` : `<span class="ph" style="width:${s}px;height:${s}px;display:inline-block"></span>`;
function anello(p, col, size = 52) {
  const r = size / 2 - 5, L = 2 * Math.PI * r, c = size / 2;
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#232836" stroke-width="6"/><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(L * p / 100).toFixed(1)} ${L.toFixed(1)}" transform="rotate(-90 ${c} ${c})"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" fill="#f2f2f2" font-size="${size > 60 ? 18 : 13}" font-weight="600">${Math.round(p)}%</text></svg>`;
}
const colProb = (p) => (p >= 0.85 ? "#3ddc84" : p >= 0.78 ? "#9be564" : p >= 0.72 ? "#ffc24a" : OR);

// ---- aggiornamento "morbido": confronta il nuovo HTML con quello già in pagina e tocca solo ciò che è cambiato (logo e foto non si ricaricano, niente lampeggio)
function morph(el, html) {
  const t = document.createElement("template"); t.innerHTML = html; morphFigli(el, t.content);
}
function morphFigli(a, b) {
  const A = [...a.childNodes], B = [...b.childNodes];
  for (let i = 0; i < B.length; i++) {
    if (!A[i]) { a.appendChild(B[i]); continue; }
    const x = A[i], y = B[i];
    if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName) { x.replaceWith(y); continue; }
    if (x.nodeType !== 1) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; continue; }
    if (x === document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(x.nodeName)) continue;
    for (const at of [...x.attributes]) if (!y.hasAttribute(at.name) && !(x.nodeName === "DETAILS" && at.name === "open")) x.removeAttribute(at.name);
    for (const at of [...y.attributes]) if (x.getAttribute(at.name) !== at.value && !(x.nodeName === "DETAILS" && at.name === "open")) x.setAttribute(at.name, at.value);
    morphFigli(x, y);
  }
  for (let i = A.length - 1; i >= B.length; i--) A[i].remove();
}
