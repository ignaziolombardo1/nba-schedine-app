// NBA Schedine - giocatore.js (parte dell'app: i file si caricano in ordine da index.html, vedi CLAUDE.md)
"use strict";
// ---------- GIOCATORE
async function vistaGiocatore(pid) {
  const back = `<a class="back" href="javascript:history.back()"><i class="ti ti-chevron-left"></i>Indietro</a>`;
  APP.innerHTML = back + skel();
  let D; try { D = await dati(false); } catch (e) { APP.innerHTML = back + errBox(e); return; }
  let x = null, p = null;
  for (const g of D.partite) { const f = g.giocatori.find((q) => String(q.pid) === String(pid)); if (f) { x = f; p = g; break; } }
  if (!x) { await schedaGiocatoreLibero(pid, back); return; }
  const avv = x.sq === p.casa ? p.trasf : p.casa, dub = x.inf === "dubbio" ? `<span class="pill" style="color:${AM};margin-left:6px">Dubbio</span>` : "";
  let h = back + `<div class="card gm" style="--ca:${T(D, x.sq).c};--cb:transparent"><div class="lg">${foto(x.pid, 64)}<div style="min-width:0"><div class="nome" style="font-size:26px">${esc(x.nome)}${stella("pl", x.pid, x.nome, x.sq)}${dub}</div><div class="s">${logo(x.sq, 16)} ${esc(T(D, x.sq).n)} · contro ${esc(T(D, avv).b)} · ${esc(p.ora)}</div><div class="s">${Math.round(x.min)} minuti attesi${x.conForma ? " · con forma recente" : " · solo media stagione"}</div></div></div>${x.assenze ? `<div class="s" style="margin-top:8px;color:${AM}">Assenti in squadra: ${esc(x.assenze.join(", "))}. Una parte dei loro numeri passa a questo giocatore.</div>` : ""}</div>`;
  for (const [m, c] of Object.entries(MERC)) {
    const o = x[c.k], u = x.ult && x.ult[c.k];
    h += `<h2>${m}</h2><div class="card"><div class="row3"><div class="tile on"><b>${o.v.toFixed(1)}</b><span>stima per questa partita</span></div><div class="tile"><b>${o.media.toFixed(1)}</b><span>media stagione</span></div><div class="tile"><b>${u ? (u.reduce((a, b) => a + b, 0) / u.length).toFixed(1) : "–"}</b><span>ultime ${u ? u.length : 0}</span></div></div>`;
    if (u) {
      const sg = o.rec != null ? o.rec : o.lad.length ? o.lad[Math.floor(o.lad.length / 2)][0] : null, su = sg != null ? u.filter((v) => v > sg).length : null;
      h += `<div style="margin-top:12px"><div class="riga s"><span>ULTIME ${u.length} GARE (vecchia → recente)</span>${sg != null ? `<span>soglia ${sg}: superata ${su} volte su ${u.length}</span>` : ""}</div>${spark(u, sg, MU)}</div>`;
    } else h += `<div class="s" style="margin-top:10px">Ultime partite non ancora disponibili.</div>`;
    h += o.rec != null ? `<div style="margin-top:10px"><span class="s">CONSIGLIATO</span><div style="font-weight:600;color:${GR}">over ${o.rec} ${c.u} · ${pct(o.lad.find((q) => q[0] === o.rec)[1])}</div></div>` : `<div class="s" style="margin-top:10px">Nessuna soglia sopra il 70%.</div>`;
    h += `<div class="lad">${o.lad.map(([t, pr]) => `<span style="color:${pr >= 0.7 ? GR : pr >= 0.5 ? AM : MU}">over ${t} · ${pct(pr)}</span>`).join("")}</div></div>`;
  }
  h += `<a class="btn" style="display:block;text-align:center" href="#/partita/${p.id}">Apri la partita</a>`;
  APP.innerHTML = h;
}


// probabilità di una giocata scritta a mano, dal modello (stima e variabilità dei giocatori, totale e squadre)
function probCustom(g, c) {
  const over = (v, sd, t) => 1 - phi((t - v) / sd);
  let v, sd, nome = "", pid = null, sq = null, k = c.k;
  if (k === "win") {
    const casa = c.sq === g.casa, p = casa ? g.r.pw : 1 - g.r.pw, nm = T(window.__D, c.sq).b, m = casa ? g.r.margine : -g.r.margine;
    return { id: "mio_" + Date.now() + Math.random().toString(36).slice(2, 6), chiave: null, testo: `${casa ? "1" : "2"} · ${nm} vince`, prob: p, partita: `${g.casa} - ${g.trasf}`, g: g.id, pid: null, sq: c.sq, k: "win", dir: "over", soglia: null, nome: null, mia: true, stima: m };
  }
  if (k === "tot") { v = g.r.totale; sd = 17; nome = "Totale"; }
  else if (k === "sq") { v = c.sq === g.casa ? g.r.ptCasa : g.r.ptTr; sd = 12; sq = c.sq; nome = T(window.__D, c.sq).b; }
  else { const pl = g.giocatori.find((x) => x.pid === c.pid); if (!pl) return null; const o = pl[k]; v = o.v; sd = o.sd; nome = pl.nome; pid = pl.pid; sq = pl.sq; if (pl.inf === "dubbio") c.pg = (pl[k].pg ?? 0.5); }
  let p = over(v, sd, c.soglia); if (c.dir === "under") p = 1 - p; p *= c.pg || 1;
  const u = k === "pts" ? "pt" : k === "reb" ? "rimb." : k === "ast" ? "ass." : "punti";
  const testo = k === "tot" ? `Totale ${c.dir} ${c.soglia}` : k === "sq" ? `${nome} ${c.dir} ${c.soglia} punti` : `${nome} ${c.dir} ${c.soglia} ${u}`;
  return { id: "mio_" + Date.now() + Math.random().toString(36).slice(2, 6), chiave: null, testo, prob: p, partita: `${g.casa} - ${g.trasf}`, g: g.id, pid, sq, k, dir: c.dir, soglia: c.soglia, nome: k === "tot" || k === "sq" ? null : nome, mia: true, stima: v };
}
async function vistaMia() {
  const back = `<a class="back" href="#/combo"><i class="ti ti-chevron-left"></i>Consigli</a>`;
  barraMia();
  APP.innerHTML = back + `<h2>La mia schedina</h2>` + skel();
  let D = null; try { D = await dati(false); window.__D = D; } catch {}
  const gare = D ? D.partite.filter((x) => x.stato === "pre") : [];
  const preIds = new Set(gare.map((x) => x.id));
  APP.innerHTML = back + `<h2>La mia schedina</h2><div id="miaris"></div><div id="miacos"></div>`;
  // --- riepilogo: giocate scelte, probabilità, quota e salvataggio
  const riepilogo = () => {
    const L = miaLeggi(), el = $("#miaris");
    if (!L.length) {
      const pronte = (D && D.schedine || []).filter((x) => /^q\d+$/.test(x.id));
      el.innerHTML = `<div class="card"><div style="font-weight:600">Nessuna giocata scelta</div><div class="cap" style="margin:4px 0 8px">Parti da una schedina pronta oppure scegli tu le giocate qui sotto.</div>${pronte.length ? `<div class="grid2" style="gap:8px">${pronte.map((x) => `<button class="btn" data-pronta="${esc(x.id)}" style="margin:0">${esc(x.nome.replace("La bomba quota", "Quota"))}<br><span class="s">${pct(x.prob)} · ${x.legs.length} giocate</span></button>`).join("")}</div>` : ""}</div>`;
      el.querySelectorAll("[data-pronta]").forEach((b) => b.onclick = () => {
        const x = pronte.find((q) => q.id === b.dataset.pronta); if (!x) return;
        ls.set("mia", x.legs.map((l) => ({ id: l.id || `${l.g}|${l.tipo}|${l.pid || l.squadra || l.testo}`, ...legDa({ ...l, id: l.id || `${l.g}|${l.tipo}|${l.pid || l.squadra || l.testo}` }) })));
        barraMia(); riepilogo(); lista();
      });
      return;
    }
    const q = L.reduce((a, l) => a / Math.max(0.05, l.prob), 1), p = L.reduce((a, l) => a * l.prob, 1), stessa = new Set(L.map((l) => l.g)).size < L.length;
    el.innerHTML = L.map((l, i) => `<div class="card cardp"><div style="min-width:0"><div class="s">${esc(l.partita)}${l.mia ? " · scelta da te" : ""}</div><div style="font-weight:500">${esc(l.testo)}</div></div><div style="text-align:right"><div class="v" style="color:${colProb(l.prob)}">${pct(l.prob)}</div><button class="chipbtn" data-rm="${i}" style="padding:2px 9px;font-size:11px">Togli</button></div></div>`).join("") +
    `<div class="card"><div class="row3"><div class="tile"><b>${(p * 100).toFixed(0)}%</b><span>tutte centrate</span></div><div class="tile"><b>${q.toFixed(2)}</b><span>quota giusta</span></div><div class="tile"><b>${L.length}</b><span>giocate</span></div></div>${stessa ? `<div class="cap" style="margin:8px 0 0;color:${AM}">Ci sono più giocate della stessa partita: la probabilità reale è diversa da quella calcolata.</div>` : ""}${confrontoMia(L, p, D)}
    <div class="grid2" style="margin-top:10px"><input class="linea" inputmode="decimal" placeholder="Quota offerta (es. 4.50)" id="miaq" style="margin:0"><input class="linea" inputmode="decimal" placeholder="Puntata €" id="miap" value="${impo().puntata}" style="margin:0"></div><div id="miaval"></div>
    <button class="btn" id="miaok" style="margin:6px 0 0"><i class="ti ti-notebook"></i> Salva e segui in diretta</button><div class="grid2" style="gap:8px;margin-top:8px"><button class="btn" id="miacp" style="margin:0"><i class="ti ti-copy"></i> Copia</button><button class="btn" id="miasvuota" style="margin:0">Svuota</button></div></div>`;
    el.querySelectorAll("[data-rm]").forEach((b) => b.onclick = () => { const l = miaLeggi(); l.splice(+b.dataset.rm, 1); ls.set("mia", l); barraMia(); riepilogo(); lista(); });
    $("#miasvuota").onclick = () => { ls.set("mia", []); barraMia(); riepilogo(); lista(); };
    $("#miacp").onclick = async () => { try { await navigator.clipboard.writeText(testoSchedina({ nome: "La mia schedina", legs: L, prob: p })); $("#miacp").textContent = "Copiata ✓"; } catch { $("#miacp").textContent = "Copia non riuscita"; } };
    const mq = $("#miaq");
    mq.oninput = () => { const v = parseFloat(String(mq.value).replace(",", ".")); $("#miaval").innerHTML = v > 1 ? rigaValore(valoreGiocata(p, v)) : ""; };
    $("#miaok").onclick = () => {
      const qq = parseFloat(String(mq.value).replace(",", ".")), pu = parseFloat(String($("#miap").value).replace(",", "."));
      if (!(qq > 1) || !(pu > 0)) { $("#miaok").textContent = "Scrivi la quota (maggiore di 1) e la puntata"; return; }
      const r = ls.get("registro", []); r.unshift({ id: "mia|" + Date.now(), chiave: null, nome: `La mia schedina (${L.length})`, testo: L.map((l) => l.testo).join(" + "), tipo: "Schedina", prob: p, quota: qq, puntata: pu, data: new Date().toISOString().slice(0, 10), esito: null, legs: L });
      ls.set("registro", r); ls.set("mia", []); barraMia(); location.hash = "#/live";
    };
  };
  // --- scelta delle giocate: dai consigli oppure scritte a mano
  const lista = () => {
    const tab = ls.get("miaTab", "c"), el = $("#miacos");
    let h = `<div class="tabs" style="margin-top:14px"><button class="chipbtn${tab === "c" ? " on" : ""}" data-tab="c">Scegli dai consigli</button><button class="chipbtn${tab === "s" ? " on" : ""}" data-tab="s">Scrivi la tua</button></div>`;
    if (!gare.length) h += `<div class="cap">Non ci sono partite da giocare per il giorno selezionato: cambia giorno dalla pagina Consigli.</div>`;
    else if (tab === "c") {
      const cat = Math.min(ls.get("miaCat", 0), SC.length - 1);
      h += `<div class="tabs">${SC.map(([t], i) => `<button class="chipbtn${cat === i ? " on" : ""}" data-cat="${i}">${esc(t)}</button>`).join("")}</div>`;
      const l = (D.picks || []).filter((x) => preIds.has(x.g) && SC[cat][2].includes(x.tipo)).slice(0, 25);
      h += l.length ? l.map(cardPick).join("") : `<div class="vuoto">Nessuna giocata di questo tipo con probabilità sopra il 70%.</div>`;
    } else {
      const C = ls.get("miaForm", { g: "", k: "pts", pid: "", sq: "", dir: "over", soglia: "" }), g = gare.find((x) => x.id === C.g) || gare[0], pl = g.giocatori.slice().sort((a, b) => b.pts.v - a.pts.v);
      const sel = (id, opts, val) => `<select class="linea" id="${id}" style="margin:0">${opts.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(val) ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
      h += `<div class="cap" style="margin-top:0">Scrivi la linea che vedi sul tuo bookmaker: l'app calcola la probabilità.</div><div class="card">${sel("cg", gare.map((x) => [x.id, `${x.casa} - ${x.trasf} · ${String(x.ora).slice(-5)}`]), g.id)}
      <div class="grid2" style="margin-top:8px">${sel("ck", [["pts", "Punti giocatore"], ["reb", "Rimbalzi giocatore"], ["ast", "Assist giocatore"], ["tot", "Totale partita"], ["sq", "Punti di una squadra"], ["win", "Vincente (1 / 2)"]], C.k)}${C.k === "win" ? "" : sel("cd", [["over", "Over"], ["under", "Under"]], C.dir)}</div>
      ${["pts", "reb", "ast"].includes(C.k) ? `<div style="margin-top:8px">${sel("cp", pl.map((x) => [x.pid, `${x.nome} (${x.sq})`]), C.pid || (pl[0] && pl[0].pid))}</div>` : C.k === "sq" ? `<div style="margin-top:8px">${sel("cs", [[g.trasf, g.trasf], [g.casa, g.casa]], C.sq || g.trasf)}</div>` : C.k === "win" ? `<div style="margin-top:8px">${sel("cs", [[g.casa, `1 · ${T(window.__D, g.casa).b} (casa)`], [g.trasf, `2 · ${T(window.__D, g.trasf).b} (trasferta)`]], C.sq || g.casa)}</div>` : ""}
      ${C.k === "win" ? `<input type="hidden" id="cl" value="1">` : `<input class="linea" inputmode="decimal" id="cl" placeholder="Linea del bookmaker (es. 19.5)" value="${esc(C.soglia)}" style="margin:8px 0 0">`}<div id="cprob"></div><button class="btn" id="cadd" style="margin:8px 0 0">Aggiungi alla schedina</button></div>`;
    }
    el.innerHTML = h;
    el.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => { ls.set("miaTab", b.dataset.tab); lista(); });
    el.querySelectorAll("[data-cat]").forEach((b) => b.onclick = () => { ls.set("miaCat", +b.dataset.cat); lista(); });
    if (tab === "s" && gare.length) {
      const leggi = () => ({ g: $("#cg").value, k: $("#ck").value, dir: $("#cd") ? $("#cd").value : "over", pid: $("#cp") ? $("#cp").value : "", sq: $("#cs") ? $("#cs").value : "", soglia: parseFloat(String($("#cl").value).replace(",", ".")) });
      const salvaC = () => { const c = leggi(); ls.set("miaForm", { ...c, soglia: c.k === "win" ? "" : $("#cl").value }); return c; };
      const mostra = () => { const c = salvaC(), g = gare.find((x) => x.id === c.g); if (!g || !(c.soglia > 0)) { $("#cprob").innerHTML = ""; return null; } const r = probCustom(g, c); if (!r) { $("#cprob").innerHTML = ""; return null; } $("#cprob").innerHTML = `<div class="s" style="margin-top:8px">Per il modello: <b style="color:${colProb(r.prob)}">${pct(r.prob)}</b>${r.k === "win" ? ` · scarto stimato ${r.stima >= 0 ? "+" : ""}${r.stima.toFixed(1)}` : ` · stima ${r.stima.toFixed(1)}`}</div>`; return r; };
      for (const id of ["cg", "ck"]) $("#" + id).onchange = () => { salvaC(); lista(); };
      for (const id of ["cd", "cp", "cs"]) if ($("#" + id)) $("#" + id).onchange = () => { salvaC(); mostra(); };
      $("#cl").oninput = mostra; mostra();
      $("#cadd").onclick = () => { const r = mostra(); if (!r) { $("#cadd").textContent = "Scrivi la linea del bookmaker"; return; } const l = miaLeggi(); l.push(r); ls.set("mia", l); barraMia(); riepilogo(); if ($("#cl").type !== "hidden") $("#cl").value = ""; ls.set("miaForm", { ...leggi(), soglia: "" }); mostra(); };
    }
  };
  window.__miaAgg = () => { riepilogo(); };
  riepilogo(); lista();
}

// ---------- SCHEDINE
const TONI = { ok: [GR, "ti-shield-check"], mid: [OR, "ti-scale"], alta: [RD, "ti-flame"] };
// confronto tra la quota pagata e la quota "giusta" (1 / probabilità del modello)
function confQuota(r) {
  if (!(r.prob > 0) || !(r.quota > 1)) return "";
  const giusta = 1 / r.prob, ev = r.prob * r.quota - 1;
  return `<div class="s">quota giusta ${giusta.toFixed(2)} · <b style="color:${ev >= 0 ? GR : RD}">${ev >= 0 ? "valore +" : "valore "}${(ev * 100).toFixed(0)}%</b>${ev < 0 ? " (pagata poco)" : ""}</div>`;
}
// confronto della tua schedina con quello che propone il modello
function confrontoMia(L, p, D) {
  const deboli = L.filter((l) => l.prob < 0.7), pr = ((D && D.schedine) || []).filter((x) => x.legs.length === L.length || x.id === "sicura"), simile = pr.sort((a, b) => Math.abs(a.legs.length - L.length) - Math.abs(b.legs.length - L.length))[0];
  let t = "";
  if (deboli.length) t += `<div class="cap" style="margin:8px 0 0;color:${AM}"><b>${deboli.length} ${deboli.length === 1 ? "giocata è" : "giocate sono"} sotto il 70%</b> per il modello: ${deboli.map((l) => esc(l.testo) + " (" + pct(l.prob) + ")").join("; ")}. Sono quelle che abbassano di più la tua schedina.</div>`;
  else t += `<div class="cap" style="margin:8px 0 0;color:${GR}">Tutte le giocate sono almeno al 70% per il modello.</div>`;
  if (simile) t += `<div class="cap" style="margin:6px 0 0">La più simile proposta dal modello: «${esc(simile.nome)}» con ${simile.legs.length} giocate, si centra il ${pct(simile.prob)} (la tua: ${(p * 100).toFixed(0)}%).</div>`;
  return t;
}
function testoSchedina(s) { return `${s.nome} (${s.legs.length} giocate, probabilità unita ${pct(s.prob)})\n` + s.legs.map((l) => `• ${l.testo} (${l.partita}) ${pct(l.prob)}`).join("\n"); }
function cardSchedina(s) {
  const [col, ic] = TONI[s.tono] || [OR, "ti-ticket"];
  return `<div class="card sch" style="border-top:3px solid ${col};padding:12px 14px"><div class="riga" style="align-items:center"><div><div class="sn"><i class="ti ${ic}" style="color:${col}"></i> ${esc(s.nome)}</div><div class="s">${esc(s.sotto)}</div></div><div style="text-align:right"><div class="sp" style="color:${col}">${pct(s.prob)}</div><div class="s">quota ${s.quotaEqua.toFixed(2)}</div></div></div>
  <div style="margin:8px 0 4px">${s.legs.map((l) => `<div class="leg" style="gap:8px;padding:4px 0">${l.pid ? foto(l.pid, 26) : l.squadra ? logo(l.squadra, 24) : `<span class="ph" style="width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center"><i class="ti ti-chart-bar" style="color:${OR}"></i></span>`}<div style="min-width:0;flex:1"><div style="font-weight:600;font-size:13.5px">${esc(l.testo)}</div><div class="s" style="font-size:11px">${esc(l.partita)} · ${esc(String(l.ora).slice(-5))}</div></div><b style="color:${colProb(l.prob)}">${pct(l.prob)}</b></div>`).join("")}</div>
  ${s.stessaPartita ? `<div class="s" style="color:${AM};margin-bottom:6px">Più giocate della stessa partita: la probabilità reale è diversa.</div>` : ""}
  <div class="grid2" style="gap:8px"><button class="btn cp" data-cp="${esc(testoSchedina(s))}" style="margin:0"><i class="ti ti-share"></i> ${navigator.share ? "Condividi" : "Copia"}</button>${btnRegistro({ id: s.chiave, chiave: s.chiave, nome: s.nome, testo: s.legs.map((l) => l.testo).join(" + "), prob: s.prob })}</div></div>`;
}
async function vistaSchedine(force) {
  APP.innerHTML = topBar() + giorniChips() + skel(); bindGiorni();
  let D; try { D = await dati(force); } catch (e) { APP.innerHTML = topBar() + giorniChips() + errBox(e); bindGiorni(); return; }
  let h = topBar(D) + giorniChips();
  const sc = D.schedine || [];
  h += `<div class="cap" style="margin-top:0">Quota = quota giusta calcolata dalle probabilità: il tuo bookmaker ne paga un po' meno. Stime del modello, nessuna schedina è sicura.</div>`;
  if (!sc.length) h += `<div class="vuoto">Per questo giorno non ci sono abbastanza partite da giocare o giocate sopra la soglia. Le proposte compaiono prima dell'inizio delle partite.</div>`;
  h += sc.map(cardSchedina).join("");
  const singola = D.picks.find((x) => D.partite.find((p) => p.id === x.g && p.stato === "pre"));
  if (singola) h += `<h2>Singola del giorno</h2><div class="card riga" style="gap:12px;border-top:3px solid ${GR}">${anello(singola.prob * 100, colProb(singola.prob), 64)}<div style="min-width:0;flex:1"><div style="font-weight:600;font-size:16px">${esc(singola.testo)}</div><div class="s">${esc(singola.partita)} · stima ${esc(singola.stima)}</div></div></div>${btnRegistro({ id: chiaveGiocata(singola), chiave: chiaveGiocata(singola), nome: "Singola", testo: singola.testo, prob: singola.prob })}<div class="cap">${esc(singola.motivo)}</div>`;
  h += `<div class="cap">Più giocate unisci, meno la schedina è probabile: tre giocate al 80% insieme valgono circa il 51%.</div>`;
  APP.innerHTML = h; bindGiorni(); bindRegistro();
  APP.querySelectorAll(".cp").forEach((b) => b.onclick = async () => { try { if (navigator.share) { await navigator.share({ title: "NBA Schedine", text: b.dataset.cp + "\n\nStime del modello, non certezze." }); return; } await navigator.clipboard.writeText(b.dataset.cp); b.innerHTML = `<i class="ti ti-check"></i> Copiata`; } catch (e) { if (e && e.name === "AbortError") return; try { await navigator.clipboard.writeText(b.dataset.cp); b.innerHTML = `<i class="ti ti-check"></i> Copiata`; } catch { b.textContent = "Copia non riuscita"; } } });
}

// ---------- COMBO

// ---------- RIEPILOGO PER CATEGORIA: tutte le giocate consigliate di un tipo, con le percentuali
async function vistaCategoria(n) {
  const back = `<a class="back" href="#/combo"><i class="ti ti-chevron-left"></i>Consigli</a>`, c = SC[n]; if (!c) { location.hash = "#/combo"; return; }
  APP.innerHTML = back + giorniChips() + skel(); bindGiorni();
  let D; try { D = await dati(false); } catch (e) { APP.innerHTML = back + errBox(e); return; }
  const ord = ls.get("catOrd", "p"), min = ls.get("catMin", 0.7);
  let l = applicaImp(D).picks.filter((x) => c[2].includes(x.tipo) && x.prob >= min);
  l = [...l].sort(ord === "p" ? (a, b) => b.prob - a.prob : (a, b) => String(a.partita).localeCompare(String(b.partita)) || b.prob - a.prob);
  let h = back + giorniChips() + `<h2><i class="ti ${c[1]}"></i> ${esc(c[0])}: tutte le giocate</h2><div class="tabs">${[["p", "Più sicure"], ["g", "Per partita"]].map(([k, t]) => `<button class="chipbtn${ord === k ? " on" : ""}" data-o="${k}">${t}</button>`).join("")}${[0.7, 0.8, 0.9].map((v) => `<button class="chipbtn${min === v ? " on" : ""}" data-m="${v}">≥${Math.round(v * 100)}%</button>`).join("")}</div>`;
  h += `<div class="cap" style="margin-top:0">${l.length} giocate. Quote e linee dei bookmaker compaiono dove disponibili (ESPN fornisce solo totali e spread delle squadre).</div>`;
  h += l.length ? l.map(cardPick).join("") : `<div class="vuoto">Nessuna giocata con questa probabilità minima.</div>`;
  APP.innerHTML = h; bindGiorni(); bindRegistro();
  APP.querySelectorAll("[data-o]").forEach((b) => b.onclick = () => { ls.set("catOrd", b.dataset.o); vistaCategoria(n); });
  APP.querySelectorAll("[data-m]").forEach((b) => b.onclick = () => { ls.set("catMin", +b.dataset.m); vistaCategoria(n); });
}
async function vistaCombo(force) {
  APP.innerHTML = topBar() + giorniChips() + skel(); bindGiorni();
  let D; try { D = await dati(force); } catch (e) { APP.innerHTML = topBar() + giorniChips() + errBox(e); bindGiorni(); return; }
  const gruppi = SC.map(([t, ic, tipi]) => [t, ic, D.picks.filter((x) => tipi.includes(x.tipo))]);
  const scelte = gruppi.map((g) => g[2][0]).filter(Boolean);
  let h = topBar(D) + giorniChips();
  h += riquadriConsigli(D);
  h += `<div class="cap">Per ogni giocata l'app trova la soglia che si supera con probabilità di almeno il 70% secondo il modello. Le percentuali sono stime, non certezze.</div>`;
  if (!D.partite.length) h += `<div class="vuoto">Nessuna partita per questo giorno.</div>`;
  const ess = ls.get("ess", false);
  h += `<label class="sw"><input type="checkbox" id="ess" ${ess ? "checked" : ""}> Vista essenziale (solo le giocate più forti)</label>`;
  if (ess) {
    const f = D.picks.filter((x) => x.prob >= 0.78).slice(0, 15);
    h += f.length ? f.map((x) => `<div class="card riga" style="padding:8px 12px"><div class="lg" style="flex:1">${x.pid ? foto(x.pid, 30) : x.squadra ? logo(x.squadra, 26) : ""}<div style="min-width:0"><b>${esc(x.testo)}</b><div class="s">${esc(x.partita)}</div></div></div><b style="color:${GR}">${pct(x.prob)}</b></div>`).join("") : `<div class="vuoto">Nessuna giocata sopra il 78% per ora.</div>`;
  } else {
    for (const [t, ic, l] of gruppi) {
      if (!l.length) continue;
      h += `<div class="card box"><h3><i class="ti ${ic}"></i>${esc(t)}<a href="#/categoria/${SC.findIndex((q) => q[0] === t)}" style="margin-left:auto;font-size:12px;font-weight:500;color:${OR}">Vedi tutte (${l.length}) <i class="ti ti-chevron-right"></i></a></h3>${l.slice(0, 3).map((x) => rigaPick(D, x)).join("")}</div>`;
      if (l.length > 3) h += `<details><summary>Altre giocate: ${esc(t)} (${l.length - 3})</summary>${l.slice(3).map(cardPick).join("")}</details>`;
    }
    const tutti = D.partite.flatMap((p) => p.giocatori);
    if (tutti.length) {
      h += `<h2>I migliori della giornata</h2><div class="card">`;
      for (const [m, c] of Object.entries(MERC)) {
        h += `<div class="s" style="margin-top:8px">${m.toUpperCase()}</div>` + [...tutti].sort((a, b) => b[c.k].v - a[c.k].v).slice(0, 5).map((p, i) => `<div class="riga" style="padding:3px 0"><span>${i + 1}. <b style="color:${T(D, p.sq).c}">${esc(p.sq)}</b> ${esc(p.nome)}</span><b style="color:${i === 0 ? OR : "#f2f2f2"}">${p[c.k].v.toFixed(1)}</b></div>`).join("");
      }
      h += `</div>`;
    }
  }
  APP.innerHTML = h; bindGiorni(); $("#ess").onchange = (e) => { ls.set("ess", e.target.checked); route(true); };
}

// ---------- STUDIO PARTITA
async function vistaStudio(id, force) {
  APP.innerHTML = `<a class="back" href="#/"><i class="ti ti-chevron-left"></i>Partite</a>` + skel();
  let D; try { D = await dati(force); } catch (e) { APP.innerHTML = `<a class="back" href="#/"><i class="ti ti-chevron-left"></i>Partite</a>` + errBox(e); return; }
  const p = D.partite.find((x) => x.id === id);
  if (!p) { APP.innerHTML = `<a class="back" href="#/"><i class="ti ti-chevron-left"></i>Partite</a><div class="vuoto">Partita non trovata per il giorno selezionato.</div>`; return; }
  const picks = D.picks.filter((x) => x.g === id), r = p.r;
  const mer = ls.get("mercato", "Punti");
  let h = `<a class="back" href="#/"><i class="ti ti-chevron-left"></i>Partite</a>` + schedaPartita(D, p, picks[0], false);
  { const best = [...picks].sort((a, b) => b.prob - a.prob)[0];
    if (best) h += `<div class="gdg" style="margin-top:10px"><div class="gt">Giocata migliore</div><div class="gx">${esc(best.testo)}</div><div class="gp"><b style="color:${colProb(best.prob)}">${Math.round(best.prob * 100)}%</b><span class="s">stima ${esc(best.stima)}</span></div><div class="gb"><i style="width:${Math.round(best.prob * 100)}%"></i></div></div>`; }
  { const n = ls.get("hintNews", 0); if (n < 3) { ls.set("hintNews", n + 1); h += `<div class="cap" style="margin:8px 0 0"><i class="ti ti-news"></i> Tocca il logo di una squadra per la sua pagina e le sue notizie.</div>`; } }
  // 1) i migliori delle due squadre con le loro medie
  if (p.giocatori.length) {
    h += `<h2>I migliori</h2><div class="card">` + [p.casa, p.trasf].map((sq, i) => {
      const ds = [...p.giocatori.filter((x) => x.sq === sq)].sort((a, b) => b.pts.media - a.pts.media).slice(0, 4), stima = i === 0 ? r.ptCasa : r.ptTr;
      return `<div${i ? ' style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line)"' : ""}><div class="riga"><div class="lg">${logo(sq, 26)}<b>${esc(T(D, sq).n)}</b></div><span class="s">stima ${stima.toFixed(0)} punti</span></div>` +
        `<div class="s" style="display:grid;grid-template-columns:1fr 44px 44px 44px;gap:2px 6px;margin-top:6px;text-align:right"><span></span><span>PT</span><span>RB</span><span>AS</span>` +
        ds.map((x) => `<a href="#/giocatore/${esc(x.pid)}" style="text-align:left;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.nome)}${x.inf ? ` <span style="color:${AM}">⚠</span>` : ""}</a><b>${x.pts.media.toFixed(1).replace(".", ",")}</b><b>${x.reb.media.toFixed(1).replace(".", ",")}</b><b>${x.ast.media.toFixed(1).replace(".", ",")}</b>`).join("") + `</div></div>`;
    }).join("") + `<div class="cap" style="margin:8px 0 0">Medie della stagione per partita. Tocca un giocatore per aprire la sua pagina.</div></div>`;
  }
  // 2) consigli della partita divisi per tipo
  const gruppi = { p: ["Partita", (x) => ["Vincente", "Totale"].includes(x.tipo)], s: ["Squadre", (x) => x.tipo === "Squadra"], g: ["Giocatori", (x) => ["Punti", "Rimbalzi", "Assist"].includes(x.tipo)] };
  let stt = ls.get("studioTab", "p"); if (!gruppi[stt]) stt = "p";
  h += `<h2>Consigli partita</h2><div class="seg" id="sttab">${Object.entries(gruppi).map(([k, [n, f]]) => `<a data-stt="${k}"${k === stt ? ' class="on"' : ""}>${n} <span class="s">${picks.filter(f).length}</span></a>`).join("")}</div><div id="stc"></div>`;
  h += `<h2>Testa a testa</h2><div id="h2h"><div class="skel" style="height:70px"></div></div>`;
  h += `<h2>Ultimi incontri</h2><div id="ultime"><div class="skel" style="height:90px"></div></div>`;
  const lt = D.linee["tot_" + p.casa] ?? (r.mk && r.mk.tot ? r.mk.tot.linea : undefined), lineaT = ls.get("L_tot_" + id, lt ?? "");
  h += `<h2>Totale e spread</h2><div class="card"><div class="s">Over/Under (punti totali)</div>${gauge(r.totale, lineaT)}<div id="totp" class="s"></div><input class="linea" id="lt" inputmode="decimal" placeholder="Linea Over/Under (es. 224.5)" value="${esc(lineaT)}">${mercatoPartita(p)}</div>`;
  if (p.giocatori.length) {
    h += `<h2>Giocatori</h2><div class="tabs">${Object.keys(MERC).map((m) => `<button class="chipbtn${m === mer ? " on" : ""}" data-m="${m}">${m}</button>`).join("")}</div>`;
    const c = MERC[mer];
    for (const sq of [p.casa, p.trasf]) {
      h += `<div class="sub">${esc(T(D, sq).n)}</div>`;
      h += p.giocatori.filter((x) => x.sq === sq).slice(0, 10).map((x) => schedaGiocatore(D, id, x, mer, c)).join("");
    }
  }
  if (p.inf && p.inf.length) h += `<h2>Infortuni segnalati</h2>` + p.inf.map((i) => `<div class="card" style="padding:9px 12px"><b>${esc(i.nome)}</b> <span class="s">(${esc(T(D, i.sq).b)})</span> <span style="color:${i.stato === "out" ? RD : AM}">${i.stato === "out" ? "Fuori, escluso dai calcoli" : "In dubbio, ancora incluso"}</span><div class="s">${esc(i.dettaglio)}</div></div>`).join("");
  const note = ["Infortuni: l'app legge l'elenco di ESPN ed esclude chi è «out». Controlla le ultime notizie e le formazioni poco prima della partita.", "Riposo: è considerato solo il back-to-back (squadra che ha giocato ieri, circa un punto in meno).", "Rimbalzi e assist: stima semplice basata sulla media e sul ritmo di gioco, meno precisa dei punti.", "Quote bookmaker: la stima finale unisce il modello (40%) e il mercato (60%). Se le due stime sono molto distanti, di solito il mercato sa qualcosa che il modello non vede (infortuni, formazioni): fidati meno della giocata."];
  if (Math.abs(r.margine) >= 10) note.push("Margine stimato ampio: nei finali sbilanciati i titolari possono giocare meno minuti, con rischio per gli over sui giocatori.");
  if (Math.abs(r.margine) < 3) note.push("Partita molto equilibrata: lo spread è poco affidabile, conta di più il totale.");
  for (const s of [p.casa, p.trasf]) if ((D.b2b || []).includes(s)) note.push(`${T(D, s).b} ha giocato ieri: stima ridotta di circa 1.2 punti.`);
  h += `<h2>Da controllare prima di decidere</h2><div class="cap" style="display:grid;gap:6px">${note.map((n) => `<div>• ${esc(n)}</div>`).join("")}</div>`;
  APP.innerHTML = h;
  const contStudio = (k) => {
    const l = picks.filter(gruppi[k][1]); if (!l.length) return `<div class="vuoto">Nessuna giocata sopra la soglia in questa sezione.</div>`;
    if (k === "p") return [...raggruppa(l)].filter(([, v]) => v.length).map(([t, v]) => `<div class="sub">${esc(t)}</div>` + v.map((x) => cardPick(x) + `<div class="cap">${esc(x.motivo)}</div>`).join("")).join("");
    return [p.casa, p.trasf].map((sq) => { const v = l.filter((x) => x.squadra === sq); return v.length ? `<div class="sub lg">${logo(sq, 20)}<b>${esc(T(D, sq).n)}</b></div>` + v.map((x) => cardPick(x) + `<div class="cap">${esc(x.motivo)}</div>`).join("") : ""; }).join("");
  };
  $("#stc").innerHTML = contStudio(stt);
  APP.querySelectorAll("[data-stt]").forEach((b) => b.onclick = () => { ls.set("studioTab", b.dataset.stt); APP.querySelectorAll("[data-stt]").forEach((x) => x.classList.toggle("on", x === b)); $("#stc").innerHTML = contStudio(b.dataset.stt); });
  aggiornaTot(r);
  $("#lt").oninput = (e) => { ls.set("L_tot_" + id, e.target.value); aggiornaTot(r); };
  APP.querySelectorAll("[data-m]").forEach((b) => b.onclick = () => { ls.set("mercato", b.dataset.m); vistaStudio(id); });
  APP.querySelectorAll("input[data-lk]").forEach((i) => i.oninput = () => { ls.set("L_" + i.dataset.lk, i.value); probLinea(i); });
  APP.querySelectorAll("input[data-lk]").forEach(probLinea);
  api(`/api/h2h?a=${p.casa}&b=${p.trasf}`, 600000).then((H) => {
    const el = $("#h2h"); if (!el) return; const l = H.partite || [];
    if (!l.length) { el.innerHTML = `<div class="cap">Nessuno scontro diretto tra queste squadre nella stagione in corso e nella scorsa.</div>`; return; }
    const v = l.filter((x) => x.vinta).length, m = (f) => l.reduce((a, x) => a + f(x), 0) / l.length;
    el.innerHTML = `<div class="card"><div class="riga"><div class="lg">${logo(p.casa, 28)}<b>${esc(T(D, p.casa).b)}</b></div><b style="font-size:22px;font-family:'Barlow Condensed',Inter,sans-serif">${v} - ${l.length - v}</b><div class="lg"><b>${esc(T(D, p.trasf).b)}</b>${logo(p.trasf, 28)}</div></div><div class="s" style="margin:6px 0 8px">Ultimi ${l.length} scontri: media ${m((x) => x.pf).toFixed(1)} a ${m((x) => x.pa).toFixed(1)} · totale medio ${m((x) => x.pf + x.pa).toFixed(1)}</div>` +
      l.map((x) => `<div class="riga rg"><div><div style="font-weight:500">${x.casa ? "in casa di " + esc(T(D, p.casa).b) : "in casa di " + esc(T(D, p.trasf).b)}</div><div class="s">${esc(x.data)}</div></div><b style="color:${x.vinta ? GR : RD}">${x.pf}-${x.pa}</b></div>`).join("") + `</div>`;
  }).catch(() => { const el = $("#h2h"); if (el) el.innerHTML = `<div class="cap">Scontri diretti non disponibili.</div>`; });
  Promise.all([p.casa, p.trasf].map((s) => api("/api/ultime?s=" + s, 600000).catch(() => null))).then((res) => {
    const el = $("#ultime"); if (!el) return;
    el.innerHTML = res.map((x, i) => ultimeHtml(D, [p.casa, p.trasf][i], x && x.ultime)).join("");
  });
}
function mercatoPartita(p) {
  const r = p.r, mk = r.mk; if (!mk || (!mk.tot && !mk.spr)) return `<div class="s" style="margin-top:8px">Nessuna quota bookmaker ancora per questa partita: stima del solo modello.</div>`;
  let h = `<div class="mk">`;
  if (mk.tot) h += `<div class="riga s"><span>BOOKMAKER · TOTALE ${mk.tot.linea}</span><span>${divTag(mk.tot.div)}</span></div><div class="grid3"><div><b style="color:${colProb(mk.tot.pMk)}">${pct(mk.tot.pMk)}</b><span>mercato over</span></div><div><b>${mk.totaleModello.toFixed(1)}</b><span>solo modello</span></div><div><b>${r.totale.toFixed(1)}</b><span>stima finale</span></div></div><div class="s">${mk.tot.n} ${mk.tot.n === 1 ? "libro" : "libri"} · il modello da solo darebbe over ${pct(mk.tot.pMod)}, insieme al mercato ${pct(mk.tot.pFin)}</div>`;
  if (mk.spr) h += `<div class="riga s" style="margin-top:8px"><span>BOOKMAKER · SPREAD ${esc(p.casa)} ${mk.spr.linea > 0 ? "+" : ""}${mk.spr.linea}</span><span>${divTag(mk.spr.div)}</span></div><div class="s">Margine stimato dal modello ${mk.margineModello.toFixed(1)}, dal mercato ${mk.spr.muMk.toFixed(1)}, finale ${r.margine.toFixed(1)} (a favore di ${esc(p.casa)}).</div>`;
  return h + `</div>`;
}
function gauge(stima, linea) {
  const lo = stima - 20, hi = stima + 20, pp = (v) => Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100));
  const l = parseFloat(linea);
  return `<div class="gauge">${l ? `<div class="l" style="left:${pp(l)}%"></div>` : ""}<div class="m" style="left:${pp(stima)}%"></div></div><div class="s">Stima ${stima.toFixed(1)}${l ? ` · linea ${l}` : ""}</div>`;
}
function aggiornaTot(r) {
  const el = $("#totp"), v = parseFloat($("#lt").value);
  if (!el) return;
  if (!v) { el.textContent = `Senza linea: punti totali stimati ${r.totale.toFixed(1)}. Inserisci la linea per ottenere le probabilità.`; return; }
  const po = 1 - phi((v - r.totale) / 17);
  el.innerHTML = `Over ${v}: <b style="color:${po >= 0.7 ? GR : po >= 0.5 ? OR : MU}">${pct(po)}</b> · Under: <b style="color:${1 - po >= 0.7 ? GR : 1 - po >= 0.5 ? OR : MU}">${pct(1 - po)}</b>`;
}
function spark(vals, soglia, col) {
  const mx = Math.max(...vals, soglia || 0, 1), w = 200, h = 34, bw = w / vals.length;
  const bars = vals.map((v, i) => { const bh = Math.max(2, v / mx * (h - 4)); return `<rect x="${(i * bw + 1).toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${soglia != null && v > soglia ? GR : col}" opacity="${soglia != null && v > soglia ? 1 : 0.55}"/>`; }).join("");
  const ln = soglia != null ? `<line x1="0" x2="${w}" y1="${(h - soglia / mx * (h - 4)).toFixed(1)}" y2="${(h - soglia / mx * (h - 4)).toFixed(1)}" stroke="${AM}" stroke-dasharray="3 3" stroke-width="1"/>` : "";
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none">${bars}${ln}</svg>`;
}
function formaHtml(x, mer, c, o) {
  const k = { Punti: "pts", Rimbalzi: "reb", Assist: "ast" }[mer];
  if (!x.conForma || !x.ult || !x.ult[k]) return `<div class="s" style="margin-top:8px">Forma recente non ancora disponibile (si usa la media stagione).</div>`;
  const v = x.ult[k], m10 = v.reduce((a, b) => a + b, 0) / v.length, diff = m10 - (mer === "Punti" ? x.stagione : o.media);
  const tag = diff >= 1.5 ? `<span style="color:${GR}">in forma</span>` : diff <= -1.5 ? `<span style="color:${RD}">in calo</span>` : `<span class="s">nella media</span>`;
  return `<div style="margin-top:10px"><div class="riga s"><span>ULTIME ${v.length} GARE</span><span>${tag} · media ${m10.toFixed(1)}</span></div>${spark(v, o.rec, MU)}</div>`;
}
const divTag = (d) => d === "alta" ? `<span style="color:${RD}">modello e mercato molto distanti</span>` : d === "media" ? `<span style="color:${AM}">in parte diversi</span>` : `<span style="color:${GR}">allineati</span>`;
function quoteGioc(o, c) {
  const m = o.mk;
  if (!m) return `<div class="s" style="margin-top:8px">Nessuna quota bookmaker per questo giocatore: stima del solo modello.</div>`;
  const libri = (m.libri || []).slice(0, 4).map((l) => `${esc(l.b)} ${l.o}/${l.u}`).join(" · ");
  return `<div class="mk"><div class="riga s"><span>BOOKMAKER · LINEA ${m.linea} ${c.u}</span><span>${divTag(m.div)}</span></div>
  <div class="grid3"><div><b style="color:${colProb(m.pMk)}">${pct(m.pMk)}</b><span>mercato over</span></div><div><b>${pct(m.pMod)}</b><span>solo modello</span></div><div><b style="color:${colProb(m.pFin)}">${pct(m.pFin)}</b><span>insieme</span></div></div>
  <div class="s">Il modello da solo stimava ${o.vModello.toFixed(1)}, il mercato ${m.muMk.toFixed(1)}: stima finale ${o.v.toFixed(1)}. ${m.n} ${m.n === 1 ? "libro" : "libri"}${libri ? " · quote over/under: " + libri : ""}</div></div>`;
}
// la linea che di solito offre il bookmaker è vicina alla mediana (probabilità ~50%): le soglie sopra il 70% sono linee più basse, pagate meno
function lineaTipica(o, c) {
  let l = Math.floor(o.v) + 0.5; if (Math.abs(l + 1 - o.v) < Math.abs(l - o.v)) l += 1; // .5 più vicino alla stima
  const po = 1 - phi((l - o.v) / o.sd);
  return `<div class="s" style="margin-top:6px;line-height:1.45">Linea tipica del bookmaker: circa <b style="color:#f2f2f2">${l}</b> ${c.u} (qui over ${pct(po)}). ${o.rec != null && o.rec < l ? `La soglia consigliata ${o.rec} è più bassa: più sicura ma pagata meno, e molti book non la offrono.` : ""}</div>`;
}
function schedaGiocatore(D, gid, x, mer, c) {
  const o = x[c.k], dub = x.inf === "dubbio" ? `<span class="pill" style="color:${AM};margin-left:6px">Dubbio</span>` : "";
  const tile = (n, v, on) => `<div class="tile${on ? " on" : ""}"><b>${v.toFixed(1)}</b><span>${n}</span></div>`;
  const rec = o.rec != null ? `<div style="margin-top:10px"><span class="s">CONSIGLIATO</span><div style="font-weight:600;color:${GR}">over ${o.rec} ${c.u} · ${pct(o.lad.find((q) => q[0] === o.rec)[1])}</div></div>` : `<div class="s" style="margin-top:10px">Nessuna soglia sopra il 70%: giocatore poco sicuro.</div>`;
  const lad = o.lad.map(([t, pr]) => { const col = pr >= 0.7 ? GR : pr >= 0.5 ? AM : MU; return `<span style="color:${col};${t === o.rec ? "border:1px solid " + col : ""}">over ${t} · ${pct(pr)}</span>`; }).join("");
  const key = `${gid}_${x.pid || x.nome}_${mer}`;
  return `<div class="card pl"><div class="lg">${foto(x.pid, 48)}<div style="min-width:0"><div class="tn">${x.pid ? `<a href="#/giocatore/${esc(x.pid)}" style="border-bottom:1px dotted #5a6378">${esc(x.nome)}</a>` : esc(x.nome)}${dub}</div><div class="s">${esc(x.sq)} · ${Math.round(x.min)} min attesi</div>${x.assenze && x.boost && x.boost[c.k] >= 0.3 ? `<div class="s" style="color:${AM}">+${x.boost[c.k].toFixed(1)} ${c.u} per l'assenza di ${esc(x.assenze.join(", "))}</div>` : ""}</div></div>
  <div class="row3">${tile("Punti", x.pts.v, mer === "Punti")}${tile("Rimbalzi", x.reb.v, mer === "Rimbalzi")}${tile("Assist", x.ast.v, mer === "Assist")}</div>${rec}${lineaTipica(o, c)}${quoteGioc(o, c)}${formaHtml(x, mer, c, o)}
  <div class="s" style="margin-top:8px">ALTRE SOGLIE POSSIBILI</div><div class="lad">${lad}</div>
  <input class="linea" inputmode="decimal" placeholder="Tua linea ${mer.toLowerCase()} (es. ${(Math.round(o.v * 2) / 2)})" data-lk="${esc(key)}" data-v="${o.v}" data-sd="${o.sd}" value="${esc(ls.get("L_" + key, ""))}"><div class="s" data-lp="${esc(key)}"></div></div>`;
}
function probLinea(i) {
  const el = APP.querySelector(`[data-lp="${CSS.escape(i.dataset.lk)}"]`); if (!el) return;
  const l = parseFloat(i.value); if (!l) { el.textContent = ""; return; }
  const po = 1 - phi((l - +i.dataset.v) / +i.dataset.sd);
  el.innerHTML = `Over ${l}: <b style="color:${po >= 0.7 ? GR : po >= 0.5 ? OR : MU}">${pct(po)}</b> · Under: <b>${pct(1 - po)}</b>`;
}
function ultimeHtml(D, sig, ul) {
  if (!ul || !ul.length) return `<div class="cap">Ultimi incontri di ${esc(sig)} non disponibili.</div>`;
  const m = (f) => ul.reduce((a, x) => a + f(x), 0) / ul.length;
  return `<div class="card"><div class="riga"><div class="lg">${logo(sig, 30)}<b>${esc(T(D, sig).n)}</b></div><div>${ul.map((x) => `<span class="fm" style="background:${x.vinta ? GR : RD}">${x.vinta ? "V" : "S"}</span>`).join("")}</div></div><div class="s" style="margin:6px 0 8px">Ultime ${ul.length}: ${m((x) => x.pf).toFixed(1)} fatti, ${m((x) => x.pa).toFixed(1)} subiti · totale ${m((x) => x.pf + x.pa).toFixed(1)}</div>` +
    ul.map((x) => `<div class="riga rg"><div class="lg">${logo(x.avv, 22)}<div><div style="font-weight:500">${x.casa ? "in casa con" : "in trasferta da"} ${esc((D.squadre[x.avv] || { b: x.avv }).b)}</div><div class="s">${esc(x.data)}</div></div></div><b style="color:${x.vinta ? GR : RD}">${x.pf}-${x.pa}</b></div>`).join("") + `</div>`;
}


// andamento della partita: scarto quarto per quarto contro quello che prevedeva il modello, e ritmo dei punti
function andamentoLive(D, p) {
  const qc = p.qCasa || [], qt = p.qTr || []; if (!qt.length || !p.r) return "";
  let a = 0, b = 0; const pts = [0], att = [0], n = Math.max(qt.length, 1);
  qt.forEach((q, i) => { a += qc[i] ?? 0; b += q; pts.push(a - b); att.push(p.r.margine * Math.min(1, (i + 1) / 4)); });
  const w = 300, h = 64, mx = Math.max(6, ...pts.map(Math.abs), ...att.map(Math.abs)), X = (i) => (i / Math.max(1, pts.length - 1) * (w - 12) + 6).toFixed(1), Y = (v) => (h / 2 - v / mx * (h / 2 - 6)).toFixed(1);
  const t = p.ptCasa + p.ptTr, prev = p.r.totale * p.f, rit = t - prev, mar = (p.ptCasa - p.ptTr) - p.r.margine * p.f, cc = T(D, p.casa).b;
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;margin:6px 0 2px"><line x1="0" x2="${w}" y1="${Y(0)}" y2="${Y(0)}" stroke="${MU}" stroke-width="1" opacity=".5"/><polyline fill="none" stroke="${MU}" stroke-dasharray="4 3" stroke-width="1.5" opacity=".8" points="${att.map((v, i) => X(i) + "," + Y(v)).join(" ")}"/><polyline fill="none" stroke="${OR}" stroke-width="2.5" stroke-linejoin="round" points="${pts.map((v, i) => X(i) + "," + Y(v)).join(" ")}"/>${pts.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="${i === pts.length - 1 ? 4 : 2.2}" fill="${OR}"/>`).join("")}<text x="6" y="10" fill="${MU}" font-size="9">1 ${esc(p.casa)} avanti</text><text x="6" y="${h - 3}" fill="${MU}" font-size="9">2 ${esc(p.trasf)} avanti</text></svg>
  <div class="s" style="margin-bottom:4px">Linea arancione: scarto reale. Tratteggiata: scarto previsto dal modello. <b style="color:${Math.abs(rit) < 4 ? MU : rit > 0 ? GR : AM}">Ritmo ${rit >= 0 ? "+" : ""}${rit.toFixed(0)} punti ${rit >= 0 ? "sopra" : "sotto"} il previsto</b>${Math.abs(mar) >= 3 ? ` · ${esc(cc)} ${mar > 0 ? "meglio" : "peggio"} del previsto di ${Math.abs(mar).toFixed(0)}` : ""}.</div>`;
}
