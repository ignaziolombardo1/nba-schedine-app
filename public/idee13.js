// NBA Schedine - idee13.js: «Chiedi all'app» dentro Pronostici: quadrati da toccare, la risposta compare subito sotto
"use strict";

const TESSERE = [
  ["ti-star", "Migliori giocate", "Migliori giocate"], ["ti-flame", "Combo", "Combo con le favorite"], ["ti-trophy", "Chi vince", "Chi vince?"],
  ["ti-target", "Chi fa 25 punti", "Chi fa 25 punti stasera?"], ["ti-stack-2", "Doppia doppia", "Doppia doppia stasera"], ["ti-user-star", "Chi segna di più", "Chi segna di più?"],
  ["ti-chart-bar", "Più punti", "Partite con più punti"], ["ti-scale", "Equilibrate", "Partite più equilibrate"], ["ti-first-aid-kit", "Chi è fuori", "Chi è fuori?"],
  ["ti-clock", "Orari", "Che partite ci sono?"],
];
function chiediBlocco() {
  return `<div class="sub" style="margin-top:10px">Chiedi all'app</div><div class="grid2" id="pqt">${TESSERE.map(([ic, t, q]) => `<button class="card pq" data-pq="${esc(q)}" style="padding:12px;text-align:left;font:inherit;color:inherit"><i class="ti ${ic}" style="color:var(--or);font-size:20px"></i><div style="font-weight:600;margin-top:4px">${esc(t)}</div></button>`).join("")}</div>
  <div class="card" style="padding:8px 12px;display:flex;gap:8px;align-items:center"><input class="linea" id="pqi" placeholder="Scrivi una domanda, per esempio: combo con i Lakers" style="margin:0;flex:1" enterkeyhint="search"><button class="btn" id="pqv" style="width:auto;margin:0;padding:8px 14px">Chiedi</button></div><div id="pqr"></div>`;
}
const _riquadriConsigli0 = riquadriConsigli;
riquadriConsigli = function (D) { return _riquadriConsigli0(D) + chiediBlocco(); };

async function chiediQui(q) {
  const box = document.getElementById("pqr"); if (!box || !q) return;
  box.innerHTML = `<div class="cap">Cerco…</div>`;
  let D; try { D = await dati(); } catch (e) { box.innerHTML = errBox(e); return; }
  const r = rispondi(D, q);
  box.innerHTML = `<div class="sub" style="margin-top:8px;display:flex;justify-content:space-between;gap:8px"><span>${esc(r.t)}</span><a id="pqx" style="color:var(--or);font-size:12px;white-space:nowrap">Chiudi</a></div>` +
    (r.l || []).map((o) => `<a class="card riga" href="${o.href}" style="padding:10px 12px;color:inherit;gap:10px"><div style="min-width:0"><b>${esc(o.a)}</b><div class="s">${o.b}</div></div><b style="color:${o.c};white-space:nowrap">${esc(o.v)}</b></a>`).join("");
  const x = document.getElementById("pqx"); if (x) x.onclick = () => { box.innerHTML = ""; document.querySelectorAll(".pq.on").forEach((e) => e.classList.remove("on")); };
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
document.addEventListener("click", (e) => {
  const t = e.target.closest && e.target.closest("[data-pq]"); if (t) { document.querySelectorAll(".pq.on").forEach((x) => x.classList.remove("on")); t.classList.add("on"); const i = document.getElementById("pqi"); if (i) i.value = ""; chiediQui(t.dataset.pq); return; }
  if (e.target.closest && e.target.closest("#pqv")) { const i = document.getElementById("pqi"); if (i && i.value.trim()) { document.querySelectorAll(".pq.on").forEach((x) => x.classList.remove("on")); chiediQui(i.value.trim()); } }
});
document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target && e.target.id === "pqi" && e.target.value.trim()) { document.querySelectorAll(".pq.on").forEach((x) => x.classList.remove("on")); chiediQui(e.target.value.trim()); } });
