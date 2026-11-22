// NBA Schedine - idee10.js: Live più ricca (striscia dei punteggi, scheda con etichette, giocatori delle mie giocate evidenziati, animazioni)
"use strict";

// giocatori e squadre che hanno una giocata aperta nelle mie schedine
function mieiPid() {
  const s = new Set();
  try { for (const r of ls.get("registro", [])) if (r.esito == null) for (const l of r.legs || []) if (l.pid) s.add(String(l.pid)); } catch {}
  try { for (const l of miaLeggi()) if (l.pid) s.add(String(l.pid)); } catch {}
  return s;
}
function mieiGare() {
  const s = new Set();
  try { for (const r of ls.get("registro", [])) if (r.esito == null) for (const l of r.legs || []) if (l.g) s.add(String(l.g)); } catch {}
  try { for (const l of miaLeggi()) if (l.g) s.add(String(l.g)); } catch {}
  return s;
}

// 1. striscia fissa con tutte le partite in corso
function stripLive(D) {
  if (!D.partite.length) return "";
  const mie = mieiGare();
  const it = D.partite.map((p) => {
    const diff = Math.abs((p.ptCasa || 0) - (p.ptTr || 0)), clutch = p.periodo >= 4 && p.f >= 0.85 && diff <= 6;
    return `<a class="lvs${mie.has(String(p.id)) ? " mia" : ""}${clutch ? " cl" : ""}" data-vai="${p.id}">${logo(p.casa, 18)}<b>${p.ptCasa}</b><i>-</i><b>${p.ptTr}</b>${logo(p.trasf, 18)}<span class="s">${esc(String(p.dettaglio || "").replace(/^Live ·\s*/, ""))}</span></a>`;
  }).join("");
  return `<div class="lvstrip">${it}</div>`;
}
document.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest("[data-vai]"); if (!a) return;
  const c = document.querySelector(`[data-lg="${a.dataset.vai}"]`); if (c) c.scrollIntoView({ behavior: "smooth", block: "start" });
});

// 2. scheda partita: etichetta "punto a punto" / "decisa", punteggio grande
const _schedaLive0 = schedaLive;
schedaLive = function (D, p) {
  let h = _schedaLive0(D, p);
  const diff = Math.abs((p.ptCasa || 0) - (p.ptTr || 0)), fin = p.f >= 0.85 && p.periodo >= 4;
  let et = "";
  if (fin && diff <= 6) et = `<span class="lvet" style="color:${OR};border-color:${OR}"><i class="ti ti-flame"></i> Finale punto a punto</span>`;
  else if (p.f >= 0.7 && diff >= 20) et = `<span class="lvet" style="color:${MU};border-color:${MU}"><i class="ti ti-flag"></i> Partita decisa</span>`;
  else if (p.periodo > 4) et = `<span class="lvet" style="color:${AM};border-color:${AM}"><i class="ti ti-clock-plus"></i> Supplementari</span>`;
  const mie = mieiGare().has(String(p.id)) ? `<span class="lvet" style="color:${GR};border-color:${GR}"><i class="ti ti-ticket"></i> Hai una giocata</span>` : "";
  h = h.replace('<div class="cg">', `<div class="lvets">${et}${mie}</div><div class="cg">`); // il contenitore c'è sempre: la struttura non cambia e le immagini non si ricaricano
  return h;
};

// 3. nel box score: evidenzia chi è nelle mie giocate
const _formazioniLive0 = formazioniLive;
formazioniLive = function (D, p) {
  const h = _formazioniLive0(D, p), mp = mieiPid(); if (!mp.size) return h;
  const nomi = new Set(p.giocatori.filter((g) => g.pid && mp.has(String(g.pid))).map((g) => g.nome)); if (!nomi.size) return h;
  return h.replace(/<tr class="([^"]*)"><td class="nm"><div class="nmi">(.*?)<\/div><\/td>/g, (m, c, inner) => {
    const mio = [...nomi].some((n) => { const q = n.split(" "), br = q.length > 1 ? q[0][0] + ". " + q.slice(1).join(" ") : n; return inner.includes(esc(br)); });
    return mio ? `<tr class="${c} mio"><td class="nm"><div class="nmi">${inner}</div></td>` : m;
  });
};

// 4. animazioni: il numero del punteggio "salta" quando sale; vibrazione quando una giocata viene presa
const _illumina0 = illumina;
illumina = function (card, id, ptTr, ptCasa) {
  const prima = ultimiPt[id]; _illumina0(card, id, ptTr, ptCasa);
  if (!prima || !card) return;
  const n = card.querySelectorAll(".liveN"); // [casa, trasferta]
  [[n[0], ptCasa, prima[1]], [n[1], ptTr, prima[0]]].forEach(([el, v, pv]) => { if (el && v > pv) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); } });
};
const _aggStoria0 = aggiornaStoriaLive;
aggiornaStoriaLive = function (D) {
  const n0 = eventiLive.length; _aggStoria0(D);
  if (eventiLive.length > n0 && eventiLive.slice(n0).some((e) => e.ok)) { try { navigator.vibrate && navigator.vibrate([70, 40, 70]); } catch {} }
};
