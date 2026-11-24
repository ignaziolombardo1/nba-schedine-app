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
