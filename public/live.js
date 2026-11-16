// NBA Schedine - live.js (parte dell'app: i file si caricano in ordine da index.html, vedi CLAUDE.md)
"use strict";
// ---------- LIVE
function schedaLive(D, p) {
  const t = T(D, p.casa), v = T(D, p.trasf), cc = t.c, ct = v.c.toLowerCase() === cc.toLowerCase() ? "#5a6378" : v.c;
  const lato = (ab, r, n, l) => `<div class="tm cr" data-l="${l}"><div class="cl ${r}">${logo(ab, 34)}<div class="tn"><b class="n12">${n}</b>${esc(T(D, ab).b.length > 7 ? ab : T(D, ab).b)}</div></div></div>`;
  return `<div class="card gm cmp inlive" data-lg="${p.id}" data-lv="${p.id}" style="--ca:${ct};--cb:${cc};cursor:pointer"><div class="riga" style="margin-bottom:4px"><span class="pill" style="color:${OR}"><span class="dot"></span>Live · ${esc(p.dettaglio)}</span><span class="s">Giocata al ${Math.round(p.f * 100)}% <i class="ti ti-chevron-${liveAperte.has(String(p.id)) ? "up" : "down"}"></i></span></div>
  <div class="cg">${lato(p.casa, "ca", 1, "c")}<div class="cm"><span class="big liveN">${p.ptCasa}</span><i>-</i><span class="big liveN">${p.ptTr}</span></div>${lato(p.trasf, "tr", 2, "t")}</div>
  <div class="qr">${(p.qTr || []).map((q, i) => `<span class="${p.periodo === i + 1 ? "cur" : ""}">Q${i + 1} ${(p.qCasa || [])[i] ?? 0}-${q}</span>`).join("")}</div>
  ${andamentoLive(D, p)}
  <div class="bar" style="margin:6px 0 2px"><div style="width:${(p.pwLive * 100).toFixed(0)}%;background:${cc}"></div><div style="flex:1;background:${ct}"></div></div>
  <div class="riga s" style="margin:0 0 6px"><span>1 ${esc(p.casa)} ${pct(p.pwLive)}</span><span>vittoria adesso</span><span>${esc(p.trasf)} ${pct(1 - p.pwLive)} 2</span></div>
  <span class="chip">Totale ora ${p.ptCasa + p.ptTr}</span><span class="chip">Finale stimato ${p.proiTot.toFixed(0)}</span>${p.mercato ? `<span class="chip" style="color:${AM}">Bookmaker ${p.mercato.linea}: over ${pct(p.mercato.pMk)} (${p.mercato.minuti} min fa)</span><span class="chip" style="color:${colProb(Math.max(p.mercato.pNostra, 1 - p.mercato.pNostra))}">Nostra stima: ${p.mercato.pNostra >= 0.5 ? "over" : "under"} ${pct(Math.max(p.mercato.pNostra, 1 - p.mercato.pNostra))}</span>` : ""}</div>`;
}
function rigaSegnale(x) {
  const vis = x.pid ? foto(x.pid, 34) : `<span class="ph" style="width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center"><i class="ti ti-bolt" style="color:${OR}"></i></span>`;
  return `<div class="card seg"><div class="riga" style="gap:10px"><div class="lg" style="flex:1">${vis}<div style="min-width:0"><div style="font-weight:600">${esc(x.testo)}</div><div class="s">${esc(x.tipo)} · ora ${esc(x.adesso)} · stima ${esc(x.stima)}</div></div></div><div style="font-size:20px;font-weight:600;color:${colProb(x.prob)}">${pct(x.prob)}</div></div><div class="cap" style="margin:6px 0 0">${esc(x.motivo)}</div></div>`;
}
function rigaLive(x) {
  const hit = x.pLive >= 0.995 && x.cur != null, col = hit ? GR : x.pLive >= 0.7 ? GR : x.pLive >= 0.4 ? OR : RD;
  const delta = x.pLive - x.prob, fr = delta >= 0 ? "ti-arrow-up-right" : "ti-arrow-down-right";
  return `<div class="card riga" style="padding:10px 12px;gap:10px"><div style="min-width:0;flex:1"><div style="font-weight:500">${esc(x.testo)}</div><div class="s">${esc(x.tipo)} · ora ${esc(x.adesso)}</div><div class="s">Prima ${pct(x.prob)} <i class="ti ${fr}" style="color:${delta >= 0 ? GR : RD}"></i></div></div><div style="text-align:right"><div style="font-size:20px;font-weight:600;color:${col}">${pct(x.pLive)}</div><div class="s">${hit ? "Centrata" : x.pLive < 0.15 ? "Difficile" : "In corso"}</div></div></div>`;
}
const storiaLive = {}, eventiLive = [], statoGiocate = {};
function aggiornaStoriaLive(D) {
  for (const p of D.partite) {
    const a = (storiaLive[p.id] ||= []), ult = a[a.length - 1];
    if (!ult || ult.f !== p.f) a.push({ f: p.f, p: p.pwLive });
    for (const q of p.picks || []) {
      const k = p.id + "|" + (q.id || q.testo), prima = statoGiocate[k];
      const ora = q.pLive >= 0.995 ? "ok" : q.pLive <= 0.03 ? "no" : "in";
      if (prima && prima !== ora && ora !== "in") eventiLive.push({ t: Date.now(), ok: ora === "ok", testo: q.testo, partita: `${p.casa} - ${p.trasf}` });
      statoGiocate[k] = ora;
    }
  }
  while (eventiLive.length > 20) eventiLive.shift();
}
function grafLive(p) {
  const a = storiaLive[p.id] || []; if (a.length < 2) return "";
  const w = 300, h = 70, X = (f) => (f * w).toFixed(1), Y = (v) => ((1 - v) * (h - 6) + 3).toFixed(1);
  const pts = a.map((q) => `${X(q.f)},${Y(q.p)}`).join(" ");
  const ca = T({ squadre: {} }, p.casa).c;
  return `<div class="card" style="padding:10px 12px"><div class="riga s"><span>Probabilità di vittoria di ${esc(p.casa)} nel tempo</span><b style="color:var(--txt)">${pct(p.pwLive)}</b></div><svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" style="margin-top:6px"><line x1="0" x2="${w}" y1="${Y(0.5)}" y2="${Y(0.5)}" stroke="#2a3040" stroke-dasharray="4 4"/><polyline points="${pts}" fill="none" stroke="${OR}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg></div>`;
}
function novitaLive() {
  const l = eventiLive.filter((e) => Date.now() - e.t < 15 * 60000).slice(-4).reverse(); if (!l.length) return "";
  return `<div class="sub">Appena successo</div>` + l.map((e) => `<div class="card riga" style="padding:9px 12px;border-left:3px solid ${e.ok ? GR : RD}"><div style="min-width:0"><div style="font-weight:600">${esc(e.testo)}</div><div class="s">${esc(e.partita)}</div></div><b style="color:${e.ok ? GR : RD}">${e.ok ? "Centrata" : "Persa"}</b></div>`).join("");
}

// formazioni in riga: nome a sinistra, statistiche a destra
function formazioniLive(D, p) {
  if (!p.giocatori.length) return `<div class="vuoto" style="margin-top:12px">Formazioni e statistiche non ancora disponibili da ESPN.</div>`;
  const col = (g) => g.pts ?? 0;
  const tab = (sq) => {
    const l = p.giocatori.filter((g) => g.sq === sq); if (!l.length) return "";
    const top = Math.max(...l.map(col));
    const rg = (g) => { const n = g.nome.split(" "), br = n.length > 1 ? n[0][0] + ". " + n.slice(1).join(" ") : g.nome;
      const hot = col(g) >= 20 || (g.pts >= 10 && g.reb >= 10) || (g.pts >= 10 && g.ast >= 10);
      return `<tr class="${hot ? "hot" : ""}"><td class="nm"><div class="nmi">${g.pid ? foto(g.pid, 22) : ""}<span>${esc(br)}${g.pts === top && top > 0 ? ' <i class="ti ti-flame" style="color:' + OR + '"></i>' : ""}</span></div></td><td class="pt">${g.pts ?? 0}</td><td>${g.reb ?? 0}</td><td>${g.ast ?? 0}</td><td>${g.tre ?? "–"}</td><td>${g.stl ?? 0}</td><td>${g.blk ?? 0}</td><td class="${(g.pf ?? 0) >= 4 ? "fl" : ""}">${g.pf ?? 0}</td><td class="mn">${Math.round(g.min ?? 0)}</td></tr>`; };
    const tit = l.filter((g) => g.tit), pan = l.filter((g) => !g.tit).sort((a, b) => (b.min || 0) - (a.min || 0));
    const hd = `<tr class="th"><th></th><th>PT</th><th>RB</th><th>AS</th><th>3P</th><th>PR</th><th>ST</th><th>FL</th><th>MIN</th></tr>`;
    return `<div class="card fz"><div class="lg" style="margin-bottom:4px">${logo(sq, 24)}<b>${esc(T(D, sq).n)}</b><span class="s" style="margin-left:auto">${sq === p.casa ? "casa" : "trasferta"}</span></div><table class="bx">${hd}${(tit.length ? tit : pan.slice(0, 5)).map(rg).join("")}</table>${(tit.length ? pan : pan.slice(5)).length ? `<details class="pan"><summary>Panchina (${(tit.length ? pan : pan.slice(5)).length})</summary><table class="bx">${hd}${(tit.length ? pan : pan.slice(5)).map(rg).join("")}</table></details>` : ""}</div>`;
  };
  return `<div class="sub">Formazioni e statistiche</div>` + tab(p.casa) + tab(p.trasf) + `<div class="cap" style="margin-top:0">PT punti · RB rimbalzi · AS assist · 3P triple (segnate-tentate) · PR palle rubate · ST stoppate · FL falli (rosso da 4) · MIN minuti. In arancione chi ha 20+ punti o una doppia doppia.</div>`;
}

// stato di una giocata della mia schedina rispetto alla partita in corso
function avanzamentoLeg(l, D) {
  const p = D.partite.find((x) => x.id === l.g);
  if (!p) return D.prossime.some((x) => x.id === l.g) ? { st: "pre", testo: "non ancora iniziata" } : { st: "nd", testo: "partita non in corso" };
  let cur = null;
  if (l.k === "tot") cur = (p.ptTr || 0) + (p.ptCasa || 0);
  else if (l.k === "sq") cur = l.sq === p.casa ? p.ptCasa : p.ptTr;
  else if (l.k === "win") { const d = l.sq === p.casa ? (p.ptCasa || 0) - (p.ptTr || 0) : (p.ptTr || 0) - (p.ptCasa || 0); return { st: d > 0 ? "vant" : "svant", testo: `${d > 0 ? "in vantaggio di " : "sotto di "}${Math.abs(d)}`, cur: d, soglia: 0, p }; }
  else { const g = p.giocatori.find((x) => (l.pid && x.pid === l.pid) || (l.nome && x.nome === l.nome)); if (!g) return { st: "nd", testo: "giocatore non ancora nel tabellino", p }; cur = g[l.k]; }
  const over = l.dir !== "under", sg = l.soglia;
  const st = over ? (cur > sg ? "ok" : "in") : (cur > sg ? "no" : "in");
  return { st, cur, soglia: sg, testo: `${cur} / ${sg}`, p };
}
function mieGiocateLive(D) {
  const oggi = new Date().toISOString().slice(0, 10), R = ls.get("registro", []).filter((r) => r.legs && r.legs.length && (r.esito == null || String(r.data) >= oggi || r.esito != null && String(r.data) >= new Date(Date.now() - 86400000).toISOString().slice(0, 10)));
  if (!R.length) return "";
  const col = { ok: GR, no: RD, in: OR, vant: GR, svant: AM, pre: MU, nd: MU };
  return `<div class="sub"><i class="ti ti-ticket" style="color:${OR}"></i> Le mie giocate</div>` + R.map((r) => `<div class="card"><div class="riga"><b>${esc(r.nome)}</b><span class="s">${r.esito === 1 ? "<b style=\"color:" + GR + "\">VINTA</b> · " : r.esito === 0 ? "<b style=\"color:" + RD + "\">PERSA</b> · " : ""}quota ${r.quota} · ${r.puntata} €${r.esito == null ? `<button class="chipbtn" data-delm="${esc(r.id)}" style="padding:2px 9px;font-size:11px;margin-left:6px">Rimuovi</button>` : ""}</span></div>` + (r.esito != null && r.es ? dettaglioLegs(r) : r.legs.map((l) => {
    const a = avanzamentoLeg(l, D), c = col[a.st] || MU, pr = a.soglia > 0 && a.cur != null ? Math.max(0, Math.min(100, (a.cur / a.soglia) * 100)) : 0;
    const ic = a.st === "ok" ? "ti-circle-check-filled" : a.st === "no" ? "ti-circle-x-filled" : "ti-circle-dashed";
    return `<div style="margin-top:10px"><div class="riga" style="gap:8px"><div style="min-width:0;flex:1"><i class="ti ${ic}" style="color:${c}"></i> ${esc(l.testo)}</div><b style="color:${c};white-space:nowrap">${esc(a.testo)}</b></div>${a.soglia > 0 ? `<div class="bar" style="height:4px;margin-top:4px"><div style="width:${pr}%;background:${c}"></div></div>` : ""}${a.p ? `<div class="s" style="margin-top:2px">${esc(a.p.dettaglio || "")}</div>` : ""}</div>`;
  }).join("")) + `</div>`).join("");
}
const bloccoLive = {};
let ultimoLive = null;
const liveAperte = new Set((() => { try { return JSON.parse(sessionStorage.getItem("liveAp") || "[]"); } catch { return []; } })());
async function vistaLive(primo = true) {
  let dipinto = false;
  if (primo) {
    aggiornaRegistro();
    if (ultimoLive && Date.now() - ultimoLive.t < 10 * 60000) { APP.innerHTML = ultimoLive.html; APP.dataset.live = ultimoLive.chiavi; for (const k of Object.keys(bloccoLive)) delete bloccoLive[k]; Object.assign(bloccoLive, ultimoLive.blocchi); dipinto = true; }
    else { APP.innerHTML = topBar() + skel(); delete APP.dataset.live; }
  }
  let D; try { D = await api("/api/live", 3000); } catch (e) { if (primo) APP.innerHTML = topBar() + errBox(e); timer = setTimeout(() => location.hash.startsWith("#/live") && vistaLive(false), 20000); return; }
  if (!location.hash.startsWith("#/live")) return;
  aggiornaStoriaLive(D);
  const B = []; // blocchi con chiave: si riscrive solo quello che cambia, così la pagina non lampeggia
  B.push(["top", topBar(D) + novitaLive() + `<div class="cap" style="margin-top:0">Si aggiorna da solo ogni 6 secondi (ESPN pubblica i dati ogni 10-20 secondi circa). Le probabilità tengono conto di punteggio, tempo rimasto e minuti giocati.</div>`]);
  if (!D.partite.length) {
    let h = `<div class="vuoto"><b>Nessuna partita in corso.</b><br>Oggi: ${D.totali} partite, ${D.finite} finite.</div>`;
    if (D.prossime.length) h += `<h2>Prossime partite</h2>` + D.prossime.map((q) => `<a class="card riga" href="#/partita/${q.id}"><div class="lg">${logo(q.casa, 28)}<b>${esc(q.casa)}</b><span class="s">-</span>${logo(q.trasf, 28)}<b>${esc(q.trasf)}</b></div><span class="s">${esc(q.ora)}</span></a>`).join("");
    B.push(["vuoto", h]);
  }
  B.push(["mie", mieGiocateLive(D)]);
  for (const p of D.partite) {
    let h = formazioniLive(D, p) + grafLive(p);
    if (p.segnali && p.segnali.length) h += `<div class="sub"><span class="pill" style="color:${OR}"><span class="dot"></span>Segnali live</span> <span class="s">nati durante la partita</span></div>` + p.segnali.map(rigaSegnale).join("");
    const picks = [...p.picks].sort((a, b) => (a.pLive >= 0.995) - (b.pLive >= 0.995) || b.pLive - a.pLive);
    if (picks.length) h += `<div class="sub">Le nostre giocate su questa partita</div>` + picks.map(rigaLive).join("");
    h += `<a class="btn" style="display:block;text-align:center" href="#/partita/${p.id}">Apri lo studio di questa partita</a>`;
    B.push(["g" + p.id, schedaLive(D, p) + `<div class="lvdet" id="lvd${p.id}"${liveAperte.has(String(p.id)) ? "" : " hidden"}>${h}</div>`]);
  }
  const chiavi = B.map((x) => x[0]).join("|"), y = window.scrollY;
  if ((!primo || dipinto) && APP.dataset.live === chiavi && APP.querySelector("[data-blk]")) {
    for (const [k, h] of B) {
      const el = APP.querySelector(`[data-blk="${k}"]`); if (!el || bloccoLive[k] === h) continue;
      const aperti = [...el.querySelectorAll("details")].map((d) => d.open);
      el.innerHTML = h; bloccoLive[k] = h;
      el.querySelectorAll("details").forEach((d, i) => { if (aperti[i]) d.open = true; });
    }
  } else {
    APP.innerHTML = B.map(([k, h]) => `<div data-blk="${k}">${h}</div>`).join(""); APP.dataset.live = chiavi;
    for (const k of Object.keys(bloccoLive)) delete bloccoLive[k];
    for (const [k, h] of B) bloccoLive[k] = h;
  }
  ultimoLive = { t: Date.now(), chiavi, html: APP.innerHTML, blocchi: { ...bloccoLive } };
  window.scrollTo(0, y);
  for (const p of D.partite) illumina(APP.querySelector(`[data-lg="${p.id}"]`), p.id, p.ptTr, p.ptCasa);
  timer = setTimeout(() => !document.hidden && location.hash.startsWith("#/live") && vistaLive(false), 6000);
}

// ---------- ESITI e STORICO
function barraPerc(t, k, n, att) { const p = n ? k / n * 100 : 0; return `<div class="card pc"><div class="s">${esc(t)}</div><b>${k}/${n}</b> <span class="s">(${p.toFixed(0)}%${att != null ? " · previsto " + pct(att) : ""})</span><div class="mini"><i style="width:${p.toFixed(0)}%;background:${p >= 60 ? GR : RD}"></i></div></div>`; }
function precisioneModello(S) {
  const nomi = { Totale: "Punti totali della partita", Squadra: "Punti di una squadra", Punti: "Punti di un giocatore", Rimbalzi: "Rimbalzi", Assist: "Assist" }, per = {};
  for (const r of S.righe || []) {
    if (r.esito !== 0 && r.esito !== 1 || !nomi[r.tipo]) continue;
    const st = parseFloat(r.stima), m = /fatto (-?\d+(?:\.\d+)?)/.exec(r.dettaglio || ""); if (!Number.isFinite(st) || !m) continue;
    const c = (per[r.tipo] ||= { n: 0, ae: 0, e: 0 }); c.n++; c.ae += Math.abs(st - +m[1]); c.e += st - +m[1];
  }
  const l = Object.entries(per).filter(([, c]) => c.n >= 3); if (!l.length) return "";
  return `<h2>Precisione del modello</h2><div class="grid2">` + l.map(([t, c]) => `<div class="card pc"><div class="s">${esc(nomi[t])}</div><b>±${(c.ae / c.n).toFixed(1)}</b> <span class="s">di errore medio</span><div class="s">${c.n} giocate · ${Math.abs(c.e / c.n) < 0.5 ? "nessuna tendenza" : c.e > 0 ? "stima in media " + (c.e / c.n).toFixed(1) + " in più del reale" : "stima in media " + (-c.e / c.n).toFixed(1) + " in meno del reale"}</div></div>`).join("") + `</div><div class="cap">Confronta la stima dell'app con quello che è successo davvero nelle giocate già chiuse.</div>`;
}
function schedineStorico(S) {
  const l = (S.schedine || []); if (!l.length) return "";
  const ris = l.filter((r) => r.esito === 0 || r.esito === 1), att = l.length - ris.length;
  const per = {}; for (const r of ris) { const c = (per[r.squadra] ||= { n: 0, ok: 0, pr: 0, nome: String(r.partita || r.squadra) }); c.n++; c.ok += r.esito; c.pr += r.prob; }
  let h = `<h2>Schedine proposte</h2>`;
  if (!ris.length) return h + `<div class="vuoto">Salvate ${l.length} schedine, ${att} in attesa che le partite finiscano. Qui vedrai quante ne vengono centrate.</div>`;
  h += `<div class="grid2">` + Object.values(per).map((c) => barraPerc(c.nome, c.ok, c.n, c.pr / c.n)).join("") + `</div>`;
  h += ris.slice(0, 8).map((r) => `<div class="card riga" style="padding:9px 12px;gap:10px"><div style="min-width:0"><div style="font-weight:500">${esc(r.partita)} · ${esc(r.data)}</div><div class="s">${esc(r.dettaglio || "")} · prevista ${pct(r.prob)}</div></div><b style="color:${r.esito === 1 ? GR : RD}">${r.esito === 1 ? "Centrata" : "Sbagliata"}</b></div>`).join("");
  return h;
}
function rigaEsito(r) {
  const [s, c] = { 1: ["✓", GR], 0: ["✗", RD], 2: ["–", MU] }[r.esito];
  return `<div class="card riga" style="padding:10px 12px;gap:10px;justify-content:flex-start"><div style="width:28px;height:28px;border-radius:50%;background:${c}22;color:${c};display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">${s}</div><div style="min-width:0;flex:1"><div style="font-weight:500">${esc(r.testo)}</div><div class="s">${esc(r.partita)} · ${esc(r.dettaglio || "")}</div></div><div class="s">${pct(r.prob)}</div></div>`;
}
async function vistaEsiti() {
  APP.innerHTML = topBar() + segStorico("e") + giorniChips() + skel(); bindGiorni();
  let E; try { E = await api("/api/esiti?" + qs(), 60000); } catch (e) { APP.innerHTML = topBar() + segStorico("e") + giorniChips() + errBox(e); bindGiorni(); return; }
  const ris = E.risultati, val = ris.filter((x) => x.esito !== 2); ultimoD = { squadre: E.squadre || {} };
  let h = topBar() + segStorico("e") + giorniChips();
  if (!val.length) h += `<div class="vuoto">Nessuna partita finita da verificare per questo giorno. Torna a partite concluse.</div>`;
  else {
    const ok = val.filter((x) => x.esito === 1).length, p = ok / val.length * 100;
    h += `<div class="card riga" style="gap:14px;justify-content:flex-start">${anello(p, p >= 60 ? GR : OR, 76)}<div><div class="s">Consigli delle partite finite</div><div style="font-size:20px;font-weight:600">${ok} su ${val.length} azzeccati</div><div class="s">${ris.length - val.length} non validi (giocatore fermo o dato mancante)</div></div></div>`;
    const cat = ls.get("esCat", null), sel = cat != null ? SC[cat] : null;
    h += `<div class="grid2">${SC.map(([t, , tipi], i) => { const v = val.filter((x) => tipi.includes(x.tipo)); return v.length ? `<div data-ec="${i}" style="cursor:pointer;${cat === i ? "outline:1px solid " + OR + ";border-radius:16px" : ""}">${barraPerc(t, v.filter((x) => x.esito === 1).length, v.length)}</div>` : ""; }).join("")}</div>`;
    if (sel) {
      const l = val.filter((x) => sel[2].includes(x.tipo)).sort((a, b) => b.prob - a.prob);
      h += `<h2>${esc(sel[0])} (${l.length})</h2><div class="cap" style="margin-top:0">Tutte le giocate della categoria, dalla più probabile. <a href="#" id="tutte" style="color:${OR}">Mostra tutto</a></div>` + l.map(rigaEsito).join("");
    } else
    for (const [t, c] of [["Azzeccati", 1], ["Sbagliati", 0]]) { const l = val.filter((x) => x.esito === c); if (l.length) h += `<h2>${t} (${l.length})</h2>` + l.map(rigaEsito).join(""); }
    const nulli = ris.filter((x) => x.esito === 2);
    if (nulli.length) h += `<details><summary>Non validi (${nulli.length})</summary>${nulli.map(rigaEsito).join("")}</details>`;
    h += riquadroTabellini(ris) + `<div class="cap">I consigli sono ricalcolati con le statistiche attuali. Per il registro vero guarda «Storico».</div>`;
  }
  APP.innerHTML = h; bindGiorni();
  APP.querySelectorAll("[data-ec]").forEach((el) => el.onclick = () => { const i = +el.dataset.ec; ls.set("esCat", ls.get("esCat", null) === i ? null : i); vistaEsiti(); });
  const tt = $("#tutte"); if (tt) tt.onclick = (e) => { e.preventDefault(); ls.set("esCat", null); vistaEsiti(); };
}
function schedineStorico(S) {
  const l = (S.schedine || []); if (!l.length) return "";
  const ris = l.filter((r) => r.esito === 0 || r.esito === 1), att = l.length - ris.length;
  const per = {}; for (const r of ris) { const c = (per[r.squadra] ||= { n: 0, ok: 0, pr: 0, nome: String(r.partita || r.squadra) }); c.n++; c.ok += r.esito; c.pr += r.prob; }
  let h = `<h2>Schedine proposte</h2>`;
  if (!ris.length) return h + `<div class="vuoto">Salvate ${l.length} schedine, ${att} in attesa che le partite finiscano. Qui vedrai quante ne vengono centrate.</div>`;
  h += `<div class="grid2">` + Object.values(per).map((c) => barraPerc(c.nome, c.ok, c.n, c.pr / c.n)).join("") + `</div>`;
  h += ris.slice(0, 8).map((r) => `<div class="card riga" style="padding:9px 12px;gap:10px"><div style="min-width:0"><div style="font-weight:500">${esc(r.partita)} · ${esc(r.data)}</div><div class="s">${esc(r.dettaglio || "")} · prevista ${pct(r.prob)}</div></div><b style="color:${r.esito === 1 ? GR : RD}">${r.esito === 1 ? "Centrata" : "Sbagliata"}</b></div>`).join("");
  return h;
}
function rigaEsito(r) {
  const [s, c] = { 1: ["✓", GR], 0: ["✗", RD], 2: ["–", MU] }[r.esito];
  return `<div class="card riga" style="padding:10px 12px;gap:10px;justify-content:flex-start"><div style="width:28px;height:28px;border-radius:50%;background:${c}22;color:${c};display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">${s}</div><div style="min-width:0;flex:1"><div style="font-weight:500">${esc(r.testo)}</div><div class="s">${esc(r.partita)} · ${esc(r.dettaglio || "")}</div></div><div class="s">${pct(r.prob)}</div></div>`;
}
async function vistaEsiti() {
  APP.innerHTML = topBar() + segStorico("e") + giorniChips() + skel(); bindGiorni();
  let E; try { E = await api("/api/esiti?" + qs(), 60000); } catch (e) { APP.innerHTML = topBar() + segStorico("e") + giorniChips() + errBox(e); bindGiorni(); return; }
  const ris = E.risultati, val = ris.filter((x) => x.esito !== 2); ultimoD = { squadre: E.squadre || {} };
  let h = topBar() + segStorico("e") + giorniChips();
  if (!val.length) h += `<div class="vuoto">Nessuna partita finita da verificare per questo giorno. Torna a partite concluse.</div>`;
  else {
    const ok = val.filter((x) => x.esito === 1).length, p = ok / val.length * 100;
    h += `<div class="card riga" style="gap:14px;justify-content:flex-start">${anello(p, p >= 60 ? GR : OR, 76)}<div><div class="s">Consigli delle partite finite</div><div style="font-size:20px;font-weight:600">${ok} su ${val.length} azzeccati</div><div class="s">${ris.length - val.length} non validi (giocatore fermo o dato mancante)</div></div></div>`;
    const cat = ls.get("esCat", null), sel = cat != null ? SC[cat] : null;
    h += `<div class="grid2">${SC.map(([t, , tipi], i) => { const v = val.filter((x) => tipi.includes(x.tipo)); return v.length ? `<div data-ec="${i}" style="cursor:pointer;${cat === i ? "outline:1px solid " + OR + ";border-radius:16px" : ""}">${barraPerc(t, v.filter((x) => x.esito === 1).length, v.length)}</div>` : ""; }).join("")}</div>`;
    if (sel) {
      const l = val.filter((x) => sel[2].includes(x.tipo)).sort((a, b) => b.prob - a.prob);
      h += `<h2>${esc(sel[0])} (${l.length})</h2><div class="cap" style="margin-top:0">Tutte le giocate della categoria, dalla più probabile. <a href="#" id="tutte" style="color:${OR}">Mostra tutto</a></div>` + l.map(rigaEsito).join("");
    } else
    for (const [t, c] of [["Azzeccati", 1], ["Sbagliati", 0]]) { const l = val.filter((x) => x.esito === c); if (l.length) h += `<h2>${t} (${l.length})</h2>` + l.map(rigaEsito).join(""); }
    const nulli = ris.filter((x) => x.esito === 2);
    if (nulli.length) h += `<details><summary>Non validi (${nulli.length})</summary>${nulli.map(rigaEsito).join("")}</details>`;
    h += riquadroTabellini(ris) + `<div class="cap">I consigli sono ricalcolati con le statistiche attuali. Per il registro vero guarda «Storico».</div>`;
  }
  APP.innerHTML = h; bindGiorni();
  APP.querySelectorAll("[data-ec]").forEach((el) => el.onclick = () => { const i = +el.dataset.ec; ls.set("esCat", ls.get("esCat", null) === i ? null : i); vistaEsiti(); });
  const tt = $("#tutte"); if (tt) tt.onclick = (e) => { e.preventDefault(); ls.set("esCat", null); vistaEsiti(); };
}
function taraturaFasce(val) {
  const DAL = "2026-11-14T12:00:00Z", fasce = [[0.7, 0.75, "70-75%"], [0.75, 0.8, "75-80%"], [0.8, 0.85, "80-85%"], [0.85, 1.01, "85% e oltre"]];
  const riga = (l) => { if (!l.length) return ""; const n = l.length, ok = l.filter((r) => r.esito === 1).length, pr = l.reduce((a, r) => a + r.prob, 0) / n, re = ok / n, d = (re - pr) * 100;
    return `<div class="riga" style="font-size:13px"><span>${ok}/${n}</span><span class="s">previsto ${pct(pr)} · centrato ${pct(re)}</span><b style="color:${Math.abs(d) < 5 ? GR : d < 0 ? RD : OR}">${d > 0 ? "+" : ""}${d.toFixed(0)}</b></div>`; };
  return `<div class="grid2">${fasce.map(([a, b, n]) => { const l = val.filter((r) => r.prob >= a && r.prob < b), nuovi = l.filter((r) => r.creato && String(r.creato) >= DAL); if (!l.length) return "";
    return `<div class="card pc"><div class="s">${n}</div>${riga(l)}${nuovi.length && nuovi.length < l.length ? `<div class="s" style="margin-top:4px">Solo modello attuale</div>${riga(nuovi)}` : ""}</div>`; }).join("")}</div>`;
}
async function vistaStorico() {
  APP.innerHTML = topBar() + skel();
  let S; try { S = await api("/api/storico", 0); } catch (e) { APP.innerHTML = topBar() + errBox(e); return; }
  let h = topBar();
  if (!S.attivo) h += `<div class="vuoto">Il registro non è ancora attivo: servono i segreti SUPABASE_URL e SUPABASE_KEY nel progetto Cloudflare.</div>`;
  else {
    const val = S.righe.filter((r) => r.esito === 0 || r.esito === 1), att = S.righe.filter((r) => r.esito == null).length;
    if (!val.length) h += `<div class="vuoto">Nessun esito ancora: ${S.righe.length} consigli salvati, ${att} in attesa che le partite finiscano. Apri l'app prima delle partite e dopo la fine.</div>`;
    else {
      const ok = val.filter((r) => r.esito === 1).length, p = ok / val.length * 100, at = val.reduce((a, r) => a + r.prob, 0) / val.length;
      h += `<div class="card riga" style="gap:14px;justify-content:flex-start">${anello(p, p >= 60 ? GR : OR, 76)}<div><div class="s">Storico dei consigli salvati</div><div style="font-size:20px;font-weight:600">${ok} su ${val.length} azzeccati</div><div class="s">Il modello prevedeva in media il ${pct(at)} · ${att} in attesa</div></div></div>`;
      const sub = (l) => [l.filter((r) => r.esito === 1).length, l.length, l.reduce((a, r) => a + r.prob, 0) / l.length];
      h += `<h2>Per categoria</h2><div class="grid2">${SC.map(([t, , tipi]) => { const l = val.filter((r) => tipi.includes(r.tipo)); return l.length ? barraPerc(t, ...sub(l)) : ""; }).join("")}</div>`;
      h += `<h2>Taratura per fascia</h2>` + taraturaFasce(val) + `<div class="cap">Per ogni fascia di probabilità: quanto prevedeva il modello e quanto è stato centrato davvero. Scarto negativo = il modello era troppo ottimista. Il modello attuale conta dal 14/11.</div>`;
      h += `<h2>Esiti per giornata</h2>` + perGiornata(val.map((r) => ({ r })), ({ r }) => rigaEsito(r));
    }
  }
  h += riquadroTabellini((S.righe || []).filter((r) => r.esito === 0 || r.esito === 1).slice(0, 80)) + precisioneModello(S) + schedineStorico(S);
  h += `<div class="cap" style="text-align:center;margin-top:14px"><a href="#/registro" style="color:${OR}"><i class="ti ti-notebook"></i> Il mio registro</a> &nbsp;·&nbsp; <a href="#/calcolatore" style="color:${OR}"><i class="ti ti-calculator"></i> Calcolatore</a> &nbsp;·&nbsp; <a href="#/impostazioni" style="color:${OR}"><i class="ti ti-settings"></i> Impostazioni</a></div>`;
  h += `<div class="cap" style="text-align:center;margin-top:18px"><a href="#/diag" style="color:${OR}"><i class="ti ti-stethoscope"></i> Controllo dei dati</a></div>`;
  APP.innerHTML = h;
}

async function vistaDiag() {
  APP.innerHTML = topBar() + skel();
  let D; try { D = await api("/api/diag", 0); } catch (e) { APP.innerHTML = topBar() + errBox(e); return; }
  const v = D.controlli || D.voci || [];
  let h = topBar() + `<h2>Controllo dei dati</h2><div class="cap" style="margin-top:0">Verifica una per una le fonti usate dall'app. Se una voce è rossa, il motivo è scritto sotto.</div>`;
  h += v.map((x) => `<div class="card"><div class="riga"><b>${esc(x.nome)}</b><span class="pill" style="color:${x.ok ? GR : RD}">${x.ok ? "OK" : "Errore"}</span></div><div class="s" style="margin-top:4px">${esc(x.dettaglio)}</div></div>`).join("");
  h += `<div class="cap">Versione dell'app sul telefono: ${VERSIONE}.</div><div class="cap">Controllato alle ${esc(new Date(D.ora || D.aggiornato || Date.now()).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }))}. <a href="#/diag" onclick="route(true);return false" style="color:${OR}">Ricontrolla</a></div>`;
  APP.innerHTML = h;
}



