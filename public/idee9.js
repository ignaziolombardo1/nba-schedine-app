// NBA Schedine - idee9.js: combo di partita (squadra vince + giocatore over con linea più alta) con quota simile a quella dei bookmaker
"use strict";

const MARGINE_COMBO = 0.9; // i bookmaker pagano circa il 10% in meno della quota giusta
const CORR_COMBO = 1.06;   // squadra che vince e giocatore che segna sono leggermente legati: la probabilità unita sale un po'
const NOMI_COMBO = { pts: ["punti", "pt"], reb: ["rimbalzi", "rimb."], ast: ["assist", "ass."] };

// per un giocatore e una statistica: le linee candidate (la più vicina a ciascuna probabilità voluta + quella del bookmaker se c'è)
function lineeCombo(pl, k) {
  const o = pl[k]; if (!o || !(o.sd > 0) || !(o.v > 0)) return [];
  const pg = o.pg == null ? 1 : o.pg * 1, out = [];
  const pOver = (t) => (1 - phi((t - o.v) / o.sd)) * pg * 0.97;
  const cand = []; for (let t = Math.max(0.5, Math.floor(o.v * 0.5) + 0.5); t <= o.v * 1.8 + 1; t += 1) cand.push(+t.toFixed(1));
  for (const voluta of [0.62, 0.52, 0.42, 0.33]) {
    let best = null; for (const t of cand) { const p = pOver(t); if (!best || Math.abs(p - voluta) < Math.abs(best.p - voluta)) best = { t, p }; }
    if (best && !out.some((x) => x.t === best.t)) out.push({ ...best, bk: false });
  }
  if (o.mk && o.mk.linea > 0 && o.mk.pFin > 0) { const p = o.mk.pFin * pg * 0.97; const i = out.findIndex((x) => x.t === o.mk.linea); const b = { t: o.mk.linea, p, bk: true }; if (i >= 0) out[i] = b; else out.push(b); }
  return out.sort((a, b) => b.p - a.p);
}

function comboPartita(D, qMin) {
  const res = [], fq = typeof fattoreQuota === "function" ? fattoreQuota().f : 1;
  for (const g of D.partite) {
    if (g.stato !== "pre" || !g.r) continue;
    const pw = g.r.pw, fav = pw >= 0.5 ? g.casa : g.trasf, pf = Math.max(pw, 1 - pw);
    if (pf < 0.52) continue;
    const unisci = (p, corr) => Math.min(pf, p, pf * p * corr);
    // a) la favorita vince + il suo giocatore chiave supera i PUNTI (solo punti)
    const pls = (g.giocatori || []).filter((x) => x.sq === fav && x.inf !== "fuori" && x.pts && (x.pts.pg == null || x.pts.pg >= 0.85)).sort((a, b) => b.pts.v - a.pts.v).slice(0, 3);
    for (const pl of pls) {
      let best = null;
      for (const l of lineeCombo(pl, "pts")) { const joint = unisci(l.p, CORR_COMBO), q = 1 / joint * MARGINE_COMBO * fq; if (q < qMin) continue; if (!best || joint > best.joint) best = { ...l, joint, q }; }
      if (best) res.push({ tipo: "pl", g, fav, pf, pl, k: "pts", l: best });
    }
    // b) la favorita vince + over sui punti TOTALI della partita
    if (typeof probCustom === "function") {
      const base = Math.round(g.r.totale), cand = [];
      for (let t = base - 20; t <= base + 20; t++) { const r = probCustom(g, { g: g.id, k: "tot", dir: "over", soglia: t + 0.5 }); if (r) cand.push({ t: t + 0.5, p: r.prob }); }
      let best = null;
      for (const voluta of [0.62, 0.52, 0.42, 0.33]) {
        let c = null; for (const x of cand) if (!c || Math.abs(x.p - voluta) < Math.abs(c.p - voluta)) c = x;
        if (!c) continue; const joint = unisci(c.p, 1.03), q = 1 / joint * MARGINE_COMBO * fq; if (q < qMin) continue; if (!best || joint > best.joint) best = { ...c, joint, q };
      }
      if (best) res.push({ tipo: "tot", g, fav, pf, k: "tot", l: best });
    }
  }
  // per ogni giocatore solo la combo migliore; le combo sul totale restano una per partita
  const per = new Map(); for (const r of res) { const id = r.tipo === "tot" ? "t" + r.g.id : r.pl.pid; const c = per.get(id); if (!c || r.l.joint > c.l.joint) per.set(id, r); }
  return [...per.values()].sort((a, b) => b.l.joint - a.l.joint).slice(0, 12);
}

async function vistaComboPartita() {
  const back = `<a class="back" href="#/combo"><i class="ti ti-chevron-left"></i>Consigli</a>`;
  APP.innerHTML = back + `<h2>Combo di partita</h2>` + skel();
  let D; try { D = await dati(false); window.__D = D; } catch (e) { APP.innerHTML = back + errBox(e); return; }
  const S = ls.get("comboSet", { q: 3 });
  const disegna = () => {
    const r = comboPartita(D, S.q);
    APP.innerHTML = back + `<h2>Combo di partita</h2><div class="card"><div class="cap" style="margin:0 0 8px">La squadra favorita vince <b>e</b> il suo giocatore chiave supera i punti con una linea più alta della media, oppure la partita supera un totale di punti più alto: così la quota si avvicina a quella dei bookmaker. Scegli la quota minima che vuoi.</div>
    <div class="s">Quota minima</div><div class="tabs">${[2, 3, 4, 6, 8].map((v) => `<button class="chipbtn${S.q === v ? " on" : ""}" data-q="${v}">${v}</button>`).join("")}</div></div>` +
      (r.length ? r.map((c, i) => {
        const sq = T(D, c.fav), nomeS = sq.n || c.fav, l = c.l, forma = c.tipo === "pl" && typeof statoForma === "function" ? statoForma(c.pl) : null;
        const riga2 = c.tipo === "tot" ? `<div class="riga rg" style="gap:8px"><span>Punti totali della partita over ${l.t}<br><span class="s">stima ${virg(c.g.r.totale)} punti</span></span><b style="color:${colProb(l.p)}">${pct(l.p)}</b></div>`
          : `<div class="riga rg" style="gap:8px"><span>${esc(c.pl.nome)} over ${l.t} punti${l.bk ? ` <span class="s">(linea bookmaker)</span>` : ""}${forma && forma.k === "su" ? ` <span style="color:${GR};font-size:12px">🔥 in forma</span>` : ""}<br><span class="s">media ${virg(c.pl.pts.media)} · stima partita ${virg(c.pl.pts.v)}</span></span><b style="color:${colProb(l.p)}">${pct(l.p)}</b></div>`;
        return `<div class="card"><div class="riga" style="margin-bottom:6px"><b>${esc(c.g.casa)} - ${esc(c.g.trasf)}</b><span><b style="color:${colProb(l.joint)}">${pct(l.joint)}</b> <span class="s">quota circa ${l.q.toFixed(2)}</span></span></div>
        <div class="riga rg" style="gap:8px"><span>${logo(c.fav, 22)} ${esc(nomeS)} vince</span><b style="color:${colProb(c.pf)}">${pct(c.pf)}</b></div>${riga2}
        <button class="btn" data-usa="${i}" style="margin:8px 0 0">Aggiungi alla mia schedina</button></div>`;
      }).join("") + `<div class="cap">Probabilità unita = le due probabilità moltiplicate, con un piccolo aumento perché le due cose sono legate. La quota è una stima${typeof fattoreQuota === "function" && fattoreQuota().n >= 3 ? `, corretta sulle quote del tuo sito (×${fattoreQuota().f.toFixed(2)})` : ": scrivi la quota vera del tuo sito nelle schedine che salvi, così l'app impara quanto paga"}.</div>` : `<div class="vuoto">Nessuna combo con questa quota minima. Abbassa la quota o aspetta che escano le partite di oggi.</div>`);
    APP.querySelectorAll("[data-q]").forEach((b) => b.onclick = () => { S.q = +b.dataset.q; ls.set("comboSet", S); disegna(); });
    APP.querySelectorAll("[data-usa]").forEach((b) => b.onclick = () => {
      const c = r[+b.dataset.usa], w = probCustom(c.g, { g: c.g.id, k: "win", sq: c.fav }), p = c.tipo === "tot" ? probCustom(c.g, { g: c.g.id, k: "tot", dir: "over", soglia: c.l.t }) : probCustom(c.g, { g: c.g.id, k: "pts", dir: "over", pid: c.pl.pid, sq: null, soglia: c.l.t });
      if (!w || !p) return; p.prob = c.l.p;
      const L = miaLeggi(); for (const leg of [w, p]) if (!L.some((x) => x.g === leg.g && x.k === leg.k && x.pid === leg.pid && x.soglia === leg.soglia)) L.push(leg);
      ls.set("mia", L); barraMia(); b.textContent = "Aggiunta ✓"; b.disabled = true;
    });
  };
  disegna();
}
window.RIDEE.push([/^\/combopartita/, vistaComboPartita]);
