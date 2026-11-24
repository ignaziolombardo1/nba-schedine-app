// NBA Schedine - esplora.js (parte dell'app: i file si caricano in ordine da index.html, vedi CLAUDE.md)
"use strict";
// ---------- aspetto (tema, dimensione testo) e numero di giocate aperte sull'icona dell'app
function applicaAspetto() {
  const a = ls.get("aspetto", { tema: "scuro", testo: "normale" }), chiaro = a.tema === "chiaro" || (a.tema === "auto" && matchMedia("(prefers-color-scheme: light)").matches);
  document.documentElement.classList.toggle("chiaro", !!chiaro);
  const m = document.querySelector("main"); if (m) m.style.zoom = a.testo === "grande" ? "1.12" : a.testo === "molto" ? "1.25" : a.tema === "notte" ? "1.12" : "";
  if (typeof applicaNotte === "function") applicaNotte();
}
function aggiornaBadge() {
  try { const n = ls.get("registro", []).filter((r) => r.esito == null).length; if (navigator.setAppBadge) { if (n > 0) navigator.setAppBadge(n); else navigator.clearAppBadge && navigator.clearAppBadge(); } } catch {}
}

// ---------- ESPLORA: classifica, calendario, squadra, ricerca giocatori
const segEsplora = (att) => `<div class="seg">${[["s", "stasera", "Stasera"], ["w", "seguiti", "Seguiti"], ["n", "news", "News"], ["f", "forma", "Forma"], ["i", "infortunati", "Infortunati"], ["c", "classifica", "Classifica"], ["g", "cerca", "Giocatori"], ["v", "valore", "Valore"], ["q", "chiedi", "Chiedi"]].map(([k, h, n]) => `<a href="#/${h}"${att === k ? ' class="on"' : ""}>${n}</a>`).join("")}</div>`;
const rigaEsplora = () => segEsplora(null);
const ymdData = (ymd) => new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8), 12));
const ymdPiu = (ymd, n) => ymdData(ymd) && new Date(ymdData(ymd).getTime() + n * 86400000).toISOString().slice(0, 10).replaceAll("-", "");
const etichettaGiorno = (ymd) => ymdData(ymd).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const nomeSq = (S, ab) => (S && S[ab] ? S[ab].b : ab);

async function vistaClassifica() {
  const top = topBar() + segEsplora("c"); APP.innerHTML = top + skel();
  let C; try { C = await api("/api/classifica", 600000); } catch (e) { APP.innerHTML = top + errBox(e); return; }
  const k = ls.get("conf", "Est") === "Ovest" ? "Ovest" : "Est", L = C[k] || [], pm = new Set(pref().sq);
  let h = top + `<div class="tabs">${["Est", "Ovest"].map((c) => `<button class="chipbtn${k === c ? " on" : ""}" data-conf="${c}">${c}</button>`).join("")}</div>`;
  h += `<div class="card" style="padding:4px 12px"><div class="riga s" style="padding:6px 0"><span style="width:22px">#</span><span style="flex:1">Squadra</span><span style="width:54px;text-align:right">V-P</span><span style="width:40px;text-align:right">GB</span><span style="width:36px;text-align:right">Serie</span></div>` +
    L.map((x, i) => `<a class="riga rg" href="#/squadra/${esc(x.ab)}" style="color:inherit${i === 5 || i === 9 ? ";border-top:1px dashed " + OR : ""}"><span style="width:22px;color:${i < 6 ? GR : i < 10 ? AM : MU};font-weight:600">${i + 1}</span><div class="lg" style="flex:1;min-width:0">${logo(x.ab, 24)}<b>${esc(nomeSq(C.squadre, x.ab))}</b>${pm.has(x.ab) ? " ★" : ""}</div><span style="width:54px;text-align:right">${x.v}-${x.p}</span><span class="s" style="width:40px;text-align:right">${esc(x.gb ?? "")}</span><span class="s" style="width:36px;text-align:right;color:${/^W/i.test(x.strk || "") ? GR : /^L/i.test(x.strk || "") ? RD : MU}">${esc(x.strk ?? "")}</span></a>`).join("") + `</div>`;
  h += `<div class="cap">Le prime 6 vanno ai playoff, dalla 7ª alla 10ª ai play-in. GB = partite di distanza dalla prima. Tocca una squadra per vedere risultati, prossime partite e giocatori.</div>`;
  APP.innerHTML = h;
  APP.querySelectorAll("[data-conf]").forEach((b) => b.onclick = () => { ls.set("conf", b.dataset.conf); vistaClassifica(); });
}

let calDa = null;
async function vistaCalendario() {
  const top = topBar() + segEsplora("k"); APP.innerHTML = top + skel();
  const q = calDa ? "?d=" + calDa : "";
  let C; try { C = await api("/api/calendario" + q, 300000); } catch (e) { APP.innerHTML = top + errBox(e); return; }
  const pm = new Set(pref().sq);
  let h = top + `<div class="riga" style="margin-bottom:8px"><button class="chipbtn" id="calP"><i class="ti ti-chevron-left"></i> Prima</button><span class="s">7 giorni dal ${esc(etichettaGiorno(C.da))}</span><button class="chipbtn" id="calN">Dopo <i class="ti ti-chevron-right"></i></button></div>`;
  if (!C.giorni.length) h += `<div class="vuoto">Nessuna partita in questi giorni.</div>`;
  for (const g of C.giorni) {
    h += `<h2 class="sez" style="text-transform:capitalize">${esc(etichettaGiorno(g.ymd))}</h2>` + g.partite.map((x) => {
      const mid = x.stato === "pre" ? esc(String(x.ora).slice(-5)) : `${x.ptCasa ?? 0} - ${x.ptTr ?? 0}`;
      return `<div class="card riga" style="padding:9px 12px"><a class="lg" href="#/squadra/${esc(x.casa)}" style="color:inherit">${logo(x.casa, 26)}<b>${esc(x.casa)}${pm.has(x.casa) ? " ★" : ""}</b></a><b style="font-size:17px;color:${x.stato === "in" ? RD : "inherit"}">${mid}${x.stato === "in" ? ' <span class="s" style="color:' + RD + '">live</span>' : ""}</b><a class="lg" href="#/squadra/${esc(x.trasf)}" style="color:inherit"><b>${esc(x.trasf)}${pm.has(x.trasf) ? " ★" : ""}</b>${logo(x.trasf, 26)}</a></div>`;
    }).join("");
  }
  h += `<button class="btn" id="icsBtn"><i class="ti ti-calendar-plus"></i> Aggiungi al calendario del telefono le partite delle mie squadre</button>`;
  h += `<div class="cap">Orari in ora italiana. A sinistra la squadra di casa, a destra la trasferta.</div>`;
  APP.innerHTML = h;
  const oggi = () => { const d = new Date(); return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(d).replaceAll("-", ""); };
  $("#calP").onclick = () => { calDa = ymdPiu(C.da, -7); vistaCalendario(); };
  $("#calN").onclick = () => { calDa = ymdPiu(C.da, 7); vistaCalendario(); };
}

async function vistaSquadra(ab) {
  const back = `<a class="back" href="javascript:history.back()"><i class="ti ti-chevron-left"></i>Indietro</a>`;
  APP.innerHTML = back + skel();
  let S; try { S = await api("/api/squadra?s=" + encodeURIComponent(ab), 300000); } catch (e) { APP.innerHTML = back + errBox(e); return; }
  const I = S.squadre[S.s] || { n: S.s, b: S.s, c: "#4a5060" }, r = S.riga, m = (l, k) => (l.length ? l.reduce((a, x) => a + x[k], 0) / l.length : 0);
  let h = back + `<div class="card gm" style="--ca:${I.c};--cb:transparent"><div class="lg">${logo(S.s, 64)}<div style="min-width:0"><div class="nome" style="font-size:26px">${esc(I.n)}${stella("sq", S.s)}</div><div class="s">${r ? `${S.pos}ª ${esc(S.conf)} · ${r.v}-${r.p}${r.strk ? " · serie " + esc(r.strk) : ""}` : "Classifica non disponibile"}</div>${r && (r.pf != null) ? `<div class="s">${r.pf.toFixed(1)} punti fatti · ${r.pa.toFixed(1)} subiti a partita</div>` : ""}${r && (r.casa || r.tra) ? `<div class="s">Casa ${esc(r.casa ?? "–")} · Trasferta ${esc(r.tra ?? "–")}${r.ultime10 ? " · ultime 10: " + esc(r.ultime10) : ""}</div>` : ""}</div></div></div>`;
  if (S.prossime.length) h += `<h2>Prossime partite</h2>` + S.prossime.map((x) => `<div class="card riga" style="padding:8px 12px"><div class="lg">${logo(x.avv, 24)}<div><b>${x.casa ? "in casa con" : "in trasferta da"} ${esc(nomeSq(S.squadre, x.avv))}</b></div></div><span class="s">${esc(x.ora)}</span></div>`).join("");
  if (S.fatte.length) {
    const u = S.fatte.slice(0, 8);
    h += `<h2>Ultime partite</h2><div class="card"><div class="riga"><div>${u.map((x) => `<span class="fm" style="background:${x.vinta ? GR : RD}">${x.vinta ? "V" : "S"}</span>`).join("")}</div><span class="s">${m(u, "pf").toFixed(1)} fatti · ${m(u, "pa").toFixed(1)} subiti · totale ${m(u.map((x) => ({ t: x.pf + x.pa })), "t").toFixed(1)}</span></div>` +
      u.map((x) => `<div class="riga rg"><div class="lg">${logo(x.avv, 22)}<div><div style="font-weight:500">${x.casa ? "in casa con" : "in trasferta da"} ${esc(nomeSq(S.squadre, x.avv))}</div><div class="s">${esc(x.data.slice(0, 10))}</div></div></div><b style="color:${x.vinta ? GR : RD}">${x.pf}-${x.pa}</b></div>`).join("") + `</div>`;
  }
  if (S.giocatori.length) h += `<h2>Giocatori</h2><div class="card">` + S.giocatori.map((x, i) => `<a class="riga rg" href="#/giocatore/${esc(x.pid)}" style="color:inherit${i ? "" : ";border-top:0"}"><div class="lg">${foto(x.pid, 30)}<div style="min-width:0"><b>${esc(x.nome)}</b>${x.inf ? ` <span class="pill" style="color:${x.inf.stato === "out" ? RD : AM}">${x.inf.stato === "out" ? "Fuori" : "Dubbio"}</span>` : ""}<div class="s">${Math.round(x.min)} minuti</div></div></div><span class="s" style="text-align:right"><b style="color:var(--txt)">${x.pts.toFixed(1)}</b> pt · ${x.reb.toFixed(1)} rb · ${x.ast.toFixed(1)} as</span></a>`).join("") + `<div class="cap" style="margin:8px 0 0">Medie della stagione per partita.</div></div>`;
  h += `<h2>Ultime notizie</h2><div id="sqNews"><div class="skel"></div></div>`;
  APP.innerHTML = h;
  try { const R = await api("/api/news?s=" + encodeURIComponent(ab), 300000); const el = document.getElementById("sqNews"); if (el) el.innerHTML = R.news.length ? R.news.slice(0, 8).map(cardNews).join("") + `<a class="chipbtn" href="#/news/${esc(ab)}" style="display:inline-block;margin-top:6px">Tutte le notizie</a><div class="cap">Titoli tradotti in automatico; l'articolo si apre in inglese.</div>` : `<div class="vuoto">Nessuna notizia al momento.</div>`; } catch { const el = document.getElementById("sqNews"); if (el) el.innerHTML = `<div class="vuoto">Notizie non disponibili ora.</div>`; }
}

async function vistaCerca() {
  const top = topBar() + segEsplora("g");
  const P = pref(), riga = (x) => `<a class="card riga" href="#/giocatore/${esc(x.pid)}" style="padding:8px 12px;color:inherit"><div class="lg">${foto(x.pid, 34)}<div style="min-width:0"><b>${esc(x.nome)}</b><div class="s">${logo(x.sq, 14)} ${esc(x.sq)}</div></div></div>${x.pts != null ? `<span class="s" style="text-align:right"><b style="color:var(--txt)">${x.pts.toFixed(1)}</b> pt · ${x.reb.toFixed(1)} rb · ${x.ast.toFixed(1)} as</span>` : ""}</a>`;
  APP.innerHTML = top + `<input class="linea" id="cercaQ" placeholder="Cerca un giocatore (es. Tatum)" autocomplete="off" style="margin-top:0"><div id="cercaR">${P.pl.length ? `<h2>I tuoi giocatori ★</h2>` + P.pl.map((x) => riga({ pid: x.pid, nome: x.nome, sq: x.sq })).join("") : `<div class="cap">Scrivi almeno due lettere. Aprendo un giocatore vedi medie e ultime partite, anche nei giorni senza partite. Con la ★ lo segui e ricevi gli avvisi.</div>`}</div>`;
  let t = null, n = 0;
  $("#cercaQ").oninput = (e) => { clearTimeout(t); const q = e.target.value.trim(), mio = ++n;
    t = setTimeout(async () => { const R = $("#cercaR"); if (q.length < 2) { return; } R.innerHTML = `<div class="skel"></div>`;
      try { const d = await api("/api/cerca?q=" + encodeURIComponent(q), 600000); if (mio !== n) return; R.innerHTML = d.giocatori.length ? d.giocatori.map(riga).join("") : `<div class="vuoto">Nessun giocatore trovato.</div>`; } catch (er) { if (mio === n) R.innerHTML = errBox(er); } }, 300); };
}


async function vistaInfortunati() {
  const top = topBar() + segEsplora("i"); APP.innerHTML = top + skel();
  let I; try { I = await api("/api/infortunati", 300000); } catch (e) { APP.innerHTML = top + errBox(e); return; }
  const P = pref(), mie = new Set(P.sq), seguiti = new Set(P.pl.map((x) => String(x.pid))), filtro = ls.get("infF", "tutti"), per = {};
  const lista = I.giocatori.filter((x) => filtro === "miei" ? mie.has(x.sq) || seguiti.has(x.pid) : filtro === "out" ? x.stato === "out" : true);
  for (const x of lista) (per[x.sq] ||= []).push(x);
  let h = top + `<div class="tabs">${[["tutti", "Tutti"], ["out", "Fuori"], ["miei", "I miei ★"]].map(([k, n]) => `<button class="chipbtn${filtro === k ? " on" : ""}" data-inf="${k}">${n}</button>`).join("")}</div>`;
  h += `<div class="cap" style="margin-top:0">${lista.length} giocatori${filtro === "tutti" ? " segnalati" : ""}. Tocca un giocatore per le sue medie.</div>`;
  if (!lista.length) h += `<div class="vuoto">${filtro === "miei" ? "Nessun infortunato tra le squadre e i giocatori che segui." : "Nessun infortunato segnalato."}</div>`;
  for (const ab of Object.keys(per).sort()) {
    h += `<a class="sub lg" href="#/squadra/${esc(ab)}" style="color:inherit;margin-top:14px">${logo(ab, 22)}<b>${esc((I.squadre[ab] || { n: ab }).n)}</b></a><div class="card" style="padding:4px 12px">` + per[ab].map((x, i) => {
      const c = x.stato === "out" ? RD : AM, et = x.stato === "out" ? "Fuori" : x.stato === "giorno" ? "Giorno per giorno" : "Dubbio";
      return `<a class="riga rg" ${x.pid ? `href="#/giocatore/${esc(x.pid)}"` : ""} style="color:inherit;align-items:flex-start${i ? "" : ";border-top:0"}"><div class="lg" style="align-items:flex-start">${foto(x.pid, 36)}<div style="min-width:0"><b>${esc(x.nome)}</b>${x.pos ? ` <span class="s">${esc(x.pos)}</span>` : ""}${x.dettaglio ? `<div class="s" style="line-height:1.35">${esc(x.dettaglio)}</div>` : ""}</div></div><span class="pill" style="color:${c};flex:0 0 auto">${et}</span></a>`;
    }).join("") + `</div>`;
  }
  APP.innerHTML = h;
  APP.querySelectorAll("[data-inf]").forEach((b) => b.onclick = () => { ls.set("infF", b.dataset.inf); vistaInfortunati(); });
}


// ---------- STASERA: tutte le partite non ancora iniziate, con giocata migliore e assenti
async function vistaStasera() {
  const top = topBar() + segEsplora("s"); APP.innerHTML = top + skel();
  let D; try { D = await dati(); } catch (e) { APP.innerHTML = top + errBox(e); return; }
  const pre = D.partite.filter((p) => p.stato === "pre").sort((a, b) => (a.iso < b.iso ? -1 : 1)), live = D.partite.filter((p) => p.stato === "in");
  let h = top + bannerErrore(D);
  const top3 = D.picks.filter((x) => pre.some((p) => p.id === x.g)).sort((a, b) => b.prob - a.prob).slice(0, 3);
  if (top3.length) h += `<h2 class="sez">Le tre giocate migliori</h2>` + top3.map((x) => cardPick(x)).join("");
  if (live.length) h += `<a class="btn" href="#/live" style="display:block;text-align:center"><span class="dot"></span> ${live.length} ${live.length === 1 ? "partita in corso" : "partite in corso"}: vai al Live</a>`;
  h += `<h2 class="sez">${pre.length ? "Da giocare" : "Nessuna partita da giocare"}</h2>`;
  for (const p of pre) {
    const mie = D.picks.filter((x) => x.g === p.id).sort((a, b) => b.prob - a.prob)[0], out = (p.inf || []).filter((i) => i.stato === "out"), dub = (p.inf || []).filter((i) => i.stato !== "out");
    h += `<a class="card" href="#/partita/${p.id}" style="display:block;color:inherit"><div class="riga"><div class="lg">${logo(p.casa, 28)}<b>${esc(p.casa)}</b></div><div style="text-align:center"><b style="font-size:17px">${esc(String(p.ora).slice(-5))}</b><div class="s">stimati ${p.r ? p.r.ptCasa.toFixed(0) + "-" + p.r.ptTr.toFixed(0) : "–"}</div></div><div class="lg"><b>${esc(p.trasf)}</b>${logo(p.trasf, 28)}</div></div>` +
      (mie ? `<div class="riga" style="margin-top:8px"><span class="s">Migliore: <b style="color:var(--txt)">${esc(mie.testo)}</b></span><b style="color:${colProb(mie.prob)}">${pct(mie.prob)}</b></div>` : "") +
      (out.length ? `<div class="s" style="margin-top:4px;color:${RD}">Fuori: ${out.map((i) => esc(i.nome) + " (" + esc(T(D, i.sq).b) + ")").join(", ")}</div>` : "") +
      (dub.length ? `<div class="s" style="margin-top:2px;color:${AM}">In dubbio: ${dub.map((i) => esc(i.nome)).join(", ")}</div>` : "") + `</a>`;
  }
  APP.innerHTML = h;
}


// ---------- NEWS: ultime notizie della lega o di una squadra (ESPN, titoli tradotti in automatico)
const quandoFa = (iso) => { const t = Date.parse(iso); if (!t) return ""; const m = Math.round((Date.now() - t) / 60000); return m < 60 ? `${Math.max(m, 1)} min fa` : m < 1440 ? (Math.round(m / 60) === 1 ? "1 ora fa" : `${Math.round(m / 60)} ore fa`) : (Math.round(m / 1440) === 1 ? "1 giorno fa" : `${Math.round(m / 1440)} giorni fa`); };
const cardNews = (n) => `<a class="card nws" href="${esc(n.url)}" target="_blank" rel="noopener">${n.img ? `<img class="nimg" loading="lazy" alt="" src="${esc(n.img)}" onerror="this.style.display='none'">` : ""}<div style="min-width:0"><div style="font-weight:600;line-height:1.3">${esc(n.titoloIt || n.titolo)}</div>${n.descIt || n.desc ? `<div class="s" style="margin-top:3px;line-height:1.35">${esc((n.descIt || n.desc).slice(0, 160))}</div>` : ""}<div class="s" style="margin-top:4px">${esc(quandoFa(n.data))}${n.autore ? " · " + esc(n.autore) : ""} · ESPN</div></div></a>`;
async function vistaNews(ab) {
  const back = ab ? `<a class="back" href="javascript:history.back()"><i class="ti ti-chevron-left"></i>Indietro</a>` : "";
  const top = ab ? back : topBar() + segEsplora("n"); APP.innerHTML = top + skel();
  const mie = pref().sq; let R;
  try { R = await api("/api/news" + (ab ? "?s=" + encodeURIComponent(ab) : ""), 300000); } catch (e) { APP.innerHTML = top + errBox(e); return; }
  let h = top;
  if (ab) h += `<div class="lg" style="margin:6px 0 4px">${logo(ab, 40)}<h2 style="margin:0;font-size:22px">Notizie ${esc(ab)}</h2></div><a class="chipbtn" href="#/squadra/${esc(ab)}" style="display:inline-block;margin-bottom:6px">Pagina della squadra</a>`;
  else if (mie.length) h += `<div class="tabs" style="flex-wrap:wrap"><a class="chipbtn on" href="#/news">Tutte</a>${mie.map((s) => `<a class="chipbtn" href="#/news/${esc(s)}">${logo(s, 16)} ${esc(s)}</a>`).join("")}</div>`;
  if (!R.news.length) h += `<div class="vuoto">Nessuna notizia al momento.</div>`;
  h += R.news.map(cardNews).join("");
  h += `<div class="cap">Notizie di ESPN. Il titolo è tradotto in automatico dall'inglese (sotto, quello originale): toccando una notizia si apre l'articolo, in inglese.</div>`;
  APP.innerHTML = h;
}

// scheda di un giocatore che oggi non gioca: medie e ultime 10 partite
// le ultime 5 partite del giocatore: data, avversario, esito e statistiche
function ultime5(S) {
  const L = (S && S.par) || []; if (!L.length) return `<h2>Ultime 5 partite</h2><div class="vuoto">Non ho ancora le ultime partite di questo giocatore.</div>`;
  const dt = (d) => (d && d.length >= 10 ? d.slice(8, 10) + "/" + d.slice(5, 7) : "");
  return `<h2>Ultime ${L.length} partite</h2><div class="card" style="padding:4px 12px"><div class="riga s" style="padding:6px 0"><span style="flex:1">Partita</span><span style="width:40px;text-align:right">PT</span><span style="width:36px;text-align:right">RB</span><span style="width:36px;text-align:right">AS</span></div>` + L.map((g) => `<div class="riga rg" style="align-items:center"><div style="flex:1;min-width:0"><div class="lg" style="gap:6px">${g.a ? logo(g.a, 20) : ""}<b>${g.f ? "@" : "vs"} ${esc(g.a || "?")}</b>${g.r ? `<span style="color:${g.r === "W" ? GR : RD};font-weight:700">${g.r === "W" ? "V" : "S"}</span>` : ""}</div><div class="s">${dt(g.d)}${g.sc ? " · " + esc(g.sc) : ""} · ${Math.round(g.mn || 0)}'</div></div><b style="width:40px;text-align:right">${g.pt ?? "–"}</b><span style="width:36px;text-align:right">${g.rb ?? "–"}</span><span style="width:36px;text-align:right">${g.as ?? "–"}</span></div>`).join("") + `</div>`;
}
async function schedaGiocatoreLibero(pid, back) {
  let S; try { S = await api("/api/giocatore?pid=" + encodeURIComponent(pid), 600000); } catch (e) { APP.innerHTML = back + errBox(e); return; }
  const I = S.squadre[S.sq] || { n: S.sq, b: S.sq, c: "#4a5060" }, med = (a) => (a && a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const pill = S.inf ? `<span class="pill" style="color:${S.inf.stato === "out" ? RD : AM}">${S.inf.stato === "out" ? "Fuori" : "Dubbio"}</span>` : `<span class="pill" style="color:${GR}">Disponibile</span>`;
  let h = back + `<div class="card gm" style="--ca:${I.c};--cb:transparent;text-align:center"><div style="display:flex;flex-direction:column;align-items:center;gap:6px">${foto(S.pid, 96)}<div class="nome" style="font-size:28px;line-height:1.1">${esc(S.nome)}${stella("pl", S.pid, S.nome, S.sq)}</div><div class="s">${S.sq ? `<a href="#/squadra/${esc(S.sq)}" style="color:inherit">${logo(S.sq, 16)} ${esc(I.n)}</a> · ` : ""}${Math.round(S.min)} minuti a partita</div>${pill}</div><div class="row3" style="margin-top:12px"><div class="tile"><b>${(S.pts || 0).toFixed(1)}</b><span>punti</span></div><div class="tile"><b>${(S.reb || 0).toFixed(1)}</b><span>rimbalzi</span></div><div class="tile"><b>${(S.ast || 0).toFixed(1)}</b><span>assist</span></div></div><div class="s" style="margin-top:6px">${S.senzaStat ? "medie delle ultime partite" : "medie stagione"}</div>${S.inf && S.inf.d ? `<div class="s" style="margin-top:8px">${esc(S.inf.d)}</div>` : ""}</div>` + ultime5(S);
  for (const [nome, k, media] of [["Punti", "pts", S.pts], ["Rimbalzi", "reb", S.reb], ["Assist", "ast", S.ast]]) {
    const u = S.ult && S.ult[k], mu = med(u);
    h += `<h2>${nome}</h2><div class="card"><div class="row3"><div class="tile on"><b>${media.toFixed(1)}</b><span>media stagione</span></div><div class="tile"><b>${mu != null ? mu.toFixed(1) : "–"}</b><span>ultime ${u ? u.length : 0}</span></div><div class="tile"><b>${u ? Math.max(...u) : "–"}</b><span>massimo</span></div></div>${u ? `<div style="margin-top:12px"><div class="s">ULTIME ${u.length} PARTITE (vecchia → recente)</div>${spark(u, null, MU)}</div>` : `<div class="s" style="margin-top:10px">Ultime partite non disponibili.</div>`}</div>`;
  }
  h += `<div class="cap">Oggi non gioca (o non è nelle partite del giorno scelto): qui vedi la sua forma. Le stime e le soglie compaiono nei giorni in cui scende in campo.</div>`;
  APP.innerHTML = h;
}


// Seguiti: i giocatori e le squadre con la ☆, con forma recente, stato infortunio e partita di oggi
async function vistaSeguiti() {
  const top = topBar() + segEsplora("w"), P = pref();
  if (!P.pl.length && !P.sq.length) { APP.innerHTML = top + `<div class="vuoto">Non segui ancora nessuno. Tocca la ☆ accanto a una squadra o a un giocatore e li ritrovi qui, con forma e infortuni.</div><a class="chipbtn" href="#/cerca">Cerca un giocatore</a>`; return; }
  APP.innerHTML = top + skel();
  let D = null, inf = { giocatori: [] };
  try { D = await dati(); } catch {}
  try { inf = await api("/api/infortunati", 300000); } catch {}
  const stato = {}; for (const x of inf.giocatori || []) if (x.pid) stato[String(x.pid)] = x;
  const oggi = (sq) => { const p = D && D.partite.find((g) => g.casa === sq || g.trasf === sq); return p ? `${p.casa === sq ? "contro " + p.trasf : "a " + p.casa} · ${p.stato === "pre" ? String(p.ora).slice(-5) : p.stato === "in" ? "in corso" : "finita"}` : "oggi non gioca"; };
  const schede = await Promise.all(P.pl.slice(0, 12).map((x) => api("/api/giocatore?pid=" + encodeURIComponent(x.pid), 600000).then((S) => ({ x, S })).catch(() => ({ x, S: null }))));
  const med = (a) => (a && a.length ? a.reduce((p, q) => p + q, 0) / a.length : null);
  let h = top;
  if (P.sq.length) h += `<h2>Squadre</h2><div class="card">` + P.sq.map((ab, i) => `<a class="riga rg" href="#/squadra/${esc(ab)}" style="color:inherit${i ? "" : ";border-top:0"}"><div class="lg">${logo(ab, 26)}<b>${esc(nomeSq(D && D.squadre, ab))}</b></div><span class="s">${esc(oggi(ab))}</span></a>`).join("") + `</div>`;
  if (schede.length) h += `<h2>Giocatori</h2>` + schede.map(({ x, S }) => {
    const i = stato[String(x.pid)], c = i ? (i.stato === "out" ? RD : AM) : GR, et = i ? (i.stato === "out" ? "Fuori" : "Dubbio") : "Disponibile";
    const u = S && S.ult && S.ult.pts, mu = med(u), m = S ? S.pts : null, fr = mu != null && m ? (mu > m + 1 ? "▲" : mu < m - 1 ? "▼" : "=") : "";
    return `<a class="card riga" href="#/giocatore/${esc(x.pid)}" style="padding:10px 12px;color:inherit"><div class="lg">${foto(x.pid, 44)}<div style="min-width:0"><b>${esc(x.nome)}</b><div class="s">${esc(oggi(x.sq))}</div><div class="s">${mu != null ? `ultime ${u.length}: ${mu.toFixed(1)} pt ${fr}${m ? ` (stagione ${m.toFixed(1)})` : ""}` : "forma non disponibile"}</div></div></div><span class="s" style="color:${c};font-weight:600;white-space:nowrap">${et}</span></a>`;
  }).join("");
  APP.innerHTML = h;
}
// notizie delle squadre che segui, in Home (si caricano dopo, senza fermare la pagina)
async function notizieHome() {
  const el = document.getElementById("hnews"); if (!el) return;
  const sq = pref().sq.slice(0, 3); if (!sq.length) return;
  try {
    const R = await Promise.all(sq.map((s) => api("/api/news?s=" + encodeURIComponent(s), 300000).then((r) => r.news.slice(0, 2).map((n) => ({ ...n, s }))).catch(() => [])));
    const l = R.flat().sort((a, b) => String(b.data).localeCompare(String(a.data))).slice(0, 4); if (!l.length || !document.getElementById("hnews")) return;
    el.innerHTML = `<h2>Notizie dei tuoi preferiti</h2><div class="card" style="padding:4px 12px">` + l.map((n, i) => `<a class="riga rg" href="${esc(n.url)}" target="_blank" rel="noopener" style="color:inherit${i ? "" : ";border-top:0"}"><div class="lg" style="align-items:flex-start">${logo(n.s, 20)}<div style="min-width:0"><div style="font-weight:500;line-height:1.3">${esc(n.titoloIt || n.titolo)}</div><div class="s">${esc(quandoFa(n.data))}</div></div></div></a>`).join("") + `</div><a class="chipbtn" href="#/news">Tutte le notizie</a>`;
  } catch {}
}
