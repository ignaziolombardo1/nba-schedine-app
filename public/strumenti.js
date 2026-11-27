// NBA Schedine - strumenti.js: colori a fine partita in Home, valore atteso con la quota, giocatori in forma, budget mensile, copie di sicurezza (vedi CLAUDE.md)
"use strict";
// ---- Home: le giocate sui giocatori delle partite finite diventano verdi o rosse
async function coloraGiocatoriHome(D) {
  const chips = [...document.querySelectorAll("[data-st=post] [data-pk], [data-st=post][data-pk]")]; if (!chips.length) return;
  const ids = new Set(chips.map((c) => c.dataset.pk)), pl = (D.picks || []).filter((x) => ids.has(x.id) && ["Punti", "Rimbalzi", "Assist"].includes(x.tipo)).slice(0, 24); if (!pl.length) return;
  try {
    const j = await (await fetch("/api/valuta-giocate", { method: "POST", body: JSON.stringify({ legs: pl.map(legDa) }) })).json();
    (j.esiti || []).forEach((e, i) => {
      if (!pl[i] || (e.esito !== 0 && e.esito !== 1)) return; ESPL.set(pl[i].id, e.esito);
      const el = document.querySelector(`[data-pk="${CSS.escape(pl[i].id)}"]`); if (el) { el.style.color = e.esito ? GR : RD; if (!/^[✓✗]/.test(el.textContent)) el.prepend(e.esito ? "✓ " : "✗ "); }
    });
  } catch {}
}
// ---- valore atteso: con la quota del bookmaker si vede se la giocata conviene (probabilità × quota − 1)
function quotaRow(x) {
  if (esitoPick(x) != null) return "";
  const q = ls.get("Q_" + x.id, ""), ev = parseFloat(String(q).replace(",", ".")) > 1 ? x.prob * parseFloat(String(q).replace(",", ".")) - 1 : null;
  return `<div class="qrow" data-p="${x.prob}" style="flex:0 0 100%;display:flex;align-items:center;gap:8px;margin-top:6px"><span class="s">Quota del bookmaker</span><input class="qin" data-q="${esc(x.id)}" inputmode="decimal" placeholder="es. 1,85" value="${esc(q)}" style="width:76px;padding:4px 8px;border-radius:8px;border:1px solid var(--line);background:var(--chip);color:var(--txt)"><span class="qev s">${evTesto(ev)}</span></div>`;
}
const evTesto = (ev) => (ev == null ? "" : `<b style="color:${ev >= 0.05 ? GR : ev >= -0.05 ? AM : RD}">${ev >= 0 ? "+" : "−"}${Math.abs(ev * 100).toFixed(0)}% ${ev >= 0.05 ? "conviene" : ev >= -0.05 ? "alla pari" : "non conviene"}</b>`);
document.addEventListener("input", (e) => {
  const t = e.target; if (!t.classList || !t.classList.contains("qin")) return;
  ls.set("Q_" + t.dataset.q, t.value); const row = t.closest(".qrow"), q = parseFloat(String(t.value).replace(",", "."));
  row.querySelector(".qev").innerHTML = evTesto(q > 1 ? parseFloat(row.dataset.p) * q - 1 : null);
});
// ---- giocatori in forma e in calo (ultime 5 partite contro la media stagione)
async function vistaForma() {
  const top = topBar() + segEsplora("f"); APP.innerHTML = top + skel();
  let D; try { D = await dati(); } catch (e) { APP.innerHTML = top + errBox(e); return; }
  const L = [], vis = new Set();
  for (const p of D.partite.filter((g) => g.stato !== "post")) for (const x of p.giocatori || []) {
    const u = x.ult && x.ult.pts, m = x.pts && x.pts.media; if (!u || u.length < 3 || !m || m < 8 || vis.has(x.pid)) continue; vis.add(x.pid);
    const r5 = u.slice(-5), mu = r5.reduce((a, b) => a + b, 0) / r5.length; L.push({ x, p, mu, m, d: mu / m - 1 });
  }
  const riga = (o) => `<a class="card riga" href="#/giocatore/${esc(o.x.pid)}" style="padding:10px 12px;color:inherit"><div class="lg">${foto(o.x.pid, 40)}<div style="min-width:0"><b>${esc(o.x.nome)}</b><div class="s">${logo(o.x.sq, 14)} ${esc(o.x.sq === o.p.casa ? "contro " + o.p.trasf : "a " + o.p.casa)}</div><div class="s">ultime ${Math.min(5, o.x.ult.pts.length)}: ${o.mu.toFixed(1)} pt · stagione ${o.m.toFixed(1)}</div></div></div><span style="display:flex;align-items:center;gap:10px"><b style="color:${o.d >= 0 ? GR : RD};font-size:18px">${o.d >= 0 ? "+" : "−"}${Math.abs(o.d * 100).toFixed(0)}%</b>${(() => { const k = (D.picks || []).find((x) => x.pid === o.x.pid && x.tipo === "Punti"); return k ? addBtn(k) : ""; })()}</span></a>`;
  const caldi = L.filter((o) => o.d >= 0.12).sort((a, b) => b.d - a.d).slice(0, 8), freddi = L.filter((o) => o.d <= -0.12).sort((a, b) => a.d - b.d).slice(0, 8);
  APP.innerHTML = top + `<div class="cap" style="margin-top:0">Chi gioca oggi e sta andando sopra o sotto la sua media stagione nelle ultime 5 partite. Un buon momento non garantisce nulla: serve come spunto da controllare.</div><h2>In forma</h2>${caldi.length ? caldi.map(riga).join("") : `<div class="vuoto">Nessun giocatore molto sopra la media oggi.</div>`}<h2>In calo</h2>${freddi.length ? freddi.map(riga).join("") : `<div class="vuoto">Nessun giocatore molto sotto la media oggi.</div>`}`;
}
// ---- budget mensile: limite di perdita e avviso in Home
const nettoMese = () => { const m = new Date().toISOString().slice(0, 7); return ls.get("registro", []).filter((r) => String(r.data).startsWith(m) && (r.esito === 0 || r.esito === 1)).reduce((t, r) => t + (r.esito === 1 ? (r.puntata || 0) * ((r.quota || 1) - 1) : -(r.puntata || 0)), 0); };
function avvisoBudget() {
  const lim = +(ls.get("budget", {}).perdita || 0); if (!lim) return ""; const persa = -nettoMese(); if (persa < lim * 0.8) return "";
  const sopra = persa >= lim;
  return `<a class="card riga" href="#/impostazioni" style="padding:10px 14px;color:inherit;margin-bottom:10px;border-color:${sopra ? RD : AM}"><div class="lg"><i class="ti ti-alert-triangle" style="font-size:22px;color:${sopra ? RD : AM}"></i><div><b>${sopra ? "Limite mensile raggiunto" : "Vicino al limite mensile"}</b><div class="s">Questo mese hai perso ${persa.toFixed(2).replace(".", ",")} € su ${lim} €${sopra ? ": meglio fermarsi" : ""}</div></div></div></a>`;
}
function cardBudget() {
  const lim = +(ls.get("budget", {}).perdita || 0), persa = Math.max(0, -nettoMese());
  return `<div class="card"><div class="sub" style="margin-top:0"><i class="ti ti-wallet"></i> Budget mensile</div><div class="cap" style="margin:4px 0 8px">Imposta la perdita massima che accetti in un mese. In Home compare un avviso quando arrivi all'80% e quando la raggiungi.</div><div class="riga"><span>Perdita massima (€)</span><input id="bdg" inputmode="decimal" value="${lim || ""}" placeholder="es. 100" style="width:90px;padding:6px 10px;border-radius:8px;border:1px solid var(--line);background:var(--chip);color:var(--txt)"></div>${lim ? `<div class="bar" style="margin-top:8px"><div style="width:${Math.min(100, persa / lim * 100)}%;background:${persa >= lim ? RD : persa >= lim * 0.8 ? AM : GR}"></div></div><div class="s" style="margin-top:4px">Questo mese: −${persa.toFixed(2).replace(".", ",")} € su ${lim} €</div>` : ""}</div>`;
}
document.addEventListener("change", (e) => { if (e.target.id === "bdg") { ls.set("budget", { perdita: Math.max(0, parseFloat(String(e.target.value).replace(",", ".")) || 0) }); if (location.hash.startsWith("#/impostazioni")) route(true); } });
// ---- copie di sicurezza automatiche del registro (una a settimana sul server, le ultime 3)
function cardCopie() {
  return `<div class="card"><div class="sub" style="margin-top:0"><i class="ti ti-history"></i> Copie automatiche</div><div class="cap" style="margin:4px 0 8px">Ogni settimana il server tiene una copia del tuo registro (le ultime 3). Se qualcosa si cancella per sbaglio puoi tornare a una di quelle.</div><button class="chipbtn" id="copieVedi">Mostra le copie</button><div id="copieL"></div></div>`;
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest && e.target.closest("#copieVedi, [data-ripcopia]"); if (!b) return;
  const cod = ls.get("codice", ""); if (!cod) { alert("Serve il codice di sincronizzazione (sezione qui sopra)."); return; }
  try {
    if (b.id === "copieVedi") {
      const j = await (await fetch("/api/copie?codice=" + encodeURIComponent(cod))).json(), el = document.getElementById("copieL");
      el.innerHTML = (j.copie || []).length ? j.copie.map((c) => `<div class="riga" style="margin-top:8px"><span>${new Date(c.t).toLocaleDateString("it-IT", { day: "numeric", month: "long" })} · ${c.n} giocate</span><button class="chipbtn" data-ripcopia="${c.i}">Ripristina</button></div>`).join("") : `<div class="s" style="margin-top:8px">Ancora nessuna copia: la prima si crea dopo la sincronizzazione del registro.</div>`;
    } else if (confirm("Sostituire il registro di questo telefono con la copia scelta?")) {
      const j = await (await fetch(`/api/copia?codice=${encodeURIComponent(cod)}&i=${b.dataset.ripcopia}`)).json();
      if (!Array.isArray(j.registro)) throw new Error("copia non valida"); ls.set("registro", j.registro); alert("Registro ripristinato."); location.hash = "#/registro";
    }
  } catch (er) { alert("Non riesco: " + er.message); }
});

// «+N» sulle schede partita: mostra le etichette nascoste senza aprire la partita
document.addEventListener("click", (e) => {
  const b = e.target.closest && e.target.closest(".chip.more"); if (!b) return;
  e.preventDefault(); e.stopPropagation(); const r = b.nextElementSibling; if (r && r.classList.contains("resto")) { r.hidden = false; r.style.display = "contents"; b.remove(); }
}, true);

// Esiti: le tue giocate del giorno scelto con il saldo, sopra il riepilogo del modello
function bloccoMieGiornata() {
  const y = String(typeof giorno === "number" ? etGiorno(giorno).ymd : giorno).replace(/\D/g, ""), d = y.slice(0, 4) + "-" + y.slice(4, 6) + "-" + y.slice(6, 8);
  const R = ls.get("registro", []).filter((r) => String(r.data) === d); if (!R.length) return "";
  const ch = R.filter((r) => r.esito === 0 || r.esito === 1), saldo = ch.reduce((t, r) => t + (r.esito === 1 ? (r.puntata || 0) * ((r.quota || 1) - 1) : -(r.puntata || 0)), 0), ok = ch.filter((r) => r.esito === 1).length;
  return `<h2>Le tue giocate</h2><div class="card" style="padding:4px 12px">` + R.map((r, i) => `<div class="riga rg" style="${i ? "" : "border-top:0"}"><div style="min-width:0"><b>${esc(r.nome || "Schedina")}</b><div class="s">quota ${r.quota} · ${r.puntata} €</div></div><b style="color:${r.esito === 1 ? GR : r.esito === 0 ? RD : "var(--mut)"}">${r.esito === 1 ? "Vinta" : r.esito === 0 ? "Persa" : "In attesa"}</b></div>`).join("") + `<div class="riga rg"><b>${ch.length ? `${ok} su ${ch.length} prese` : "Nessuna ancora chiusa"}</b><b style="color:${saldo >= 0 ? GR : RD}">${ch.length ? eur(saldo) : ""}</b></div></div>`;
}

// ---------- profilo personale: nome, squadra del cuore (colore dell'app), preferiti e riepilogo
function applicaProfilo() {
  const pf = ls.get("profilo", null); let c = pf && pf.col;
  if (!c || !/^#[0-9a-f]{6}$/i.test(c)) { OR = "#ff8a2a"; document.documentElement.style.removeProperty("--or"); return; }
  let [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255; // colori scuri si schiariscono, per restare leggibili sullo sfondo
  if (lum < 0.45) { const k = (0.55 - lum) / (1 - lum); r = Math.round(r + (255 - r) * k); g = Math.round(g + (255 - g) * k); b = Math.round(b + (255 - b) * k); }
  OR = "#" + [r, g, b].map((v) => Math.min(255, v).toString(16).padStart(2, "0")).join("");
  document.documentElement.style.setProperty("--or", OR);
}
async function vistaProfilo() {
  APP.innerHTML = topBar() + skel();
  let D = null; try { D = await dati(); } catch {}
  const pf = ls.get("profilo", {}), P = pref(), reg = ls.get("registro", []).filter((r) => r.esito === 0 || r.esito === 1);
  const vinte = reg.filter((r) => r.esito === 1), perc = reg.length ? Math.round(vinte.length / reg.length * 100) : null;
  const migl = vinte.slice().sort((a, b) => (b.quota || 0) - (a.quota || 0))[0], mese = nettoMese();
  const sqs = D && D.squadre ? Object.keys(D.squadre).sort((a, b) => nomeSq(D.squadre, a).localeCompare(nomeSq(D.squadre, b), "it")) : [];
  let h = topBar() + `<div class="card pfh2"><div class="av">${pf.sq ? logo(pf.sq, 40) : `<i class="ti ti-user"></i>`}</div><div style="flex:1;min-width:0"><input id="pfn" maxlength="24" placeholder="Il tuo nome" value="${esc(pf.nome || "")}" aria-label="Il tuo nome"><div class="s">${pf.sq ? "Tifi " + esc(nomeSq(D && D.squadre, pf.sq)) : "Scegli la squadra del cuore: colora l'app"}</div></div><button class="chipbtn" id="pfMod">Squadra</button></div>`;
  h += `<h2>Squadra del cuore</h2><div class="card"><div class="cuore">${sqs.length ? sqs.map((ab) => `<button data-cuore="${esc(ab)}" class="${pf.sq === ab ? "on" : ""}" aria-label="${esc(nomeSq(D.squadre, ab))}">${logo(ab, 40)}</button>`).join("") : `<div class="s" style="grid-column:1/-1">Elenco squadre non disponibile ora.</div>`}</div>${pf.sq ? `<button class="chipbtn" id="cuoreNo" style="margin-top:10px">Togli la squadra del cuore</button>` : ""}</div>`;
  h += `<h2>I miei numeri</h2><div class="pfk"><div class="card"><div class="s">Saldo del mese</div><b style="color:${mese >= 0 ? GR : RD}">${typeof eur === "function" ? eur(mese) : mese.toFixed(2)}</b></div><div class="card"><div class="s">Giocate centrate</div><b>${perc == null ? "–" : perc + "%"}</b><div class="s">${vinte.length} su ${reg.length}</div></div></div>`;
  if (migl) h += `<div class="card" style="margin-top:8px"><div class="s">Giocata migliore</div><b>${esc(migl.nome || migl.testo || "Schedina")}</b><div class="s">quota ${(+migl.quota || 0).toFixed(2).replace(".", ",")} · ${esc(String(migl.data || ""))}</div></div>`;
  h += blocchiProfilo();
  h += `<h2>I miei preferiti</h2>`;
  if (!P.sq.length && !P.pl.length) h += `<div class="vuoto">Nessun preferito. Tocca la ☆ accanto a una squadra o a un giocatore per seguirlo.</div>`;
  else {
    if (P.sq.length) h += `<div class="card">` + P.sq.map((ab, i) => `<div class="riga rg" style="${i ? "" : "border-top:0"}"><a class="lg" href="#/squadra/${esc(ab)}" style="color:inherit">${logo(ab, 26)}<b>${esc(nomeSq(D && D.squadre, ab))}</b></a>${stella("sq", ab)}</div>`).join("") + `</div>`;
    if (P.pl.length) h += `<div class="card">` + P.pl.map((x, i) => `<div class="riga rg" style="${i ? "" : "border-top:0"}"><a class="lg" href="#/giocatore/${esc(x.pid)}" style="color:inherit">${foto(x.pid, 30)}<div><b>${esc(x.nome)}</b><div class="s">${esc(nomeSq(D && D.squadre, x.sq))}</div></div></a>${stella("pl", x.pid, x.nome, x.sq)}</div>`).join("") + `</div>`;
    if (P.gm.length) h += `<div class="cap">Hai ${P.gm.length} ${P.gm.length === 1 ? "partita" : "partite"} con la campanella.</div>`;
  }
  { const nt = P.nt || { gg: 1, pr: 1, sc: 1 }, sw = (k, t, d) => `<div class="riga rg" style="${k === "gg" ? "border-top:0" : ""}"><div style="min-width:0"><b>${t}</b><div class="s">${d}</div></div><button class="chipbtn${nt[k] === 0 ? "" : " on"}" data-nt="${k}" style="min-width:64px">${nt[k] === 0 ? "No" : "Sì"}</button></div>`;
    h += `<h2>Notifiche</h2><div class="card">${sw("gg", "Riepilogo delle 9", "Ogni mattina alle 9: le giocate e le schedine di stanotte (o di oggi)")}${sw("pr", "Partite che segui", "Promemoria 30 minuti prima, quintetti ufficiali, inizio, intervallo, finale punto a punto e risultato, per le squadre e i giocatori preferiti e le partite con la campanella")}${sw("sc", "Le mie schedine", "Quasi presa, presa, persa, giocatore fuori o rientrato, quintetti ufficiali, riepilogo serale")}</div><div class="cap" id="ntst"></div>`; }
  h += `<a class="chipbtn" href="#/seguiti" style="display:inline-block;margin:6px 6px 0 0">Forma e infortuni dei preferiti</a><a class="chipbtn" href="#/cerca" style="display:inline-block;margin-top:6px">Cerca un giocatore</a>`;
  h += cardSilenzio() + cardHomeSuMisura() + cardUI() + hubStrumenti();
  h += `<h2>Altro</h2><div class="card"><a class="riga rg" href="#/impostazioni" style="color:inherit;border-top:0"><span><i class="ti ti-settings"></i> Impostazioni, notifiche e codice di sincronizzazione</span><i class="ti ti-chevron-right"></i></a><a class="riga rg" href="#/statistiche" style="color:inherit"><span><i class="ti ti-chart-bar"></i> Statistiche del registro</span><i class="ti ti-chevron-right"></i></a><a class="riga rg" href="#/diag" style="color:inherit"><span><i class="ti ti-stethoscope"></i> Controllo dei dati · versione ${VERSIONE}</span><i class="ti ti-chevron-right"></i></a></div>`;
  { // ordine: intestazione, numeri, notifiche, serie e badge, squadra del cuore, poi il resto
    const pz = h.split(/(?=<h2>)/), tr = (t) => pz.findIndex((x) => x.startsWith("<h2>" + t));
    const ord = ["I miei numeri", "Notifiche", "Serie e badge", "Squadra del cuore"].map(tr);
    if (ord.every((i) => i > 0)) { const resto = pz.filter((_, i) => i > 0 && !ord.includes(i)); h = pz[0] + ord.map((i) => pz[i]).join("") + resto.join(""); }
  }
  APP.innerHTML = h;
  const pm = document.getElementById("pfMod"); if (pm) pm.onclick = () => { const c = APP.querySelector(".cuore"); if (c) c.scrollIntoView({ behavior: "smooth", block: "center" }); };
  const n = document.getElementById("pfn"); if (n) n.onchange = () => { const v = ls.get("profilo", {}); v.nome = n.value.trim(); ls.set("profilo", v); };
  APP.querySelectorAll("[data-cuore]").forEach((b) => b.onclick = () => { const ab = b.dataset.cuore, v = ls.get("profilo", {}); v.sq = ab; v.col = D.squadre[ab].c; ls.set("profilo", v); applicaProfilo(); vistaProfilo(); });
  APP.querySelectorAll("[data-nt]").forEach((b) => b.onclick = () => { const v = ls.get("pref", null) || { sq: [], pl: [], gm: [] }; v.nt = { gg: 1, pr: 1, sc: 1, ...(v.nt || {}) }; v.nt[b.dataset.nt] = v.nt[b.dataset.nt] === 0 ? 1 : 0; ls.set("pref", v); sincPref(); vistaProfilo(); });
  try { const reg = "serviceWorker" in navigator && "PushManager" in window ? await navigator.serviceWorker.ready : null, sb = reg ? await reg.pushManager.getSubscription() : null, st = document.getElementById("ntst"); if (st) st.innerHTML = sb ? "Notifiche attive su questo telefono." : `Notifiche non attive su questo telefono: <a href="#/impostazioni" style="color:var(--or)">attivale dalle Impostazioni</a>.`; } catch {}
  const no = document.getElementById("cuoreNo"); if (no) no.onclick = () => { const v = ls.get("profilo", {}); delete v.sq; delete v.col; ls.set("profilo", v); applicaProfilo(); vistaProfilo(); };
}

// ---------- «Perché questa linea?»: stima, linea scelta, cosa conta e cosa no
const vir = (n) => String(Math.round(n * 10) / 10).replace(".", ",");
function perche(x) {
  const d = x.det;
  if (!d) return `<div class="cap">${esc(x.motivo || "")}</div>`;
  const lm = /over ([\d.]+)/.exec(x.testo || ""), linea = lm ? +lm[1] : null, u = x.tipo === "Punti" ? "punti" : x.tipo === "Rimbalzi" ? "rimbalzi" : "assist";
  const stima = +x.stima, riga = (s, t, v, cl) => `<div class="fa"><i class="${cl}">${s}</i><span>${t}</span><span class="v ${cl === "dn" ? "dn" : ""}">${v}</span></div>`;
  const su = (v) => (linea != null && v >= linea ? ["▲", "up"] : ["▼", "dn"]), rs = (a, t, v) => riga(a[0], t, v, a[1]);
  const rows = [];
  rows.push(rs(su(d.st), "Media della stagione", vir(d.st)));
  if (d.f10 != null) rows.push(rs(su(d.f10), `Ultime ${d.nf} partite`, vir(d.f10)));
  else rows.push(riga("•", "Ultime partite", "non disponibili: uso solo la stagione", "no"));
  rows.push(riga("•", "Minuti attesi" + (d.minBase - d.min >= 0.5 ? " (ridotti: partita probabilmente decisa presto)" : ""), vir(d.min), "no"));
  if (d.dif != null) rows.push(riga(d.dif >= 0 ? "▲" : "▼", d.dif >= 0 ? "Difesa avversaria più debole della media" : "Difesa avversaria più dura della media", (d.dif > 0 ? "+" : "") + vir(d.dif) + "%", d.dif >= 0 ? "up" : "dn"));
  if (d.ass && d.ass.length && d.boost) rows.push(riga("▲", `Compagni fuori (${esc(d.ass.join(", "))}): più spazio`, "+" + vir(d.boost), "up"));
  if (d.mk) rows.push(riga(d.mk.linea >= (linea || 0) ? "▲" : "▼", `Linea del bookmaker (modello da solo: ${vir(d.vm)})`, vir(d.mk.linea), d.mk.linea >= (linea || 0) ? "up" : "dn"));
  if (d.emp) rows.push(riga(d.emp.h / d.emp.n >= 0.7 ? "▲" : "▼", `Ha superato ${vir(linea)} nelle ultime ${d.emp.n}`, `${d.emp.h} su ${d.emp.n}`, d.emp.h / d.emp.n >= 0.7 ? "up" : "dn"));
  const pm = d.mk && d.lad.find((l) => l[0] === d.mk.linea);
  const testo = `L'app stima <b>${vir(stima)}</b> ${u}, ma consiglia <b>${vir(linea)}</b>: è la linea più alta che supera almeno il 70% delle volte (qui ${pct(x.prob)}, dopo la taratura sullo Storico e il rischio che non scenda in campo). È prudente di proposito: più sale la linea, più rende ma meno spesso si centra.${d.mk && linea != null && d.mk.linea - linea >= 2 ? ` Il bookmaker ha messo la linea a <b>${vir(d.mk.linea)}</b>${pm ? `: per l'app lì la probabilità è ${Math.round(pm[1] * 100)}%` : ""}.` : ""}`;
  const scala = d.lad.map((l) => `<div class="${l[0] === linea ? "on" : ""}">${vir(l[0])}<b>${Math.round(l[1] * 100)}%</b></div>`).join("");
  return `<details class="pwy"><summary>Perché questa linea?</summary><div class="dual"><div class="or"><span class="s">Stima dell'app</span><b>${vir(stima)} ${u === "punti" ? "pt" : u}</b></div><div><span class="s">Linea scelta</span><b>${vir(linea)} <span class="s">· ${pct(x.prob)}</span></b></div></div><div class="why">${testo}</div><div class="s" style="margin:10px 0 4px">Probabilità del modello di superare ogni linea</div><div class="lad">${scala}</div><div class="s" style="margin:12px 0 2px">Cosa tiene in conto</div>${rows.join("")}<div class="s" style="margin:12px 0 2px">Cosa non tiene in conto</div><div class="fa"><i class="no">–</i><span class="no">Come ha giocato contro questa squadra in particolare</span><span></span></div><div class="fa"><i class="no">–</i><span class="no">Motivazioni, rivalità, serie di vittorie o sconfitte</span><span></span></div><div class="fa"><i class="no">–</i><span class="no">Viaggi, meteo, ruolo nei finali di partita</span><span></span></div></details>`;
}
