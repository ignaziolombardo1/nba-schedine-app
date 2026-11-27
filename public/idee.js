// NBA Schedine - idee.js: unione di idee1..idee15 (nell'ordine originale; ogni sezione ha il suo commento iniziale). Vedi CLAUDE.md.
// NBA Schedine - idee1.js: pagella del modello, minuti a rischio, schedina del giorno, limite di perdita, tema notte, correlazione (vedi CLAUDE.md)
"use strict";
window.RIDEE = window.RIDEE || []; // rotte extra: [regex, funzione(match)]

// ---- 2. Pagella del modello: probabilità dichiarate contro risultati reali del registro
function graficoPagella(reg) {
  const pr = reg.filter((r) => r.prob > 0 && (r.esito === 0 || r.esito === 1));
  const fasce = [[0.4, 0.55], [0.55, 0.7], [0.7, 0.8], [0.8, 0.9], [0.9, 1.01]];
  const pt = fasce.map(([a, b]) => { const l = pr.filter((r) => r.prob >= a && r.prob < b); return l.length >= 3 ? { n: l.length, x: l.reduce((t, r) => t + r.prob, 0) / l.length, y: l.reduce((t, r) => t + r.esito, 0) / l.length } : null; }).filter(Boolean);
  if (pt.length < 2) return `<div class="cap">La pagella appare quando hai almeno 3 giocate chiuse in due fasce di probabilità diverse.</div>`;
  const W = 300, H = 200, P = 26, X = (v) => P + v * (W - P - 8), Y = (v) => H - P - v * (H - P - 8);
  const linea = pt.map((p) => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ");
  const pes = pt.reduce((t, p) => t + p.n * (p.y - p.x), 0) / pt.reduce((t, p) => t + p.n, 0);
  const verdetto = Math.abs(pes) < 0.04 ? "Il modello è ben tarato sui tuoi risultati." : pes > 0 ? `Il modello è prudente: centri circa ${Math.round(pes * 100)} punti in più del previsto.` : `Il modello è ottimista: centri circa ${Math.round(-pes * 100)} punti in meno del previsto.`;
  return `<h2>Pagella del modello</h2><div class="card"><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Probabilità dichiarate contro risultati reali"><line x1="${X(0)}" y1="${Y(0)}" x2="${X(1)}" y2="${Y(1)}" stroke="#4a5266" stroke-dasharray="4 4"/><line x1="${X(0)}" y1="${Y(0)}" x2="${X(1)}" y2="${Y(0)}" stroke="#2a3040"/><line x1="${X(0)}" y1="${Y(0)}" x2="${X(0)}" y2="${Y(1)}" stroke="#2a3040"/><polyline points="${linea}" fill="none" stroke="${OR}" stroke-width="2.5" stroke-linejoin="round"/>${pt.map((p) => `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${(3 + Math.min(5, p.n / 4)).toFixed(1)}" fill="${OR}"/>`).join("")}<text x="${W - 6}" y="${H - 8}" text-anchor="end" font-size="9" fill="${MU}">probabilità dichiarata</text><text x="6" y="12" font-size="9" fill="${MU}">centrate</text></svg><div class="s" style="margin-top:4px">${verdetto}</div><div class="cap" style="margin:6px 0 0">Ogni punto è una fascia di probabilità (più grande = più giocate). Sopra la linea tratteggiata il modello è prudente, sotto è troppo ottimista.</div></div>`;
}

// ---- 6. Minuti a rischio: etichetta sulle giocate dei giocatori quando il modello taglia i minuti per partita decisa presto
function rischioMin(x) {
  const d = x && x.det; if (!d || d.minBase == null || d.min == null || d.minBase - d.min < 1.5) return "";
  return `<span class="s" style="color:${AM}" title="Il modello prevede una partita sbilanciata: i titolari potrebbero riposare nel finale"> · minuti a rischio (${Math.round(d.min)} su ${Math.round(d.minBase)})</span>`;
}

// ---- 24. Schedina del giorno: le 3 giocate più sicure di partite diverse, in un tocco
function sceltaSchedinaGiorno(D) {
  const pre = new Set((D.partite || []).filter((p) => p.stato === "pre").map((p) => p.id)), viste = new Set(), s = [];
  for (const x of [...(D.picks || [])].sort((a, b) => b.prob - a.prob)) { if (!pre.has(x.g) || viste.has(x.g) || x.prob < 0.74) continue; viste.add(x.g); s.push(x); if (s.length === 3) break; }
  return s;
}
function btnSchedinaGiorno(D) {
  const s = sceltaSchedinaGiorno(D); if (s.length < 2) return "";
  const p = s.reduce((t, x) => t * x.prob, 1);
  return `<button class="btn" id="sgg" style="margin:0 0 10px"><i class="ti ti-wand"></i> Schedina del giorno: ${s.length} giocate di partite diverse, ${pct(p)} tutte centrate</button>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest && e.target.closest("#sgg"); if (!b || !window.__D) return;
  const s = sceltaSchedinaGiorno(window.__D); if (!s.length) return;
  for (const x of s) PM.set(x.id, legDa(x));
  ls.set("mia", s.map(legDa)); barraMia(); location.hash = "#/mia";
});

// ---- 26. Limite di perdita: prima di salvare una giocata si controlla il budget mensile
function controllaBudget(puntata) {
  const lim = +(ls.get("budget", {}).perdita || 0); if (!lim) return true;
  const persa = Math.max(0, -nettoMese());
  if (persa >= lim) return confirm(`Hai già raggiunto il limite di perdita del mese (${lim} €). Vuoi salvare comunque questa giocata da ${puntata} €?`);
  if (persa + puntata > lim) return confirm(`Con questa puntata da ${puntata} € potresti superare il limite del mese (${lim} €, già persi ${persa.toFixed(0)} €). Salvarla comunque?`);
  return true;
}

// ---- 43. Modalità notte: tema ultra scuro e testo grande (si imposta da Impostazioni › Aspetto)
function applicaNotte() { const a = ls.get("aspetto", {}); document.documentElement.classList.toggle("notte", a.tema === "notte"); }
;
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
;
// NBA Schedine - idee3.js: Radar del valore, Chiedi al modello, linee che si muovono, modello contro mercato, ritmo/viaggi/altitudine
"use strict";
const MERC3 = { pts: "punti", reb: "rimbalzi", ast: "assist" };
const num3 = (s) => parseFloat(String(s).replace(",", "."));
const ymd3 = () => etGiorno(0).ymd;

// ---- 10. linee che si muovono: la prima linea del bookmaker vista oggi contro l'ultima
function tracciaLinee(D) {
  if (!D || !D.partite) return [];
  const st = ls.get("lineeStor", {}), oggi = ymd3(), mosse = []; let cambiato = false;
  for (const p of D.partite) for (const g of p.giocatori || []) for (const k of ["pts", "reb", "ast"]) {
    const mk = g[k] && g[k].mk; if (!mk || mk.linea == null) continue;
    const id = `${p.id}|${g.pid}|${k}`, s = st[id];
    if (!s || s.d !== oggi) { st[id] = { d: oggi, a: mk.linea, u: mk.linea, n: g.nome, sq: g.sq, k, g: p.id, st: p.stato }; cambiato = true; }
    else if (s.u !== mk.linea) { s.u = mk.linea; cambiato = true; }
    const s2 = st[id]; if (p.stato === "pre" && Math.abs(s2.u - s2.a) >= (k === "pts" ? 1.5 : 1)) mosse.push(s2);
  }
  if (cambiato) { for (const k of Object.keys(st)) if (st[k].d !== oggi) delete st[k]; ls.set("lineeStor", st); }
  return mosse.sort((a, b) => Math.abs(b.u - b.a) - Math.abs(a.u - a.a));
}

// ---- 1/9. dati del radar
function datiRadar(D) {
  const pre = new Set((D.partite || []).filter((p) => p.stato === "pre").map((p) => p.id));
  const conQuota = (D.picks || []).filter((x) => pre.has(x.g)).map((x) => { const q = num3(ls.get("Q_" + x.id, "")); return q > 1 ? { x, q, ev: x.prob * q - 1 } : null; }).filter(Boolean).sort((a, b) => b.ev - a.ev);
  const disacc = [];
  for (const p of D.partite || []) if (p.stato === "pre") for (const g of p.giocatori || []) for (const k of ["pts", "reb", "ast"]) {
    const o = g[k]; if (!o || !o.mk || o.vModello == null) continue;
    const d = o.vModello - o.mk.linea; if (Math.abs(d) >= (k === "pts" ? 2.5 : 1.2)) disacc.push({ g, k, p, d, mod: o.vModello, lin: o.mk.linea });
  }
  disacc.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  return { conQuota, disacc: disacc.slice(0, 10), mosse: tracciaLinee(D) };
}
const riepRadar = (R) => R.conQuota.filter((o) => o.ev >= 0.05).length + R.mosse.length;
function bannerRadar(D) {
  let R; try { R = datiRadar(D); } catch { return ""; }
  const n = riepRadar(R); if (!n) return "";
  const a = R.conQuota.filter((o) => o.ev >= 0.05).length, b = R.mosse.length;
  return `<a class="card riga" href="#/valore" style="padding:10px 14px;color:inherit;margin-bottom:10px"><div class="lg"><i class="ti ti-radar" style="font-size:22px;color:${OR}"></i><div><b>Radar del valore</b><div class="s">${a ? `${a} ${a === 1 ? "giocata conviene" : "giocate convengono"} con la tua quota` : ""}${a && b ? " · " : ""}${b ? `${b} ${b === 1 ? "linea si è mossa" : "linee si sono mosse"}` : ""}</div></div></div><i class="ti ti-chevron-right"></i></a>`;
}
async function vistaValore() {
  const top = topBar() + segEsplora("v"); APP.innerHTML = top + skel();
  let D; try { D = await dati(); } catch (e) { APP.innerHTML = top + errBox(e); return; }
  const R = datiRadar(D); let h = top;
  h += `<div class="cap" style="margin-top:0">Il radar mette a confronto la nostra stima con la quota del bookmaker. Il valore atteso è probabilità × quota − 1: sopra zero significa che, se la stima è giusta, la giocata conviene. Il mercato di solito è molto preciso: usalo come spunto da controllare.</div>`;
  h += `<h2>Giocate che convengono</h2>`;
  if (!R.conQuota.length) h += `<div class="vuoto">Scrivi la quota del bookmaker sotto una giocata (pagina Pronostici o studio partita, campo «Quota del bookmaker»): qui compaiono ordinate per valore atteso.</div>`;
  else h += R.conQuota.map((o) => `<a class="card riga" href="#/partita/${o.x.g}" style="padding:10px 12px;color:inherit;gap:10px"><div style="min-width:0"><b>${esc(o.x.testo)}</b><div class="s">${esc(o.x.partita)} · stima ${pct(o.x.prob)} · quota ${String(o.q).replace(".", ",")}</div></div><b style="color:${o.ev >= 0.05 ? GR : o.ev >= -0.05 ? AM : RD};white-space:nowrap">${o.ev >= 0 ? "+" : "−"}${Math.abs(o.ev * 100).toFixed(0)}%</b></a>`).join("");
  if (D.valore && D.valore.length) h += `<h2>Dal mercato</h2>` + (typeof confrontoMercato === "function" ? confrontoMercato(D).replace(/<h2>.*?<\/h2>/, "") : "");
  h += `<h2>Modello e mercato non sono d'accordo</h2>`;
  h += R.disacc.length ? `<div class="cap" style="margin-top:0">Qui il modello da solo e la linea del bookmaker differiscono parecchio. Non vuol dire che il modello abbia ragione: è il punto da guardare con più attenzione.</div>` + R.disacc.map((o) => `<a class="card riga" href="#/partita/${o.p.id}" style="padding:10px 12px;color:inherit;gap:10px"><div class="lg">${foto(o.g.pid, 36)}<div style="min-width:0"><b>${esc(o.g.nome)}</b><div class="s">${MERC3[o.k]}: modello ${vir(o.mod)}, bookmaker ${vir(o.lin)}</div></div></div><b style="color:${o.d > 0 ? GR : AM};white-space:nowrap">${o.d > 0 ? "modello sopra" : "modello sotto"}</b></a>`).join("") : `<div class="vuoto">Nessuna differenza rilevante, oppure mancano le linee dei bookmaker (serve la chiave ODDS).</div>`;
  h += `<h2>Linee che si sono mosse</h2>`;
  h += R.mosse.length ? `<div class="cap" style="margin-top:0">Rispetto alla prima linea vista oggi su questo telefono. Un movimento spesso segnala un'assenza o una notizia.</div>` + R.mosse.slice(0, 12).map((s) => `<a class="card riga" href="#/partita/${s.g}" style="padding:10px 12px;color:inherit;gap:10px"><div style="min-width:0"><b>${esc(s.n)}</b><div class="s">${MERC3[s.k]}: da ${vir(s.a)} a ${vir(s.u)}</div></div><b style="color:${s.u > s.a ? GR : AM};white-space:nowrap">${s.u > s.a ? "▲ sale" : "▼ scende"} ${vir(Math.abs(s.u - s.a))}</b></a>`).join("") : `<div class="vuoto">Nessuna linea si è mossa in modo importante da quando apri l'app oggi. Il controllo parte dalla prima volta che vedi le linee della giornata.</div>`;
  APP.innerHTML = h;
}
window.RIDEE.push([/^\/valore/, vistaValore]);

// ---- 3. Chiedi al modello: domande semplici in italiano sulla serata
const ESEMPI = ["Chi fa 25 punti stasera?", "Chi prende 10 rimbalzi?", "Migliori giocate", "Partite con più punti", "Chi vince?", "Giocate dei Lakers", "Doppia doppia stasera", "Chi è fuori?", "Che partite ci sono?", "Combo con i Lakers", "Partite più equilibrate", "Chi è in diretta?"];
// squadre nominate nella domanda: per nome (Lakers, Celtics...) o per sigla scritta in MAIUSCOLO (LAL); «chi», «mia», «per» ecc. non valgono come sigle
function squadreCitate(D, q) {
  const norm = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""), t = " " + norm(q).replace(/[^a-z0-9 ]/g, " ") + " ", maius = new Set(String(q).match(/\b[A-Z]{2,4}\b/g) || []);
  return Object.keys(D.squadre || {}).filter((ab) => {
    if (maius.has(ab)) return true;
    const inf = T(D, ab), nomi = [inf.b, inf.n && String(inf.n).split(" ").pop()].map(norm).filter((x) => x.length >= 4 && x !== norm(ab));
    return nomi.some((x) => t.includes(" " + x + " ") || t.includes(" " + x + "s ") );
  });
}
function rispondi(D, q) {
  const t = q.toLowerCase(), pre = (D.partite || []).filter((p) => p.stato === "pre"), B = (ab) => T(D, ab).b;
  const sqCit = squadreCitate(D, q);
  const solo = (g) => !sqCit.length || sqCit.includes(g.sq);
  const n = num3((/(\d+(?:[.,]\d+)?)/.exec(t) || [])[1]);
  const k = /rimbal/.test(t) ? "reb" : /assist/.test(t) ? "ast" : /punt|segn|canest/.test(t) ? "pts" : null;
  if (!pre.length && !(D.partite || []).length) return { t: "Non ci sono partite per questo giorno.", l: [] };
  if (k && n > 0 && /\b(fa|fanno|segna|prende|prender|servi|arriv|supera|almeno|più di|piu di|chi)/.test(t)) {
    const L = []; for (const p of pre) for (const g of p.giocatori || []) { if (!solo(g) || !g[k]) continue; const pr = 1 - phi((n - 0.5 - g[k].v) / (g[k].sd || 1)); if (pr >= 0.25) L.push({ g, p, pr, v: g[k].v }); }
    L.sort((a, b) => b.pr - a.pr);
    return { t: L.length ? `Giocatori che possono arrivare a ${n} ${MERC3[k]} (almeno ${n}), con la probabilità del modello:` : `Nessun giocatore ha almeno il 25% di arrivare a ${n} ${MERC3[k]} stasera.`, l: L.slice(0, 10).map((o) => ({ href: "#/partita/" + o.p.id, a: `${o.g.nome}`, b: `${esc(o.p.casa)} - ${esc(o.p.trasf)} · stima ${vir(o.v)}`, v: pct(o.pr), c: colProb(o.pr) })) };
  }
  if (/vince|favorit|vincent/.test(t)) return { t: "Le favorite del modello:", l: pre.map((p) => ({ p, fav: p.r.pw >= 0.5 ? p.casa : p.trasf, pr: Math.max(p.r.pw, 1 - p.r.pw) })).filter((o) => !sqCit.length || sqCit.includes(o.p.casa) || sqCit.includes(o.p.trasf)).sort((a, b) => b.pr - a.pr).map((o) => ({ href: "#/partita/" + o.p.id, a: `${B(o.fav)}`, b: `${esc(o.p.casa)} - ${esc(o.p.trasf)}`, v: pct(o.pr), c: colProb(o.pr) })) };
  if (/total|più punti|piu punti|meno punti|ritmo|alto|basso/.test(t)) { const asc = /meno|basso/.test(t); return { t: asc ? "Partite con meno punti previsti:" : "Partite con più punti previsti:", l: [...pre].sort((a, b) => asc ? a.r.totale - b.r.totale : b.r.totale - a.r.totale).slice(0, 8).map((p) => ({ href: "#/partita/" + p.id, a: `${B(p.casa)} - ${B(p.trasf)}`, b: `totale stimato`, v: p.r.totale.toFixed(0), c: OR })) }; }
  if (/migliori|sicur|consigl|giocat/.test(t) || sqCit.length) {
    const ok = new Set(pre.map((p) => p.id)); let L = (D.picks || []).filter((x) => ok.has(x.g));
    if (sqCit.length) L = L.filter((x) => { const p = pre.find((q) => q.id === x.g); return p && (sqCit.includes(p.casa) || sqCit.includes(p.trasf)); });
    L.sort((a, b) => b.prob - a.prob);
    return { t: sqCit.length ? "Giocate sulle partite di " + sqCit.map(B).join(" e ") + ":" : "Le giocate più probabili di stasera:", l: L.slice(0, 10).map((x) => ({ href: "#/partita/" + x.g, a: x.testo, b: x.partita, v: pct(x.prob), c: colProb(x.prob) })) };
  }
  const nome = (D.partite || []).flatMap((p) => (p.giocatori || []).map((g) => ({ g, p }))).filter((o) => String(o.g.nome).toLowerCase().split(" ").some((w) => w.length > 3 && t.includes(w)));
  if (nome.length) { const o = nome[0], L = ["pts", "reb", "ast"].filter((c) => o.g[c]).map((c) => ({ href: "#/partita/" + o.p.id, a: `${MERC3[c]}`, b: `stima ${vir(o.g[c].v)}, linea consigliata ${o.g[c].rec != null ? vir(o.g[c].rec) : "–"}`, v: o.g[c].rec != null ? pct((o.g[c].lad.find((l) => l[0] === o.g[c].rec) || [0, 0])[1]) : "", c: OR })); return { t: `${o.g.nome} (${o.g.sq}):`, l: L }; }
  return { t: "Non ho capito la domanda. Prova con una di queste:", l: [] };
}
async function vistaChiedi() {
  const top = topBar() + segEsplora("q"); APP.innerHTML = top + skel();
  let D; try { D = await dati(); } catch (e) { APP.innerHTML = top + errBox(e); return; }
  APP.innerHTML = top + `<div class="cap" style="margin-top:0">Fai una domanda sulla serata: risponde con i numeri del modello, senza inventare nulla. Capisce richieste su punti, rimbalzi, assist, doppie doppie, infortuni, orari, live, combo, favorite, totali, singole squadre e giocatori.</div><div class="card"><input class="linea" id="chq" placeholder="Es. chi fa 25 punti stasera?" style="margin:0" enterkeyhint="search"></div><div class="tabs">${ESEMPI.map((e) => `<button class="chipbtn" data-esq="${esc(e)}">${esc(e)}</button>`).join("")}</div><div id="chr"></div>`;
  const vai = () => {
    const q = $("#chq").value.trim(); if (!q) return; const r = rispondi(D, q);
    $("#chr").innerHTML = `<div class="sub" style="margin-top:12px">${esc(r.t)}</div>` + r.l.map((o) => `<a class="card riga" href="${o.href}" style="padding:10px 12px;color:inherit;gap:10px"><div style="min-width:0"><b>${esc(o.a)}</b><div class="s">${o.b}</div></div><b style="color:${o.c};white-space:nowrap">${esc(o.v)}</b></a>`).join("");
  };
  $("#chq").onkeydown = (e) => { if (e.key === "Enter") vai(); };
  APP.querySelectorAll("[data-esq]").forEach((b) => b.onclick = () => { $("#chq").value = b.dataset.esq; vai(); });
}
window.RIDEE.push([/^\/chiedi/, vistaChiedi]);

// ---- 4/8. contesto della partita: ritmo, altitudine e viaggio (informativo, non entra nel calcolo)
const FUSO = { ATL: 0, BOS: 0, BKN: 0, CHA: 0, CLE: 0, DET: 0, IND: 0, MIA: 0, NY: 0, NYK: 0, ORL: 0, PHI: 0, TOR: 0, WSH: 0, WAS: 0, CHI: 1, DAL: 1, HOU: 1, MEM: 1, MIL: 1, MIN: 1, NO: 1, NOP: 1, OKC: 1, SA: 1, SAS: 1, DEN: 2, UTA: 2, UTAH: 2, PHX: 2, GS: 3, GSW: 3, LAC: 3, LAL: 3, POR: 3, SAC: 3 };
function chipContesto(D, p) {
  let s = ""; const tot = p.r && p.r.totale;
  if (tot >= 233) s += `<span class="chip">Ritmo alto (${tot.toFixed(0)} punti stimati)</span>`; else if (tot && tot <= 220) s += `<span class="chip">Ritmo basso (${tot.toFixed(0)} punti stimati)</span>`;
  if (["DEN", "UTA", "UTAH"].includes(p.casa) && p.stato === "pre") s += `<span class="chip" style="color:${AM}">Altitudine: ${esc(T(D, p.casa).b)} a ${p.casa === "DEN" ? "1.600" : "1.300"} m</span>`;
  const f = Math.abs((FUSO[p.casa] ?? 0) - (FUSO[p.trasf] ?? 0)); if (f >= 2 && p.stato === "pre") s += `<span class="chip">${esc(T(D, p.trasf).b)} in viaggio (${f} fusi)</span>`;
  return s;
}
;
// NBA Schedine - idee4.js: costruttore guidato, quando uscire, simulatore «e se», diario, tu contro il modello, portafogli, rendiconto stampabile
"use strict";
const HUB = [["#/verifica", "ti-clipboard-check", "Verifica del modello", "Dove sbaglia: per fascia, tipo, squadra e giocatore"], ["#/serata", "ti-moon-stars", "Riepilogo della serata", "Giocate prese e perse, saldo e cosa ha sbagliato l'app"], ["#/combopartita", "ti-flame", "Combo di partita", "La favorita vince + il suo giocatore chiave con linea più alta"], ["#/auto", "ti-sparkles", "Schedina automatica", "Scegli la quota: l'app propone la combinazione più probabile"], ["#/costruisci", "ti-wand", "Costruisci una schedina", "Passo passo, con il controllo delle giocate legate"], ["#/esese", "ti-arrows-shuffle", "Simulatore «e se»", "Cosa sarebbe successo con altre puntate o senza una giocata"], ["#/diario", "ti-notebook", "Diario delle scelte", "Perché hai giocato: lo rivedi accanto all'esito"], ["#/portafogli", "ti-folders", "Portafogli", "Separa le giocate per strategia"], ["#/rendiconto", "ti-file-text", "Rendiconto del mese", "Pagina da stampare o salvare in PDF"], ["#/gruppo", "ti-users-group", "Gruppo di amici", "Classifica privata e sfide sul vincitore"], ["#/playoff", "ti-tournament", "Tabellone playoff", "Pronostici sul primo turno"], ["#/mercato", "ti-arrows-exchange", "Mercato e scambi", "Notizie su firme e contratti"], ["#/confronta", "ti-arrows-diff", "Confronto giocatori", "Due giocatori affiancati"], ["#/premi", "ti-trophy", "Corsa ai premi", "I più produttivi della stagione"], ["#/ideale", "ti-star", "Squadra ideale della notte", "I cinque più produttivi stasera"], ["#/valore", "ti-radar", "Radar del valore", "Stima contro quota del bookmaker"], ["#/glossario", "ti-book-2", "Glossario", "Che cosa significano linea, over, quota…"], ["#/chiedi", "ti-message-question", "Chiedi al modello", "Domande sulla serata"]];
const hubStrumenti = () => `<h2>Strumenti</h2><div class="card" style="padding:4px 12px">${HUB.map(([h, ic, t, d], i) => `<a class="riga rg" href="${h}" style="color:inherit;${i ? "" : "border-top:0"}"><span style="display:flex;gap:10px;align-items:center"><i class="ti ${ic}" style="color:${OR};font-size:20px"></i><span><b>${t}</b><div class="s">${d}</div></span></span><i class="ti ti-chevron-right"></i></a>`).join("")}</div>`;
const chiuseReg = () => ls.get("registro", []).filter((r) => r.esito === 0 || r.esito === 1);
const saldoR4 = (r) => (r.esito === 1 ? (r.puntata || 0) * ((r.quota || 1) - 1) : -(r.puntata || 0));
const back4 = (h = "#/conto", t = "Conto") => `<a class="back" href="${h}"><i class="ti ti-chevron-left"></i>${t}</a>`;

// ---- 21. costruttore guidato: partita → giocate → quota e puntata
async function vistaCostruisci() {
  APP.innerHTML = back4("#/schedine", "Schedine") + `<h2>Costruisci una schedina</h2>` + skel();
  let D; try { D = await dati(); } catch (e) { APP.innerHTML = errBox(e); return; }
  const pre = D.partite.filter((p) => p.stato === "pre"), sel = new Set(ls.get("cstGare", []).filter((g) => pre.some((p) => p.id === g)));
  const disegna = () => {
    const L = miaLeggi(), q = L.reduce((a, l) => a / Math.max(0.05, l.prob), 1), p = L.reduce((a, l) => a * l.prob, 1);
    const grp = new Map(); for (const l of L) grp.set(l.g, [...(grp.get(l.g) || []), l.prob]);
    const pMin = [...grp.values()].reduce((a, v) => a * (v.length > 1 ? Math.min(...v) : v[0]), 1), legata = L.length > new Set(L.map((l) => l.g)).size;
    let h = back4("#/schedine", "Schedine") + `<h2>Costruisci una schedina</h2>`;
    h += `<div class="sub" style="margin-top:0">1. Scegli le partite</div>` + (pre.length ? `<div class="tabs">${pre.map((g) => `<button class="chipbtn${sel.has(g.id) ? " on" : ""}" data-cg="${g.id}">${esc(g.casa)} - ${esc(g.trasf)}</button>`).join("")}</div>` : `<div class="vuoto">Non ci sono partite da giocare per questo giorno: cambia giorno dalla pagina Schedine.</div>`);
    if (sel.size) {
      h += `<div class="sub">2. Scegli le giocate</div><div class="cap" style="margin-top:0">Per ogni partita le giocate più probabili. Toccando + le aggiungi.</div>`;
      for (const id of sel) { const g = pre.find((p) => p.id === id); if (!g) continue; const l = (D.picks || []).filter((x) => x.g === id).slice(0, 6); h += `<div class="s" style="margin:10px 0 4px"><b>${esc(g.casa)} - ${esc(g.trasf)}</b></div>` + (l.length ? l.map(cardPick).join("") : `<div class="vuoto">Nessuna giocata sopra la soglia.</div>`); }
    }
    h += `<div class="sub">3. Controlla</div><div class="card">` + (L.length ? `<div class="row3"><div class="tile"><b>${L.length}</b><span>giocate</span></div><div class="tile"><b>${(p * 100).toFixed(0)}%</b><span>tutte centrate</span></div><div class="tile"><b>${q.toFixed(2)}</b><span>quota giusta</span></div></div>` + (legata ? `<div class="cap" style="margin:8px 0 0;color:${AM}"><b>Attenzione:</b> hai più giocate nella stessa partita. Non sono eventi indipendenti: la probabilità vera sta tra <b>${(pMin * 100).toFixed(0)}%</b> e <b>${(p * 100).toFixed(0)}%</b>. Per esempio un over sul totale e un over sui punti di un giocatore si muovono insieme.</div>` : `<div class="cap" style="margin:8px 0 0">Giocate di partite diverse: sono indipendenti, quindi la probabilità unita è il prodotto.</div>`) + `<a class="btn" href="#/mia" style="display:block;text-align:center;margin:10px 0 0">Quota, puntata e salvataggio</a>` : `<div class="cap" style="margin:0">Aggiungi almeno una giocata.</div>`) + `</div>`;
    const y = window.scrollY; APP.innerHTML = h; window.scrollTo(0, y);
    APP.querySelectorAll("[data-cg]").forEach((b) => b.onclick = () => { const id = b.dataset.cg; sel.has(id) ? sel.delete(id) : sel.add(id); ls.set("cstGare", [...sel]); disegna(); });
  };
  window.__miaAgg = disegna; disegna();
}
window.RIDEE.push([/^\/costruisci/, vistaCostruisci]);

// ---- 23. quando uscire: valore equo di un'uscita anticipata di una schedina aperta (usato dal Live)
function cashoutHtml(r, D) {
  if (r.esito != null || !r.legs || !r.legs.length || !(r.quota > 1)) return "";
  let p = 1, vive = 0;
  for (const l of r.legs) {
    const a = avanzamentoLeg(l, D); let pl = l.prob || 0.5;
    if (a.st === "ok" || (a.st === "vant" && a.p && a.p.stato === "post")) pl = 1; else if (a.st === "no") pl = 0;
    else if (a.p) { const m = (a.p.picks || []).find((x) => x.id === l.id); if (m && m.pLive != null) pl = m.pLive; }
    p *= pl; if (pl >= 0.995) vive++;
  }
  const eq = p * r.quota * r.puntata, prima = r.prob || 0;
  const verdetto = p <= 0.001 ? "La schedina è ormai persa." : p >= 0.999 ? "Tutte le giocate sono centrate." : eq > r.puntata * r.quota * 0.9 ? "Sei molto vicino alla vincita." : "";
  return `<div class="s" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--line)">Probabilità di vincere adesso <b style="color:var(--txt)">${pct(p)}</b>${prima ? ` (partita da ${pct(prima)})` : ""} · valore equo di un'uscita ${euro(eq)} su ${euro(r.puntata * r.quota)} possibili. ${verdetto || "Se il bookmaker ti offre più del valore equo, uscire conviene; se offre meno, conviene aspettare."}</div>`;
}

// ---- 25. simulatore «e se»
function vistaEsEse() {
  const chiuse = chiuseReg(), st = +ls.get("eseStake", impo().puntata) || 5, v = APP;
  let h = back4() + `<h2>Simulatore «e se»</h2>`;
  if (chiuse.length < 3) { v.innerHTML = h + `<div class="vuoto">Servono almeno 3 giocate chiuse nel registro.</div>`; return; }
  const reale = chiuse.reduce((t, r) => t + saldoR4(r), 0), piatto = chiuse.reduce((t, r) => t + (r.esito === 1 ? st * ((r.quota || 1) - 1) : -st), 0);
  const quasi = chiuse.filter((r) => r.esito === 0 && r.legs && r.es && r.es.length === r.legs.length && r.es.filter((e) => e && e.esito === 0).length === 1);
  const vintoSe = quasi.reduce((t, r) => t + (r.puntata || 0) * ((r.quota || 1) - 1), 0);
  const noPerse = chiuse.filter((r) => r.esito === 0 && (r.quota || 0) >= 10), senzaAlte = reale - noPerse.reduce((t, r) => t + saldoR4(r), 0);
  const riga = (t, d, val) => `<div class="riga rg"><div style="min-width:0"><b>${t}</b><div class="s">${d}</div></div><b style="color:${val >= 0 ? GR : RD};white-space:nowrap">${eur(val)}</b></div>`;
  h += `<div class="cap" style="margin-top:0">Calcoli sul tuo registro (${chiuse.length} giocate chiuse). Sono ipotesi sul passato: servono a capire dove si guadagna e dove si perde, non a prevedere il futuro.</div>`;
  h += `<div class="card"><div class="s">Saldo reale</div><b style="font-size:26px;color:${reale >= 0 ? GR : RD}">${eur(reale)}</b></div>`;
  h += `<div class="card"><div class="sub" style="margin-top:0">E se avessi puntato sempre lo stesso importo?</div><input class="linea" id="esst" inputmode="decimal" value="${st}" style="margin:6px 0 0">${riga(`Sempre ${st} € a giocata`, "ogni giocata con la stessa puntata", piatto)}${riga("Differenza dal reale", piatto >= reale ? "avresti fatto meglio" : "hai fatto meglio così", piatto - reale)}</div>`;
  h += `<div class="card" style="padding:4px 12px">${riga("Schedine perse per una sola giocata", quasi.length ? `${quasi.length} schedine: quanto avresti vinto se quella giocata fosse andata` : "nessuna (serve il dettaglio delle singole giocate)", vintoSe)}${riga("Senza le giocate a quota 10 o più", noPerse.length ? `togliendo ${noPerse.length} giocate perse ad alta quota` : "non ne hai perse", senzaAlte)}</div>`;
  v.innerHTML = h;
  $("#esst").onchange = (e) => { ls.set("eseStake", Math.max(0.5, num3(e.target.value) || 5)); vistaEsEse(); };
}
window.RIDEE.push([/^\/esese/, vistaEsEse]);

// ---- 27. diario delle scelte
function vistaDiario() {
  const reg = ls.get("registro", []).slice(0, 40);
  let h = back4() + `<h2>Diario delle scelte</h2><div class="cap" style="margin-top:0">Scrivi in una riga perché hai fatto una giocata. A fine mese vedi se le scelte ragionate rendono più di quelle d'istinto.</div>`;
  const con = reg.filter((r) => r.motivo && (r.esito === 0 || r.esito === 1)), senza = reg.filter((r) => !r.motivo && (r.esito === 0 || r.esito === 1));
  const hit = (l) => (l.length ? Math.round(l.reduce((t, r) => t + r.esito, 0) / l.length * 100) + "%" : "–");
  if (con.length >= 3 && senza.length >= 3) h += `<div class="card"><div class="row3"><div class="tile"><b>${hit(con)}</b><span>centrate con motivo (${con.length})</span></div><div class="tile"><b>${hit(senza)}</b><span>senza motivo (${senza.length})</span></div><div class="tile"><b>${eur(con.reduce((t, r) => t + saldoR4(r), 0))}</b><span>saldo con motivo</span></div></div></div>`;
  h += reg.length ? reg.map((r) => `<div class="card"><div class="riga"><b style="min-width:0">${esc(r.nome || "Schedina")}</b><b style="color:${r.esito === 1 ? GR : r.esito === 0 ? RD : MU};white-space:nowrap">${r.esito === 1 ? "Vinta" : r.esito === 0 ? "Persa" : "Aperta"}</b></div><div class="s">${esc(String(r.data || ""))} · quota ${r.quota} · ${r.puntata} €</div><input class="linea" data-mot="${esc(r.id)}" maxlength="140" placeholder="Perché l'hai giocata?" value="${esc(r.motivo || "")}" style="margin:6px 0 0"></div>`).join("") : `<div class="vuoto">Il registro è vuoto: salva una giocata per iniziare.</div>`;
  APP.innerHTML = h;
  APP.querySelectorAll("[data-mot]").forEach((i) => i.onchange = () => { const R = ls.get("registro", []), r = R.find((x) => String(x.id) === i.dataset.mot); if (r) { r.motivo = i.value.trim(); ls.set("registro", R); } });
}
window.RIDEE.push([/^\/diario/, vistaDiario]);

// ---- 28. tu contro il modello: giocate scelte da te e consigli dell'app, giocata per giocata
function tuVsModello(reg) {
  const m = { tu: [0, 0], app: [0, 0] };
  for (const r of reg) if (r.legs && r.es && r.es.length === r.legs.length) r.legs.forEach((l, i) => { const e = r.es[i]; if (!e || (e.esito !== 0 && e.esito !== 1)) return; const c = l.mia ? m.tu : m.app; c[0] += e.esito; c[1]++; });
  if (m.tu[1] < 3 || m.app[1] < 3) return "";
  const f = (c) => Math.round(c[0] / c[1] * 100) + "%";
  return `<h2>Tu contro il modello</h2><div class="card"><div class="grid2"><div class="tile"><b style="color:${m.tu[0] / m.tu[1] >= m.app[0] / m.app[1] ? GR : MU}">${f(m.tu)}</b><span>giocate scelte da te (${m.tu[1]})</span></div><div class="tile"><b style="color:${m.app[0] / m.app[1] > m.tu[0] / m.tu[1] ? GR : MU}">${f(m.app)}</b><span>consigliate dall'app (${m.app[1]})</span></div></div><div class="cap" style="margin:8px 0 0">Singole giocate dentro le tue schedine, centrate o no. Con poche giocate la differenza può essere solo fortuna.</div></div>`;
}

// ---- 29. portafogli
const portafoglioAttuale = () => ls.get("ptfAtt", "Principale");
function vistaPortafogli() {
  const R = ls.get("registro", []), lista = [...new Set(["Principale", ...ls.get("ptfLista", []), ...R.map((r) => r.ptf).filter(Boolean)])], att = portafoglioAttuale();
  let h = back4() + `<h2>Portafogli</h2><div class="cap" style="margin-top:0">Un portafoglio raccoglie giocate con la stessa strategia, per esempio «Prudente» e «Rischiose». Quello attivo viene assegnato alle nuove giocate che salvi nel registro.</div>`;
  h += lista.map((n) => { const l = R.filter((r) => (r.ptf || "Principale") === n), ch = l.filter((r) => r.esito === 0 || r.esito === 1), s = ch.reduce((t, r) => t + saldoR4(r), 0), ok = ch.filter((r) => r.esito === 1).length; return `<div class="card"><div class="riga"><div><b>${esc(n)}</b>${n === att ? ` <span class="chip" style="color:${GR}">attivo</span>` : ""}<div class="s">${l.length} giocate · ${ch.length ? `vinte ${ok} su ${ch.length}` : "nessuna chiusa"}</div></div><b style="color:${s >= 0 ? GR : RD}">${eur(s)}</b></div>${n === att ? "" : `<button class="chipbtn" data-ptf="${esc(n)}" style="margin-top:8px">Rendi attivo</button>`}</div>`; }).join("");
  h += `<div class="card"><div class="sub" style="margin-top:0">Nuovo portafoglio</div><div class="grid2"><input class="linea" id="ptfn" maxlength="20" placeholder="Nome" style="margin:0"><button class="btn" id="ptfa" style="margin:0">Aggiungi</button></div></div>`;
  APP.innerHTML = h;
  APP.querySelectorAll("[data-ptf]").forEach((b) => b.onclick = () => { ls.set("ptfAtt", b.dataset.ptf); vistaPortafogli(); });
  $("#ptfa").onclick = () => { const n = $("#ptfn").value.trim(); if (!n) return; ls.set("ptfLista", [...new Set([...ls.get("ptfLista", []), n])]); ls.set("ptfAtt", n); vistaPortafogli(); };
}
window.RIDEE.push([/^\/portafogli/, vistaPortafogli]);

// ---- 30. rendiconto del mese, da stampare o salvare in PDF
function vistaRendiconto() {
  const ym = ls.get("contoMese", new Date().toISOString().slice(0, 7)), R = ls.get("registro", []).filter((r) => String(r.data).startsWith(ym)), ch = R.filter((r) => r.esito === 0 || r.esito === 1);
  const pun = ch.reduce((t, r) => t + (r.puntata || 0), 0), inc = ch.reduce((t, r) => t + (r.esito === 1 ? (r.puntata || 0) * (r.quota || 1) : 0), 0), pf = ls.get("profilo", {});
  APP.innerHTML = `<div class="noprint">${back4()}<button class="btn" onclick="window.print()"><i class="ti ti-printer"></i> Stampa o salva in PDF</button></div><div id="rend"><h2 style="margin-top:6px">Rendiconto di ${nomeMese(ym)}${pf.nome ? ` · ${esc(pf.nome)}` : ""}</h2><div class="card"><div class="row3"><div class="tile"><b>${euro(pun)}</b><span>puntato</span></div><div class="tile"><b>${euro(inc)}</b><span>incassato</span></div><div class="tile"><b style="color:${inc - pun >= 0 ? GR : RD}">${eur(inc - pun)}</b><span>saldo</span></div></div><div class="s" style="margin-top:6px">${R.length} schedine, ${ch.filter((r) => r.esito === 1).length} vinte su ${ch.length} chiuse${R.length - ch.length ? `, ${R.length - ch.length} ancora aperte` : ""}.</div></div><table class="qt" style="width:100%;margin-top:10px"><tr><th style="text-align:left">Data</th><th style="text-align:left">Giocata</th><th>Quota</th><th>Puntata</th><th>Esito</th></tr>${R.map((r) => `<tr><td style="text-align:left">${esc(String(r.data).slice(5))}</td><td style="text-align:left">${esc(r.nome || r.testo || "")}</td><td>${r.quota}</td><td>${r.puntata} €</td><td>${r.esito === 1 ? "Vinta" : r.esito === 0 ? "Persa" : "Aperta"}</td></tr>`).join("")}</table><div class="cap">Generato da NBA Schedine il ${new Date().toLocaleDateString("it-IT")}. Stime e registro personale, non consulenza.</div></div>`;
}
window.RIDEE.push([/^\/rendiconto/, vistaRendiconto]);
;
// NBA Schedine - idee5.js: Stasera con conto alla rovescia, gruppo e sfide, condividi la serie, playoff, mercato, calendario .ics, confronto giocatori, premi, squadra ideale
"use strict";
const wait5 = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- 31. Stasera: conto alla rovescia accanto a ogni partita (si aggiorna da solo mentre la pagina è aperta)
const tra = (iso) => { const m = Math.round((Date.parse(iso) - Date.now()) / 60000); if (isNaN(m)) return ""; if (m <= 0) return "sta per iniziare"; const h = Math.floor(m / 60); return h ? `tra ${h} h ${String(m % 60).padStart(2, "0")} min` : `tra ${m} min`; };
async function vistaStaseraCount() {
  await vistaStasera();
  const D = window.__D; if (!D) return;
  const mappa = new Map((D.partite || []).map((p) => [String(p.id), p]));
  const decora = () => {
    if (!location.hash.startsWith("#/stasera")) return;
    document.querySelectorAll('#app a.card[href^="#/partita/"]').forEach((a) => {
      const p = mappa.get(a.getAttribute("href").split("/").pop()); if (!p || p.stato !== "pre") return;
      let el = a.querySelector(".cdw"); if (!el) { el = document.createElement("div"); el.className = "cdw s"; el.style.cssText = "text-align:center;margin-top:4px;font-weight:600;color:" + OR; a.appendChild(el); }
      const t = tra(p.iso); el.textContent = t ? "Palla a due " + t : "";
    });
    setTimeout(decora, 30000);
  };
  decora();
}
window.RIDEE.push([/^\/stasera/, vistaStaseraCount]);

// ---- serie e statistiche personali (usate da gruppo, immagine e profilo)
function statsPersonali() {
  const reg = chiuseReg().slice().sort((a, b) => String(b.data).localeCompare(String(a.data)) || 0), n = reg.length, ok = reg.filter((r) => r.esito === 1).length;
  let serie = 0; for (const r of reg) { if (r.esito === 1) serie++; else break; }
  let best = 0, cur = 0; for (const r of reg.slice().reverse()) { cur = r.esito === 1 ? cur + 1 : 0; best = Math.max(best, cur); }
  return { saldo: typeof nettoMese === "function" ? nettoMese() : 0, perc: n ? ok / n * 100 : 0, n, serie, best };
}
async function immagineSerie() {
  const S = statsPersonali(), pf = ls.get("profilo", {}), W = 1080, H = 1080, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const x = cv.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#161a24"); g.addColorStop(1, "#0b0d12"); x.fillStyle = g; x.fillRect(0, 0, W, H); x.fillStyle = OR; x.fillRect(0, 0, W, 14);
  const t = (s, px, py, sz, col, w = 600, al = "left") => { x.font = `${w} ${sz}px -apple-system, "Segoe UI", Roboto, sans-serif`; x.fillStyle = col; x.textAlign = al; x.fillText(s, px, py); };
  t("NBA Schedine", 60, 100, 34, OR, 700); t(pf.nome || "La mia serie", 60, 180, 56, "#ffffff", 700);
  t(String(S.serie), W / 2, 560, 330, OR, 800, "center"); t(S.serie === 1 ? "schedina presa di fila" : "schedine prese di fila", W / 2, 640, 44, "#c9cfdc", 600, "center");
  [["Record", String(S.best)], ["Centrate", Math.round(S.perc) + "%"], ["Giocate chiuse", String(S.n)]].forEach(([k, v], i) => { const cx = 60 + i * 340; t(k, cx, 820, 28, "#8b93a7", 500); t(v, cx, 900, 64, "#ffffff", 700); });
  t("Stime del modello, non certezze.", W / 2, H - 40, 24, "#5d667a", 500, "center");
  const blob = await new Promise((ok) => cv.toBlob(ok, "image/png")); if (!blob) return;
  const f = new File([blob], "serie.png", { type: "image/png" });
  try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: "La mia serie" }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "serie.png"; a.click();
}
document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("#serieImg")) immagineSerie(); });

// ---- 32/33. gruppo di amici: classifica e sfide sul vincitore di una partita
async function idMio() { const c = ls.get("codice", "") || (typeof codiceSync === "function" ? codiceSync() : ""); const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("gr|" + c)); return [...new Uint8Array(d)].slice(0, 4).map((b) => b.toString(16).padStart(2, "0")).join(""); }
async function postGruppo(corpo) { const r = await fetch("/api/gruppo", { method: "POST", body: JSON.stringify(corpo) }), j = await r.json(); if (!r.ok || j.errore) throw new Error(j.errore || "Errore " + r.status); return j; }
async function risolviSfide(G, S, id) { // chi vede una partita finita scrive il vincitore, così tutti i punteggi si aggiornano
  let nuovo = false;
  for (const [gid, pr] of Object.entries(S.p || {})) {
    if (S.r && S.r[gid]) continue;
    try { const D = await api("/api/giorno?d=" + pr.y, 300000), p = (D.partite || []).find((q) => q.id === gid); if (p && p.stato === "post" && p.ptCasa !== p.ptTr) { const v = p.ptCasa > p.ptTr ? p.casa : p.trasf; (S.r ||= {})[gid] = v; await postGruppo({ gr: G, id, nome: ls.get("profilo", {}).nome || "Io", stats: statsPersonali(), ris: { g: gid, v } }); nuovo = true; } } catch {}
  }
  return nuovo;
}
async function vistaGruppo() {
  const G = ls.get("gruppo", ""); let h = back4("#/profilo", "Profilo") + `<h2>Gruppo di amici</h2>`;
  if (!G) {
    APP.innerHTML = h + `<div class="cap" style="margin-top:0">Crea un gruppo scegliendo un codice (da 4 a 16 lettere o numeri) e passalo ai tuoi amici: chi lo inserisce entra nella classifica. Si condividono solo nome, saldo del mese, percentuale di centrate e le sfide: mai le schedine.</div><div class="card"><input class="linea" id="grc" maxlength="16" placeholder="Codice del gruppo (es. canestri23)" style="margin:0 0 8px" autocapitalize="none"><input class="linea" id="grn" maxlength="20" placeholder="Il tuo nome" value="${esc(ls.get("profilo", {}).nome || "")}" style="margin:0 0 8px"><button class="btn" id="grok" style="margin:0">Entra nel gruppo</button><div id="grerr" class="s" style="color:${RD};margin-top:6px"></div></div>`;
    $("#grok").onclick = async () => { const g = $("#grc").value.trim().toLowerCase(), n = $("#grn").value.trim(); if (!/^[a-z0-9]{4,16}$/.test(g)) { $("#grerr").textContent = "Il codice deve avere da 4 a 16 lettere o numeri, senza spazi."; return; } if (!n) { $("#grerr").textContent = "Scrivi il tuo nome."; return; } try { const id = await idMio(); await postGruppo({ gr: g, id, nome: n, stats: statsPersonali() }); const pf = ls.get("profilo", {}); pf.nome = pf.nome || n; ls.set("profilo", pf); ls.set("gruppo", g); vistaGruppo(); } catch (e) { $("#grerr").textContent = e.message; } };
    return;
  }
  APP.innerHTML = h + skel();
  let S, id, D = null; try { id = await idMio(); S = await postGruppo({ gr: G, id, nome: ls.get("profilo", {}).nome || "Io", stats: statsPersonali() }); } catch (e) { APP.innerHTML = h + errBox(e); return; }
  try { D = await dati(); } catch {}
  if (await risolviSfide(G, S, id)) { try { S = await (await fetch("/api/gruppo?gr=" + G)).json(); } catch {} }
  const punti = {}; for (const [gid, pr] of Object.entries(S.p || {})) { const v = (S.r || {})[gid]; if (v) for (const [m, s] of Object.entries(pr.s)) punti[m] = (punti[m] || 0) + (s === v ? 1 : 0); }
  const mem = Object.entries(S.m || {}).map(([k, v]) => ({ k, ...v, pt: punti[k] || 0 })).sort((a, b) => b.saldo - a.saldo);
  const nomeDi = (k) => (S.m[k] || {}).n || "?";
  h += `<div class="cap" style="margin-top:0">Gruppo <b style="color:var(--txt)">${esc(G)}</b> · ${mem.length} ${mem.length === 1 ? "persona" : "persone"}. La classifica è sul saldo di questo mese.</div><div class="card" style="padding:4px 12px">` + mem.map((m, i) => `<div class="riga rg" style="${i ? "" : "border-top:0"}"><div style="min-width:0"><b>${i + 1}. ${esc(m.n)}${m.k === id ? " (tu)" : ""}</b><div class="s">centrate ${m.perc}% su ${m.n_} · serie ${m.serie} · sfide vinte ${m.pt}</div></div><b style="color:${m.saldo >= 0 ? GR : RD}">${eur(m.saldo)}</b></div>`).join("") + `</div>`;
  const pre = D ? D.partite.filter((p) => p.stato === "pre") : [];
  h += `<h2>Sfide di oggi</h2><div class="cap" style="margin-top:0">Scegli chi vince: ogni risultato giusto vale un punto nelle sfide.</div>`;
  h += pre.length ? pre.map((p) => { const pr = (S.p || {})[p.id], mia = pr && pr.s[id]; return `<div class="card"><div class="riga"><b>${esc(p.casa)} - ${esc(p.trasf)}</b><span class="s">${esc(String(p.ora).slice(-5))}</span></div><div class="grid2" style="margin-top:8px">${[p.casa, p.trasf].map((ab) => `<button class="chipbtn${mia === ab ? " on" : ""}" data-sf="${p.id}|${ab}" style="justify-content:center">${logo(ab, 18)} ${esc(T(D, ab).b)}</button>`).join("")}</div>${pr ? `<div class="s" style="margin-top:6px">${Object.entries(pr.s).map(([k, s]) => `${esc(nomeDi(k))}: ${esc(s)}`).join(" · ")}</div>` : ""}</div>`; }).join("") : `<div class="vuoto">Nessuna partita da giocare in questo giorno.</div>`;
  const chiuse = Object.entries(S.p || {}).filter(([gid]) => (S.r || {})[gid]).slice(-6).reverse();
  if (chiuse.length) h += `<h2>Sfide chiuse</h2><div class="card" style="padding:4px 12px">` + chiuse.map(([gid, pr], i) => `<div class="riga rg" style="${i ? "" : "border-top:0"}"><span>Ha vinto <b>${esc(S.r[gid])}</b></span><span class="s">${Object.entries(pr.s).map(([k, s]) => `${esc(nomeDi(k))} ${s === S.r[gid] ? "✓" : "✗"}`).join(" · ")}</span></div>`).join("") + `</div>`;
  h += `<button class="btn" id="serieImg"><i class="ti ti-share"></i> Condividi la mia serie come immagine</button><button class="chipbtn" id="grex" style="margin-top:6px">Esci dal gruppo</button>`;
  APP.innerHTML = h;
  APP.querySelectorAll("[data-sf]").forEach((b) => b.onclick = async () => { const [g, s] = b.dataset.sf.split("|"), p = pre.find((q) => q.id === g); try { await postGruppo({ gr: G, id, nome: ls.get("profilo", {}).nome || "Io", stats: statsPersonali(), pron: { g, s, y: etGiorno(typeof giorno === "number" ? giorno : 0).ymd } }); vistaGruppo(); } catch (e) { alert(e.message); } });
  $("#grex").onclick = () => { if (confirm("Uscire dal gruppo su questo telefono?")) { ls.set("gruppo", ""); vistaGruppo(); } };
}
window.RIDEE.push([/^\/gruppo/, vistaGruppo]);

// ---- 35. tabellone playoff previsto sulla classifica attuale, con i tuoi pronostici
async function vistaPlayoff() {
  const top = topBar() + segEsplora("c"); APP.innerHTML = top + skel();
  let C; try { C = await api("/api/classifica", 600000); } catch (e) { APP.innerHTML = top + errBox(e); return; }
  const P = ls.get("playoff", {}); let h = top + `<h2>Tabellone playoff</h2><div class="cap" style="margin-top:0">Primo turno previsto con la classifica di oggi: le prime 6 di ogni conference sono dirette, 7ª e 8ª si decidono ai play-in. Scegli chi passa il turno: i pronostici restano sul telefono.</div>`;
  for (const k of ["Est", "Ovest"]) {
    const L = C[k] || []; if (L.length < 8) continue;
    const coppie = [[0, 7], [3, 4], [2, 5], [1, 6]];
    h += `<div class="sub">${k}</div>` + coppie.map(([a, b]) => { const A = L[a], Bq = L[b], key = `${k}${a}${b}`, nomeB = b >= 6 ? `${nomeSq(C.squadre, Bq.ab)} (play-in)` : nomeSq(C.squadre, Bq.ab), sc = (x, i, nm) => `<button class="chipbtn${P[key] === x.ab ? " on" : ""}" data-po="${key}|${x.ab}" style="justify-content:center">${logo(x.ab, 20)} ${i + 1}. ${esc(nm)}</button>`; return `<div class="card"><div class="grid2">${sc(A, a, nomeSq(C.squadre, A.ab))}${sc(Bq, b, nomeB)}</div></div>`; }).join("");
  }
  h += `<div class="cap">Il tabellone è solo un gioco di pronostici: non ci sono probabilità del modello per le serie.</div>`;
  APP.innerHTML = h;
  APP.querySelectorAll("[data-po]").forEach((b) => b.onclick = () => { const [k, ab] = b.dataset.po.split("|"), p = ls.get("playoff", {}); p[k] = p[k] === ab ? null : ab; ls.set("playoff", p); vistaPlayoff(); });
}
window.RIDEE.push([/^\/playoff/, vistaPlayoff]);

// ---- 36. mercato e scambi: le notizie che parlano di firme, scambi e contratti (tue squadre + generali)
async function vistaMercato() {
  const top = topBar() + segEsplora("n"); APP.innerHTML = top + skel();
  const sq = pref().sq.slice(0, 4), rx = /trade|traded|sign|signs|signed|extension|waive|contract|free agent|buyout|deal|scambio|firma|rinnov|taglia|contratto/i;
  let R = []; try { R = (await Promise.all([null, ...sq].map((s) => api("/api/news" + (s ? "?s=" + s : ""), 300000).then((r) => r.news || []).catch(() => [])))).flat(); } catch {}
  const viste = new Set(), L = R.filter((n) => rx.test(n.titolo + " " + (n.desc || "") + " " + (n.titoloIt || ""))).filter((n) => !viste.has(n.url) && viste.add(n.url)).sort((a, b) => Date.parse(b.data) - Date.parse(a.data));
  APP.innerHTML = top + `<h2>Mercato e scambi</h2><div class="cap" style="margin-top:0">Le notizie su scambi, firme e contratti, tra le generali e quelle delle squadre che segui${sq.length ? "" : " (metti la ☆ a una squadra per vedere anche le sue)"}.</div>` + (L.length ? L.map(cardNews).join("") : `<div class="vuoto">Nessuna notizia di mercato in questo momento.</div>`);
}
window.RIDEE.push([/^\/mercato/, vistaMercato]);

// ---- 37. calendario del telefono: file .ics con le partite delle squadre e partite seguite
async function scaricaIcs() {
  const P = pref(); let C; try { C = await api("/api/calendario", 300000); } catch (e) { alert("Non riesco a leggere il calendario: " + e.message); return; }
  const fmt = (d) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d+/, ""), ev = [];
  for (const g of C.giorni || []) for (const x of g.partite) { if (x.stato !== "pre" || !x.iso) continue; if (!(P.sq.includes(x.casa) || P.sq.includes(x.trasf) || P.gm.includes(String(x.id)))) continue; const i = Date.parse(x.iso); ev.push(`BEGIN:VEVENT\r\nUID:nba${x.id}@nba-schedine\r\nDTSTAMP:${fmt(Date.now())}\r\nDTSTART:${fmt(i)}\r\nDTEND:${fmt(i + 2.5 * 3600e3)}\r\nSUMMARY:${x.trasf} @ ${x.casa}\r\nDESCRIPTION:NBA Schedine\r\nEND:VEVENT`); }
  if (!ev.length) { alert("Nessuna partita delle tue squadre o con la 🔔 nei prossimi giorni. Metti la ☆ a una squadra e riprova."); return; }
  const blob = new Blob(["BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//NBA Schedine//IT\r\n" + ev.join("\r\n") + "\r\nEND:VCALENDAR"], { type: "text/calendar" }), a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "partite-nba.ics"; a.click();
}
document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("#icsBtn")) scaricaIcs(); });

// ---- 38. confronto giocatori
async function vistaConfronta() {
  const top = topBar() + segEsplora("g"); APP.innerHTML = top + skel();
  let D; try { D = await dati(); } catch (e) { APP.innerHTML = top + errBox(e); return; }
  const tutti = D.partite.filter((p) => p.stato === "pre").flatMap((p) => (p.giocatori || []).map((g) => ({ g, p }))).sort((a, b) => a.g.nome.localeCompare(b.g.nome, "it"));
  if (tutti.length < 2) { APP.innerHTML = top + `<div class="vuoto">Servono almeno due giocatori di partite non ancora iniziate.</div>`; return; }
  const C = ls.get("conf2", [tutti[0].g.pid, tutti[1].g.pid]), sel = (i) => `<select class="linea" data-cf="${i}" style="margin:0">${tutti.map((o) => `<option value="${esc(o.g.pid)}"${o.g.pid === C[i] ? " selected" : ""}>${esc(o.g.nome)} (${esc(o.g.sq)})</option>`).join("")}</select>`;
  const A = tutti.find((o) => o.g.pid === C[0]) || tutti[0], B = tutti.find((o) => o.g.pid === C[1]) || tutti[1];
  const riga = (t, a, b, alto = true) => { const va = +a, vb = +b, ma = alto ? va >= vb : va <= vb, mb = alto ? vb >= va : vb <= va; return `<div class="riga rg"><b style="width:30%;text-align:left;color:${ma && va !== vb ? GR : "inherit"}">${vir(va)}</b><span class="s" style="flex:1;text-align:center">${t}</span><b style="width:30%;text-align:right;color:${mb && va !== vb ? GR : "inherit"}">${vir(vb)}</b></div>`; };
  const ctx = (o) => `${esc(o.p.casa)} - ${esc(o.p.trasf)}`;
  APP.innerHTML = top + `<h2>Confronto giocatori</h2><div class="card"><div class="grid2">${sel(0)}${sel(1)}</div></div><div class="card"><div class="riga" style="align-items:flex-start"><div style="width:42%;text-align:center">${foto(A.g.pid, 64)}<div><b>${esc(A.g.nome)}</b></div><div class="s">${ctx(A)}</div></div><div style="width:42%;text-align:center">${foto(B.g.pid, 64)}<div><b>${esc(B.g.nome)}</b></div><div class="s">${ctx(B)}</div></div></div>` +
    riga("Punti stimati", A.g.pts.v, B.g.pts.v) + riga("Media punti", A.g.pts.media, B.g.pts.media) + riga("Rimbalzi stimati", A.g.reb.v, B.g.reb.v) + riga("Assist stimati", A.g.ast.v, B.g.ast.v) + riga("Minuti attesi", A.g.min, B.g.min) + `</div><div class="cap">In verde il valore migliore. Stime del modello per la partita di oggi, non il giudizio su chi è più forte.</div>`;
  APP.querySelectorAll("[data-cf]").forEach((s) => s.onchange = () => { const c = ls.get("conf2", [tutti[0].g.pid, tutti[1].g.pid]); c[+s.dataset.cf] = s.value; ls.set("conf2", c); vistaConfronta(); });
}
window.RIDEE.push([/^\/confronta/, vistaConfronta]);

// ---- 39. corsa ai premi: i giocatori più produttivi della stagione
async function vistaPremi() {
  const top = topBar() + segEsplora("g"); APP.innerHTML = top + skel();
  let R; try { R = await api("/api/leader", 1800000); } catch (e) { APP.innerHTML = top + errBox(e); return; }
  APP.innerHTML = top + `<h2>Corsa ai premi</h2><div class="cap" style="margin-top:0">I 15 giocatori più produttivi della stagione, con un indice semplice: punti + 0,7 rimbalzi + 0,9 assist a partita (solo chi gioca almeno 25 minuti). Non è il voto vero dell'MVP, che dipende anche dalle vittorie della squadra.</div>` + R.giocatori.map((x, i) => `<a class="card riga" href="#/giocatore/${esc(x.pid)}" style="padding:10px 12px;color:inherit;gap:10px"><div class="lg"><b style="width:22px;color:${OR}">${i + 1}</b>${foto(x.pid, 38)}<div style="min-width:0"><b>${esc(x.nome)}</b><div class="s">${esc(nomeSq(R.squadre, x.sq))} · ${x.pts.toFixed(1)} pt · ${x.reb.toFixed(1)} rb · ${x.ast.toFixed(1)} as</div></div></div><b>${x.ind.toFixed(1)}</b></a>`).join("");
}
window.RIDEE.push([/^\/premi/, vistaPremi]);

// ---- 40. squadra ideale della notte: i cinque con più produzione attesa stasera
async function vistaIdeale() {
  const top = topBar() + segEsplora("s"); APP.innerHTML = top + skel();
  let D; try { D = await dati(); } catch (e) { APP.innerHTML = top + errBox(e); return; }
  const L = D.partite.filter((p) => p.stato === "pre").flatMap((p) => (p.giocatori || []).filter((g) => g.pts && g.reb && g.ast && !(p.inf || []).some((i) => i.stato === "out" && i.nome === g.nome)).map((g) => ({ g, p, ind: g.pts.v + 0.7 * g.reb.v + 0.9 * g.ast.v }))).sort((a, b) => b.ind - a.ind);
  const sq = [], vis = new Set(); for (const o of L) { if (vis.has(o.g.pid)) continue; vis.add(o.g.pid); sq.push(o); if (sq.length === 5) break; }
  APP.innerHTML = top + `<h2>Squadra ideale della notte</h2><div class="cap" style="margin-top:0">I cinque giocatori con più produzione attesa tra le partite di stasera (punti + 0,7 rimbalzi + 0,9 assist stimati). Chi è dato per fuori non entra.</div>` + (sq.length ? sq.map((o) => `<a class="card riga" href="#/partita/${o.p.id}" style="padding:10px 12px;color:inherit;gap:10px"><div class="lg">${foto(o.g.pid, 40)}<div style="min-width:0"><b>${esc(o.g.nome)}</b><div class="s">${esc(o.p.casa)} - ${esc(o.p.trasf)} · ${vir(o.g.pts.v)} pt · ${vir(o.g.reb.v)} rb · ${vir(o.g.ast.v)} as</div></div></div><b>${o.ind.toFixed(1)}</b></a>`).join("") : `<div class="vuoto">Nessuna partita da giocare in questo giorno.</div>`);
}
window.RIDEE.push([/^\/ideale/, vistaIdeale]);
;
// NBA Schedine - idee6.js: profilo con serie e badge, Home su misura, silenzio durante i turni, gesti, festa per la schedina presa, comandi rapidi, densità, glossario, indicatore offline
"use strict";

// ---- 41. serie e badge
function badgeProfilo() {
  const S = statsPersonali(), R = chiuseReg(), vinte = R.filter((r) => r.esito === 1), mese = typeof nettoMese === "function" ? nettoMese() : 0;
  const L = [
    ["ti-ticket", "Prima schedina presa", vinte.length >= 1, "Vinci una schedina"],
    ["ti-flame", "Tre di fila", S.best >= 3, "Tre schedine prese consecutive"],
    ["ti-bolt", "Cinque di fila", S.best >= 5, "Cinque schedine prese consecutive"],
    ["ti-notebook", "Dieci giocate chiuse", S.n >= 10, "Chiudi dieci giocate nel registro"],
    ["ti-books", "Cinquanta giocate chiuse", S.n >= 50, "Chiudi cinquanta giocate"],
    ["ti-trending-up", "Mese in positivo", mese > 0, "Chiudi il mese corrente con un saldo positivo"],
    ["ti-diamond", "Quota alta", vinte.some((r) => (r.quota || 0) >= 10), "Vinci una giocata a quota 10 o più"],
    ["ti-target", "Occhio sicuro", S.n >= 10 && S.perc >= 60, "Centra almeno il 60% con 10 giocate o più"],
  ];
  return L;
}
function blocchiProfilo() {
  const S = statsPersonali(), B = badgeProfilo(), ok = B.filter((b) => b[2]).length;
  return `<h2>Serie e badge</h2><div class="card"><div class="row3"><div class="tile"><b style="color:${S.serie >= 3 ? GR : "inherit"}">${S.serie}</b><span>schedine prese di fila</span></div><div class="tile"><b>${S.best}</b><span>record</span></div><div class="tile"><b>${ok}/${B.length}</b><span>badge</span></div></div><div class="cap" style="margin:8px 0 0">La serie si calcola sulle schedine chiuse del registro, dalla più recente.</div></div><div class="card" style="padding:4px 12px">${B.map((b, i) => `<div class="riga rg" style="${i ? "" : "border-top:0"};justify-content:flex-start;gap:12px;opacity:${b[2] ? 1 : 0.5}"><i class="ti ${b[0]}" style="font-size:22px;color:${b[2] ? OR : MU}"></i><div style="flex:1"><b>${b[1]}</b><div class="s">${b[3]}</div></div><span class="s" style="color:${b[2] ? GR : MU}">${b[2] ? "ottenuto" : "da fare"}</span></div>`).join("")}</div><button class="btn" id="serieImg"><i class="ti ti-share"></i> Condividi la serie come immagine</button>`;
}

// ---- 42. Home su misura
const BLOCCHI_HOME = [["budget", "Avviso del budget"], ["radar", "Radar del valore"], ["aperte", "Giocate aperte"], ["giorno", "Giocata del giorno"], ["mercato", "Confronto con i bookmaker"], ["pref", "Preferiti"], ["news", "Notizie dei preferiti"]];
const homeOn = (k) => (ls.get("homeBl", {})[k] !== 0);
function cardHomeSuMisura() {
  return `<h2>Home su misura</h2><div class="card"><div class="cap" style="margin:0 0 6px">Scegli cosa vedere sopra le partite.</div><div class="tabs" style="flex-wrap:wrap">${BLOCCHI_HOME.map(([k, n]) => `<button class="chipbtn${homeOn(k) ? " on" : ""}" data-hb="${k}">${n}</button>`).join("")}</div></div>`;
}

// ---- 49. densità delle schede
const densita = () => ls.get("dens", "normale");
function applicaDensita() { document.documentElement.classList.toggle("compatta", densita() === "compatta"); }
function cardUI() {
  const sw = (k, v, n) => `<button class="chipbtn${ls.get(k, v === "normale" || v === 1 ? v : "") === v ? " on" : ""}" data-ui="${k}|${v}">${n}</button>`;
  return `<h2>Aspetto e gesti</h2><div class="card"><div class="cap" style="margin:0 0 6px">Densità delle schede</div><div class="tabs" style="margin:0"><button class="chipbtn${densita() === "normale" ? " on" : ""}" data-ui="dens|normale">Normale</button><button class="chipbtn${densita() === "compatta" ? " on" : ""}" data-ui="dens|compatta">Compatta</button></div><div class="cap" style="margin:10px 0 6px">Gesti sulle giocate</div><div class="tabs" style="margin:0"><button class="chipbtn${ls.get("gesti", 1) ? " on" : ""}" data-ui="gesti|1">Scorri a sinistra per aggiungere</button><button class="chipbtn${ls.get("gesti", 1) ? "" : " on"}" data-ui="gesti|0">Spenti</button></div></div>`;
}

// ---- 44. silenzio durante il turno
const PRESET_SIL = [["Mattina 6-14", "06:00", "14:00"], ["Pomeriggio 14-22", "14:00", "22:00"], ["Notte 22-6", "22:00", "06:00"]];
function cardSilenzio() {
  const s = pref().sil || { on: 0, da: "22:00", a: "06:00" };
  return `<h2>Silenzio durante il turno</h2><div class="card"><div class="cap" style="margin:0 0 8px">Nelle ore del turno le notifiche non suonano: a fine turno ne arriva una sola con quello che è successo. Gli orari sono in ora italiana.</div><div class="tabs" style="flex-wrap:wrap;margin:0 0 8px">${PRESET_SIL.map(([n, a, b]) => `<button class="chipbtn${s.on && s.da === a && s.a === b ? " on" : ""}" data-sil="${a}|${b}">${n}</button>`).join("")}<button class="chipbtn${s.on ? "" : " on"}" data-sil="off">Mai</button></div><div class="grid2"><label class="s">Dalle<input class="linea" type="time" id="silda" value="${esc(s.da)}" style="margin:2px 0 0"></label><label class="s">Alle<input class="linea" type="time" id="silaa" value="${esc(s.a)}" style="margin:2px 0 0"></label></div><div class="s" style="margin-top:6px">${s.on ? `Attivo: silenzio dalle ${esc(s.da)} alle ${esc(s.a)}.` : "Spento: ricevi gli avvisi sempre."}</div></div>`;
}
function salvaSilenzio(sil) { const v = ls.get("pref", null) || { sq: [], pl: [], gm: [] }; v.sil = sil; ls.set("pref", v); sincPref(); }
document.addEventListener("click", (e) => {
  const t = e.target.closest && e.target.closest("[data-hb],[data-ui],[data-sil]"); if (!t) return;
  if (t.dataset.hb) { const b = ls.get("homeBl", {}); b[t.dataset.hb] = homeOn(t.dataset.hb) ? 0 : 1; ls.set("homeBl", b); vistaProfilo(); return; }
  if (t.dataset.ui) { const [k, v] = t.dataset.ui.split("|"); ls.set(k, k === "gesti" ? +v : v); applicaDensita(); vistaProfilo(); return; }
  if (t.dataset.sil) { if (t.dataset.sil === "off") salvaSilenzio({ ...(pref().sil || { da: "22:00", a: "06:00" }), on: 0 }); else { const [da, a] = t.dataset.sil.split("|"); salvaSilenzio({ on: 1, da, a }); } vistaProfilo(); }
});
document.addEventListener("change", (e) => { if (e.target.id === "silda" || e.target.id === "silaa") { const da = $("#silda").value, a = $("#silaa").value; if (da && a) { salvaSilenzio({ on: 1, da, a }); vistaProfilo(); } } });

// ---- 45. gesti: scorri a sinistra una giocata per aggiungerla alla schedina
{ let x0 = 0, y0 = 0, el = null;
  document.addEventListener("touchstart", (e) => { el = ls.get("gesti", 1) ? e.target.closest && e.target.closest(".cardp") : null; if (el) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; } }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (!el) return; const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0, c = el; el = null;
    if (dx < -80 && Math.abs(dy) < 30) { const b = c.querySelector(".addl"); if (b) { b.click(); c.style.transition = "transform .18s"; c.style.transform = "translateX(-14px)"; setTimeout(() => { c.style.transform = ""; }, 180); } }
  }, { passive: true });
}

// ---- 47. un solo momento di festa quando una schedina viene presa
function confetti(testo) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv = document.createElement("canvas"); cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:99"; cv.width = innerWidth; cv.height = innerHeight; document.body.appendChild(cv);
  const x = cv.getContext("2d"), P = Array.from({ length: 90 }, () => ({ x: innerWidth / 2, y: innerHeight * 0.4, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, c: [OR, GR, "#ffffff", AM][Math.floor(Math.random() * 4)], s: 5 + Math.random() * 6 })), t0 = performance.now();
  const f = (t) => { const k = t - t0; x.clearRect(0, 0, cv.width, cv.height); for (const p of P) { p.vy += 0.35; p.x += p.vx; p.y += p.vy; x.globalAlpha = Math.max(0, 1 - k / 1800); x.fillStyle = p.c; x.fillRect(p.x, p.y, p.s, p.s * 0.6); } if (k < 1800) requestAnimationFrame(f); else cv.remove(); };
  requestAnimationFrame(f);
  const m = document.createElement("div"); m.textContent = testo; m.style.cssText = "position:fixed;top:18%;left:50%;transform:translateX(-50%);background:var(--card);border:1px solid var(--or);color:var(--txt);padding:12px 18px;border-radius:14px;font-weight:700;z-index:100;box-shadow:0 8px 30px rgba(0,0,0,.5)"; document.body.appendChild(m); setTimeout(() => m.remove(), 2600);
}
function festeggia() {
  const gia = new Set(ls.get("festeggiate", [])), oggi = Date.now(), nuove = ls.get("registro", []).filter((r) => r.esito === 1 && !gia.has(String(r.id)) && oggi - Date.parse(String(r.data) + "T23:59:00") < 3 * 86400000);
  if (!nuove.length) return;
  ls.set("festeggiate", [...gia, ...ls.get("registro", []).filter((r) => r.esito === 1).map((r) => String(r.id))].slice(-300));
  const v = nuove.reduce((t, r) => t + (r.puntata || 0) * ((r.quota || 1) - 1), 0); confetti(`Schedina presa! +${v.toFixed(2).replace(".", ",")} €`);
}
{ const base = aggiornaRegistro; aggiornaRegistro = async function (...a) { const r = await base.apply(this, a); try { festeggia(); } catch {} return r; }; }

// ---- 48. comandi rapidi: pagine, squadre e giocatori di oggi in una ricerca
const COMANDI = [["#/", "Oggi, partite"], ["#/live", "Live"], ["#/combo", "Pronostici"], ["#/schedine", "Schedine"], ["#/mia", "La mia schedina"], ["#/conto", "Conto"], ["#/registro", "Registro"], ["#/statistiche", "Statistiche"], ["#/storico", "Modello"], ["#/impostazioni", "Impostazioni"], ["#/profilo", "Profilo"], ["#/forma", "Forma dei giocatori"], ["#/infortunati", "Infortunati"], ["#/classifica", "Classifica"], ["#/calendario", "Calendario"], ["#/stasera", "Stasera"], ["#/news", "Notizie"], ["#/glossario", "Glossario"], ...HUB.map(([h, , t]) => [h, t])];
async function vistaComandi() {
  APP.innerHTML = back4("#/", "Oggi") + `<h2>Cerca</h2><div class="card"><input class="linea" id="cmq" placeholder="Pagina, squadra o giocatore" style="margin:0" autocapitalize="none" autofocus></div><div id="cmr"></div>`;
  let D = null; try { D = await dati(); } catch {}
  const squadre = D && D.squadre ? Object.entries(D.squadre).map(([ab, s]) => ["#/squadra/" + ab, `${s.n || ab} (squadra)`]) : [], gioc = D ? D.partite.flatMap((p) => (p.giocatori || []).map((g) => ["#/giocatore/" + g.pid, `${g.nome} (${g.sq})`])) : [];
  const tutti = [...COMANDI, ...squadre, ...gioc], disegna = () => { const q = $("#cmq").value.trim().toLowerCase(), l = (q ? tutti.filter(([, n]) => n.toLowerCase().includes(q)) : COMANDI).slice(0, 14); $("#cmr").innerHTML = l.length ? `<div class="card" style="padding:4px 12px">${l.map(([h, n], i) => `<a class="riga rg" href="${h}" style="color:inherit;${i ? "" : "border-top:0"}"><span>${esc(n)}</span><i class="ti ti-chevron-right"></i></a>`).join("")}</div>` : `<div class="vuoto">Niente trovato. Per altri giocatori usa «Giocatori» in Esplora.</div>`; };
  $("#cmq").oninput = disegna; disegna();
}
window.RIDEE.push([/^\/cerca-tutto|^\/comandi/, vistaComandi]);

// ---- 50. glossario
const GLOSSARIO = [["Linea", "Il numero da superare o non superare, per esempio 19,5 punti. Con 19,5 serve segnare 20 o più."], ["Over", "Scommessa che il valore finale sarà sopra la linea."], ["Under", "Scommessa che il valore finale sarà sotto la linea."], ["Probabilità", "Quanto il modello ritiene probabile che la giocata vada a segno: 80% significa 8 volte su 10, in media."], ["Quota", "Quanto paga il bookmaker per ogni euro giocato. Con quota 2,00 e 5 € puntati vinci 10 € in tutto."], ["Quota giusta", "1 diviso la probabilità. È la quota a cui, secondo il modello, la giocata sarebbe alla pari."], ["Valore atteso", "Probabilità × quota − 1. Sopra zero, in teoria conviene; sotto zero no."], ["Stima", "Il numero che il modello si aspetta, per esempio 26 punti. La linea consigliata è più bassa, per essere prudenti."], ["Back-to-back", "Squadra che gioca due sere di fila: di solito è più stanca."], ["Doppia doppia", "Almeno 10 in due statistiche, per esempio 10 punti e 10 rimbalzi."], ["Play-in", "Spareggi per le posizioni dalla 7ª alla 10ª di ogni conference."], ["Parziale", "Una serie di punti consecutivi di una squadra, per esempio 10-0."], ["Kelly", "Metodo che suggerisce quanto puntare in proporzione al vantaggio. Qui si usa solo una frazione, per prudenza."], ["Taratura", "Quanto le probabilità dichiarate corrispondono ai risultati reali."], ["Schedina", "Più giocate unite in una sola: vince solo se le centri tutte, e la quota si moltiplica."]];
function vistaGlossario() {
  APP.innerHTML = back4("#/profilo", "Profilo") + `<h2>Glossario</h2><div class="card"><input class="linea" id="glq" placeholder="Cerca una parola" style="margin:0"></div><div id="glr"></div>`;
  const d = () => { const q = $("#glq").value.trim().toLowerCase(); $("#glr").innerHTML = `<div class="card" style="padding:4px 12px">${GLOSSARIO.filter(([t, s]) => !q || (t + s).toLowerCase().includes(q)).map(([t, s], i) => `<div class="rg" style="padding:10px 0;${i ? "" : "border-top:0"}"><b>${t}</b><div class="s" style="margin-top:2px">${s}</div></div>`).join("")}</div>`; };
  $("#glq").oninput = d; d();
}
window.RIDEE.push([/^\/glossario/, vistaGlossario]);

// ---- 46. indicatore offline: i dati salvati restano visibili e lo si dice
function bannerOffline() { const el = document.getElementById("offl"); if (navigator.onLine) { if (el) el.remove(); return; } if (el) return; const d = document.createElement("div"); d.id = "offl"; d.textContent = "Sei offline: vedi gli ultimi dati salvati"; d.style.cssText = "position:fixed;top:0;left:0;right:0;background:var(--am);color:#000;text-align:center;font-size:13px;font-weight:600;padding:4px;z-index:98"; document.body.appendChild(d); }
addEventListener("online", bannerOffline); addEventListener("offline", bannerOffline); bannerOffline();
;
// NBA Schedine - idee7.js: studio partita: formazioni (ufficiali o stimate), tutti i giocatori, forma, contorno ai migliori e spiegazione dettagliata
"use strict";
const rosaUff = {}; // id partita -> { pubblicato, titolari } dal server

// i 5 più probabili titolari: prima chi parte spesso da titolare (partite da titolare / giocate), altrimenti chi gioca più minuti
function titolariStimati(lista) {
  const sq0 = lista[0] && lista[0].sq, ult = window.__ultimiTit && window.__ultimiTit[sq0]; // titolari dell'ultima partita (ESPN non dà le partite da titolare)
  if (ult && ult.size >= 3) { const ok = lista.filter((x) => x.pid && ult.has(x.pid) && x.inf !== "out"), resto = lista.filter((x) => !ok.includes(x) && x.inf !== "out").sort((a, b) => (b.minBase || b.min) - (a.minBase || a.min)); if (ok.length >= 3) return [...ok, ...resto].slice(0, 5); }
  const conGs = lista.filter((x) => x.gs != null && x.gp >= 3).length >= Math.min(8, lista.length);
  const chiave = (x) => (conGs && x.gp >= 3 && x.gs != null ? (x.gs / x.gp) * 100 + x.minBase / 100 : x.minBase || x.min);
  return [...lista].sort((a, b) => chiave(b) - chiave(a)).slice(0, 5);
}
// stato di forma dalle ultime partite (punti): confronto tra ultime 5 e media stagione
function statoForma(x) {
  const u = x.ult && x.ult.pts; if (!u || u.length < 5) return { k: "nd", t: "Forma non disponibile", col: MU, ico: "ti-minus", frase: "Non ci sono ancora abbastanza partite recenti: l'app usa solo la media della stagione." };
  const l5 = u.slice(-5), m5 = l5.reduce((a, b) => a + b, 0) / 5, st = x.stagione || x.pts.media, d = st > 0 ? (m5 - st) / st : 0, v = (n) => vir(n);
  const pre = `Ultime 5 partite: ${v(m5)} punti contro ${v(st)} di media stagione (${d >= 0 ? "+" : ""}${Math.round(d * 100)}%).`;
  if (d >= 0.12) return { k: "su", t: "In forma", col: GR, ico: "ti-trending-up", d, m5, frase: pre + " Sta rendendo sopra il solito: l'app ne tiene conto (60% forma recente, 40% stagione)." };
  if (d <= -0.12) return { k: "giu", t: "In calo", col: RD, ico: "ti-trending-down", d, m5, frase: pre + " Sta rendendo sotto il solito: l'app abbassa la stima, ma una serie breve può essere casuale." };
  return { k: "st", t: "Stabile", col: MU, ico: "ti-minus", d, m5, frase: pre + " È in linea con la sua media." };
}
// cosa dice l'app di questo giocatore: giocate consigliate, migliore probabilità
function votoGiocatore(x, picks) {
  const mie = picks.filter((q) => q.pid && x.pid && q.pid === x.pid).sort((a, b) => b.prob - a.prob);
  return { mie, best: mie[0] ? mie[0].prob : 0 };
}
// spiegazione quando non c'è nessuna giocata: cosa si avvicina di più
function senzaGiocata(x, soglia) {
  const righe = [];
  for (const [k, n, u] of [["pts", "Punti", "punti"], ["reb", "Rimbalzi", "rimbalzi"], ["ast", "Assist", "assist"]]) {
    const o = x[k]; if (!o || !o.lad || !o.lad.length) continue;
    const ok = o.lad.filter((l) => l[1] >= 0.5).slice(-1)[0];
    righe.push(`${n}: stima ${vir(o.v)}${ok ? `, la linea più vicina è over ${vir(ok[0])} con ${Math.round(ok[1] * 100)}%` : ""}`);
  }
  return `<div class="cap" style="margin:6px 0 0">Nessuna giocata consigliata: nessuna linea supera il ${Math.round(soglia * 100)}% di probabilità (o il giocatore è fuori dalle prime scelte della squadra). ${esc(righe.join(" · "))}.</div>`;
}
function dettaglioRosa(x, picks, ruolo, forma, soglia) {
  const v = votoGiocatore(x, picks), tile = (n, k) => `<div class="tile"><b>${vir(x[k].v)}</b><span>${n} · media ${vir(x[k].media)}</span></div>`;
  let h = `<div class="ro-sez"><b>Stato di forma:</b> <span style="color:${forma.col}"><i class="ti ${forma.ico}"></i> ${forma.t}</span>`;
  if (x.ult && x.ult.pts && x.ult.pts.length) h += `<div style="margin:6px 0 2px">${spark(x.ult.pts, x.stagione, forma.col)}</div><div class="s">Punti nelle ultime ${x.ult.pts.length} partite (dalla più vecchia alla più recente), linea tratteggiata = media stagione.</div>`;
  h += `<div class="cap" style="margin:6px 0 0">${esc(forma.frase)}</div></div>`;
  h += `<div class="ro-sez"><b>Ruolo e minuti</b><div class="cap" style="margin:4px 0 0">${esc(ruolo.frase)} Minuti attesi: <b>${Math.round(x.min)}</b>${x.minBase - x.min >= 1.5 ? ` (${Math.round(x.minBase)} senza il rischio di partita sbilanciata)` : ""}.</div></div>`;
  h += `<div class="ro-sez"><b>Stima per questa partita</b><div class="row3" style="margin-top:6px">${tile("Punti", "pts")}${tile("Rimbalzi", "reb")}${tile("Assist", "ast")}</div></div>`;
  const ctx = [];
  if (x.dif) ctx.push(x.dif > 0 ? `difesa avversaria più debole della media (${x.dif > 0 ? "+" : ""}${vir(x.dif)}% sui punti)` : `difesa avversaria più dura della media (${vir(x.dif)}% sui punti)`);
  if (x.assenze && x.assenze.length) ctx.push(`compagni fuori (${x.assenze.join(", ")}): più palloni da giocare`);
  if (x.inf === "dubbio") ctx.push(`in dubbio: la probabilità che giochi pesa sulle percentuali`);
  if (ctx.length) h += `<div class="ro-sez"><b>Contesto</b><div class="cap" style="margin:4px 0 0">${esc(ctx.join("; ").replace(/^./, (c) => c.toUpperCase()))}.</div></div>`;
  h += `<div class="ro-sez"><b>${v.mie.length ? "Perché l'app lo segnala" : "Giocate"}</b>`;
  h += v.mie.length ? v.mie.map((q) => `<div class="s" style="margin:8px 0 2px"><b style="color:${colProb(q.prob)}">${esc(q.testo)} · ${pct(q.prob)}</b></div>${graficoPick(x, q)}${perche(q)}`).join("") : senzaGiocata(x, soglia);
  return h + `</div>` + (x.pid ? `<a class="chipbtn" style="display:inline-block;margin-top:8px" href="#/giocatore/${esc(x.pid)}">Apri la scheda completa</a>` : "");
}
function rigaRosa(D, x, picks, ruolo, rango, soglia) {
  const v = votoGiocatore(x, picks), forma = statoForma(x);
  const cl = x.inf === "dubbio" ? "ro-dub" : rango.has(x.pid || x.nome) ? "ro-top" : v.mie.length ? "ro-ok" : "";
  const tag = rango.has(x.pid || x.nome) ? `<span class="pill ro-tg" style="color:${OR}">Top</span>` : v.mie.length ? `<span class="pill ro-tg" style="color:${GR}">Consigliato</span>` : "";
  const num = (k) => `<b>${vir(x[k].v)}</b>`;
  return `<details class="ro ${cl}"><summary><div class="lg" style="flex:1;min-width:0">${foto(x.pid, 40)}<div style="min-width:0"><div class="tn">${esc(x.nome)}${x.inf === "dubbio" ? ` <span style="color:${AM}">⚠</span>` : ""}</div><div class="s">${tag}<span style="color:${forma.col}"><i class="ti ${forma.ico}"></i> ${forma.t}</span> · ${Math.round(x.min)} min${ruolo.uff ? "" : ""}</div></div></div><div class="ro-n s"><span>PT ${num("pts")}</span><span>RB ${num("reb")}</span><span>AS ${num("ast")}</span></div></summary><div class="ro-d">${dettaglioRosa(x, picks, ruolo, forma, soglia)}</div></details>`;
}
function bloccoSquadra(D, p, sq, picks, uff, rango, soglia) {
  const lista = p.giocatori.filter((x) => x.sq === sq);
  let tit, ufficiale = false;
  if (uff && uff.pubblicato) { tit = lista.filter((x) => x.pid && uff.titolari[x.pid]); ufficiale = true; }
  if (!tit || !tit.length) { tit = titolariStimati(lista); ufficiale = false; }
  const inTit = new Set(tit.map((x) => x.pid || x.nome)), panca = lista.filter((x) => !inTit.has(x.pid || x.nome)).sort((a, b) => b.min - a.min);
  const fuori = (p.inf || []).filter((i) => i.sq === sq && i.stato === "out");
  const usaGs = lista.filter((x) => x.gs != null && x.gp >= 3).length >= Math.min(8, lista.length);
  const spiega = ufficiale ? "Quintetto ufficiale pubblicato da ESPN poco prima della partita." : usaGs ? "Quintetto stimato: i 5 che partono più spesso da titolari in stagione. L'ufficiale compare circa un'ora prima della palla a due." : (window.__ultimiTit && window.__ultimiTit[sq] ? "Quintetto stimato: i titolari dell'ultima partita (senza chi è fuori), completati dai giocatori con più minuti." : "Quintetto stimato: i 5 che giocano più minuti.") + " L'ufficiale compare circa un'ora prima della palla a due.";
  const ruoloT = { uff: ufficiale, frase: ufficiale ? "Titolare ufficiale." : "Titolare probabile (stimato).", }, ruoloP = { uff: ufficiale, frase: ufficiale ? "Parte dalla panchina." : "Probabile panchina: entra a partita in corso." };
  let h = `<div class="sub" style="display:flex;align-items:center;gap:8px">${logo(sq, 22)}${esc(T(D, sq).n)}</div>`;
  h += `<div class="s" style="margin:4px 0 6px"><b style="color:${ufficiale ? GR : AM}">${ufficiale ? "Quintetto ufficiale" : "Probabile quintetto"}</b> · ${esc(spiega)}</div>`;
  h += tit.map((x) => rigaRosa(D, x, picks, ruoloT, rango, soglia)).join("");
  if (panca.length) h += `<div class="s" style="margin:12px 0 6px"><b>Panchina</b> · ${panca.length} giocatori con almeno 20 minuti di media</div>` + panca.map((x) => rigaRosa(D, x, picks, ruoloP, rango, soglia)).join("");
  if (fuori.length) h += `<div class="s" style="margin:12px 0 6px"><b style="color:${RD}">Fuori</b> · esclusi dai calcoli</div>` + fuori.map((i) => `<div class="ro ro-out"><div class="lg"><div style="min-width:0"><div class="tn">${esc(i.nome)}</div><div class="s">${esc(i.dettaglio || "Fuori")}</div></div></div></div>`).join("");
  return h;
}
// corpo della sezione; i giocatori «Top» sono i 3 con la giocata più probabile della partita
function corpoRosa(D, p, picks) {
  const soglia = impo().soglia, sg = picks.filter((q) => q.pid).sort((a, b) => b.prob - a.prob), rango = new Set(), viste = new Set();
  for (const q of sg) { if (viste.has(q.pid)) continue; viste.add(q.pid); if (rango.size < 3 && q.prob >= 0.74) rango.add(q.pid); }
  const uff = rosaUff[p.id] || null;
  return [p.casa, p.trasf].map((sq) => bloccoSquadra(D, p, sq, picks, uff, rango, soglia)).join("");
}
function rosaPartita(D, p, picks) {
  if (!p.giocatori || !p.giocatori.length) return "";
  return (typeof tabelloneRosa === "function" ? tabelloneRosa(D, p, window.__picksRosa || (D.picks || [])) : "") + `<h2>Formazioni e giocatori</h2><div class="card" style="padding:10px 12px"><div class="ro-leg"><span><i class="ro-sw top"></i> Top: tra i 3 migliori della partita</span><span><i class="ro-sw ok"></i> Giocata consigliata</span><span><i class="ro-sw dub"></i> In dubbio</span></div><div class="cap" style="margin:6px 0 0">Tocca un giocatore per vedere forma, minuti e il motivo delle giocate.</div></div><div id="rosa">${corpoRosa(D, p, picks)}</div>`;
}
// dopo il disegno: se ESPN ha pubblicato i quintetti li prende e ridisegna (restano aperti i giocatori già aperti)
async function rosaUfficiale(D, p, picks) {
  if (!p || p.stato === "post" || !p.giocatori || !p.giocatori.length) return;
  try {
    const q = rosaUff[p.id] || await api("/api/quintetti?id=" + encodeURIComponent(p.id), 45000); rosaUff[p.id] = q;
    const el = document.getElementById("rosa"); if (!el || !q.pubblicato) return;
    const aperti = new Set([...el.querySelectorAll("details.ro[open] .tn")].map((e) => e.firstChild ? e.firstChild.textContent.trim() : ""));
    el.innerHTML = corpoRosa(D, p, picks);
    const tb = document.getElementById("tabrosa"); if (tb && typeof corpoTabellone === "function") tb.innerHTML = corpoTabellone(D, p, picks);
    el.querySelectorAll("details.ro").forEach((d) => { const n = d.querySelector(".tn"); if (n && n.firstChild && aperti.has(n.firstChild.textContent.trim())) d.open = true; });
  } catch {}
}

// grafico delle ultime partite contro la linea della giocata (se la forma è caricata)
function graficoPick(x, q) {
  const k = q.tipo === "Punti" ? "pts" : q.tipo === "Rimbalzi" ? "reb" : q.tipo === "Assist" ? "ast" : null, m = /(over|under) ([\d.]+)/.exec(q.testo || "");
  if (!k || !m || !x.ult || !x.ult[k]) return "";
  return typeof graficoUltime === "function" ? graficoUltime(x.ult[k], +m[2]) : "";
}

// ---- v120: tabellone del quintetto: per ogni titolare (e i 3 panchinari che giocano di più) stima, linea secondo lo stile scelto e linea del bookmaker
const STILI = { rif: ["Può farli?", null, "per ogni giocatore la linea vicina alla sua media (o quella del bookmaker) e un verdetto per questa partita: può superarla oppure no"], pru: ["Prudente", 0.70, "linea alta che si supera 7 volte su 10"], equ: ["Equilibrato", 0.55, "linea che si supera poco più di una volta su due"], amb: ["Ambizioso", 0.45, "linea vicina alla stima: rende di più ma si centra meno"] };
const stileLinee = () => { const v = ls.get("stileLinee", "rif"); return STILI[v] ? v : "rif"; };
const NOMI_K = { pts: ["PT", "punti", "Punti"], reb: ["RB", "rimbalzi", "Rimbalzi"], ast: ["AS", "assist", "Assist"] };
const virg = (n) => vir(n);
// la linea più alta che il giocatore supera con almeno la probabilità dello stile (0,97 = rischio che non scenda in campo, come nelle giocate)
function lineaStile(o, sogl) {
  const pg = o.pg == null ? 1 : o.pg; let best = null;
  for (const [t, p] of o.lad || []) { const pe = p * pg * 0.97; if (pe >= sogl && (!best || t > best.t)) best = { t, p: pe }; }
  return best;
}
// perché la stima è questa: minuti, forma, difesa avversaria, compagni fuori, bookmaker
function spiegaStima(x) {
  const a = [`gioca circa ${Math.round(x.min)} minuti`];
  if (x.minBase - x.min >= 1.5) a[0] += ` (meno del solito: partita che può finire presto)`;
  const f = statoForma(x); if (f.k !== "nd") a.push(`punti: ${f.t.toLowerCase()} (ultime 5 a ${virg(f.m5)} contro ${virg(x.stagione || x.pts.media)} di media)`);
  if (x.dif && Math.abs(x.dif) >= 1) a.push(x.dif > 0 ? `difesa avversaria permissiva (+${virg(x.dif)}% sui punti)` : `difesa avversaria dura (${virg(x.dif)}% sui punti)`);
  if (x.assenze && x.assenze.length) { const b = x.boost || {}, parti = ["pts", "reb", "ast"].filter((k) => b[k] >= 0.3).map((k) => `+${virg(b[k])} ${NOMI_K[k][1]}`); a.push(`senza ${x.assenze.join(" e ")} ha più spazio${parti.length ? ` (${parti.join(", ")})` : ""}`); }
  if (x.inf === "dubbio") a.push("è in dubbio: le probabilità tengono conto che potrebbe non giocare");
  const mk = ["pts", "reb", "ast"].filter((k) => x[k] && x[k].mk).map((k) => `${NOMI_K[k][1]} ${x[k].mk.linea} (${Math.round(x[k].mk.pMk * 100)}% over)`);
  if (mk.length) a.push(`il bookmaker segna ${mk.join(", ")}: la stima finale unisce modello e mercato`);
  return a.join("; ").replace(/^./, (c) => c.toUpperCase()) + ".";
}
const lineaMedia = (m) => { let l = Math.floor(m) + 0.5; if (Math.abs(l + 1 - m) < Math.abs(l - m)) l += 1; return l; };
// verdetto per questa partita sulla linea di riferimento: quella del bookmaker se c'è, altrimenti quella vicina alla media stagione
function verdetto(x, k) {
  const o = x[k]; if (!o) return null; const pg = o.pg == null ? 1 : o.pg, L = o.mk ? o.mk.linea : lineaMedia(o.media), p = (o.mk ? o.mk.pFin : 1 - phi((L - o.v) / o.sd)) * pg * 0.97;
  const t = p >= 0.60 ? ["Può farli", GR, "ti-check"] : p >= 0.45 ? ["Al limite", AM, "ti-minus"] : ["Difficile", RD, "ti-x"];
  return { L, p, t: t[0], col: t[1], ico: t[2], d: o.v - o.media, bk: !!o.mk };
}
function cellaRif(x, k) {
  const o = x[k], v = verdetto(x, k); if (!o || !v) return "";
  return `<div class="tb-c"><div class="s">${NOMI_K[k][0]} · ${v.bk ? "book" : "linea"} ${v.L}</div><div class="tb-v">${virg(o.v)}</div><div class="s">media ${virg(o.media)} ${Math.abs(v.d) >= 0.3 ? `<span style="color:${v.d > 0 ? GR : RD}">${v.d > 0 ? "▲" : "▼"} ${virg(Math.abs(v.d))}</span>` : ""}</div><div class="vd" style="color:${v.col};border-color:${v.col}"><i class="ti ${v.ico}"></i> ${v.t} ${Math.round(v.p * 100)}% <button class="tb-add" data-add7="${esc(x.pid || "")}|${k}|${v.L}|${v.p.toFixed(4)}" aria-label="Aggiungi alla schedina">+</button></div></div>`;
}
function cellaStat(x, k, st) {
  if (st === "rif") return cellaRif(x, k);
  const o = x[k]; if (!o) return "";
  const b = lineaStile(o, STILI[st][1]), mk = o.mk ? `<div class="s">book ${o.mk.linea} · <b style="color:${colProb(o.mk.pFin)}">${Math.round(o.mk.pFin * 100)}%</b></div>` : "";
  return `<div class="tb-c"><div class="s">${NOMI_K[k][0]}</div><div class="tb-v">${virg(o.v)}</div>${b ? `<div class="tb-l">over <b>${b.t}</b> <span style="color:${colProb(b.p)}">${Math.round(b.p * 100)}%</span> <button class="tb-add" data-add7="${esc(x.pid || "")}|${k}|${b.t}|${b.p.toFixed(4)}" aria-label="Aggiungi alla schedina">+</button></div>` : `<div class="s">nessuna linea</div>`}${mk}</div>`;
}
function cardTabellone(x, ruolo, picks) {
  const f = statoForma(x), n = picks.filter((q) => q.pid && q.pid === x.pid).length;
  return `<div class="tb ${x.inf === "dubbio" ? "ro-dub" : ""}"><div class="lg">${foto(x.pid, 38)}<div style="min-width:0;flex:1"><div class="tn">${esc(x.nome)}${x.inf === "dubbio" ? ` <span style="color:${AM}">⚠</span>` : ""}</div><div class="s"><span class="pill ro-tg" style="margin:0 6px 0 0">${ruolo}</span><span style="color:${f.col}"><i class="ti ${f.ico}"></i> ${f.t}</span> · ${Math.round(x.min)} min</div></div></div><div class="tb-g">${["pts", "reb", "ast"].map((k) => cellaStat(x, k, stileLinee())).join("")}</div>${rigaDD(x)}<div class="cap" style="margin:6px 0 0">${esc(spiegaStima(x))}</div></div>`;
}
// probabilità di doppia e tripla doppia (solo informativo): P(stat >= 10) per punti, rimbalzi, assist, tenendo conto che potrebbe non giocare
function rigaDD(x) {
  const o = ["pts", "reb", "ast"].map((k) => x[k]); if (o.some((q) => !q || !(q.sd > 0))) return "";
  const pg = o[0].pg == null ? 1 : o[0].pg, p = o.map((q) => Math.min(0.995, Math.max(0.001, 1 - phi((9.5 - q.v) / q.sd))));
  const [a, b, c] = p, dd = (a * b + a * c + b * c - 2 * a * b * c) * pg * 0.97, td = a * b * c * pg * 0.97, dd2 = Math.max(dd, td);
  if (dd2 < 0.12) return "";
  const col = (v) => v >= 0.5 ? GR : v >= 0.25 ? AM : "var(--mu,#8a93a6)";
  return `<div class="s" style="margin-top:6px">Doppia doppia <b style="color:${col(dd2)}">${Math.round(dd2 * 100)}%</b>${td >= 0.05 ? ` · tripla doppia <b style="color:${col(td)}">${Math.round(td * 100)}%</b>` : ""}</div>`;
}
function corpoTabellone(D, p, picks) {
  const uff = rosaUff[p.id], st = stileLinee();
  return [p.casa, p.trasf].map((sq) => {
    const lista = p.giocatori.filter((x) => x.sq === sq); let tit = uff && uff.pubblicato ? lista.filter((x) => x.pid && uff.titolari[x.pid]) : []; const ufficiale = tit.length > 0; if (!tit.length) tit = titolariStimati(lista);
    const inT = new Set(tit.map((x) => x.pid || x.nome)), panca = lista.filter((x) => !inT.has(x.pid || x.nome)).sort((a, b) => b.min - a.min).slice(0, 3);
    return `<div class="sub" style="display:flex;align-items:center;gap:8px">${logo(sq, 22)}${esc(T(D, sq).n)} <span class="s">${ufficiale ? "quintetto ufficiale" : "quintetto probabile"}</span></div>` + tit.map((x) => cardTabellone(x, "T", picks)).join("") + (panca.length ? `<div class="s" style="margin:10px 0 4px">Dalla panchina, i più utilizzati</div>` + panca.map((x) => cardTabellone(x, "P", picks)).join("") : "");
  }).join("");
}
const descrStile = () => { const st = stileLinee(); return `<b>${STILI[st][0]}</b>: ${STILI[st][2]}. La <b>stima</b> è quanto l'app si aspetta che faccia in questa partita.${st === "rif" ? " Sotto c'è la sua media stagionale, con la freccia che dice di quanto la partita lo spinge sopra o sotto." : " La linea è quella che l'app propone di giocare."} Le giocate consigliate restano prudenti (70%), per questo possono sembrare basse rispetto alla stima.`; };
function tabelloneRosa(D, p, picks) {
  if (!p.giocatori || !p.giocatori.length) return "";
  const st = stileLinee();
  return `<h2>Previsioni del quintetto</h2><div class="card" style="padding:10px 12px"><div class="s" style="margin-bottom:6px">Che linea vuoi vedere per ogni giocatore?</div><div class="tabs">${Object.entries(STILI).map(([k, v]) => `<button class="chipbtn${st === k ? " on" : ""}" data-stile7="${k}">${v[0]}</button>`).join("")}</div><div class="cap" style="margin:6px 0 0">Tocca un giocatore per forma, minuti e motivi.</div><details style="margin-top:6px"><summary class="s">Come leggere le previsioni</summary><div class="cap" style="margin:6px 0 0">${descrStile()}</div></details></div><div id="tabrosa">${corpoTabellone(D, p, picks)}</div>`;
}
document.addEventListener("click", (e) => {
  const s = e.target.closest && e.target.closest("[data-stile7]"); if (s) { ls.set("stileLinee", s.dataset.stile7); const D = window.__D, id = (location.hash.match(/partita\/([^/?]+)/) || [])[1], p = D && D.partite.find((x) => String(x.id) === id); if (p) { const picks = D.picks || [], cont = document.getElementById("tabrosa"); if (cont) { cont.parentElement.querySelectorAll("[data-stile7]").forEach((b) => b.classList.toggle("on", b.dataset.stile7 === s.dataset.stile7)); cont.innerHTML = corpoTabellone(D, p, picks); const cap = cont.previousElementSibling; if (cap) { const c = cap.querySelector(".cap"); if (c) c.innerHTML = descrStile(); } } } return; }
  const b = e.target.closest && e.target.closest("[data-add7]"); if (!b) return;
  const [pid, k, t, pr] = b.dataset.add7.split("|"), D = window.__D, id = (location.hash.match(/partita\/([^/?]+)/) || [])[1], g = D && D.partite.find((x) => String(x.id) === id); if (!g) return;
  const leg = probCustom(g, { g: g.id, k, dir: "over", pid, sq: null, soglia: +t }); if (!leg) return; leg.prob = +pr;
  const L = miaLeggi(); if (!L.some((l) => l.pid === leg.pid && l.k === leg.k && l.soglia === leg.soglia)) { L.push(leg); ls.set("mia", L); barraMia(); }
  b.textContent = "✓"; b.classList.add("on");
});
;
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
;
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
;
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
  h = h.replace('<div class="lvrows">', `<div class="lvets">${et}${mie}</div><div class="lvrows">`); // il contenitore c'è sempre: la struttura non cambia e le immagini non si ricaricano
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
;
// NBA Schedine - idee11.js: quote del tuo sito, statistiche combo, riepilogo serata, cronaca azione per azione nella Live
"use strict";

// ---- 1. quanto le quote del tuo sito si discostano dalla stima dell'app (rapporto mediano sulle schedine che hai salvato con la quota vera)
function fattoreQuota() {
  const v = [];
  for (const r of ls.get("registro", [])) {
    if (!(r.quota > 1) || !r.legs || !r.legs.length || r.legs.some((l) => !(l.prob > 0))) continue;
    const est = r.legs.reduce((a, l) => a / l.prob, 1) * 0.9; if (est > 1) v.push(r.quota / est);
  }
  if (v.length < 3) return { f: 1, n: v.length };
  v.sort((a, b) => a - b); const m = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
  return { f: Math.max(0.6, Math.min(1.6, m)), n: v.length };
}

// ---- 2. statistiche delle combo (squadra vince + giocatore) e delle quote, in fondo alle Statistiche
const _vistaStat0 = vistaStatistiche;
vistaStatistiche = function () {
  _vistaStat0();
  const reg = ls.get("registro", []).filter((r) => r.esito === 0 || r.esito === 1), fq = fattoreQuota();
  const combo = reg.filter((r) => (r.legs || []).some((l) => l.k === "win" && r.legs.some((m) => m !== l && m.g === l.g && ["pts", "reb", "ast"].includes(m.k))));
  let h = "";
  if (combo.length) {
    const ok = combo.filter((r) => r.esito === 1).length, prev = combo.reduce((a, r) => a + (r.legs.reduce((p, l) => p * (l.prob || 1), 1)), 0) / combo.length, saldo = combo.reduce((a, r) => a + (r.esito === 1 ? (r.puntata || 0) * ((r.quota || 1) - 1) : -(r.puntata || 0)), 0);
    h += `<h2>Le tue combo</h2><div class="card"><div class="riga rg"><span>Squadra vince + giocatore (${combo.length})</span><b>${ok} su ${combo.length}</b></div><div class="riga rg"><span class="s">Previsto dall'app</span><b>${pct(prev)}</b></div><div class="riga rg"><span class="s">Centrate davvero</span><b style="color:${ok / combo.length >= prev ? GR : RD}">${pct(ok / combo.length)}</b></div><div class="riga rg"><span class="s">Saldo</span><b style="color:${saldo >= 0 ? GR : RD}">${saldo >= 0 ? "+" : ""}${saldo.toFixed(2)} €</b></div></div>`;
  }
  if (fq.n >= 3) h += `<h2>Le quote del tuo sito</h2><div class="card"><div class="cap" style="margin:0">Su ${fq.n} schedine con la quota scritta, il tuo sito paga in media <b>${Math.round(fq.f * 100)}%</b> della quota stimata dall'app. ${Math.abs(fq.f - 1) < 0.05 ? "La stima è in linea." : fq.f < 1 ? "Il tuo sito paga meno della stima." : "Il tuo sito paga più della stima."} Nelle combo la quota stimata viene corretta con questo rapporto.</div></div>`;
  else h += `<div class="cap">Per tarare le quote sul tuo sito scrivi la quota vera nelle schedine che salvi: dopo 3 schedine l'app confronta la sua stima con la tua.</div>`;
  if (h) APP.insertAdjacentHTML("beforeend", h);
};

// ---- 3. riepilogo della serata (rotta #/serata)
let giornoSerata = 0;
function vistaSerata() {
  const back = `<a class="back" href="#/esiti"><i class="ti ti-chevron-left"></i>Esiti</a>`;
  const d = new Date(Date.now() - giornoSerata * 86400000), iso = d.toISOString().slice(0, 10);
  const R = ls.get("registro", []).filter((r) => String(r.data || "").slice(0, 10) === iso);
  const chiuse = R.filter((r) => r.esito === 0 || r.esito === 1), aperte = R.filter((r) => r.esito == null);
  const vinte = chiuse.filter((r) => r.esito === 1), saldo = chiuse.reduce((a, r) => a + (r.esito === 1 ? (r.puntata || 0) * ((r.quota || 1) - 1) : -(r.puntata || 0)), 0);
  let ok = 0, no = 0, ann = 0; const perse = [];
  for (const r of R) (r.legs || []).forEach((l, i) => { const e = (r.es || [])[i]; if (!e) return; if (e.esito === 1) ok++; else if (e.esito === 0) { no++; perse.push({ l, r }); } else if (e.esito === 2) ann++; });
  const chips = `<div class="tabs"><button class="chipbtn${giornoSerata === 0 ? " on" : ""}" data-gs="0">Oggi</button><button class="chipbtn${giornoSerata === 1 ? " on" : ""}" data-gs="1">Ieri</button><button class="chipbtn${giornoSerata === 2 ? " on" : ""}" data-gs="2">L'altro ieri</button></div>`;
  let h = back + `<h2>Riepilogo della serata</h2>` + chips;
  if (!R.length) h += `<div class="vuoto">Nessuna schedina salvata in questo giorno.</div>`;
  else {
    const frase = !chiuse.length ? "Le tue schedine non sono ancora chiuse." : saldo > 0 ? `Serata in positivo: ${vinte.length} schedine su ${chiuse.length} vinte, saldo +${saldo.toFixed(2)} €.` : saldo < 0 ? `Serata difficile: ${vinte.length} schedine su ${chiuse.length} vinte, saldo ${saldo.toFixed(2)} €.` : `Serata in pareggio: ${vinte.length} su ${chiuse.length} vinte.`;
    h += `<div class="card"><div style="font-size:16px;font-weight:600">${esc(frase)}</div>${aperte.length ? `<div class="s" style="margin-top:4px">${aperte.length} ancora aperte.</div>` : ""}</div>`;
    if (ok + no) h += `<div class="card"><div class="riga rg"><span>Giocate centrate</span><b style="color:${GR}">${ok}</b></div><div class="riga rg"><span>Giocate sbagliate</span><b style="color:${RD}">${no}</b></div>${ann ? `<div class="riga rg"><span>Annullate</span><b>${ann}</b></div>` : ""}<div class="riga rg"><span class="s">Percentuale</span><b>${pct(ok / (ok + no))}</b></div></div>`;
    if (perse.length) h += `<h2>Cosa ha sbagliato</h2><div class="card">` + perse.slice(0, 8).map(({ l }) => `<div class="riga rg"><span>${esc(l.testo)}</span><b style="color:${RD}">${l.prob ? pct(l.prob) : ""}</b></div>`).join("") + `</div><div class="cap">La percentuale è quella che l'app dava alla giocata prima della partita.</div>`;
    h += R.map((r) => `<div class="card riga"><div style="min-width:0"><b>${esc(r.nome)}</b><div class="s">${(r.legs || []).length} giocate · quota ${r.quota} · ${r.puntata} €</div></div><b style="color:${r.esito === 1 ? GR : r.esito === 0 ? RD : MU}">${r.esito === 1 ? "Vinta" : r.esito === 0 ? "Persa" : "Aperta"}</b></div>`).join("");
  }
  h += `<a class="btn" style="display:block;text-align:center" href="#/esiti">Come è andato il modello stasera</a>`;
  APP.innerHTML = h;
  APP.querySelectorAll("[data-gs]").forEach((b) => b.onclick = () => { giornoSerata = +b.dataset.gs; vistaSerata(); });
}
window.RIDEE.push([/^\/serata/, vistaSerata]);

// ---- 4. cronaca azione per azione (da ESPN) dentro la scheda aperta della partita
const azioniLive = {};
const TRAD_AZ = [[/makes (\d+)-foot three point (jumper|shot)/i, "segna da 3 ($1 piedi)"], [/makes three point/i, "segna da 3"], [/misses three point/i, "sbaglia da 3"], [/makes free throw/i, "segna un tiro libero"], [/misses free throw/i, "sbaglia un tiro libero"], [/makes (.*?)(dunk|layup)/i, "segna ($2)"], [/misses/i, "sbaglia"], [/makes/i, "segna"], [/defensive rebound/i, "rimbalzo difensivo"], [/offensive rebound/i, "rimbalzo offensivo"], [/turnover/i, "palla persa"], [/steals?/i, "palla rubata"], [/blocks?/i, "stoppata"], [/assists/i, "assist"], [/shooting foul/i, "fallo in tiro"], [/personal foul|foul/i, "fallo"], [/enters the game for/i, "entra al posto di"], [/timeout/i, "timeout"]];
function trAz(t) {
  let s = String(t); for (const [re, r] of TRAD_AZ) s = s.replace(re, r); return s;
}
function htmlAzioni(A) {
  if (!A || !A.length) return `<div class="s" style="padding:8px 0">La cronaca azione per azione non è disponibile da ESPN per questa partita.</div>`;
  return A.slice(0, 12).map((q, i) => `<div class="riga rg" style="${i ? "" : "border-top:0"};gap:8px;justify-content:flex-start;align-items:flex-start"><span class="s" style="min-width:58px">${q.per ? "Q" + q.per : ""} ${esc(q.ck)}</span><span style="flex:1;${q.p ? "font-weight:600" : ""}">${esc(trAz(q.t))}</span>${q.p && q.c != null ? `<b style="color:${OR};white-space:nowrap">${q.c}-${q.o}</b>` : ""}</div>`).join("");
}
const _cronacaHtml0 = cronacaHtml;
cronacaHtml = function (id) { return _cronacaHtml0(id) + `<div class="sub">Ultime azioni</div><div class="card" style="padding:4px 12px" id="az${id}">${azioniLive[id] || `<div class="s" style="padding:8px 0">Caricamento…</div>`}</div>`; };
let _azBusy = false;
setInterval(async () => {
  if (_azBusy || document.hidden || !location.hash.startsWith("#/live")) return; _azBusy = true;
  try {
    for (const el of document.querySelectorAll(".lvdet:not([hidden])")) {
      const id = String(el.id).replace("lvd", ""); if (!/^\d+$/.test(id)) continue;
      try { const r = await api("/api/cronaca?id=" + id, 4000); azioniLive[id] = htmlAzioni(r.azioni); } catch { continue; }
      const t = document.getElementById("az" + id); if (t) t.innerHTML = azioniLive[id];
    }
  } finally { _azBusy = false; }
}, 9000);
;
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
  const sq = squadreCitate(D, q);
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
;
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
;
// NBA Schedine - idee14.js: scheda giocatore dettagliata (25 partite, casa/trasferta, contro l'avversario di oggi, riposo, percentuale sopra la linea), confronto tra squadre
"use strict";

const _vistaGiocatore0 = vistaGiocatore;
vistaGiocatore = async function (pid) { try { window.__D = await dati(false); } catch {} return _vistaGiocatore0(pid); };

const media14 = (a) => { const v = a.filter((x) => x != null); return v.length ? v.reduce((p, q) => p + q, 0) / v.length : null; };
const f1 = (x) => (x == null ? "–" : (Math.round(x * 10) / 10).toString().replace(".", ","));
const giorniTra = (a, b) => Math.round((new Date(a) - new Date(b)) / 86400000);

function partitaDiOggi(S) {
  const D = window.__D; if (!D) return null;
  for (const p of D.partite) if ((p.giocatori || []).some((g) => String(g.pid) === String(S.pid))) return { p, avv: (S.sq || "") === p.casa ? p.trasf : p.casa, casa: S.sq === p.casa };
  return null;
}

function dettaglioLog(S) {
  const L = (S && S.log) || []; if (L.length < 5) return "";
  const oggi = partitaDiOggi(S);
  // riposo: giorni dalla partita precedente (le righe sono dalla più recente)
  L.forEach((r, i) => { r.rip = L[i + 1] ? giorniTra(r.d, L[i + 1].d) : null; });
  const K = [["pt", "Punti", "PT"], ["rb", "Rimbalzi", "RB"], ["as", "Assist", "AS"]];
  const gruppi = [["Ultime 5", L.slice(0, 5)], ["Ultime 10", L.slice(0, 10)], [`Ultime ${L.length}`, L], ["In casa", L.filter((r) => !r.f)], ["In trasferta", L.filter((r) => r.f)], ["Dopo riposo (2+ giorni)", L.filter((r) => r.rip != null && r.rip >= 2)], ["Back-to-back", L.filter((r) => r.rip === 1)]];
  if (oggi) gruppi.push([`Contro ${oggi.avv}`, L.filter((r) => String(r.a).toUpperCase() === String(oggi.avv).toUpperCase())]);
  const tab = gruppi.filter((g) => g[1].length).map(([n, r]) => `<div class="riga rg" style="gap:6px"><span style="flex:1.6;min-width:0">${esc(n)} <span class="s">(${r.length})</span></span>${K.map(([k]) => `<b style="width:42px;text-align:right">${f1(media14(r.map((x) => x[k])))}</b>`).join("")}<b style="width:42px;text-align:right">${f1(media14(r.map((x) => x.mn)))}</b></div>`).join("");
  const testa = `<div class="riga s" style="gap:6px;padding:2px 0"><span style="flex:1.6"></span>${K.map(([, , t]) => `<span style="width:42px;text-align:right">${t}</span>`).join("")}<span style="width:42px;text-align:right">MIN</span></div>`;
  // quante volte ha superato le linee più vicine alla sua media
  const hit = K.map(([k, nome]) => {
    const m = media14(L.slice(0, 10).map((x) => x[k])); if (m == null) return "";
    const passo = k === "pt" ? 2 : 1, base = Math.round(m / passo) * passo, linee = [base - passo, base, base + passo].filter((v) => v > 0).map((v) => v + 0.5);
    return `<div class="s" style="margin-top:8px">${nome}: superate nelle ultime partite</div>` + linee.map((ln) => { const n5 = L.slice(0, 5).filter((x) => x[k] > ln).length, n10 = L.slice(0, 10).filter((x) => x[k] > ln).length, nT = L.filter((x) => x[k] > ln).length, c = (n, t) => (n / t >= 0.7 ? GR : n / t >= 0.5 ? AM : MU); return `<div class="riga rg"><span>over ${ln}</span><span><b style="color:${c(n5, Math.min(5, L.length))}">${n5}/${Math.min(5, L.length)}</b> <span class="s">·</span> <b style="color:${c(n10, Math.min(10, L.length))}">${n10}/${Math.min(10, L.length)}</b> <span class="s">·</span> <b style="color:${c(nT, L.length)}">${nT}/${L.length}</b></span></div>`; }).join("");
  }).join("");
  const mins = L.slice().reverse().map((x) => x.mn);
  const dt = (d) => d.slice(8, 10) + "/" + d.slice(5, 7);
  const righe = L.slice(0, 10).map((r) => { const ris = String(r.r || "").toUpperCase(); return `<div class="riga rg" style="gap:6px"><span style="flex:1.6;min-width:0" class="s">${dt(r.d)} ${r.f ? "@" : "vs"} ${esc(r.a)} <b style="color:${ris === "W" ? GR : ris === "L" ? RD : MU}">${esc(ris)}</b></span><b style="width:42px;text-align:right">${f1(r.pt)}</b><b style="width:42px;text-align:right">${f1(r.rb)}</b><b style="width:42px;text-align:right">${f1(r.as)}</b><span style="width:42px;text-align:right" class="s">${f1(r.mn)}</span></div>`; }).join("");
  const tiri = (() => { const fg = L.filter((x) => x.fga > 0), tp = L.filter((x) => x.tpa > 0); if (!fg.length) return ""; const s = (a, b) => (a.reduce((p, x) => p + x[b[0]], 0) / Math.max(1, a.reduce((p, x) => p + x[b[1]], 0))); return `<div class="riga rg"><span>Tiri dal campo</span><b>${Math.round(s(fg, ["fg", "fga"]) * 100)}% <span class="s">(${f1(media14(fg.map((x) => x.fga)))} a partita)</span></b></div>${tp.length ? `<div class="riga rg"><span>Da 3 punti</span><b>${Math.round(s(tp, ["tp", "tpa"]) * 100)}% <span class="s">(${f1(media14(tp.map((x) => x.tp)))} segnati, ${f1(media14(tp.map((x) => x.tpa)))} tentati)</span></b></div>` : ""}`; })();
  return `<h2>Dettaglio dalle ultime ${L.length} partite</h2><div class="card" style="padding:6px 12px"><div class="s" style="margin:4px 0">Medie in situazioni diverse</div>${testa}${tab}</div>
  <div class="card" style="padding:6px 12px"><div class="cap" style="margin:4px 0">Quante volte ha superato queste linee: ultime 5 · ultime 10 · tutte (${L.length})</div>${hit}</div>
  <div class="card" style="padding:6px 12px"><div class="s" style="margin:4px 0">Partita per partita</div>${testa}${righe}<div style="margin-top:6px"><div class="s">Minuti giocati (dalla più vecchia)</div>${typeof spark === "function" ? spark(mins, null, MU) : ""}</div></div>${tiri ? `<div class="card" style="padding:6px 12px"><div class="s" style="margin:4px 0">Tiro</div>${tiri}</div>` : ""}`;
}
const _ultime5_0 = ultime5;
ultime5 = function (S) { let h = _ultime5_0(S); try { h += dettaglioLog(S); } catch (e) { console.warn("dettaglioLog", e); } return h; };

// ---- confronto tra le squadre nello studio partita (dalle ultime 15 partite di ciascuna)
function statSquadra(sig, U, oggi) {
  const u = (U || []).slice(0, 15); if (u.length < 3) return null;
  const m = (a, f) => (a.length ? a.reduce((x, y) => x + f(y), 0) / a.length : null), l10 = u.slice(0, 10), l5 = u.slice(0, 5);
  let serie = 0; const prima = u[0] && u[0].vinta; for (const x of u) { if (x.vinta === prima) serie++; else break; }
  const rip = u[0] && u[0].data ? giorniTra(oggi, u[0].data) : null;
  return { sig, n10: l10.length, v10: l10.filter((x) => x.vinta).length, pf10: m(l10, (x) => x.pf), pa10: m(l10, (x) => x.pa), pf5: m(l5, (x) => x.pf), pa5: m(l5, (x) => x.pa), tot10: m(l10, (x) => x.pf + x.pa), casa: u.filter((x) => x.casa), fuori: u.filter((x) => !x.casa), m, serie, prima, rip };
}
async function confrontoSquadre(D, p) {
  const el = document.getElementById("conf14"); if (!el) return;
  const R = await Promise.all([p.casa, p.trasf].map((s) => api("/api/ultime?s=" + s + "&n=15", 600000).then((x) => x.ultime).catch(() => null)));
  const oggi = new Date().toISOString().slice(0, 10), A = statSquadra(p.casa, R[0], oggi), B = statSquadra(p.trasf, R[1], oggi);
  if (!A || !B) { el.innerHTML = `<div class="cap">Confronto non disponibile: mancano le ultime partite.</div>`; return; }
  const dove = (S, casa) => { const g = casa ? S.casa : S.fuori; return g.length >= 3 ? `${g.filter((x) => x.vinta).length}-${g.length - g.filter((x) => x.vinta).length} · ${f1(S.m(g, (x) => x.pf))} a ${f1(S.m(g, (x) => x.pa))}` : "–"; };
  const riga = (t, a, b, evid) => `<div class="riga rg" style="gap:6px"><b style="flex:1;text-align:left;${evid === 1 ? "color:" + GR : ""}">${a}</b><span class="s" style="flex:1.2;text-align:center">${t}</span><b style="flex:1;text-align:right;${evid === 2 ? "color:" + GR : ""}">${b}</b></div>`;
  const piu = (x, y, alto = true) => (x == null || y == null || Math.abs(x - y) < 0.5 ? 0 : (x > y) === alto ? 1 : 2);
  const att = (A.pf10 + B.pa10) / 2, att2 = (B.pf10 + A.pa10) / 2, stimaRec = att + att2, mod = p.r.totale, mk = p.r.mk && p.r.mk.tot ? p.r.mk.tot.linea : null;
  const rA = A.rip, rB = B.rip, lab = (r) => (r == null ? "–" : r <= 1 ? "back-to-back" : r + " giorni");
  el.innerHTML = `<div class="card" style="padding:8px 12px"><div class="riga" style="margin-bottom:6px"><div class="lg">${logo(p.casa, 26)}<b>${esc(T(D, p.casa).b)}</b></div><div class="lg"><b>${esc(T(D, p.trasf).b)}</b>${logo(p.trasf, 26)}</div></div>
  ${riga("Ultime 10", `${A.v10}-${A.n10 - A.v10}`, `${B.v10}-${B.n10 - B.v10}`, piu(A.v10 / A.n10, B.v10 / B.n10) && piu(A.v10 / A.n10, B.v10 / B.n10) * (Math.abs(A.v10 / A.n10 - B.v10 / B.n10) < 0.1 ? 0 : 1))}
  ${riga("Serie", `${A.serie} ${A.prima ? "V" : "S"} di fila`, `${B.serie} ${B.prima ? "V" : "S"} di fila`, 0)}
  ${riga("Punti fatti (10)", f1(A.pf10), f1(B.pf10), piu(A.pf10, B.pf10))}
  ${riga("Punti subiti (10)", f1(A.pa10), f1(B.pa10), piu(A.pa10, B.pa10, false))}
  ${riga("Punti fatti (ultime 5)", f1(A.pf5), f1(B.pf5), piu(A.pf5, B.pf5))}
  ${riga("Punti subiti (ultime 5)", f1(A.pa5), f1(B.pa5), piu(A.pa5, B.pa5, false))}
  ${riga("In casa / in trasferta", dove(A, true), dove(B, false), 0)}
  ${riga("Dall'ultima partita", lab(rA), lab(rB), rA != null && rB != null && rA !== rB ? (rA > rB ? 1 : 2) : 0)}</div>
  <div class="card" style="padding:8px 12px"><div class="s">Punti totali attesi</div><div class="riga rg"><span>Dai dati recenti (attacco di una contro difesa dell'altra)</span><b>${f1(stimaRec)}</b></div><div class="riga rg"><span>Stima del modello</span><b>${f1(mod)}</b></div>${mk ? `<div class="riga rg"><span>Linea del bookmaker</span><b>${mk}</b></div>` : ""}<div class="cap" style="margin:6px 0 0">${Math.abs(stimaRec - mod) >= 6 ? (stimaRec > mod ? "I dati recenti dicono più punti del modello: occhio agli over." : "I dati recenti dicono meno punti del modello: occhio agli under.") : "Dati recenti e modello vanno nella stessa direzione."} Il verde indica chi sta meglio in quella voce.</div></div>`;
}

// ---- #/verifica: dove sbaglia il modello (per fascia di probabilità, tipo, squadra, giocatore, andamento nel tempo)
function gruppiVerifica(R, chiave, minN) {
  const m = new Map();
  for (const r of R) { const k = chiave(r); if (!k) continue; const c = m.get(k) || { k, n: 0, ok: 0, pr: 0 }; c.n++; c.ok += r.esito; c.pr += r.prob; m.set(k, c); }
  return [...m.values()].filter((c) => c.n >= minN).map((c) => ({ ...c, reale: c.ok / c.n, prev: c.pr / c.n, d: c.ok / c.n - c.pr / c.n }));
}
function rigaVer(c, nome) {
  const d = Math.round(c.d * 100), col = Math.abs(d) < 5 ? MU : d > 0 ? GR : RD, w = Math.min(100, Math.abs(d) * 2.5);
  return `<div class="riga rg" style="gap:8px"><div style="min-width:0;flex:1.3"><div style="font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(nome)}</div><div class="s">${c.n} giocate · previsto ${Math.round(c.prev * 100)}% · centrato ${Math.round(c.reale * 100)}%</div></div><div style="flex:1;display:flex;align-items:center;gap:6px"><div style="flex:1;height:6px;background:#232836;border-radius:3px;position:relative"><i style="position:absolute;top:0;height:6px;border-radius:3px;background:${col};${d >= 0 ? "left:50%" : "right:50%"};width:${w / 2}%"></i></div><b style="color:${col};min-width:42px;text-align:right">${d > 0 ? "+" : ""}${d}%</b></div></div>`;
}
function vistaVerifica() {
  APP.innerHTML = topBar() + `<h2>Verifica del modello</h2><div class="skel" style="height:140px"></div>`;
  api("/api/storico", 0).then((S) => {
    const R = (S.righe || []).filter((r) => (r.esito === 0 || r.esito === 1) && r.prob > 0 && r.prob < 1);
    if (R.length < 10) { APP.innerHTML = topBar() + `<h2>Verifica del modello</h2><div class="vuoto">Servono almeno 10 consigli chiusi nello Storico: finora ${R.length}. Appena le partite finiscono, qui vedrai dove il modello sbaglia.</div>`; return; }
    const tot = R.reduce((a, r) => a + r.esito, 0) / R.length, prev = R.reduce((a, r) => a + r.prob, 0) / R.length, brier = R.reduce((a, r) => a + (r.prob - r.esito) ** 2, 0) / R.length;
    const frase = Math.abs(tot - prev) < 0.03 ? "Il modello è ben tarato: prevede quanto poi accade." : tot < prev ? `Il modello è troppo ottimista di circa ${Math.round((prev - tot) * 100)} punti.` : `Il modello è prudente: centra ${Math.round((tot - prev) * 100)} punti più di quanto prevede.`;
    const fasce = [[0, 0.6, "Sotto il 60%"], [0.6, 0.7, "60-70%"], [0.7, 0.8, "70-80%"], [0.8, 0.9, "80-90%"], [0.9, 1.01, "Sopra il 90%"]];
    const perFascia = gruppiVerifica(R, (r) => { const f = fasce.find((x) => r.prob >= x[0] && r.prob < x[1]); return f && f[2]; }, 3).sort((a, b) => fasce.findIndex((x) => x[2] === a.k) - fasce.findIndex((x) => x[2] === b.k));
    const perTipo = gruppiVerifica(R, (r) => r.tipo, 5).sort((a, b) => a.d - b.d);
    const perSq = gruppiVerifica(R, (r) => r.squadra && r.squadra.length <= 4 && /^[A-Z]{2,4}$/.test(r.squadra) ? r.squadra : null, 5).sort((a, b) => a.d - b.d);
    const perGio = gruppiVerifica(R.filter((r) => ["Punti", "Rimbalzi", "Assist"].includes(r.tipo)), (r) => { const m = /^(.+?)\s+(?:\d|oltre|over|under|meno|più)/i.exec(r.testo || ""); return m ? m[1].trim() : null; }, 4).sort((a, b) => a.d - b.d);
    const perOver = gruppiVerifica(R, (r) => /under|meno di/i.test(r.testo || "") ? "Under" : /over|oltre|almeno|\+/i.test(r.testo || "") ? "Over" : null, 5);
    const gg = [...new Set(R.map((r) => r.data))].sort(), sett = gruppiVerifica(R, (r) => { const i = gg.indexOf(r.data); return "Settimana " + (Math.floor((gg.length - 1 - i) / 7) + 1); }, 5);
    const lista = (t, l, nota) => l.length ? `<h2>${t}</h2><div class="card" style="padding:4px 12px">${l.map((c) => rigaVer(c, c.k)).join("")}</div>${nota ? `<div class="cap">${nota}</div>` : ""}` : "";
    const pe = (l, v) => l.filter((c) => (v < 0 ? c.d < -0.08 : c.d > 0.08)).slice(0, 3);
    let h = topBar() + `<h2>Verifica del modello</h2><div class="card"><div style="font-size:16px;font-weight:600">${esc(frase)}</div><div class="s" style="margin-top:4px">${R.length} consigli chiusi · centrati ${Math.round(tot * 100)}% · previsti ${Math.round(prev * 100)}% · errore di Brier ${brier.toFixed(3)} (più basso è meglio, 0,25 equivale a tirare a indovinare)</div></div>`;
    const guai = [...pe(perTipo, -1).map((c) => "tipo " + c.k), ...pe(perSq, -1).map((c) => "squadra " + c.k), ...pe(perGio, -1).map((c) => c.k)];
    const bene = [...pe(perTipo, 1).map((c) => "tipo " + c.k), ...pe(perSq, 1).map((c) => "squadra " + c.k), ...pe(perGio, 1).map((c) => c.k)];
    if (guai.length) h += `<div class="card"><div class="s">Dove è troppo ottimista</div><div>${guai.map(esc).join(", ")}</div></div>`;
    if (bene.length) h += `<div class="card"><div class="s">Dove è troppo prudente</div><div>${bene.map(esc).join(", ")}</div></div>`;
    h += lista("Per fascia di probabilità", perFascia, "Barra verde = centra più del previsto, rossa = meno. In una fascia ben tarata la barra è quasi vuota.");
    h += lista("Per tipo di giocata", perTipo) + lista("Over contro Under", perOver) + lista("Per squadra", perSq) + lista("Per giocatore", perGio, "Solo giocatori con almeno 4 giocate chiuse. La taratura per giocatore corregge già queste differenze nelle prossime proposte.") + lista("Nel tempo", sett.sort((a, b) => parseInt(a.k.split(" ")[1]) - parseInt(b.k.split(" ")[1])));
    h += `<div class="cap">Il campione cresce con lo Storico: con poche giocate le differenze piccole sono rumore, non un difetto del modello.</div>`;
    APP.innerHTML = h;
  }).catch((e) => { APP.innerHTML = topBar() + errBox(e); });
}
window.RIDEE.push([/^\/verifica/, vistaVerifica]);

// ---- come si è mossa la linea del bookmaker (totale e spread) dalla prima lettura del server
async function storiaLinee(p) {
  const el = document.getElementById("lin14"); if (!el) return;
  let R; try { R = await api(`/api/linee?c=${p.casa}&t=${p.trasf}`, 120000); } catch { return; }
  const s = R.storia || []; if (!R.attivo || s.length < 2) { el.innerHTML = R.attivo ? `<div class="cap">Linee del bookmaker: per ora una sola lettura, il movimento comparirà alle prossime.</div>` : ""; return; }
  const a = s[0], z = s[s.length - 1], d = (x, y) => (x == null || y == null ? null : y - x), dt = d(a.tot, z.tot), ds = d(a.sp, z.sp);
  const col = (v, soglia) => (v == null || Math.abs(v) < soglia ? MU : OR), fm = (v) => (v == null ? "–" : (v > 0 ? "+" : "") + v.toFixed(1).replace(".", ","));
  const ora = (t) => new Date(t).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
  el.innerHTML = `<div class="card"><div class="s">Come si è mossa la linea</div><div class="riga rg"><span>Totale</span><span><b>${a.tot ?? "–"} → ${z.tot ?? "–"}</b> <b style="color:${col(dt, 2)}">${fm(dt)}</b></span></div><div class="riga rg"><span>Spread (casa)</span><span><b>${a.sp ?? "–"} → ${z.sp ?? "–"}</b> <b style="color:${col(ds, 2)}">${fm(ds)}</b></span></div><div class="s" style="margin-top:6px">${s.map((x) => `${ora(x.t)}: ${x.tot ?? "–"} / ${x.sp ?? "–"}`).join(" · ")}</div>${Math.abs(dt || 0) >= 3 ? `<div class="cap" style="margin:6px 0 0">${dt > 0 ? "Il mercato prevede più punti di prima: gli over valgono di più, gli under meno." : "Il mercato prevede meno punti di prima: gli under valgono di più, gli over meno."}</div>` : ""}</div>`;
}

// ---- arbitri designati per la partita (official.nba.com, di solito pubblicati in giornata)
async function arbitriPartita(p) {
  const el = document.getElementById("arb14"); if (!el) return;
  let R; try { R = await api("/api/arbitri", 600000); } catch { return; }
  const x = (R.partite || []).find((q) => q.casa === p.casa && q.trasf === p.trasf); if (!x) return;
  el.innerHTML = `<div class="card"><div class="s">Arbitri designati${R.data ? " · " + esc(R.data) : ""}</div><div class="riga rg"><span>Capo arbitro</span><b>${esc(x.capo)}</b></div><div class="riga rg"><span>Arbitro</span><b>${esc(x.arbitro)}</b></div><div class="riga rg"><span>Secondo arbitro</span><b>${esc(x.secondo)}</b></div>${x.riserva ? `<div class="riga rg"><span>Riserva</span><b>${esc(x.riserva)}</b></div>` : ""}<div class="cap" style="margin:6px 0 0">Informativo: l'app non ha ancora lo storico dei fischi di ogni arbitro, quindi non cambia le stime.</div></div>`;
}

// ---- quintetto stimato dai titolari dell'ultima partita: carica i dati e ridisegna le formazioni
function ridisegnaRosa(D, p, picks) {
  const el = document.getElementById("rosa"); if (!el) return;
  const aperti = new Set([...el.querySelectorAll("details.ro[open] .tn")].map((e) => (e.firstChild ? e.firstChild.textContent.trim() : "")));
  el.innerHTML = corpoRosa(D, p, picks);
  const tb = document.getElementById("tabrosa"); if (tb && typeof corpoTabellone === "function") tb.innerHTML = corpoTabellone(D, p, picks);
  el.querySelectorAll("details.ro").forEach((d) => { const n = d.querySelector(".tn"); if (n && n.firstChild && aperti.has(n.firstChild.textContent.trim())) d.open = true; });
}
const _rosaUfficiale14 = rosaUfficiale;
rosaUfficiale = async function (D, p, picks) {
  try {
    if (p && p.stato === "pre" && p.giocatori && p.giocatori.length) {
      window.__ultimiTit = window.__ultimiTit || {}; let nuovo = false;
      await Promise.all([p.casa, p.trasf].map(async (sq) => { if (window.__ultimiTit[sq]) return; const r = await api("/api/titolari-ultimi?s=" + sq, 3600000).catch(() => null); if (r && r.titolari && r.titolari.length >= 3) { window.__ultimiTit[sq] = new Set(r.titolari.map(String)); nuovo = true; } }));
      if (nuovo) ridisegnaRosa(D, p, picks);
    }
  } catch (e) { console.warn("ultimiTit", e); }
  return _rosaUfficiale14(D, p, picks);
};
;
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
  let sel = window.__sel15; if (sel !== "tutte" && !partite.some((p) => p.id === sel)) sel = (prossima || partite[0] || {}).id;
  let h = topBar(D) + giorniChips() + toggle15();
  if (!partite.length) h += `<div class="vuoto">Nessuna partita per questo giorno.</div>`;
  else {
    h += `<div class="idx15"><button class="idc${sel === "tutte" ? " on" : ""}" data-j="tutte"><b>Tutte</b><span class="s">${partite.length} partite</span></button>${partite.map((p) => { const mig = D.picks.filter((x) => x.g === p.id).sort((a, b) => b.prob - a.prob)[0], st = p.stato === "in" ? `<span style="color:${GR}">● Live ${esc(p.dettaglio || "")}</span>` : p.stato === "post" ? "Finale" : esc(String(p.ora).slice(-5)); return `<button class="idc${sel === p.id ? " on" : ""}${p.stato === "post" ? " fin" : ""}" data-j="${esc(p.id)}"><b>${esc(p.casa)}-${esc(p.trasf)}</b><span class="s">${st}</span></button>`; }).join("")}</div>`;
    h += `<div class="ico15">${SC.map(([t, ic, tipi], i) => { const n = D.picks.filter((x) => tipi.includes(x.tipo)).length; return n ? `<a href="#/categoria/${i}"><span class="ci"><i class="ti ${ic}"></i><em>${n}</em></span><span class="s">${esc(t.replace("Punti giocatori", "Punti").replace("Totali partita", "Totali").replace("Punti squadre", "Squadre").replace("Vincente", "Chi vince"))}</span></a>` : ""; }).join("")}</div>`;
    for (const p of partite) {
      const L = D.picks.filter((x) => x.g === p.id), top = [...L].sort((a, b) => b.prob - a.prob)[0];
      h += `<section id="p15-${esc(p.id)}" class="p15"${sel !== "tutte" && sel !== p.id ? " hidden" : ""} style="${p.stato === "post" ? "opacity:.8" : ""}">${intestazione15(D, p)}`;
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
  APP.querySelectorAll("[data-j]").forEach((b) => (b.onclick = () => { // tocca una partita: si apre solo quella; «Tutte» le mostra tutte
    const j = b.dataset.j; window.__sel15 = j;
    APP.querySelectorAll(".idc").forEach((x) => x.classList.toggle("on", x === b));
    APP.querySelectorAll(".p15").forEach((s) => { s.hidden = j !== "tutte" && s.id !== "p15-" + j; });
    const e = j === "tutte" ? null : document.getElementById("p15-" + j); const ix = APP.querySelector(".idx15"); (e || ix || APP).scrollIntoView({ behavior: "smooth", block: "start" }); b.scrollIntoView({ inline: "center", block: "nearest" });
  }));
  APP.querySelectorAll(".r15 summary").forEach((sm) => sm.addEventListener("click", (ev) => { if (ev.target.closest("[data-add]")) ev.preventDefault(); }));
};
function toggle15() { const v = ls.get("pronVista", "partita"); return `<div class="tabs" id="tg15" style="margin:8px 0"><button class="chipbtn${v === "partita" ? " on" : ""}" data-pv="partita">Per partita</button><button class="chipbtn${v === "tipo" ? " on" : ""}" data-pv="tipo">Per tipo</button></div>`; }
function aggiungiToggle15() {
  if (!document.getElementById("tg15")) { const c = APP.querySelector(".cap"); const d = document.createElement("div"); d.innerHTML = toggle15(); if (c) c.before(d.firstChild); else APP.appendChild(d.firstChild); }
  APP.querySelectorAll("[data-pv]").forEach((b) => (b.onclick = () => { ls.set("pronVista", b.dataset.pv); route(); }));
}
;

;
// ---- v145: Esplora a gruppi (#/esplora)
const GRUPPI_ESPL = [
  ["Oggi", [["#/stasera", "ti-moon", "Stasera", "Le partite della serata"], ["#/seguiti", "ti-star", "Seguiti", "Giocatori e squadre con la ☆"], ["#/infortunati", "ti-bandage", "Infortunati", "Chi è fuori o in dubbio"], ["#/forma", "ti-trending-up", "Forma", "Ultime 5 contro la media"], ["#/news", "ti-news", "Notizie", "In italiano"]]],
  ["Capire il modello", [["#/valore", "ti-radar", "Valore", "Stima contro quota del bookmaker"], ["#/chiedi", "ti-message-question", "Chiedi all'app", "Domande sulla serata"], ["#/verifica", "ti-clipboard-check", "Verifica", "Dove il modello sbaglia"], ["#/combopartita", "ti-flame", "Combo di partita", "Favorita + giocatore chiave"], ["#/auto", "ti-sparkles", "Schedina automatica", "Scegli la quota"]]],
  ["Lega NBA", [["#/classifica", "ti-list-numbers", "Classifica", "Est e Ovest"], ["#/calendario", "ti-calendar", "Calendario", "Prossime partite"], ["#/cerca", "ti-search", "Cerca giocatori", "Schede e ultime partite"], ["#/premi", "ti-trophy", "Corsa ai premi", "I più produttivi"], ["#/ideale", "ti-star", "Squadra ideale", "I cinque della notte"], ["#/playoff", "ti-tournament", "Playoff", "Primo turno"], ["#/mercato", "ti-arrows-exchange", "Mercato", "Firme e scambi"], ["#/confronta", "ti-arrows-diff", "Confronto giocatori", "Due a confronto"]]],
  ["Gruppo e strumenti", [["#/gruppo", "ti-users-group", "Gruppo di amici", "Classifica e sfide"], ["#/costruisci", "ti-wand", "Costruisci una schedina", "Passo passo"], ["#/serata", "ti-moon-stars", "Riepilogo della serata", "Prese e perse"], ["#/glossario", "ti-book-2", "Glossario", "Linea, over, quota…"]]],
];
function vistaEsplora() {
  let h = topBar() + segEsplora("tutto");
  for (const [t, l] of GRUPPI_ESPL) h += `<div class="sub" style="margin-bottom:4px">${t}</div><div class="card" style="padding:2px 12px">${l.map(([hr, ic, n, d], k) => `<a class="riga rg" href="${hr}" style="color:inherit;${k ? "" : "border-top:0"}"><span style="display:flex;align-items:center;gap:10px;min-width:0"><i class="ti ${ic}" style="color:${OR};font-size:18px"></i><span style="min-width:0"><b style="font-weight:600">${n}</b><span class="s" style="display:block">${d}</span></span></span><i class="ti ti-chevron-right s"></i></a>`).join("")}</div>`;
  APP.innerHTML = h;
}
window.RIDEE.push([/^\/esplora/, vistaEsplora]);

;
// ---- v146: «Doppia consigliata» per partita: 2 giocate scelte tra forma, ultime partite, difesa e compagni fuori
const GIOCO15 = ["Vincente", "Totale", "Squadra"];
function formaLeg(x) { const d = x.det; if (!d || d.f10 == null || !(d.st > 0)) return 0; const dd = (d.f10 - d.st) / d.st; return dd >= 0.12 ? 1 : dd <= -0.12 ? -1 : 0; }
function motiviLeg(x) {
  const d = x.det, r = []; if (!d) return [x.motivo || "Probabilità calcolata dal modello."];
  if (d.f10 != null && d.st > 0) { const dd = Math.round((d.f10 - d.st) / d.st * 100), f = formaLeg(x); r.push(`Ultime ${d.nf} partite: ${vir(d.f10)} contro ${vir(d.st)} di media stagione (${dd >= 0 ? "+" : ""}${dd}%)${f > 0 ? " · 🔥 in forma" : f < 0 ? " · in calo, per questo la linea è prudente" : " · stabile"}.`); }
  else r.push(`Media stagione ${vir(d.st)}: le ultime partite non sono ancora disponibili.`);
  if (d.emp) r.push(`Ha superato la linea in ${d.emp.h} delle ultime ${d.emp.n} partite.`);
  if (d.dif != null && Math.abs(d.dif) >= 3) r.push(d.dif > 0 ? `Difesa avversaria più debole della media (+${vir(d.dif)}%).` : `Difesa avversaria più dura della media (${vir(d.dif)}%): già considerata nella stima.`);
  if (d.ass && d.ass.length && d.boost) r.push(`Compagni fuori (${d.ass.join(", ")}): più tiri e più spazio per lui.`);
  if (d.min) r.push(`Minuti attesi: ${vir(d.min)}.`);
  if (d.mk) r.push(`Il bookmaker ha messo la linea a ${vir(d.mk.linea)}${d.mk.linea > (+(/over ([\d.]+)/.exec(x.testo || "") || [])[1] || 0) ? ": la nostra scelta è più prudente." : "."}`);
  return r;
}
function scegliDoppia(L) {
  const c = L.filter((x) => x.prob >= 0.6 && !x.dubbio).map((x) => ({ x, s: x.prob + formaLeg(x) * (formaLeg(x) > 0 ? 0.03 : 0.06) })), mie = [];
  for (let a = 0; a < c.length; a++) for (let b = a + 1; b < c.length; b++) {
    const A = c[a].x, B = c[b].x; if (A.pid && A.pid === B.pid) continue; if (GIOCO15.includes(A.tipo) && GIOCO15.includes(B.tipo)) continue;
    mie.push([c[a].s + c[b].s + (A.tipo !== B.tipo ? 0.02 : 0), A, B]);
  }
  mie.sort((p, q) => q[0] - p[0]); return mie[0] ? [mie[0][1], mie[0][2]] : null;
}
function doppia15(D, p, L) {
  if (p.stato !== "pre") return ""; const d = scegliDoppia(L); if (!d) return "";
  try { salvaDoppia(p, d); } catch {}
  const pu = d[0].prob * d[1].prob, fq = typeof fattoreQuota === "function" ? (fattoreQuota().f || 1) : 1, q = 1 / pu * 0.9 * fq;
  const leg = (x) => `<div class="d15l"><div class="riga" style="align-items:flex-start"><div style="min-width:0"><b>${esc(x.testo)}</b><div class="s">${esc(NOMI15[x.tipo] || x.tipo)} · stima ${esc(x.stima)}</div></div><span style="display:flex;align-items:center;gap:8px"><b style="color:${colProb(x.prob)};font-size:20px">${pct(x.prob)}</b>${addBtn(x)}</span></div><ul class="d15m">${motiviLeg(x).map((m) => `<li>${esc(m)}</li>`).join("")}</ul></div>`;
  return `<div class="card d15"><div class="s" style="color:${OR};font-weight:600">🎯 Doppia consigliata</div><div class="cap" style="margin:2px 0 6px">Due giocate di questa partita, scelte tra quelle più probabili: una non dipende dall'altra, quindi se una sbaglia l'altra può ancora uscire.</div>${leg(d[0])}${leg(d[1])}<div class="riga" style="margin-top:8px"><span class="s">Insieme ${pct(pu)} · quota giusta circa ${q.toFixed(2)}</span><button class="btn" data-doppia="${esc(d[0].id)}|${esc(d[1].id)}" style="margin:0;padding:7px 12px">Aggiungi tutte e due</button></div><div class="cap" style="margin:6px 0 0">Sono stime del modello, non certezze: la quota del tuo sito sarà un po' più bassa.</div></div>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest && e.target.closest("[data-doppia]"); if (!b) return; e.preventDefault();
  const L = miaLeggi(); for (const id of b.dataset.doppia.split("|")) { const l = PM.get(id); if (l && !L.some((x) => x.id === l.id)) L.push(l); }
  ls.set("mia", L); barraMia(); b.textContent = "✓ Aggiunte"; b.closest(".d15").querySelectorAll("[data-add]").forEach((a) => { a.classList.add("on"); a.textContent = "✓"; });
});
// nei Pronostici per partita: sotto la giocata più sicura
{ const _hero15 = hero15; hero15 = function (x) { const L = x && window.__D ? window.__D.picks.filter((q) => q.g === x.g) : [], p = x && window.__D ? window.__D.partite.find((q) => q.id === x.g) : null; return _hero15(x) + (p ? doppia15(window.__D, p, L) : ""); }; }

;
// ---- v147: storico delle doppie proposte e verifica a fine partita; promemoria backup
function salvaDoppia(p, d) {
  const S = ls.get("doppie", {}), k = qs().slice(2) + "|" + p.id; if (S[k]) return;
  S[k] = { d: qs().slice(2), n: p.casa + "-" + p.trasf, k: d.map((x) => legDa(x).chiave), p: d.map((x) => x.prob), t: d.map((x) => x.testo) };
  const ks = Object.keys(S).sort(); while (ks.length > 120) delete S[ks.shift()]; ls.set("doppie", S);
}
function vistaDoppie() {
  APP.innerHTML = topBar() + `<h2>Le doppie consigliate</h2><div class="skel" style="height:140px"></div>`;
  api("/api/storico", 0).then((S) => {
    const esiti = new Map((S.righe || []).map((r) => [r.chiave, r.esito])), D = ls.get("doppie", {});
    const L = Object.values(D).map((o) => { const e = o.k.map((c) => (esiti.has(c) ? esiti.get(c) : null)); return { ...o, e, st: e.some((x) => x === 0) ? 0 : e.every((x) => x === 1) ? 1 : null }; }).sort((a, b) => (a.d < b.d ? 1 : -1));
    const ch = L.filter((o) => o.st != null), vinte = ch.filter((o) => o.st === 1).length, prev = ch.length ? ch.reduce((a, o) => a + o.p[0] * o.p[1], 0) / ch.length : 0;
    const gambe = L.flatMap((o) => o.e.map((x, i) => ({ x, p: o.p[i] }))).filter((g) => g.x === 0 || g.x === 1), gv = gambe.reduce((a, g) => a + g.x, 0), gp = gambe.length ? gambe.reduce((a, g) => a + g.p, 0) / gambe.length : 0;
    let h = topBar() + `<a class="back" href="#/esplora"><i class="ti ti-chevron-left"></i>Esplora</a><h2>Le doppie consigliate</h2><div class="cap" style="margin-top:0">Ogni doppia che l'app ti mostra viene salvata sul telefono e controllata a fine partita: così vedi se il criterio funziona davvero.</div>`;
    if (!L.length) h += `<div class="vuoto">Ancora nessuna doppia salvata. Apri i Pronostici o lo studio di una partita non iniziata: la doppia compare lì e viene registrata.</div>`;
    else {
      h += `<div class="row3"><div class="tile"><b>${ch.length ? vinte + "/" + ch.length : "—"}</b><span>doppie centrate</span></div><div class="tile"><b>${ch.length ? Math.round(vinte / ch.length * 100) + "%" : "—"}</b><span>previsto ${ch.length ? Math.round(prev * 100) + "%" : "—"}</span></div><div class="tile"><b>${gambe.length ? gv + "/" + gambe.length : "—"}</b><span>singole giocate${gambe.length ? " · previsto " + Math.round(gp * 100) + "%" : ""}</span></div></div>`;
      if (ch.length >= 8) h += `<div class="cap">${Math.abs(vinte / ch.length - prev) < 0.07 ? "Le doppie escono circa quanto previsto." : vinte / ch.length < prev ? "Le doppie escono meno di quanto previsto: il criterio è troppo ottimista." : "Le doppie escono più di quanto previsto: il criterio è prudente."}</div>`; else h += `<div class="cap">Servono almeno 8 doppie chiuse per un giudizio: finora ${ch.length}.</div>`;
      h += `<h2>Una per una</h2>` + L.map((o) => `<div class="card" style="padding:10px 12px;border-left:3px solid ${o.st === 1 ? GR : o.st === 0 ? RD : MU}"><div class="riga"><b>${esc(o.n)}</b><span class="s">${esc(o.d.slice(6, 8) + "/" + o.d.slice(4, 6))} · ${Math.round(o.p[0] * o.p[1] * 100)}%</span></div>${o.t.map((t, i) => `<div class="s" style="margin-top:3px"><b style="color:${o.e[i] === 1 ? GR : o.e[i] === 0 ? RD : MU}">${o.e[i] === 1 ? "✓" : o.e[i] === 0 ? "✗" : "•"}</b> ${esc(t)}</div>`).join("")}</div>`).join("");
    }
    APP.innerHTML = h;
  }).catch((e) => { APP.innerHTML = topBar() + errBox(e); });
}
window.RIDEE.push([/^\/doppie/, vistaDoppie]);
HUB.splice(1, 0, ["#/doppie", "ti-target", "Le doppie consigliate", "Quante ne sono uscite contro quanto previsto"]);
GRUPPI_ESPL[1][1].splice(3, 0, ["#/doppie", "ti-target", "Le doppie consigliate", "Verifica a fine partita"]);
function avvisoBackup() {
  const reg = ls.get("registro", []); if (reg.length < 3) return ""; const u = ls.get("ultimoBackup", 0), z = ls.get("backupSnooze", 0);
  if (Date.now() - u < 14 * 86400e3 || Date.now() < z) return "";
  return `<div class="card riga" style="padding:10px 14px;margin-bottom:10px;border-left:3px solid ${AM}"><div style="min-width:0"><b>Salva un backup</b><div class="s">${u ? "L'ultimo risale a " + Math.floor((Date.now() - u) / 86400e3) + " giorni fa." : "Non ne hai ancora fatto uno."} Registro e conto vivono su questo telefono.</div></div><span style="display:flex;gap:6px"><a class="chipbtn" href="#/impostazioni">Salva</a><button class="chipbtn" onclick="ls.set('backupSnooze',Date.now()+3*86400e3);this.closest('.card').remove()">Dopo</button></span></div>`;
}

;
// ---- v148: Statistiche (Tu contro il modello + ultime schedine) e Profilo compatto
{ const _vs148 = vistaStatistiche; vistaStatistiche = function () {
  _vs148();
  try {
    const R = ls.get("registro", []), ch = R.filter((r) => r.esito === 0 || r.esito === 1); if (ch.length < 5) return;
    let n = 0, ok = 0, pr = 0;
    for (const r of ch) if (r.legs && r.es && r.es.length === r.legs.length) r.legs.forEach((l, k) => { const e = r.es[k]; if (e && (e.esito === 0 || e.esito === 1) && l.prob > 0) { n++; ok += e.esito; pr += l.prob; } });
    const base = n >= 5 ? [ok / n, pr / n, n, "giocate"] : [ch.filter((r) => r.esito === 1).length / ch.length, ch.reduce((a, r) => a + (r.prob || 0), 0) / ch.length, ch.length, "schedine"];
    const [real, prev, tot, unita] = base, d = Math.round((real - prev) * 100);
    const ult = [...R].sort((a, b) => (String(a.data) < String(b.data) ? -1 : 1)).slice(-10);
    const html = `<div class="card"><b style="font-size:13px">Il modello contro i tuoi risultati</b><div class="riga" style="margin:10px 0"><div><div class="s">Il modello prevedeva</div><div class="bigs">${Math.round(prev * 100)}%</div></div><div style="text-align:right"><div class="s">Hai centrato</div><div class="bigs" style="color:${real >= prev ? GR : RD}">${Math.round(real * 100)}%</div></div></div><div class="barr"><i style="width:${Math.round(prev * 100)}%;background:#4aa3ff"></i></div><div class="barr" style="margin-top:4px"><i style="width:${Math.round(real * 100)}%;background:${real >= prev ? GR : RD}"></i></div><div class="cap" style="margin:6px 0 0">${Math.abs(d) < 3 ? "Sei in linea con le previsioni" : d > 0 ? `Stai facendo meglio del previsto di ${d} punti` : `Stai facendo peggio del previsto di ${-d} punti`} su ${tot} ${unita}.</div></div>
    <div class="card"><b style="font-size:13px">Ultime ${ult.length} schedine</b><div class="quad">${ult.map((r) => `<i title="${esc(r.nome || "")}" style="background:${r.esito === 1 ? GR : r.esito === 0 ? RD : AM}"></i>`).join("")}</div><div class="s" style="margin-top:6px">verde presa · rossa persa · gialla aperta</div></div>`;
    const el = APP.querySelector(".card.gm"); if (el) el.insertAdjacentHTML("beforebegin", html);
  } catch {}
}; }
