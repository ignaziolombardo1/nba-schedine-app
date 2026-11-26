// NBA Schedine - idee15.js: Pronostici divisi per partita (v138). La vista «Per tipo» resta quella di prima.
"use strict";
const ORD15 = ["Vincente", "Totale", "Squadra", "Punti", "Rimbalzi", "Assist"], NOMI15 = { Vincente: "Chi vince", Totale: "Punti totali", Squadra: "Punti delle squadre", Punti: "Punti giocatori", Rimbalzi: "Rimbalzi", Assist: "Assist" };
const _vistaCombo15 = vistaCombo;
vistaCombo = async function (force) {
  if (ls.get("pronVista", "partita") !== "partita") { await _vistaCombo15(force); aggiungiToggle15(); return; }
  APP.innerHTML = topBar() + giorniChips() + skel(); bindGiorni();
  let D; try { D = await dati(force); } catch (e) { APP.innerHTML = topBar() + giorniChips() + errBox(e); bindGiorni(); return; }
  const rango = (p) => (p.stato === "post" ? 2e12 : 0) + Date.parse(p.iso || 0) || 0, partite = [...D.partite].sort((a, b) => rango(a) - rango(b));
  let h = topBar(D) + giorniChips() + toggle15();
  if (!partite.length) h += `<div class="vuoto">Nessuna partita per questo giorno.</div>`;
  else {
    h += `<div class="idx15">${partite.map((p) => `<button class="chipbtn" data-j="${esc(p.id)}">${logo(p.casa, 18)}<span>${esc(p.casa)}-${esc(p.trasf)}</span>${logo(p.trasf, 18)}</button>`).join("")}</div>`;
    h += `<div class="cap">Una sezione per partita, in ordine di orario. Dentro ogni partita le giocate sono divise per tipo, dalla più probabile.</div>`;
    for (const p of partite) {
      const L = D.picks.filter((x) => x.g === p.id), t = T(D, p.casa), v = T(D, p.trasf);
      const chip = p.stato === "post" ? `<span style="color:${GR}">Finale${p.ptCasa != null ? " " + p.ptCasa + "-" + p.ptTr : ""}</span>` : p.stato === "in" ? `<span style="color:${OR}"><span class="dot"></span>Live · ${esc(p.dettaglio || "")}</span>` : `<span class="s">${esc(String(p.ora).slice(-5))}</span>`;
      const win = L.filter((x) => x.tipo === "Vincente").sort((a, b) => b.prob - a.prob)[0];
      h += `<section id="p15-${esc(p.id)}" class="p15" style="${p.stato === "post" ? "opacity:.78" : ""}"><a href="#/partita/${esc(p.id)}" class="card riga" style="color:inherit;margin-bottom:6px"><div class="lg">${logo(p.casa, 34)}<div><b>${esc(t.b)}</b><div class="s">casa</div></div></div><div style="text-align:center">${chip}${win ? `<div class="s">${esc(win.testo)} ${pct(win.prob)}</div>` : ""}</div><div class="lg" style="justify-content:flex-end;text-align:right"><div><b>${esc(v.b)}</b><div class="s">trasferta</div></div>${logo(p.trasf, 34)}</div></a>`;
      if (!L.length) h += `<div class="cap">Nessuna giocata sopra la soglia per questa partita.</div>`;
      for (const tipo of ORD15) {
        const l = L.filter((x) => x.tipo === tipo).sort((a, b) => b.prob - a.prob); if (!l.length) continue;
        h += `<div class="sub" style="margin:8px 0 4px">${NOMI15[tipo]} · ${l.length}</div>${l.slice(0, 3).map(cardPick).join("")}`;
        if (l.length > 3) h += `<details><summary>Altre giocate: ${NOMI15[tipo]} (${l.length - 3})</summary>${l.slice(3).map(cardPick).join("")}</details>`;
      }
      h += `<a class="btn" style="display:block;text-align:center;margin:8px 0 18px" href="#/partita/${esc(p.id)}">Studia ${esc(p.casa)}-${esc(p.trasf)}</a></section>`;
    }
  }
  h += `<details style="margin-top:10px"><summary><b>Scegli per tipo di giocata · Chiedi all'app</b></summary>${riquadriConsigli(D)}</details>`;
  APP.innerHTML = h; bindGiorni(); aggiungiToggle15();
  APP.querySelectorAll("[data-j]").forEach((b) => (b.onclick = () => { const e = document.getElementById("p15-" + b.dataset.j); if (e) e.scrollIntoView({ behavior: "smooth", block: "start" }); }));
};
function toggle15() { const v = ls.get("pronVista", "partita"); return `<div class="tabs" id="tg15" style="margin:8px 0"><button class="chipbtn${v === "partita" ? " on" : ""}" data-pv="partita">Per partita</button><button class="chipbtn${v === "tipo" ? " on" : ""}" data-pv="tipo">Per tipo</button></div>`; }
function aggiungiToggle15() {
  if (!document.getElementById("tg15")) { const c = APP.querySelector(".cap"); const d = document.createElement("div"); d.innerHTML = toggle15(); if (c) c.before(d.firstChild); else APP.appendChild(d.firstChild); }
  APP.querySelectorAll("[data-pv]").forEach((b) => (b.onclick = () => { ls.set("pronVista", b.dataset.pv); route(); }));
}
