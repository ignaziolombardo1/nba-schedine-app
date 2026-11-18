// NBA Schedine - idee8.js: modifica degli over nella schedina, verifica del modello a fine serata, schedina automatica, grafico delle ultime partite, condivisione
"use strict";

// ---- 1. modifica della linea (over/under) di ogni giocata nella mia schedina
const lineaMod = (l, D, nuova) => {
  const g = D && D.partite.find((x) => x.id === l.g); if (!g || g.stato !== "pre" || !g.r) return null;
  const grezza = (s) => { const r = probCustom(g, { g: l.g, k: l.k, dir: l.dir, pid: l.pid, sq: l.sq, soglia: s }); return r ? r.prob : null; };
  const base = l.base || { s: l.soglia, p: l.prob }, r0 = grezza(base.s), r1 = grezza(nuova);
  if (r0 == null || r1 == null) return null;
  const f = Math.min(1.25, Math.max(0.6, base.p / Math.max(0.02, r0))); // tiene la taratura che l'app aveva sulla linea originale
  const prob = Math.min(0.99, Math.max(0.01, r1 * f));
  return { ...l, base, soglia: nuova, prob, testo: String(l.testo).replace(/(over|under) [\d.]+/, `$1 ${nuova}`), chiave: l.chiave && l.k === "tot" ? String(l.chiave).replace(/[\d.]+$/, String(nuova)) : l.chiave, mod: true };
};
function stepperLinee(el, D, ridisegna) {
  const L = miaLeggi();
  el.querySelectorAll(".cardp").forEach((c, i) => {
    const l = L[i]; if (!l || l.soglia == null || !["pts", "reb", "ast", "tot", "sq"].includes(l.k)) return;
    const g = D && D.partite.find((x) => x.id === l.g); if (!g || g.stato !== "pre") return;
    const box = c.firstElementChild; if (!box || box.querySelector(".stp")) return;
    const d = document.createElement("div"); d.className = "stp";
    d.innerHTML = `<button data-st="-1" aria-label="Abbassa la linea">−</button><span>${l.dir === "under" ? "Under" : "Over"} <b>${l.soglia}</b>${l.mod ? ` <i style="color:${AM};font-style:normal">modificata (era ${l.base.s})</i>` : ""}</span><button data-st="1" aria-label="Alza la linea">+</button>${l.mod ? `<button data-st="0" aria-label="Ripristina la linea" style="width:auto;padding:0 8px;font-size:11px">Ripristina</button>` : ""}`;
    box.appendChild(d);
    d.querySelectorAll("button").forEach((b) => b.onclick = (e) => {
      e.preventDefault(); const k = +b.dataset.st, A = miaLeggi(), cur = A[i]; if (!cur) return;
      const nuovo = k === 0 ? cur.base.s : Math.max(0.5, +(cur.soglia + k).toFixed(1)), r = lineaMod(cur, D, nuovo);
      if (!r) return; if (k === 0) { delete r.base; delete r.mod; r.testo = String(cur.testo).replace(/(over|under) [\d.]+/, `$1 ${nuovo}`); r.prob = cur.base.p; }
      A[i] = r; ls.set("mia", A); barraMia(); ridisegna();
    });
  });
  const L2 = miaLeggi();
  // condividi come immagine
  const sv = document.getElementById("miasvuota");
  if (sv && !document.getElementById("miaimg") && L2.length) {
    const b = document.createElement("button"); b.className = "btn"; b.id = "miaimg"; b.style.margin = "8px 0 0"; b.innerHTML = `<i class="ti ti-photo"></i> Condividi come immagine`;
    sv.parentElement.after(b);
    b.onclick = () => { const q = L2.reduce((a, l) => a / Math.max(0.05, l.prob), 1), p = L2.reduce((a, l) => a * l.prob, 1), qo = parseFloat(String(($("#miaq") || {}).value || "").replace(",", ".")); immagineSchedina({ nome: "La mia schedina", legs: L2, prob: p, quota: qo > 1 ? qo : +q.toFixed(2), puntata: parseFloat(String(($("#miap") || {}).value || "").replace(",", ".")) || 0, esito: null }); };
  }
}

// ---- 2. verifica del modello a fine serata (in Esiti): quanto le percentuali previste somigliano a quelle reali
function verificaSerata(val) {
  if (!val || val.length < 6) return "";
  const fasce = [[0.7, 0.75, "70-75%"], [0.75, 0.8, "75-80%"], [0.8, 0.85, "80-85%"], [0.85, 1.01, "oltre 85%"]], riga = (n, v) => {
    if (v.length < 3) return ""; const prev = v.reduce((a, x) => a + x.prob, 0) / v.length, vero = v.filter((x) => x.esito === 1).length / v.length, d = vero - prev;
    const col = Math.abs(d) < 0.07 ? GR : Math.abs(d) < 0.15 ? AM : RD;
    return `<div class="riga rg"><span>${esc(n)} <span class="s">(${v.length})</span></span><span style="text-align:right"><span class="s">previsto ${pct(prev)} · reale</span> <b style="color:${col}">${pct(vero)}</b></span></div>`;
  };
  const perFascia = fasce.map(([a, b, n]) => riga(n, val.filter((x) => x.prob >= a && x.prob < b))).join("");
  const perTipo = [...new Set(val.map((x) => x.tipo))].map((t) => riga(t, val.filter((x) => x.tipo === t))).join("");
  const tot = val.reduce((a, x) => a + x.prob, 0) / val.length, ok = val.filter((x) => x.esito === 1).length / val.length, d = ok - tot;
  const frase = Math.abs(d) < 0.06 ? "Il modello ha previsto bene la serata." : d > 0 ? `Serata migliore delle previsioni di ${Math.round(d * 100)} punti.` : `Serata peggiore delle previsioni di ${Math.round(-d * 100)} punti: guarda le categorie in rosso.`;
  return `<h2>Il modello stasera</h2><div class="card" style="padding:6px 12px"><div class="cap" style="margin:6px 0">${esc(frase)} Se la percentuale reale è molto sotto quella prevista, il modello è stato troppo ottimista in quella fascia.</div>${perFascia}<div class="s" style="margin:8px 0 2px">Per tipo di giocata</div>${perTipo}</div>`;
}

// ---- 3. schedina automatica: scegli la quota che vuoi, l'app propone la combinazione più probabile
function proponiAuto(picks, qMin, nMax) {
  const cand = picks.filter((x) => x.pid || x.tipo === "Squadra" || x.tipo === "Totale" || x.tipo === "Vincente").sort((a, b) => b.prob - a.prob).slice(0, 18), out = [], MARG = 0.93;
  const scegli = (start, cur) => {
    if (cur.length >= 2) { const p = cur.reduce((a, x) => a * x.prob, 1), q = cur.reduce((a, x) => a / x.prob * MARG, 1); if (q >= qMin) out.push({ legs: cur.slice(), p, q }); }
    if (cur.length >= nMax) return;
    for (let i = start; i < cand.length; i++) { const x = cand[i]; if (cur.some((y) => y.g === x.g)) continue; cur.push(x); scegli(i + 1, cur); cur.pop(); }
  };
  scegli(0, []);
  out.sort((a, b) => b.p - a.p); const visti = new Set(), best = [];
  for (const o of out) { const k = o.legs.map((x) => x.id).sort().join(); if (visti.has(k)) continue; visti.add(k); best.push(o); if (best.length >= 3) break; }
  return best;
}
async function vistaAuto() {
  const back = `<a class="back" href="#/combo"><i class="ti ti-chevron-left"></i>Consigli</a>`;
  APP.innerHTML = back + `<h2>Schedina automatica</h2>` + skel();
  let D; try { D = await dati(false); window.__D = D; } catch (e) { APP.innerHTML = back + errBox(e); return; }
  const pre = new Set(D.partite.filter((p) => p.stato === "pre").map((p) => p.id)), picks = (D.picks || []).filter((x) => pre.has(x.g));
  const S = ls.get("autoSet", { q: 3, n: 3 });
  const disegna = () => {
    const r = proponiAuto(picks, S.q, S.n);
    APP.innerHTML = back + `<h2>Schedina automatica</h2><div class="card"><div class="cap" style="margin:0 0 8px">Scegli quanto vuoi che paghi: l'app cerca la combinazione di giocate di partite diverse con la probabilità più alta che arrivi a quella quota (stimata con il margine tipico dei bookmaker).</div>
    <div class="s">Quota che vuoi raggiungere</div><div class="tabs">${[2, 3, 5, 8, 12].map((v) => `<button class="chipbtn${S.q === v ? " on" : ""}" data-q="${v}">${v}</button>`).join("")}</div>
    <div class="s" style="margin-top:6px">Giocate al massimo</div><div class="tabs">${[2, 3, 4, 5].map((v) => `<button class="chipbtn${S.n === v ? " on" : ""}" data-n="${v}">${v}</button>`).join("")}</div></div>` +
      (r.length ? r.map((o, i) => `<div class="card"><div class="riga" style="margin-bottom:6px"><b>Proposta ${i + 1}</b><span><b style="color:${colProb(o.p)}">${pct(o.p)}</b> <span class="s">tutte centrate · quota circa ${o.q.toFixed(2)}</span></span></div>${o.legs.map((x) => `<div class="riga rg" style="gap:8px"><span style="min-width:0"><span class="s">${esc(x.partita)}</span><br>${esc(x.testo)}</span><b style="color:${colProb(x.prob)}">${pct(x.prob)}</b></div>`).join("")}<button class="btn" data-usa="${i}" style="margin:8px 0 0">Usa questa schedina</button></div>`).join("") : `<div class="vuoto">Con queste scelte non c'è nessuna combinazione. Abbassa la quota o aumenta il numero di giocate.</div>`);
    APP.querySelectorAll("[data-q]").forEach((b) => b.onclick = () => { S.q = +b.dataset.q; ls.set("autoSet", S); disegna(); });
    APP.querySelectorAll("[data-n]").forEach((b) => b.onclick = () => { S.n = +b.dataset.n; ls.set("autoSet", S); disegna(); });
    APP.querySelectorAll("[data-usa]").forEach((b) => b.onclick = () => { const o = r[+b.dataset.usa]; ls.set("mia", o.legs.map((x) => legDa(x))); barraMia(); location.hash = "#/mia"; });
  };
  disegna();
}
window.RIDEE.push([/^\/auto/, vistaAuto]);

// ---- 4. grafico delle ultime partite contro la linea
function graficoUltime(vals, linea, col) {
  if (!vals || vals.length < 3 || !(linea > 0)) return "";
  const w = 300, h = 64, mx = Math.max(...vals, linea) * 1.1, bw = w / vals.length, Y = (v) => (h - (v / mx) * (h - 4)).toFixed(1), su = vals.filter((v) => v > linea).length;
  return `<div style="margin:6px 0 2px"><div class="s">Ultime ${vals.length} partite: sopra la linea ${linea} per <b style="color:${su / vals.length >= 0.7 ? GR : su / vals.length >= 0.5 ? AM : RD}">${su} volte su ${vals.length}</b></div><svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none">${vals.map((v, i) => `<rect x="${(i * bw + 2).toFixed(1)}" y="${Y(v)}" width="${(bw - 4).toFixed(1)}" height="${(h - Y(v)).toFixed(1)}" rx="2" fill="${v > linea ? GR : "#3a4156"}" opacity="${v > linea ? 0.9 : 1}"/>`).join("")}<line x1="0" x2="${w}" y1="${Y(linea)}" y2="${Y(linea)}" stroke="${OR}" stroke-width="1.5" stroke-dasharray="4 3"/></svg></div>`;
}
