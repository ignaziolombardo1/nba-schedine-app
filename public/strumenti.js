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
