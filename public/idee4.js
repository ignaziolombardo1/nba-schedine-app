// NBA Schedine - idee4.js: costruttore guidato, quando uscire, simulatore «e se», diario, tu contro il modello, portafogli, rendiconto stampabile
"use strict";
const HUB = [["#/auto", "ti-sparkles", "Schedina automatica", "Scegli la quota: l'app propone la combinazione più probabile"], ["#/costruisci", "ti-wand", "Costruisci una schedina", "Passo passo, con il controllo delle giocate legate"], ["#/esese", "ti-arrows-shuffle", "Simulatore «e se»", "Cosa sarebbe successo con altre puntate o senza una giocata"], ["#/diario", "ti-notebook", "Diario delle scelte", "Perché hai giocato: lo rivedi accanto all'esito"], ["#/portafogli", "ti-folders", "Portafogli", "Separa le giocate per strategia"], ["#/rendiconto", "ti-file-text", "Rendiconto del mese", "Pagina da stampare o salvare in PDF"], ["#/gruppo", "ti-users-group", "Gruppo di amici", "Classifica privata e sfide sul vincitore"], ["#/playoff", "ti-tournament", "Tabellone playoff", "Pronostici sul primo turno"], ["#/mercato", "ti-arrows-exchange", "Mercato e scambi", "Notizie su firme e contratti"], ["#/confronta", "ti-arrows-diff", "Confronto giocatori", "Due giocatori affiancati"], ["#/premi", "ti-trophy", "Corsa ai premi", "I più produttivi della stagione"], ["#/ideale", "ti-star", "Squadra ideale della notte", "I cinque più produttivi stasera"], ["#/valore", "ti-radar", "Radar del valore", "Stima contro quota del bookmaker"], ["#/glossario", "ti-book-2", "Glossario", "Che cosa significano linea, over, quota…"], ["#/chiedi", "ti-message-question", "Chiedi al modello", "Domande sulla serata"]];
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
