// NBA Schedine - idee7.js: studio partita: formazioni (ufficiali o stimate), tutti i giocatori, forma, contorno ai migliori e spiegazione dettagliata
"use strict";
const rosaUff = {}; // id partita -> { pubblicato, titolari } dal server

// i 5 più probabili titolari: prima chi parte spesso da titolare (partite da titolare / giocate), altrimenti chi gioca più minuti
function titolariStimati(lista) {
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
  const spiega = ufficiale ? "Quintetto ufficiale pubblicato da ESPN poco prima della partita." : usaGs ? "Quintetto stimato: i 5 che partono più spesso da titolari in stagione. L'ufficiale compare circa un'ora prima della palla a due." : "Quintetto stimato: i 5 che giocano più minuti. L'ufficiale compare circa un'ora prima della palla a due.";
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
  return `<h2>Formazioni e giocatori</h2><div class="card" style="padding:10px 12px"><div class="ro-leg"><span><i class="ro-sw top"></i> Top: tra i 3 migliori della partita</span><span><i class="ro-sw ok"></i> Giocata consigliata</span><span><i class="ro-sw dub"></i> In dubbio</span></div><div class="cap" style="margin:6px 0 0">Tocca un giocatore per vedere forma, minuti e il motivo delle giocate.</div></div><div id="rosa">${corpoRosa(D, p, picks)}</div>`;
}
// dopo il disegno: se ESPN ha pubblicato i quintetti li prende e ridisegna (restano aperti i giocatori già aperti)
async function rosaUfficiale(D, p, picks) {
  if (!p || p.stato === "post" || !p.giocatori || !p.giocatori.length) return;
  try {
    const q = rosaUff[p.id] || await api("/api/quintetti?id=" + encodeURIComponent(p.id), 45000); rosaUff[p.id] = q;
    const el = document.getElementById("rosa"); if (!el || !q.pubblicato) return;
    const aperti = new Set([...el.querySelectorAll("details.ro[open] .tn")].map((e) => e.firstChild ? e.firstChild.textContent.trim() : ""));
    el.innerHTML = corpoRosa(D, p, picks);
    el.querySelectorAll("details.ro").forEach((d) => { const n = d.querySelector(".tn"); if (n && n.firstChild && aperti.has(n.firstChild.textContent.trim())) d.open = true; });
  } catch {}
}

// grafico delle ultime partite contro la linea della giocata (se la forma è caricata)
function graficoPick(x, q) {
  const k = q.tipo === "Punti" ? "pts" : q.tipo === "Rimbalzi" ? "reb" : q.tipo === "Assist" ? "ast" : null, m = /(over|under) ([\d.]+)/.exec(q.testo || "");
  if (!k || !m || !x.ult || !x.ult[k]) return "";
  return typeof graficoUltime === "function" ? graficoUltime(x.ult[k], +m[2]) : "";
}
