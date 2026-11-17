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
