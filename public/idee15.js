// NBA Schedine - idee15.js: Pronostici divisi per partita (v138). La vista «Per tipo» resta quella di prima.
"use strict";
const ORD15 = ["Vincente", "Totale", "Squadra", "Punti", "Rimbalzi", "Assist"], NOMI15 = { Vincente: "Chi vince", Totale: "Punti totali", Squadra: "Punti delle squadre", Punti: "Punti giocatori", Rimbalzi: "Rimbalzi", Assist: "Assist" };
const _vistaCombo15 = vistaCombo;
// colori della sfida: se le due squadre hanno colori simili, la trasferta prende un colore ben diverso
function rgb15(h) { const m = /^#?([0-9a-f]{6})$/i.exec(h || ""); if (!m) return [74, 80, 96]; const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
const dist15 = (a, b) => { const x = rgb15(a), y = rgb15(b); return Math.sqrt((x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2); };
function coloriSfida(D, p) {
  const c = T(D, p.casa).c, v = T(D, p.trasf).c; if (dist15(c, v) >= 120) return [c, v];
  const alt = ["#4aa3ff", "#ffffff", "#b06cff", "#ffd23f"].map((a) => [a, Math.min(dist15(a, c), 999)]).sort((a, b) => b[1] - a[1])[0][0];
  return [c, alt];
}
function intestazione15(D, p) {
  const [cc, cv] = coloriSfida(D, p), t = T(D, p.casa), v = T(D, p.trasf), L = D.picks.filter((x) => x.g === p.id && x.tipo === "Vincente").sort((a, b) => b.prob - a.prob)[0];
  const favCasa = p.r.margine > 0, pw = L ? Math.round(L.prob * 100) : null, pc = pw == null ? Math.round(phi(p.r.margine / 12) * 100) : favCasa ? pw : 100 - pw;
  const mid = p.stato === "post" ? `<div class="h15t" style="color:${GR}">Finale</div><div class="s">${p.ptCasa != null ? p.ptCasa + " - " + p.ptTr : ""}</div>` : p.stato === "in" ? `<div class="h15t" style="color:${OR}"><span class="dot"></span>LIVE</div><div class="s">${esc(p.dettaglio || "")}</div>` : `<div class="h15t">${esc(String(p.ora).slice(-5))}</div>`;
  const lato = (ab, nome, col, ruolo, destra) => `<div class="h15s" style="${destra ? "flex-direction:row-reverse;text-align:right" : ""}"><span class="h15l" style="border-color:${col}">${logo(ab, 34)}</span><div><div class="h15n">${esc(nome.toUpperCase())}</div><div class="s"><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${col};margin-right:4px"></i>${ruolo}</div></div></div>`;
  const marg = Math.abs(p.r.margine);
  return `<a href="#/partita/${esc(p.id)}" class="card h15" style="color:inherit"><div class="h15b"><i style="flex:${pc};background:${cc}"></i><i style="flex:${100 - pc};background:${cv}"></i></div><div class="h15r">${lato(p.casa, t.b, cc, "in casa", false)}<div style="text-align:center;flex:none">${mid}</div>${lato(p.trasf, v.b, cv, "in trasferta", true)}</div><div class="h15r" style="margin-top:8px"><b style="color:${cc}">${pc}%</b><span class="s" style="text-align:center">${esc(favCasa ? t.b : v.b)} favorita di ${marg.toFixed(1).replace(".", ",")} punti</span><b style="color:${cv}">${100 - pc}%</b></div></a>`;
}
function riga15(x) {
  const m = /^(.*?)( (?:over|under) .*)$/i.exec(x.testo || ""), nome = m ? `<b>${esc(m[1])}</b>${esc(m[2])}` : `<b>${esc(x.testo)}</b>`, col = colEsito(x, colProb(x.prob));
  let det = ""; try { det = quotaRow(x) + perche(x); } catch {}
  return `<details class="r15"><summary><span class="r15n">${nome}${x.dubbio ? ` <span style="color:${AM}">⚠</span>` : ""}${typeof rischioMin === "function" ? rischioMin(x) : ""}</span><span class="r15s">${esc(x.stima)}</span><b class="r15p" style="color:${col}">${segnoEsito(x)}${pct(x.prob)}</b>${addBtn(x)}</summary><div class="r15d">${det}</div></details>`;
}
function hero15(x) {
  if (!x) return "";
  let det = ""; try { det = perche(x); } catch {}
  return `<div class="card hero15"><div class="s" style="color:${OR};font-weight:600">★ La più sicura della partita</div><div class="riga" style="margin-top:6px;align-items:flex-start"><div style="min-width:0"><div style="font-size:17px;font-weight:700">${esc(x.testo)}${x.dubbio ? ` <span style="color:${AM}">⚠</span>` : ""}</div><div class="s">${esc(NOMI15[x.tipo] || x.tipo)} · stima ${esc(x.stima)}</div></div><b style="font-size:28px;color:${colEsito(x, colProb(x.prob))};line-height:1">${segnoEsito(x)}${pct(x.prob)}</b></div><div class="riga" style="margin-top:10px;justify-content:flex-start;gap:10px">${addBtn(x)}<span class="s">Aggiungi alla schedina</span></div><details style="margin-top:6px"><summary class="s" style="cursor:pointer">Perché questa giocata?</summary>${det}</details></div>`;
}
vistaCombo = async function (force) {
  if (ls.get("pronVista", "partita") !== "partita") { await _vistaCombo15(force); aggiungiToggle15(); return; }
  APP.innerHTML = topBar() + giorniChips() + skel(); bindGiorni();
  let D; try { D = await dati(force); } catch (e) { APP.innerHTML = topBar() + giorniChips() + errBox(e); bindGiorni(); return; }
  const rango = (p) => (p.stato === "post" ? 2e12 : 0) + Date.parse(p.iso || 0) || 0, partite = [...D.partite].sort((a, b) => rango(a) - rango(b)), prossima = partite.find((p) => p.stato !== "post");
  let h = topBar(D) + giorniChips() + toggle15();
  if (!partite.length) h += `<div class="vuoto">Nessuna partita per questo giorno.</div>`;
  else {
    h += `<div class="idx15">${partite.map((p) => { const mig = D.picks.filter((x) => x.g === p.id).sort((a, b) => b.prob - a.prob)[0], st = p.stato === "in" ? `<span style="color:${GR}">● Live ${esc(p.dettaglio || "")}</span>` : p.stato === "post" ? "Finale" : esc(String(p.ora).slice(-5)); return `<button class="idc${prossima === p ? " on" : ""}${p.stato === "post" ? " fin" : ""}" data-j="${esc(p.id)}"><b>${esc(p.casa)}-${esc(p.trasf)}</b><span class="s">${st}</span></button>`; }).join("")}</div>`;
    h += `<div class="ico15">${SC.map(([t, ic, tipi], i) => { const n = D.picks.filter((x) => tipi.includes(x.tipo)).length; return n ? `<a href="#/categoria/${i}"><span class="ci"><i class="ti ${ic}"></i><em>${n}</em></span><span class="s">${esc(t.replace("Punti giocatori", "Punti").replace("Totali partita", "Totali").replace("Punti squadre", "Squadre").replace("Vincente", "Chi vince"))}</span></a>` : ""; }).join("")}</div>`;
    for (const p of partite) {
      const L = D.picks.filter((x) => x.g === p.id), top = [...L].sort((a, b) => b.prob - a.prob)[0];
      h += `<section id="p15-${esc(p.id)}" class="p15" style="${p.stato === "post" ? "opacity:.8" : ""}">${intestazione15(D, p)}`;
      if (!L.length) h += `<div class="cap">Nessuna giocata sopra la soglia per questa partita.</div>`;
      h += hero15(top);
      for (const tipo of ORD15) {
        const l = L.filter((x) => x.tipo === tipo && x !== top).sort((a, b) => b.prob - a.prob); if (!l.length) continue;
        h += `<div class="card t15"><div class="t15h"><b>${NOMI15[tipo]}</b><span class="s">stima</span><span class="s">prob.</span><span style="width:30px"></span></div>${l.slice(0, 4).map(riga15).join("")}${l.length > 4 ? `<details class="mo15"><summary class="s">Altre ${l.length - 4}</summary>${l.slice(4).map(riga15).join("")}</details>` : ""}</div>`;
      }
      h += `<a class="btn" style="display:block;text-align:center;margin:8px 0 18px" href="#/partita/${esc(p.id)}">Studia ${esc(p.casa)}-${esc(p.trasf)}</a></section>`;
    }
  }
  h += `<details style="margin-top:10px"><summary><b>Chiedi all'app</b></summary>${typeof chiediBlocco === "function" ? chiediBlocco() : ""}</details>`;
  APP.innerHTML = h; bindGiorni(); aggiungiToggle15();
  APP.querySelectorAll("[data-j]").forEach((b) => (b.onclick = () => { const e = document.getElementById("p15-" + b.dataset.j); if (e) e.scrollIntoView({ behavior: "smooth", block: "start" }); }));
  APP.querySelectorAll(".r15 summary").forEach((sm) => sm.addEventListener("click", (ev) => { if (ev.target.closest("[data-add]")) ev.preventDefault(); }));
};
function toggle15() { const v = ls.get("pronVista", "partita"); return `<div class="tabs" id="tg15" style="margin:8px 0"><button class="chipbtn${v === "partita" ? " on" : ""}" data-pv="partita">Per partita</button><button class="chipbtn${v === "tipo" ? " on" : ""}" data-pv="tipo">Per tipo</button></div>`; }
function aggiungiToggle15() {
  if (!document.getElementById("tg15")) { const c = APP.querySelector(".cap"); const d = document.createElement("div"); d.innerHTML = toggle15(); if (c) c.before(d.firstChild); else APP.appendChild(d.firstChild); }
  APP.querySelectorAll("[data-pv]").forEach((b) => (b.onclick = () => { ls.set("pronVista", b.dataset.pv); route(); }));
}
