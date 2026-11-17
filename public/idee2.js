// NBA Schedine - idee2.js: Live e partita: cronaca (parziali, svolte, traguardi, falli, momento caldo), svolta nel grafico, modalità divano, riassunto a fine partita
"use strict";
const cronaca = {}, cronMem = {}; // id partita -> eventi; id partita -> memoria dell'ultimo giro

function evCron(id, tipo, testo) { const a = (cronaca[id] ||= []); if (a.some((e) => e.testo === testo)) return; a.push({ t: Date.now(), tipo, testo }); while (a.length > 40) a.shift(); }
// chiamata a ogni aggiornamento del Live: confronta con il giro precedente e scrive le novità
function aggiornaCronaca(D) {
  const ora = Date.now();
  for (const p of D.partite) {
    const m = (cronMem[p.id] ||= { sc: [], pl: {}, lead: 0 }), margine = (p.ptCasa || 0) - (p.ptTr || 0);
    m.sc.push({ t: ora, c: p.ptCasa || 0, r: p.ptTr || 0 }); m.sc = m.sc.filter((s) => ora - s.t < 6 * 60000);
    const vecchio = m.sc[0], dc = (p.ptCasa || 0) - vecchio.c, dr = (p.ptTr || 0) - vecchio.r, B = (ab) => T(D, ab).b;
    if (ora - vecchio.t > 60000) { // parziale: almeno 10 punti di differenza nelle ultime partite di refresh
      if (dc - dr >= 10) evCron(p.id, "run", `Parziale di ${dc}-${dr} dei ${B(p.casa)}`);
      else if (dr - dc >= 10) evCron(p.id, "run", `Parziale di ${dr}-${dc} dei ${B(p.trasf)}`);
    }
    const seg = margine > 0 ? 1 : margine < 0 ? -1 : 0;
    if (m.lead && seg && seg !== m.lead) evCron(p.id, "lead", `Sorpasso: avanti i ${B(seg > 0 ? p.casa : p.trasf)} (${p.ptCasa}-${p.ptTr})`);
    if (seg) m.lead = seg;
    for (const g of p.giocatori || []) {
      const k = g.pid || g.nome, pr = m.pl[k] || { pts: g.pts || 0, pf: g.pf || 0, dd: false, h: [] }, cognome = String(g.nome).split(" ").slice(-1)[0];
      for (const soglia of [10, 20, 30, 40]) if ((g.pts || 0) >= soglia && pr.pts < soglia) evCron(p.id, "pt", `${g.nome} arriva a ${soglia} punti`);
      if ((g.pf || 0) >= 4 && pr.pf < (g.pf || 0)) evCron(p.id, "fl", `${g.nome} a ${g.pf} falli: rischio panchina`);
      const dd = ["pts", "reb", "ast"].filter((c) => (g[c] || 0) >= 10).length >= 2;
      if (dd && !pr.dd) evCron(p.id, "dd", `Doppia doppia per ${g.nome} (${g.pts}-${g.reb}-${g.ast})`);
      pr.h.push({ t: ora, pts: g.pts || 0 }); pr.h = pr.h.filter((s) => ora - s.t < 5 * 60000);
      if (pr.h.length > 3 && ora - pr.h[0].t > 60000 && (g.pts || 0) - pr.h[0].pts >= 8) evCron(p.id, "hot", `${cognome} è caldo: ${(g.pts || 0) - pr.h[0].pts} punti in pochi minuti`);
      m.pl[k] = { pts: g.pts || 0, pf: g.pf || 0, dd, h: pr.h };
    }
  }
}
const iconaCron = { run: "ti-trending-up", lead: "ti-arrows-exchange", pt: "ti-target", fl: "ti-alert-triangle", dd: "ti-star", hot: "ti-flame" };
function cronacaHtml(id) {
  const a = (cronaca[id] || []).slice(-8).reverse();
  if (!a.length) return `<div class="sub">Cronaca</div><div class="cap" style="margin-top:0">La cronaca nasce mentre l'app è aperta sul Live: parziali, sorpassi, traguardi dei giocatori e falli.</div>`;
  return `<div class="sub">Cronaca</div><div class="card" style="padding:4px 12px">` + a.map((e, i) => `<div class="riga rg" style="${i ? "" : "border-top:0"};gap:10px;justify-content:flex-start"><i class="ti ${iconaCron[e.tipo] || "ti-point"}" style="color:${e.tipo === "fl" ? AM : OR}"></i><span style="flex:1">${esc(e.testo)}</span><span class="s">${new Date(e.t).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span></div>`).join("") + `</div>`;
}

// ---- 11. grafico della probabilità di vittoria con la svolta evidenziata
function grafLive(p) {
  const a = storiaLive[p.id] || []; if (a.length < 2) return "";
  const w = 300, h = 70, X = (f) => (f * w).toFixed(1), Y = (v) => ((1 - v) * (h - 6) + 3).toFixed(1);
  const pts = a.map((q) => `${X(q.f)},${Y(q.p)}`).join(" ");
  let sv = null, mx = 0; for (let i = 1; i < a.length; i++) { const d = Math.abs(a[i].p - a[i - 1].p); if (d > mx) { mx = d; sv = a[i]; } }
  const marca = sv && mx >= 0.08 ? `<circle cx="${X(sv.f)}" cy="${Y(sv.p)}" r="4.5" fill="${OR}" stroke="#fff" stroke-width="1.5"/>` : "";
  return `<div class="card" style="padding:10px 12px"><div class="riga s"><span>Probabilità di vittoria di ${esc(p.casa)} nel tempo</span><b style="color:var(--txt)">${pct(p.pwLive)}</b></div><svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" style="margin-top:6px"><line x1="0" x2="${w}" y1="${Y(0.5)}" y2="${Y(0.5)}" stroke="#2a3040" stroke-dasharray="4 4"/><polyline points="${pts}" fill="none" stroke="${OR}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${marca}</svg>${marca ? `<div class="s" style="margin-top:2px">Il punto cerchiato è la svolta: qui la probabilità è cambiata di ${Math.round(mx * 100)} punti in un solo aggiornamento.</div>` : ""}</div>`;
}

// ---- 18. modalità divano: Live grande e leggibile da lontano
const divanoOn = () => ls.get("divano", false);
function applicaDivano() { document.documentElement.classList.toggle("divano", !!divanoOn()); }
document.addEventListener("click", (e) => {
  const b = e.target.closest && e.target.closest("#divanoBtn"); if (!b) return;
  ls.set("divano", !divanoOn()); applicaDivano(); b.classList.toggle("on", divanoOn());
});
const bottoneDivano = () => `<button id="divanoBtn" class="chipbtn${divanoOn() ? " on" : ""}" style="margin:0 0 8px"><i class="ti ti-device-tv"></i> Modalità divano</button>`;

// ---- 20. riassunto a fine partita
function riassuntoPartita(D, p) {
  if (!p || p.stato !== "post") return "";
  const c = p.ptCasa ?? 0, t = p.ptTr ?? 0, vinc = c > t ? p.casa : p.trasf, perd = c > t ? p.trasf : p.casa, sc = Math.abs(c - t), B = (ab) => T(D, ab).b;
  const parti = [`Hanno vinto i ${B(vinc)} contro i ${B(perd)} per ${Math.max(c, t)}-${Math.min(c, t)}${sc >= 15 ? " (partita a senso unico)" : sc <= 4 ? " (finale punto a punto)" : ""}.`];
  const r = p.r; if (r) { const fav = r.pw >= 0.5 ? p.casa : p.trasf; parti.push(fav === vinc ? `Ha vinto la favorita del modello.` : `Il modello dava favorita ${B(fav)} (${pct(Math.max(r.pw, 1 - r.pw))}): sorpresa.`); const tot = c + t; parti.push(`Totale ${tot} contro ${r.totale.toFixed(0)} stimati.`); }
  const q = p.qCasa || [], qt = p.qTr || []; if (q.length >= 4 && qt.length >= 4) { let best = 0, bi = 0; q.forEach((v, i) => { const d = Math.abs(v - (qt[i] ?? 0)); if (d > best) { best = d; bi = i; } }); if (best >= 8) parti.push(`Il quarto decisivo è stato il ${bi + 1}º: ${q[bi]}-${qt[bi]}.`); }
  const mie = (D.picks || []).filter((x) => x.g === p.id).map((x) => ({ x, e: esitoPick(x) })).filter((o) => o.e != null);
  if (mie.length) parti.push(`Giocate del modello su questa partita: ${mie.filter((o) => o.e === 1).length} su ${mie.length} centrate.`);
  return `<div class="card" style="margin:8px 0"><div class="s" style="margin-bottom:4px"><i class="ti ti-notes"></i> Riassunto</div><div style="line-height:1.45">${parti.map(esc).join(" ")}</div></div>`;
}
