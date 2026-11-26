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
