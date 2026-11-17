// NBA Schedine - idee5.js: Stasera con conto alla rovescia, gruppo e sfide, condividi la serie, playoff, mercato, calendario .ics, confronto giocatori, premi, squadra ideale
"use strict";
const wait5 = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- 31. Stasera: conto alla rovescia accanto a ogni partita (si aggiorna da solo mentre la pagina è aperta)
const tra = (iso) => { const m = Math.round((Date.parse(iso) - Date.now()) / 60000); if (isNaN(m)) return ""; if (m <= 0) return "sta per iniziare"; const h = Math.floor(m / 60); return h ? `tra ${h} h ${String(m % 60).padStart(2, "0")} min` : `tra ${m} min`; };
async function vistaStaseraCount() {
  await vistaStasera();
  const D = window.__D; if (!D) return;
  const mappa = new Map((D.partite || []).map((p) => [String(p.id), p]));
  const decora = () => {
    if (!location.hash.startsWith("#/stasera")) return;
    document.querySelectorAll('#app a.card[href^="#/partita/"]').forEach((a) => {
      const p = mappa.get(a.getAttribute("href").split("/").pop()); if (!p || p.stato !== "pre") return;
      let el = a.querySelector(".cdw"); if (!el) { el = document.createElement("div"); el.className = "cdw s"; el.style.cssText = "text-align:center;margin-top:4px;font-weight:600;color:" + OR; a.appendChild(el); }
      const t = tra(p.iso); el.textContent = t ? "Palla a due " + t : "";
    });
    setTimeout(decora, 30000);
  };
  decora();
}
window.RIDEE.push([/^\/stasera/, vistaStaseraCount]);

// ---- serie e statistiche personali (usate da gruppo, immagine e profilo)
function statsPersonali() {
  const reg = chiuseReg().slice().sort((a, b) => String(b.data).localeCompare(String(a.data)) || 0), n = reg.length, ok = reg.filter((r) => r.esito === 1).length;
  let serie = 0; for (const r of reg) { if (r.esito === 1) serie++; else break; }
  let best = 0, cur = 0; for (const r of reg.slice().reverse()) { cur = r.esito === 1 ? cur + 1 : 0; best = Math.max(best, cur); }
  return { saldo: typeof nettoMese === "function" ? nettoMese() : 0, perc: n ? ok / n * 100 : 0, n, serie, best };
}
async function immagineSerie() {
  const S = statsPersonali(), pf = ls.get("profilo", {}), W = 1080, H = 1080, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const x = cv.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#161a24"); g.addColorStop(1, "#0b0d12"); x.fillStyle = g; x.fillRect(0, 0, W, H); x.fillStyle = OR; x.fillRect(0, 0, W, 14);
  const t = (s, px, py, sz, col, w = 600, al = "left") => { x.font = `${w} ${sz}px -apple-system, "Segoe UI", Roboto, sans-serif`; x.fillStyle = col; x.textAlign = al; x.fillText(s, px, py); };
  t("NBA Schedine", 60, 100, 34, OR, 700); t(pf.nome || "La mia serie", 60, 180, 56, "#ffffff", 700);
  t(String(S.serie), W / 2, 560, 330, OR, 800, "center"); t(S.serie === 1 ? "schedina presa di fila" : "schedine prese di fila", W / 2, 640, 44, "#c9cfdc", 600, "center");
  [["Record", String(S.best)], ["Centrate", Math.round(S.perc) + "%"], ["Giocate chiuse", String(S.n)]].forEach(([k, v], i) => { const cx = 60 + i * 340; t(k, cx, 820, 28, "#8b93a7", 500); t(v, cx, 900, 64, "#ffffff", 700); });
  t("Stime del modello, non certezze.", W / 2, H - 40, 24, "#5d667a", 500, "center");
  const blob = await new Promise((ok) => cv.toBlob(ok, "image/png")); if (!blob) return;
  const f = new File([blob], "serie.png", { type: "image/png" });
  try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: "La mia serie" }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "serie.png"; a.click();
}
document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("#serieImg")) immagineSerie(); });

// ---- 32/33. gruppo di amici: classifica e sfide sul vincitore di una partita
async function idMio() { const c = ls.get("codice", "") || (typeof codiceSync === "function" ? codiceSync() : ""); const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("gr|" + c)); return [...new Uint8Array(d)].slice(0, 4).map((b) => b.toString(16).padStart(2, "0")).join(""); }
async function postGruppo(corpo) { const r = await fetch("/api/gruppo", { method: "POST", body: JSON.stringify(corpo) }), j = await r.json(); if (!r.ok || j.errore) throw new Error(j.errore || "Errore " + r.status); return j; }
async function risolviSfide(G, S, id) { // chi vede una partita finita scrive il vincitore, così tutti i punteggi si aggiornano
  let nuovo = false;
  for (const [gid, pr] of Object.entries(S.p || {})) {
    if (S.r && S.r[gid]) continue;
    try { const D = await api("/api/giorno?d=" + pr.y, 300000), p = (D.partite || []).find((q) => q.id === gid); if (p && p.stato === "post" && p.ptCasa !== p.ptTr) { const v = p.ptCasa > p.ptTr ? p.casa : p.trasf; (S.r ||= {})[gid] = v; await postGruppo({ gr: G, id, nome: ls.get("profilo", {}).nome || "Io", stats: statsPersonali(), ris: { g: gid, v } }); nuovo = true; } } catch {}
  }
  return nuovo;
}
async function vistaGruppo() {
  const G = ls.get("gruppo", ""); let h = back4("#/profilo", "Profilo") + `<h2>Gruppo di amici</h2>`;
  if (!G) {
    APP.innerHTML = h + `<div class="cap" style="margin-top:0">Crea un gruppo scegliendo un codice (da 4 a 16 lettere o numeri) e passalo ai tuoi amici: chi lo inserisce entra nella classifica. Si condividono solo nome, saldo del mese, percentuale di centrate e le sfide: mai le schedine.</div><div class="card"><input class="linea" id="grc" maxlength="16" placeholder="Codice del gruppo (es. canestri23)" style="margin:0 0 8px" autocapitalize="none"><input class="linea" id="grn" maxlength="20" placeholder="Il tuo nome" value="${esc(ls.get("profilo", {}).nome || "")}" style="margin:0 0 8px"><button class="btn" id="grok" style="margin:0">Entra nel gruppo</button><div id="grerr" class="s" style="color:${RD};margin-top:6px"></div></div>`;
    $("#grok").onclick = async () => { const g = $("#grc").value.trim().toLowerCase(), n = $("#grn").value.trim(); if (!/^[a-z0-9]{4,16}$/.test(g)) { $("#grerr").textContent = "Il codice deve avere da 4 a 16 lettere o numeri, senza spazi."; return; } if (!n) { $("#grerr").textContent = "Scrivi il tuo nome."; return; } try { const id = await idMio(); await postGruppo({ gr: g, id, nome: n, stats: statsPersonali() }); const pf = ls.get("profilo", {}); pf.nome = pf.nome || n; ls.set("profilo", pf); ls.set("gruppo", g); vistaGruppo(); } catch (e) { $("#grerr").textContent = e.message; } };
    return;
  }
  APP.innerHTML = h + skel();
  let S, id, D = null; try { id = await idMio(); S = await postGruppo({ gr: G, id, nome: ls.get("profilo", {}).nome || "Io", stats: statsPersonali() }); } catch (e) { APP.innerHTML = h + errBox(e); return; }
  try { D = await dati(); } catch {}
  if (await risolviSfide(G, S, id)) { try { S = await (await fetch("/api/gruppo?gr=" + G)).json(); } catch {} }
  const punti = {}; for (const [gid, pr] of Object.entries(S.p || {})) { const v = (S.r || {})[gid]; if (v) for (const [m, s] of Object.entries(pr.s)) punti[m] = (punti[m] || 0) + (s === v ? 1 : 0); }
  const mem = Object.entries(S.m || {}).map(([k, v]) => ({ k, ...v, pt: punti[k] || 0 })).sort((a, b) => b.saldo - a.saldo);
  const nomeDi = (k) => (S.m[k] || {}).n || "?";
  h += `<div class="cap" style="margin-top:0">Gruppo <b style="color:var(--txt)">${esc(G)}</b> · ${mem.length} ${mem.length === 1 ? "persona" : "persone"}. La classifica è sul saldo di questo mese.</div><div class="card" style="padding:4px 12px">` + mem.map((m, i) => `<div class="riga rg" style="${i ? "" : "border-top:0"}"><div style="min-width:0"><b>${i + 1}. ${esc(m.n)}${m.k === id ? " (tu)" : ""}</b><div class="s">centrate ${m.perc}% su ${m.n_} · serie ${m.serie} · sfide vinte ${m.pt}</div></div><b style="color:${m.saldo >= 0 ? GR : RD}">${eur(m.saldo)}</b></div>`).join("") + `</div>`;
  const pre = D ? D.partite.filter((p) => p.stato === "pre") : [];
  h += `<h2>Sfide di oggi</h2><div class="cap" style="margin-top:0">Scegli chi vince: ogni risultato giusto vale un punto nelle sfide.</div>`;
  h += pre.length ? pre.map((p) => { const pr = (S.p || {})[p.id], mia = pr && pr.s[id]; return `<div class="card"><div class="riga"><b>${esc(p.casa)} - ${esc(p.trasf)}</b><span class="s">${esc(String(p.ora).slice(-5))}</span></div><div class="grid2" style="margin-top:8px">${[p.casa, p.trasf].map((ab) => `<button class="chipbtn${mia === ab ? " on" : ""}" data-sf="${p.id}|${ab}" style="justify-content:center">${logo(ab, 18)} ${esc(T(D, ab).b)}</button>`).join("")}</div>${pr ? `<div class="s" style="margin-top:6px">${Object.entries(pr.s).map(([k, s]) => `${esc(nomeDi(k))}: ${esc(s)}`).join(" · ")}</div>` : ""}</div>`; }).join("") : `<div class="vuoto">Nessuna partita da giocare in questo giorno.</div>`;
  const chiuse = Object.entries(S.p || {}).filter(([gid]) => (S.r || {})[gid]).slice(-6).reverse();
  if (chiuse.length) h += `<h2>Sfide chiuse</h2><div class="card" style="padding:4px 12px">` + chiuse.map(([gid, pr], i) => `<div class="riga rg" style="${i ? "" : "border-top:0"}"><span>Ha vinto <b>${esc(S.r[gid])}</b></span><span class="s">${Object.entries(pr.s).map(([k, s]) => `${esc(nomeDi(k))} ${s === S.r[gid] ? "✓" : "✗"}`).join(" · ")}</span></div>`).join("") + `</div>`;
  h += `<button class="btn" id="serieImg"><i class="ti ti-share"></i> Condividi la mia serie come immagine</button><button class="chipbtn" id="grex" style="margin-top:6px">Esci dal gruppo</button>`;
  APP.innerHTML = h;
  APP.querySelectorAll("[data-sf]").forEach((b) => b.onclick = async () => { const [g, s] = b.dataset.sf.split("|"), p = pre.find((q) => q.id === g); try { await postGruppo({ gr: G, id, nome: ls.get("profilo", {}).nome || "Io", stats: statsPersonali(), pron: { g, s, y: etGiorno(typeof giorno === "number" ? giorno : 0).ymd } }); vistaGruppo(); } catch (e) { alert(e.message); } });
  $("#grex").onclick = () => { if (confirm("Uscire dal gruppo su questo telefono?")) { ls.set("gruppo", ""); vistaGruppo(); } };
}
window.RIDEE.push([/^\/gruppo/, vistaGruppo]);

// ---- 35. tabellone playoff previsto sulla classifica attuale, con i tuoi pronostici
async function vistaPlayoff() {
  const top = topBar() + segEsplora("c"); APP.innerHTML = top + skel();
  let C; try { C = await api("/api/classifica", 600000); } catch (e) { APP.innerHTML = top + errBox(e); return; }
  const P = ls.get("playoff", {}); let h = top + `<h2>Tabellone playoff</h2><div class="cap" style="margin-top:0">Primo turno previsto con la classifica di oggi: le prime 6 di ogni conference sono dirette, 7ª e 8ª si decidono ai play-in. Scegli chi passa il turno: i pronostici restano sul telefono.</div>`;
  for (const k of ["Est", "Ovest"]) {
    const L = C[k] || []; if (L.length < 8) continue;
    const coppie = [[0, 7], [3, 4], [2, 5], [1, 6]];
    h += `<div class="sub">${k}</div>` + coppie.map(([a, b]) => { const A = L[a], Bq = L[b], key = `${k}${a}${b}`, nomeB = b >= 6 ? `${nomeSq(C.squadre, Bq.ab)} (play-in)` : nomeSq(C.squadre, Bq.ab), sc = (x, i, nm) => `<button class="chipbtn${P[key] === x.ab ? " on" : ""}" data-po="${key}|${x.ab}" style="justify-content:center">${logo(x.ab, 20)} ${i + 1}. ${esc(nm)}</button>`; return `<div class="card"><div class="grid2">${sc(A, a, nomeSq(C.squadre, A.ab))}${sc(Bq, b, nomeB)}</div></div>`; }).join("");
  }
  h += `<div class="cap">Il tabellone è solo un gioco di pronostici: non ci sono probabilità del modello per le serie.</div>`;
  APP.innerHTML = h;
  APP.querySelectorAll("[data-po]").forEach((b) => b.onclick = () => { const [k, ab] = b.dataset.po.split("|"), p = ls.get("playoff", {}); p[k] = p[k] === ab ? null : ab; ls.set("playoff", p); vistaPlayoff(); });
}
window.RIDEE.push([/^\/playoff/, vistaPlayoff]);

// ---- 36. mercato e scambi: le notizie che parlano di firme, scambi e contratti (tue squadre + generali)
async function vistaMercato() {
  const top = topBar() + segEsplora("n"); APP.innerHTML = top + skel();
  const sq = pref().sq.slice(0, 4), rx = /trade|traded|sign|signs|signed|extension|waive|contract|free agent|buyout|deal|scambio|firma|rinnov|taglia|contratto/i;
  let R = []; try { R = (await Promise.all([null, ...sq].map((s) => api("/api/news" + (s ? "?s=" + s : ""), 300000).then((r) => r.news || []).catch(() => [])))).flat(); } catch {}
  const viste = new Set(), L = R.filter((n) => rx.test(n.titolo + " " + (n.desc || "") + " " + (n.titoloIt || ""))).filter((n) => !viste.has(n.url) && viste.add(n.url)).sort((a, b) => Date.parse(b.data) - Date.parse(a.data));
  APP.innerHTML = top + `<h2>Mercato e scambi</h2><div class="cap" style="margin-top:0">Le notizie su scambi, firme e contratti, tra le generali e quelle delle squadre che segui${sq.length ? "" : " (metti la ☆ a una squadra per vedere anche le sue)"}.</div>` + (L.length ? L.map(cardNews).join("") : `<div class="vuoto">Nessuna notizia di mercato in questo momento.</div>`);
}
window.RIDEE.push([/^\/mercato/, vistaMercato]);

// ---- 37. calendario del telefono: file .ics con le partite delle squadre e partite seguite
async function scaricaIcs() {
  const P = pref(); let C; try { C = await api("/api/calendario", 300000); } catch (e) { alert("Non riesco a leggere il calendario: " + e.message); return; }
  const fmt = (d) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d+/, ""), ev = [];
  for (const g of C.giorni || []) for (const x of g.partite) { if (x.stato !== "pre" || !x.iso) continue; if (!(P.sq.includes(x.casa) || P.sq.includes(x.trasf) || P.gm.includes(String(x.id)))) continue; const i = Date.parse(x.iso); ev.push(`BEGIN:VEVENT\r\nUID:nba${x.id}@nba-schedine\r\nDTSTAMP:${fmt(Date.now())}\r\nDTSTART:${fmt(i)}\r\nDTEND:${fmt(i + 2.5 * 3600e3)}\r\nSUMMARY:${x.trasf} @ ${x.casa}\r\nDESCRIPTION:NBA Schedine\r\nEND:VEVENT`); }
  if (!ev.length) { alert("Nessuna partita delle tue squadre o con la 🔔 nei prossimi giorni. Metti la ☆ a una squadra e riprova."); return; }
  const blob = new Blob(["BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//NBA Schedine//IT\r\n" + ev.join("\r\n") + "\r\nEND:VCALENDAR"], { type: "text/calendar" }), a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "partite-nba.ics"; a.click();
}
document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("#icsBtn")) scaricaIcs(); });

// ---- 38. confronto giocatori
async function vistaConfronta() {
  const top = topBar() + segEsplora("g"); APP.innerHTML = top + skel();
  let D; try { D = await dati(); } catch (e) { APP.innerHTML = top + errBox(e); return; }
  const tutti = D.partite.filter((p) => p.stato === "pre").flatMap((p) => (p.giocatori || []).map((g) => ({ g, p }))).sort((a, b) => a.g.nome.localeCompare(b.g.nome, "it"));
  if (tutti.length < 2) { APP.innerHTML = top + `<div class="vuoto">Servono almeno due giocatori di partite non ancora iniziate.</div>`; return; }
  const C = ls.get("conf2", [tutti[0].g.pid, tutti[1].g.pid]), sel = (i) => `<select class="linea" data-cf="${i}" style="margin:0">${tutti.map((o) => `<option value="${esc(o.g.pid)}"${o.g.pid === C[i] ? " selected" : ""}>${esc(o.g.nome)} (${esc(o.g.sq)})</option>`).join("")}</select>`;
  const A = tutti.find((o) => o.g.pid === C[0]) || tutti[0], B = tutti.find((o) => o.g.pid === C[1]) || tutti[1];
  const riga = (t, a, b, alto = true) => { const va = +a, vb = +b, ma = alto ? va >= vb : va <= vb, mb = alto ? vb >= va : vb <= va; return `<div class="riga rg"><b style="width:30%;text-align:left;color:${ma && va !== vb ? GR : "inherit"}">${vir(va)}</b><span class="s" style="flex:1;text-align:center">${t}</span><b style="width:30%;text-align:right;color:${mb && va !== vb ? GR : "inherit"}">${vir(vb)}</b></div>`; };
  const ctx = (o) => `${esc(o.p.casa)} - ${esc(o.p.trasf)}`;
  APP.innerHTML = top + `<h2>Confronto giocatori</h2><div class="card"><div class="grid2">${sel(0)}${sel(1)}</div></div><div class="card"><div class="riga" style="align-items:flex-start"><div style="width:42%;text-align:center">${foto(A.g.pid, 64)}<div><b>${esc(A.g.nome)}</b></div><div class="s">${ctx(A)}</div></div><div style="width:42%;text-align:center">${foto(B.g.pid, 64)}<div><b>${esc(B.g.nome)}</b></div><div class="s">${ctx(B)}</div></div></div>` +
    riga("Punti stimati", A.g.pts.v, B.g.pts.v) + riga("Media punti", A.g.pts.media, B.g.pts.media) + riga("Rimbalzi stimati", A.g.reb.v, B.g.reb.v) + riga("Assist stimati", A.g.ast.v, B.g.ast.v) + riga("Minuti attesi", A.g.min, B.g.min) + `</div><div class="cap">In verde il valore migliore. Stime del modello per la partita di oggi, non il giudizio su chi è più forte.</div>`;
  APP.querySelectorAll("[data-cf]").forEach((s) => s.onchange = () => { const c = ls.get("conf2", [tutti[0].g.pid, tutti[1].g.pid]); c[+s.dataset.cf] = s.value; ls.set("conf2", c); vistaConfronta(); });
}
window.RIDEE.push([/^\/confronta/, vistaConfronta]);

// ---- 39. corsa ai premi: i giocatori più produttivi della stagione
async function vistaPremi() {
  const top = topBar() + segEsplora("g"); APP.innerHTML = top + skel();
  let R; try { R = await api("/api/leader", 1800000); } catch (e) { APP.innerHTML = top + errBox(e); return; }
  APP.innerHTML = top + `<h2>Corsa ai premi</h2><div class="cap" style="margin-top:0">I 15 giocatori più produttivi della stagione, con un indice semplice: punti + 0,7 rimbalzi + 0,9 assist a partita (solo chi gioca almeno 25 minuti). Non è il voto vero dell'MVP, che dipende anche dalle vittorie della squadra.</div>` + R.giocatori.map((x, i) => `<a class="card riga" href="#/giocatore/${esc(x.pid)}" style="padding:10px 12px;color:inherit;gap:10px"><div class="lg"><b style="width:22px;color:${OR}">${i + 1}</b>${foto(x.pid, 38)}<div style="min-width:0"><b>${esc(x.nome)}</b><div class="s">${esc(nomeSq(R.squadre, x.sq))} · ${x.pts.toFixed(1)} pt · ${x.reb.toFixed(1)} rb · ${x.ast.toFixed(1)} as</div></div></div><b>${x.ind.toFixed(1)}</b></a>`).join("");
}
window.RIDEE.push([/^\/premi/, vistaPremi]);

// ---- 40. squadra ideale della notte: i cinque con più produzione attesa stasera
async function vistaIdeale() {
  const top = topBar() + segEsplora("s"); APP.innerHTML = top + skel();
  let D; try { D = await dati(); } catch (e) { APP.innerHTML = top + errBox(e); return; }
  const L = D.partite.filter((p) => p.stato === "pre").flatMap((p) => (p.giocatori || []).filter((g) => g.pts && g.reb && g.ast && !(p.inf || []).some((i) => i.stato === "out" && i.nome === g.nome)).map((g) => ({ g, p, ind: g.pts.v + 0.7 * g.reb.v + 0.9 * g.ast.v }))).sort((a, b) => b.ind - a.ind);
  const sq = [], vis = new Set(); for (const o of L) { if (vis.has(o.g.pid)) continue; vis.add(o.g.pid); sq.push(o); if (sq.length === 5) break; }
  APP.innerHTML = top + `<h2>Squadra ideale della notte</h2><div class="cap" style="margin-top:0">I cinque giocatori con più produzione attesa tra le partite di stasera (punti + 0,7 rimbalzi + 0,9 assist stimati). Chi è dato per fuori non entra.</div>` + (sq.length ? sq.map((o) => `<a class="card riga" href="#/partita/${o.p.id}" style="padding:10px 12px;color:inherit;gap:10px"><div class="lg">${foto(o.g.pid, 40)}<div style="min-width:0"><b>${esc(o.g.nome)}</b><div class="s">${esc(o.p.casa)} - ${esc(o.p.trasf)} · ${vir(o.g.pts.v)} pt · ${vir(o.g.reb.v)} rb · ${vir(o.g.ast.v)} as</div></div></div><b>${o.ind.toFixed(1)}</b></a>`).join("") : `<div class="vuoto">Nessuna partita da giocare in questo giorno.</div>`);
}
window.RIDEE.push([/^\/ideale/, vistaIdeale]);
