// NBA Schedine - idee12.js: «Chiedi» capisce più domande (doppie doppie, infortuni, partite e orari, live, combo, equilibrio, titolari)
"use strict";

const _rispondi0 = rispondi;
// etichetta di forma accanto al giocatore: «in forma» se nelle ultime 5 partite rende molto sopra la media
function tagForma(g) {
  try { const f = statoForma(g); if (f.k === "su") return ` · 🔥 in forma (+${Math.round(f.d * 100)}% nelle ultime 5)`; if (f.k === "giu") return ` · in calo (${Math.round(f.d * 100)}%)`; } catch {}
  return "";
}
rispondi = function (D, q) {
  const t = String(q).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""), P = D.partite || [], pre = P.filter((p) => p.stato === "pre"), B = (ab) => T(D, ab).b;
  const sq = Object.keys(D.squadre || {}).filter((ab) => (" " + t + " ").includes(" " + ab.toLowerCase() + " ") || t.includes(String(B(ab)).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")));
  const dellaSq = (p) => !sq.length || sq.includes(p.casa) || sq.includes(p.trasf);
  if (!P.length) return { t: "Non ci sono partite per questo giorno.", l: [] };
  const gara = (p) => `${B(p.casa)} - ${B(p.trasf)}`;
  // doppia doppia / tripla doppia
  if (/doppia|tripla|double/.test(t)) {
    const td = /tripla|triple/.test(t), L = [];
    for (const p of pre) for (const g of p.giocatori || []) {
      if (!dellaSq({ casa: g.sq, trasf: g.sq }) || !g.pts || !g.reb || !g.ast || !(g.pts.sd > 0) || !(g.reb.sd > 0) || !(g.ast.sd > 0)) continue;
      const pg = g.pts.pg == null ? 1 : g.pts.pg, a = [g.pts, g.reb, g.ast].map((o) => Math.min(0.995, Math.max(0.001, 1 - phi((9.5 - o.v) / o.sd))));
      const dd = (a[0] * a[1] + a[0] * a[2] + a[1] * a[2] - 2 * a[0] * a[1] * a[2]) * pg * 0.97, tr = a[0] * a[1] * a[2] * pg * 0.97, pr = td ? tr : dd;
      if (pr >= (td ? 0.03 : 0.15)) L.push({ g, p, pr });
    }
    L.sort((a, b) => b.pr - a.pr);
    return { t: L.length ? `Giocatori con più probabilità di fare una ${td ? "tripla" : "doppia"} doppia:` : `Nessun giocatore ha una probabilità significativa di ${td ? "tripla" : "doppia"} doppia.`, l: L.slice(0, 10).map((o) => ({ href: "#/partita/" + o.p.id, a: o.g.nome, b: `${esc(gara(o.p))}${tagForma(o.g)}`, v: pct(o.pr), c: colProb(o.pr) })) };
  }
  // infortuni / assenti
  if (/infortun|assent|fuori|out\b|dubbio|non gioca|squalific/.test(t)) {
    const L = []; for (const p of P) if (dellaSq(p)) for (const i of p.inf || []) L.push({ p, i });
    L.sort((a, b) => (a.i.stato === "out" ? 0 : 1) - (b.i.stato === "out" ? 0 : 1));
    return { t: L.length ? "Giocatori fuori o in dubbio nelle partite di oggi (almeno 20 minuti di media):" : "Nessun giocatore importante risulta fuori o in dubbio.", l: L.slice(0, 14).map((o) => ({ href: "#/partita/" + o.p.id, a: o.i.nome, b: `${esc(B(o.i.sq))} · ${esc(gara(o.p))}${o.i.etichetta ? " · " + esc(o.i.etichetta) : ""}`, v: o.i.stato === "out" ? "Fuori" : "Dubbio", c: o.i.stato === "out" ? RD : AM })) };
  }
  // live / in corso
  if (/live|in corso|diretta|come sta|risultat|punteggi|stanno giocando/.test(t)) {
    const L = P.filter((p) => p.stato === "in" || p.stato === "post").filter(dellaSq);
    return { t: L.length ? "Partite in corso o finite:" : "Non ci sono ancora partite in corso o finite.", l: L.map((p) => ({ href: "#/live", a: `${B(p.casa)} ${p.ptCasa ?? ""} - ${p.ptTr ?? ""} ${B(p.trasf)}`, b: esc(p.stato === "in" ? p.dettaglio || "In corso" : "Finale"), v: p.stato === "in" ? "Live" : "Fine", c: p.stato === "in" ? OR : MU })) };
  }
  // elenco e orari delle partite
  if (/che partite|quali partite|orari|a che ora|quando gioca|programma|calendario|stasera gioca|quante partite/.test(t)) {
    const L = P.filter(dellaSq);
    return { t: `Partite di oggi (${L.length}):`, l: L.map((p) => ({ href: "#/partita/" + p.id, a: gara(p), b: p.stato === "pre" ? "Non iniziata" : p.stato === "in" ? "In corso" : "Finita", v: String(p.ora || "").slice(-5), c: MU })) };
  }
  // combo
  if (/combo|combinat|doppia giocata|vince e|vince \+/.test(t) && typeof comboPartita === "function") {
    const L = comboPartita(D, 2).filter((c) => !sq.length || sq.includes(c.g.casa) || sq.includes(c.g.trasf));
    return { t: L.length ? "Combo: la favorita vince + punti del giocatore, oppure + over sui punti totali:" : "Non ci sono combo disponibili.", l: L.slice(0, 10).map((c) => ({ href: "#/combopartita", a: c.tipo === "tot" ? `${B(c.fav)} vince + totale over ${c.l.t}` : `${B(c.fav)} vince + ${c.pl.nome} over ${c.l.t} punti`, b: `${esc(gara(c.g))} · quota circa ${c.l.q.toFixed(2)}${c.tipo === "pl" ? tagForma(c.pl) : ""}`, v: pct(c.l.joint), c: colProb(c.l.joint) })) };
  }
  // equilibrio / sfide punto a punto
  if (/equilibrat|punto a punto|incerta|testa a testa|sfida|serrat/.test(t)) {
    const L = [...pre].filter(dellaSq).sort((a, b) => Math.abs(a.r.pw - 0.5) - Math.abs(b.r.pw - 0.5));
    return { t: "Le partite più equilibrate secondo il modello:", l: L.slice(0, 6).map((p) => ({ href: "#/partita/" + p.id, a: gara(p), b: `${B(p.casa)} ${pct(p.r.pw)} · ${B(p.trasf)} ${pct(1 - p.r.pw)}`, v: pct(Math.max(p.r.pw, 1 - p.r.pw)), c: MU })) };
  }
  // chi vince: la favorita con più sicurezza in cima
  if (/vince|vincer|vincent|favorit|pronostico.*partit|chi passa/.test(t) && !/combo|vince e|vince \+/.test(t)) {
    const L = pre.filter(dellaSq).map((p) => ({ p, fav: p.r.pw >= 0.5 ? p.casa : p.trasf, pr: Math.max(p.r.pw, 1 - p.r.pw) })).sort((a, b) => b.pr - a.pr);
    if (L.length) {
      const top = L[0], altra = top.fav === top.p.casa ? top.p.trasf : top.p.casa, liv = (x) => x >= 0.75 ? "molto sicura" : x >= 0.65 ? "sicura" : x >= 0.57 ? "abbastanza probabile" : "incerta";
      return { t: `Quella di cui il modello è più sicuro: ${B(top.fav)} contro ${B(altra)} (${pct(top.pr)}, ${liv(top.pr)}). Tutte le partite, dalla più sicura:`, l: L.map((o) => ({ href: "#/partita/" + o.p.id, a: `${B(o.fav)} vince`, b: `${esc(gara(o.p))} · ${liv(o.pr)}`, v: pct(o.pr), c: colProb(o.pr) })) };
    }
  }
  // chi fa N punti / rimbalzi / assist: percentuale e, per i punti, la forma
  const nq = /(\d+(?:[.,]\d+)?)/.exec(t), kq = /rimbal/.test(t) ? "reb" : /assist/.test(t) ? "ast" : /punt|segn|canest/.test(t) ? "pts" : null;
  if (kq && nq && /\b(fa|fanno|segna|prende|prender|serv|arriv|supera|almeno|piu di|chi)/.test(t)) {
    const n = parseFloat(nq[1].replace(",", ".")), nomi = { pts: "punti", reb: "rimbalzi", ast: "assist" }, L = [];
    for (const p of pre) for (const g of p.giocatori || []) {
      if (!dellaSq({ casa: g.sq, trasf: g.sq }) || !g[kq]) continue;
      const pr = (1 - phi((n - 0.5 - g[kq].v) / (g[kq].sd || 1))) * (g[kq].pg == null ? 1 : g[kq].pg) * 0.97; if (pr >= 0.25) L.push({ g, p, pr, v: g[kq].v });
    }
    L.sort((a, b) => b.pr - a.pr);
    return { t: L.length ? `Giocatori che possono fare almeno ${n} ${nomi[kq]}, con la percentuale del modello:` : `Nessun giocatore ha almeno il 25% di arrivare a ${n} ${nomi[kq]} stasera.`, l: L.slice(0, 12).map((o) => ({ href: "#/partita/" + o.p.id, a: o.g.nome, b: `${esc(gara(o.p))} · stima ${o.v.toFixed(1).replace(".", ",")}${kq === "pts" ? tagForma(o.g) : ""}`, v: pct(o.pr), c: colProb(o.pr) })) };
  }
  // chi è la stella / il migliore marcatore della serata
  if (/chi segna di piu|miglior marcator|top scorer|piu punti.*giocator|giocator.*piu punti|stella|mvp/.test(t)) {
    const L = pre.flatMap((p) => (p.giocatori || []).filter((g) => g.pts && dellaSq({ casa: g.sq, trasf: g.sq })).map((g) => ({ g, p }))).sort((a, b) => b.g.pts.v - a.g.pts.v).slice(0, 8);
    return { t: "I giocatori con più punti stimati stasera:", l: L.map((o) => ({ href: "#/partita/" + o.p.id, a: o.g.nome, b: `${esc(gara(o.p))} · media ${o.g.pts.media != null ? o.g.pts.media.toFixed(1).replace(".", ",") : "-"}${tagForma(o.g)}`, v: o.g.pts.v.toFixed(1).replace(".", ",") + " pt", c: OR })) };
  }
  // under
  if (/\bunder\b|sotto la linea|pochi punti/.test(t) && !/meno punti|ritmo/.test(t)) {
    const ok = new Set(pre.map((p) => p.id)), L = (D.picks || []).filter((x) => ok.has(x.g) && (x.dir === "under" || /under/i.test(x.testo || ""))).sort((a, b) => b.prob - a.prob);
    if (L.length) return { t: "Le giocate «under» più probabili:", l: L.slice(0, 10).map((x) => ({ href: "#/partita/" + x.g, a: x.testo, b: x.partita, v: pct(x.prob), c: colProb(x.prob) })) };
  }
  const r = _rispondi0(D, q);
  if (r.l && r.l.length) return r;
  if (/Non ho capito/.test(r.t)) return { t: "Non ho trovato una risposta. Prova per esempio: «chi fa 25 punti?», «doppia doppia stasera», «chi è fuori?», «che partite ci sono?», «combo con i Lakers», «partite più equilibrate», oppure scrivi il nome di una squadra o di un giocatore.", l: [] };
  return r;
};
