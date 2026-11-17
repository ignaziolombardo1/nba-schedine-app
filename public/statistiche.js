// NBA Schedine - statistiche.js: statistiche del registro e schedine condivise con un link (vedi CLAUDE.md)
"use strict";
function vistaStatistiche() {
  const top = topBar() + segStorico("t");
  const reg = ls.get("registro", []).filter((r) => r.esito === 0 || r.esito === 1);
  if (reg.length < 5) { APP.innerHTML = top + `<div class="vuoto">Servono almeno 5 giocate chiuse nel registro per le statistiche (ora ne hai ${reg.length}). Segna Vinta o Persa e torna qui.</div>`; return; }
  const saldoR = (r) => (r.esito === 1 ? (r.puntata || 0) * ((r.quota || 1) - 1) : -(r.puntata || 0));
  const gruppo = (chiave) => { const m = new Map(); for (const r of reg) { const k = chiave(r); if (k == null) continue; const g = m.get(k) || { n: 0, ok: 0, saldo: 0, pun: 0, prev: 0 }; g.n++; g.ok += r.esito; g.saldo += saldoR(r); g.pun += r.puntata || 0; g.prev += r.prob || 0; m.set(k, g); } return m; };
  const riga = (k, g) => { const real = g.ok / g.n, prev = g.prev / g.n; return `<div class="riga rg"><div style="min-width:0"><b>${esc(k)}</b><div class="s">${g.n} giocate · centrate ${pct(real)}${prev ? ` · previste ${pct(prev)}` : ""}</div></div><b style="color:${g.saldo >= 0 ? GR : RD}">${eur(g.saldo)}</b></div>`; };
  const sezione = (titolo, m, ordine) => { const e = [...m.entries()]; if (ordine) e.sort((a, b) => ordine.indexOf(a[0]) - ordine.indexOf(b[0])); else e.sort((a, b) => b[1].saldo - a[1].saldo); return e.length ? `<h2>${titolo}</h2><div class="card" style="padding:4px 12px">${e.map(([k, g]) => riga(k, g)).join("")}</div>` : ""; };
  const tot = [...gruppo(() => "x").values()][0], roi = tot.pun ? tot.saldo / tot.pun : 0;
  let h = top + `<div class="card gm" style="--ca:${tot.saldo >= 0 ? "#1c3a2a" : "#3a1c1c"};--cb:transparent"><div class="s">Su ${tot.n} giocate chiuse</div><div style="font-size:30px;font-weight:700;color:${tot.saldo >= 0 ? GR : RD}">${eur(tot.saldo)}</div><div class="s">centrate ${pct(tot.ok / tot.n)} · previste ${pct(tot.prev / tot.n)} · rendimento ${Math.round(roi * 100)}%</div></div>`;
  const dif = tot.ok / tot.n - tot.prev / tot.n;
  h += `<div class="cap" style="margin-top:6px">${Math.abs(dif) < 0.05 ? "Il modello è in linea con i tuoi risultati." : dif < 0 ? `Stai centrando il ${Math.round(-dif * 100)}% in meno di quanto previsto: conviene fidarsi meno delle probabilità alte.` : `Stai centrando il ${Math.round(dif * 100)}% in più di quanto previsto: il modello è prudente.`}</div>`;
  const fasce = ["Sotto il 40%", "40-60%", "60-80%", "Oltre l'80%"], f = (p) => (p < 0.4 ? fasce[0] : p < 0.6 ? fasce[1] : p < 0.8 ? fasce[2] : fasce[3]);
  h += sezione("Per probabilità prevista", gruppo((r) => (r.prob ? f(r.prob) : null)), fasce);
  h += graficoPagella(reg);
  const qf = ["Sotto 2", "Da 2 a 5", "Da 5 a 10", "Oltre 10"], q = (x) => (x < 2 ? qf[0] : x < 5 ? qf[1] : x < 10 ? qf[2] : qf[3]);
  h += sezione("Per quota", gruppo((r) => (r.quota ? q(r.quota) : null)), qf);
  h += sezione("Per tipo di giocata", gruppo((r) => r.tipo || "Altro"));
  const gs = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];
  h += sezione("Per giorno della settimana", gruppo((r) => { const d = new Date(r.data + "T12:00:00"); return isNaN(d) ? null : gs[(d.getDay() + 6) % 7]; }), gs);
  h += `<div class="cap">Calcolato sul tuo registro. Con poche giocate per gruppo i numeri oscillano molto: guarda i gruppi con almeno 8-10 giocate.</div>`;
  APP.innerHTML = h;
}

// condivisione di una schedina con un link (si apre senza installare l'app)
async function condividiLink(r) {
  try {
    const legs = (r.legs && r.legs.length ? r.legs : String(r.testo || "").split(" + ").map((t) => ({ testo: t })));
    const res = await fetch("/api/condividi", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nome: r.nome, data: r.data, quota: r.quota, puntata: r.puntata, prob: r.prob, legs }) });
    const j = await res.json(); if (!res.ok || !j.id) throw new Error(j.errore || j.error || "errore");
    const url = location.origin + "/#/s/" + j.id;
    if (navigator.share) { try { await navigator.share({ title: r.nome || "Schedina", url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    try { await navigator.clipboard.writeText(url); alert("Link copiato:\n" + url); } catch { prompt("Copia il link:", url); }
  } catch (e) { alert("Non riesco a creare il link: " + e.message); }
}
async function vistaCondivisa(id) {
  APP.innerHTML = `<div class="top"><div class="lg"><b>NBA Schedine</b></div></div>` + skel();
  let S; try { S = await api("/api/condiviso?id=" + encodeURIComponent(id), 0); } catch { APP.innerHTML = `<div class="vuoto">Schedina non trovata: il link potrebbe essere sbagliato.</div><a class="chipbtn" href="#/">Apri l'app</a>`; return; }
  const ic = (e) => (e === 1 ? `<span style="color:${GR}">✓</span>` : e === 0 ? `<span style="color:${RD}">✗</span>` : e === 2 ? "–" : "·");
  const prese = S.legs.filter((l) => l.esito === 1).length, perse = S.legs.some((l) => l.esito === 0);
  APP.innerHTML = `<div class="top"><div class="lg"><b>NBA Schedine</b></div></div><h2>${esc(S.nome)}</h2><div class="card" style="padding:4px 12px">` + S.legs.map((l, i) => `<div class="riga rg" style="${i ? "" : "border-top:0"}"><div style="min-width:0"><b>${esc(l.testo)}</b>${l.partita ? `<div class="s">${esc(l.partita)}${l.cur != null ? ` · ora ${esc(l.cur)}` : ""}</div>` : ""}</div><b>${ic(l.esito)}</b></div>`).join("") + `</div>` +
    `<div class="card"><div class="row3"><div class="tile"><b>${esc(S.quota || "-")}</b><span>quota</span></div><div class="tile"><b>${S.puntata || 0} €</b><span>puntata</span></div><div class="tile"><b>${S.prob ? pct(S.prob) : "-"}</b><span>prevista</span></div></div></div>` +
    `<div class="cap">${perse ? "Schedina persa." : prese === S.legs.length ? "Schedina presa!" : "Lo stato si aggiorna aprendo di nuovo il link."} Stime del modello, non certezze.</div><a class="chipbtn" href="#/">Apri NBA Schedine</a>`;
}
