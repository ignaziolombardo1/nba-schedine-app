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
  const res = [];
  for (const g of D.partite) {
    if (g.stato !== "pre" || !g.r || !g.giocatori || !g.giocatori.length) continue;
    const pw = g.r.pw, fav = pw >= 0.5 ? g.casa : g.trasf, pf = Math.max(pw, 1 - pw);
    if (pf < 0.52) continue;
    const pls = g.giocatori.filter((x) => x.sq === fav && x.inf !== "fuori" && (x.pts ? x.pts.pg == null || x.pts.pg >= 0.85 : false)).sort((a, b) => b.pts.v - a.pts.v).slice(0, 3);
    for (const pl of pls) {
      for (const k of ["pts", "reb", "ast"]) {
        if (k === "reb" && !(pl.reb && pl.reb.v >= 7)) continue; if (k === "ast" && !(pl.ast && pl.ast.v >= 6)) continue;
        let best = null;
        for (const l of lineeCombo(pl, k)) {
          const joint = Math.min(pf, l.p, pf * l.p * CORR_COMBO), q = 1 / joint * MARGINE_COMBO;
          if (q < qMin) continue; if (!best || joint > best.joint) best = { ...l, joint, q };
        }
        if (best) res.push({ g, fav, pf, pl, k, l: best });
      }
    }
  }
  // per ogni giocatore solo la statistica migliore, poi ordine per probabilità
  const per = new Map(); for (const r of res) { const c = per.get(r.pl.pid); if (!c || r.l.joint > c.l.joint) per.set(r.pl.pid, r); }
  return [...per.values()].sort((a, b) => b.l.joint - a.l.joint).slice(0, 10);
}

async function vistaComboPartita() {
  const back = `<a class="back" href="#/combo"><i class="ti ti-chevron-left"></i>Consigli</a>`;
  APP.innerHTML = back + `<h2>Combo di partita</h2>` + skel();
  let D; try { D = await dati(false); window.__D = D; } catch (e) { APP.innerHTML = back + errBox(e); return; }
  const S = ls.get("comboSet", { q: 3 });
  const disegna = () => {
    const r = comboPartita(D, S.q);
    APP.innerHTML = back + `<h2>Combo di partita</h2><div class="card"><div class="cap" style="margin:0 0 8px">La squadra favorita vince <b>e</b> il suo giocatore chiave supera una linea più alta della media: così la quota si avvicina a quella dei bookmaker. Scegli la quota minima che vuoi.</div>
    <div class="s">Quota minima</div><div class="tabs">${[2, 3, 4, 6, 8].map((v) => `<button class="chipbtn${S.q === v ? " on" : ""}" data-q="${v}">${v}</button>`).join("")}</div></div>` +
      (r.length ? r.map((c, i) => {
        const u = NOMI_COMBO[c.k][1], sq = T(D, c.fav), nomeS = sq.n || c.fav, l = c.l;
        return `<div class="card"><div class="riga" style="margin-bottom:6px"><b>${esc(c.g.casa)} - ${esc(c.g.trasf)}</b><span><b style="color:${colProb(l.joint)}">${pct(l.joint)}</b> <span class="s">quota circa ${l.q.toFixed(2)}</span></span></div>
        <div class="riga rg" style="gap:8px"><span>${logo(c.fav, 22)} ${esc(nomeS)} vince</span><b style="color:${colProb(c.pf)}">${pct(c.pf)}</b></div>
        <div class="riga rg" style="gap:8px"><span>${esc(c.pl.nome)} over ${l.t} ${u}${l.bk ? ` <span class="s">(linea bookmaker)</span>` : ""}<br><span class="s">media ${virg(c.pl[c.k].media)} · stima partita ${virg(c.pl[c.k].v)}</span></span><b style="color:${colProb(l.p)}">${pct(l.p)}</b></div>
        <button class="btn" data-usa="${i}" style="margin:8px 0 0">Aggiungi alla mia schedina</button></div>`;
      }).join("") + `<div class="cap">Probabilità unita = le due probabilità moltiplicate, con un piccolo aumento perché le due cose sono legate. La quota è una stima: scrivi quella vera del tuo sito nella schedina per vedere il valore.</div>` : `<div class="vuoto">Nessuna combo con questa quota minima. Abbassa la quota o aspetta che escano le partite di oggi.</div>`);
    APP.querySelectorAll("[data-q]").forEach((b) => b.onclick = () => { S.q = +b.dataset.q; ls.set("comboSet", S); disegna(); });
    APP.querySelectorAll("[data-usa]").forEach((b) => b.onclick = () => {
      const c = r[+b.dataset.usa], w = probCustom(c.g, { g: c.g.id, k: "win", sq: c.fav }), p = probCustom(c.g, { g: c.g.id, k: c.k, dir: "over", pid: c.pl.pid, sq: null, soglia: c.l.t });
      if (!w || !p) return; p.prob = c.l.p;
      const L = miaLeggi(); for (const leg of [w, p]) if (!L.some((x) => x.g === leg.g && x.k === leg.k && x.pid === leg.pid && x.soglia === leg.soglia)) L.push(leg);
      ls.set("mia", L); barraMia(); b.textContent = "Aggiunta ✓"; b.disabled = true;
    });
  };
  disegna();
}
window.RIDEE.push([/^\/combopartita/, vistaComboPartita]);
