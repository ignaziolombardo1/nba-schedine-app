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
function rispondi(D, q) {
  const t = q.toLowerCase(), pre = (D.partite || []).filter((p) => p.stato === "pre"), B = (ab) => T(D, ab).b;
  const sqCit = Object.keys(D.squadre || {}).filter((ab) => t.includes(ab.toLowerCase() + " ") || (" " + t + " ").includes(" " + ab.toLowerCase() + " ") || t.includes(String(B(ab)).toLowerCase()));
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
