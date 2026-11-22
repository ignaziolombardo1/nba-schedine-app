// NBA Schedine - app.js (parte dell'app: i file si caricano in ordine da index.html, vedi CLAUDE.md)
"use strict";
// Versione dell'app: alzala a ogni modifica a public/ (insieme al nome cache in sw.js)
const VERSIONE = "125";
// ---------- router
let timer = null;
function route(force) {
  clearTimeout(timer); barraMia();
  const hsh = location.hash.replace(/^#/, "") || "/";
  const attivo = hsh.startsWith("/live") ? "live" : hsh.startsWith("/schedine") ? "schedine" : hsh.startsWith("/combo") || hsh.startsWith("/categoria") || hsh.startsWith("/mia") ? "consigli" : hsh.startsWith("/esiti") || hsh.startsWith("/storico") || hsh.startsWith("/conto") ? "storico" : hsh.startsWith("/diag") || hsh.startsWith("/statistiche") || hsh.startsWith("/registro") || hsh.startsWith("/impostazioni") ? "storico" : "partite";
  document.querySelectorAll("nav a").forEach((a) => a.classList.toggle("on", a.dataset.r === attivo));
  const cat = /^\/categoria\/(\d+)/.exec(hsh), m = /^\/partita\/(\d+)/.exec(hsh), gp = /^\/giocatore\/(\d+)/.exec(hsh);
  const rx = (window.RIDEE || []).find((r) => r[0].test(hsh));
  if (rx) rx[1](hsh.match(rx[0]));
  else if (hsh.startsWith("/impostazioni")) vistaImpostazioni();
  else if (hsh.startsWith("/calcolatore")) vistaCalcolatore();
  else if (hsh.startsWith("/registro")) vistaRegistro();
  else if (hsh.startsWith("/conto")) vistaConto();
  else if (hsh.startsWith("/classifica")) vistaClassifica();
  else if (hsh.startsWith("/calendario")) vistaCalendario();
  else if (/^\/news\/[A-Za-z]{2,4}$/.test(hsh)) vistaNews(hsh.split("/")[2].toUpperCase());
  else if (hsh.startsWith("/news")) vistaNews(null);
  else if (/^\/s\/[a-z0-9]+$/.test(hsh)) vistaCondivisa(hsh.split("/")[2]);
  else if (hsh.startsWith("/statistiche")) vistaStatistiche();
  else if (hsh.startsWith("/profilo")) vistaProfilo();
  else if (hsh.startsWith("/forma")) vistaForma();
  else if (hsh.startsWith("/seguiti")) vistaSeguiti();
  else if (hsh.startsWith("/stasera")) vistaStasera();
  else if (hsh.startsWith("/cerca")) vistaCerca();
  else if (hsh.startsWith("/infortunati")) vistaInfortunati();
  else if (/^\/squadra\/[A-Za-z]{2,4}$/.test(hsh)) vistaSquadra(hsh.split("/")[2].toUpperCase());
  else if (gp) vistaGiocatore(gp[1]);
  else if (m) vistaStudio(m[1], force === true);
  else if (attivo === "live") vistaLive(true);
  else if (attivo === "schedine") vistaSchedine(force === true);
  else if (hsh.startsWith("/mia")) vistaMia();
  else if (cat) vistaCategoria(+cat[1]);
  else if (hsh.startsWith("/combo")) vistaCombo(force === true);
  else if (hsh.startsWith("/esiti")) vistaEsiti();
  else if (hsh.startsWith("/diag")) vistaDiag();
  else if (attivo === "storico") vistaStorico();
  else vistaPartite(force === true);
  if (force !== true) window.scrollTo(0, 0); // apertura di una pagina: si parte dall'alto; un aggiornamento (force) tiene la posizione
}
window.route = route;
window.addEventListener("hashchange", () => route());
// Al ritorno nell'app non si ricarica la pagina: la pagina Partite si aggiorna in silenzio (senza tornare in cima), il Live riprende subito
let ultimoNascosto = Date.now();
document.addEventListener("visibilitychange", async () => {
  if (document.hidden) { ultimoNascosto = Date.now(); return; }
  const h = location.hash.replace(/^#/, "") || "/";
  aggiornaRegistro();
  if (h.startsWith("/live")) { clearTimeout(timer); vistaLive(false); return; }
  if (h === "/" && Date.now() - ultimoNascosto > 30000) {
    try {
      const D = await dati(true);
      if ((location.hash.replace(/^#/, "") || "/") !== "/") return;
      if (firmaDati(D) === firmaHome) return; // niente è cambiato: non ridisegnare
      clearTimeout(timer); const y = window.scrollY; disegnaPartite(D, true); window.scrollTo(0, y);
    } catch {}
  }
});
// il pulsante schedina si nasconde mentre scorri e torna quando ti fermi
{ let tm = null; window.addEventListener("scroll", () => { const b = document.getElementById("miabar"); if (!b) return; b.classList.add("nasc"); clearTimeout(tm); tm = setTimeout(() => b.classList.remove("nasc"), 700); }, { passive: true }); }
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
// Se il telefono chiude la pagina in secondo piano e la riapre da zero, si torna dove eri (pagina e posizione) entro 30 minuti
const salvaPosizione = () => ls.set("ult", { h: location.hash, y: window.scrollY, t: Date.now() });
document.addEventListener("visibilitychange", () => { if (document.hidden) salvaPosizione(); });
window.addEventListener("pagehide", salvaPosizione);
let ripristinaY = null;
{ const u = ls.get("ult", null); if (u && Date.now() - u.t < 30 * 60000 && (!location.hash || location.hash === "#/") && u.h && u.h !== "#/") { location.hash = u.h; ripristinaY = u.y; } else if (u && Date.now() - u.t < 30 * 60000 && (!location.hash || location.hash === "#/")) ripristinaY = u.y; }
route();
applicaAspetto(); applicaNotte(); applicaDivano(); applicaDensita(); applicaProfilo(); aggiornaBadge(); setTimeout(() => { sincReg(); aggiornaRegistro(); sincPref(); }, 2500);
setTimeout(() => { try { festeggia(); } catch {} }, 3500);
if (ripristinaY) for (const ms of [500, 1200, 2500]) setTimeout(() => window.scrollTo(0, ripristinaY), ms);
