// NBA Schedine - idee6.js: profilo con serie e badge, Home su misura, silenzio durante i turni, gesti, festa per la schedina presa, comandi rapidi, densità, glossario, indicatore offline
"use strict";

// ---- 41. serie e badge
function badgeProfilo() {
  const S = statsPersonali(), R = chiuseReg(), vinte = R.filter((r) => r.esito === 1), mese = typeof nettoMese === "function" ? nettoMese() : 0;
  const L = [
    ["ti-ticket", "Prima schedina presa", vinte.length >= 1, "Vinci una schedina"],
    ["ti-flame", "Tre di fila", S.best >= 3, "Tre schedine prese consecutive"],
    ["ti-bolt", "Cinque di fila", S.best >= 5, "Cinque schedine prese consecutive"],
    ["ti-notebook", "Dieci giocate chiuse", S.n >= 10, "Chiudi dieci giocate nel registro"],
    ["ti-books", "Cinquanta giocate chiuse", S.n >= 50, "Chiudi cinquanta giocate"],
    ["ti-trending-up", "Mese in positivo", mese > 0, "Chiudi il mese corrente con un saldo positivo"],
    ["ti-diamond", "Quota alta", vinte.some((r) => (r.quota || 0) >= 10), "Vinci una giocata a quota 10 o più"],
    ["ti-target", "Occhio sicuro", S.n >= 10 && S.perc >= 60, "Centra almeno il 60% con 10 giocate o più"],
  ];
  return L;
}
function blocchiProfilo() {
  const S = statsPersonali(), B = badgeProfilo(), ok = B.filter((b) => b[2]).length;
  return `<h2>Serie e badge</h2><div class="card"><div class="row3"><div class="tile"><b style="color:${S.serie >= 3 ? GR : "inherit"}">${S.serie}</b><span>schedine prese di fila</span></div><div class="tile"><b>${S.best}</b><span>record</span></div><div class="tile"><b>${ok}/${B.length}</b><span>badge</span></div></div><div class="cap" style="margin:8px 0 0">La serie si calcola sulle schedine chiuse del registro, dalla più recente.</div></div><div class="card" style="padding:4px 12px">${B.map((b, i) => `<div class="riga rg" style="${i ? "" : "border-top:0"};justify-content:flex-start;gap:12px;opacity:${b[2] ? 1 : 0.5}"><i class="ti ${b[0]}" style="font-size:22px;color:${b[2] ? OR : MU}"></i><div style="flex:1"><b>${b[1]}</b><div class="s">${b[3]}</div></div><span class="s" style="color:${b[2] ? GR : MU}">${b[2] ? "ottenuto" : "da fare"}</span></div>`).join("")}</div><button class="btn" id="serieImg"><i class="ti ti-share"></i> Condividi la serie come immagine</button>`;
}

// ---- 42. Home su misura
const BLOCCHI_HOME = [["budget", "Avviso del budget"], ["radar", "Radar del valore"], ["aperte", "Giocate aperte"], ["giorno", "Giocata del giorno"], ["mercato", "Confronto con i bookmaker"], ["pref", "Preferiti"], ["news", "Notizie dei preferiti"]];
const homeOn = (k) => (ls.get("homeBl", {})[k] !== 0);
function cardHomeSuMisura() {
  return `<h2>Home su misura</h2><div class="card"><div class="cap" style="margin:0 0 6px">Scegli cosa vedere sopra le partite.</div><div class="tabs" style="flex-wrap:wrap">${BLOCCHI_HOME.map(([k, n]) => `<button class="chipbtn${homeOn(k) ? " on" : ""}" data-hb="${k}">${n}</button>`).join("")}</div></div>`;
}

// ---- 49. densità delle schede
const densita = () => ls.get("dens", "normale");
function applicaDensita() { document.documentElement.classList.toggle("compatta", densita() === "compatta"); }
function cardUI() {
  const sw = (k, v, n) => `<button class="chipbtn${ls.get(k, v === "normale" || v === 1 ? v : "") === v ? " on" : ""}" data-ui="${k}|${v}">${n}</button>`;
  return `<h2>Aspetto e gesti</h2><div class="card"><div class="cap" style="margin:0 0 6px">Densità delle schede</div><div class="tabs" style="margin:0"><button class="chipbtn${densita() === "normale" ? " on" : ""}" data-ui="dens|normale">Normale</button><button class="chipbtn${densita() === "compatta" ? " on" : ""}" data-ui="dens|compatta">Compatta</button></div><div class="cap" style="margin:10px 0 6px">Gesti sulle giocate</div><div class="tabs" style="margin:0"><button class="chipbtn${ls.get("gesti", 1) ? " on" : ""}" data-ui="gesti|1">Scorri a sinistra per aggiungere</button><button class="chipbtn${ls.get("gesti", 1) ? "" : " on"}" data-ui="gesti|0">Spenti</button></div></div>`;
}

// ---- 44. silenzio durante il turno
const PRESET_SIL = [["Mattina 6-14", "06:00", "14:00"], ["Pomeriggio 14-22", "14:00", "22:00"], ["Notte 22-6", "22:00", "06:00"]];
function cardSilenzio() {
  const s = pref().sil || { on: 0, da: "22:00", a: "06:00" };
  return `<h2>Silenzio durante il turno</h2><div class="card"><div class="cap" style="margin:0 0 8px">Nelle ore del turno le notifiche non suonano: a fine turno ne arriva una sola con quello che è successo. Gli orari sono in ora italiana.</div><div class="tabs" style="flex-wrap:wrap;margin:0 0 8px">${PRESET_SIL.map(([n, a, b]) => `<button class="chipbtn${s.on && s.da === a && s.a === b ? " on" : ""}" data-sil="${a}|${b}">${n}</button>`).join("")}<button class="chipbtn${s.on ? "" : " on"}" data-sil="off">Mai</button></div><div class="grid2"><label class="s">Dalle<input class="linea" type="time" id="silda" value="${esc(s.da)}" style="margin:2px 0 0"></label><label class="s">Alle<input class="linea" type="time" id="silaa" value="${esc(s.a)}" style="margin:2px 0 0"></label></div><div class="s" style="margin-top:6px">${s.on ? `Attivo: silenzio dalle ${esc(s.da)} alle ${esc(s.a)}.` : "Spento: ricevi gli avvisi sempre."}</div></div>`;
}
function salvaSilenzio(sil) { const v = ls.get("pref", null) || { sq: [], pl: [], gm: [] }; v.sil = sil; ls.set("pref", v); sincPref(); }
document.addEventListener("click", (e) => {
  const t = e.target.closest && e.target.closest("[data-hb],[data-ui],[data-sil]"); if (!t) return;
  if (t.dataset.hb) { const b = ls.get("homeBl", {}); b[t.dataset.hb] = homeOn(t.dataset.hb) ? 0 : 1; ls.set("homeBl", b); vistaProfilo(); return; }
  if (t.dataset.ui) { const [k, v] = t.dataset.ui.split("|"); ls.set(k, k === "gesti" ? +v : v); applicaDensita(); vistaProfilo(); return; }
  if (t.dataset.sil) { if (t.dataset.sil === "off") salvaSilenzio({ ...(pref().sil || { da: "22:00", a: "06:00" }), on: 0 }); else { const [da, a] = t.dataset.sil.split("|"); salvaSilenzio({ on: 1, da, a }); } vistaProfilo(); }
});
document.addEventListener("change", (e) => { if (e.target.id === "silda" || e.target.id === "silaa") { const da = $("#silda").value, a = $("#silaa").value; if (da && a) { salvaSilenzio({ on: 1, da, a }); vistaProfilo(); } } });

// ---- 45. gesti: scorri a sinistra una giocata per aggiungerla alla schedina
{ let x0 = 0, y0 = 0, el = null;
  document.addEventListener("touchstart", (e) => { el = ls.get("gesti", 1) ? e.target.closest && e.target.closest(".cardp") : null; if (el) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; } }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (!el) return; const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0, c = el; el = null;
    if (dx < -80 && Math.abs(dy) < 30) { const b = c.querySelector(".addl"); if (b) { b.click(); c.style.transition = "transform .18s"; c.style.transform = "translateX(-14px)"; setTimeout(() => { c.style.transform = ""; }, 180); } }
  }, { passive: true });
}

// ---- 47. un solo momento di festa quando una schedina viene presa
function confetti(testo) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv = document.createElement("canvas"); cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:99"; cv.width = innerWidth; cv.height = innerHeight; document.body.appendChild(cv);
  const x = cv.getContext("2d"), P = Array.from({ length: 90 }, () => ({ x: innerWidth / 2, y: innerHeight * 0.4, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, c: [OR, GR, "#ffffff", AM][Math.floor(Math.random() * 4)], s: 5 + Math.random() * 6 })), t0 = performance.now();
  const f = (t) => { const k = t - t0; x.clearRect(0, 0, cv.width, cv.height); for (const p of P) { p.vy += 0.35; p.x += p.vx; p.y += p.vy; x.globalAlpha = Math.max(0, 1 - k / 1800); x.fillStyle = p.c; x.fillRect(p.x, p.y, p.s, p.s * 0.6); } if (k < 1800) requestAnimationFrame(f); else cv.remove(); };
  requestAnimationFrame(f);
  const m = document.createElement("div"); m.textContent = testo; m.style.cssText = "position:fixed;top:18%;left:50%;transform:translateX(-50%);background:var(--card);border:1px solid var(--or);color:var(--txt);padding:12px 18px;border-radius:14px;font-weight:700;z-index:100;box-shadow:0 8px 30px rgba(0,0,0,.5)"; document.body.appendChild(m); setTimeout(() => m.remove(), 2600);
}
function festeggia() {
  const gia = new Set(ls.get("festeggiate", [])), oggi = Date.now(), nuove = ls.get("registro", []).filter((r) => r.esito === 1 && !gia.has(String(r.id)) && oggi - Date.parse(String(r.data) + "T23:59:00") < 3 * 86400000);
  if (!nuove.length) return;
  ls.set("festeggiate", [...gia, ...ls.get("registro", []).filter((r) => r.esito === 1).map((r) => String(r.id))].slice(-300));
  const v = nuove.reduce((t, r) => t + (r.puntata || 0) * ((r.quota || 1) - 1), 0); confetti(`Schedina presa! +${v.toFixed(2).replace(".", ",")} €`);
}
{ const base = aggiornaRegistro; aggiornaRegistro = async function (...a) { const r = await base.apply(this, a); try { festeggia(); } catch {} return r; }; }

// ---- 48. comandi rapidi: pagine, squadre e giocatori di oggi in una ricerca
const COMANDI = [["#/", "Oggi, partite"], ["#/live", "Live"], ["#/combo", "Pronostici"], ["#/schedine", "Schedine"], ["#/mia", "La mia schedina"], ["#/conto", "Conto"], ["#/registro", "Registro"], ["#/statistiche", "Statistiche"], ["#/storico", "Modello"], ["#/impostazioni", "Impostazioni"], ["#/profilo", "Profilo"], ["#/forma", "Forma dei giocatori"], ["#/infortunati", "Infortunati"], ["#/classifica", "Classifica"], ["#/calendario", "Calendario"], ["#/stasera", "Stasera"], ["#/news", "Notizie"], ["#/glossario", "Glossario"], ...HUB.map(([h, , t]) => [h, t])];
async function vistaComandi() {
  APP.innerHTML = back4("#/", "Oggi") + `<h2>Cerca</h2><div class="card"><input class="linea" id="cmq" placeholder="Pagina, squadra o giocatore" style="margin:0" autocapitalize="none" autofocus></div><div id="cmr"></div>`;
  let D = null; try { D = await dati(); } catch {}
  const squadre = D && D.squadre ? Object.entries(D.squadre).map(([ab, s]) => ["#/squadra/" + ab, `${s.n || ab} (squadra)`]) : [], gioc = D ? D.partite.flatMap((p) => (p.giocatori || []).map((g) => ["#/giocatore/" + g.pid, `${g.nome} (${g.sq})`])) : [];
  const tutti = [...COMANDI, ...squadre, ...gioc], disegna = () => { const q = $("#cmq").value.trim().toLowerCase(), l = (q ? tutti.filter(([, n]) => n.toLowerCase().includes(q)) : COMANDI).slice(0, 14); $("#cmr").innerHTML = l.length ? `<div class="card" style="padding:4px 12px">${l.map(([h, n], i) => `<a class="riga rg" href="${h}" style="color:inherit;${i ? "" : "border-top:0"}"><span>${esc(n)}</span><i class="ti ti-chevron-right"></i></a>`).join("")}</div>` : `<div class="vuoto">Niente trovato. Per altri giocatori usa «Giocatori» in Esplora.</div>`; };
  $("#cmq").oninput = disegna; disegna();
}
window.RIDEE.push([/^\/cerca-tutto|^\/comandi/, vistaComandi]);

// ---- 50. glossario
const GLOSSARIO = [["Linea", "Il numero da superare o non superare, per esempio 19,5 punti. Con 19,5 serve segnare 20 o più."], ["Over", "Scommessa che il valore finale sarà sopra la linea."], ["Under", "Scommessa che il valore finale sarà sotto la linea."], ["Probabilità", "Quanto il modello ritiene probabile che la giocata vada a segno: 80% significa 8 volte su 10, in media."], ["Quota", "Quanto paga il bookmaker per ogni euro giocato. Con quota 2,00 e 5 € puntati vinci 10 € in tutto."], ["Quota giusta", "1 diviso la probabilità. È la quota a cui, secondo il modello, la giocata sarebbe alla pari."], ["Valore atteso", "Probabilità × quota − 1. Sopra zero, in teoria conviene; sotto zero no."], ["Stima", "Il numero che il modello si aspetta, per esempio 26 punti. La linea consigliata è più bassa, per essere prudenti."], ["Back-to-back", "Squadra che gioca due sere di fila: di solito è più stanca."], ["Doppia doppia", "Almeno 10 in due statistiche, per esempio 10 punti e 10 rimbalzi."], ["Play-in", "Spareggi per le posizioni dalla 7ª alla 10ª di ogni conference."], ["Parziale", "Una serie di punti consecutivi di una squadra, per esempio 10-0."], ["Kelly", "Metodo che suggerisce quanto puntare in proporzione al vantaggio. Qui si usa solo una frazione, per prudenza."], ["Taratura", "Quanto le probabilità dichiarate corrispondono ai risultati reali."], ["Schedina", "Più giocate unite in una sola: vince solo se le centri tutte, e la quota si moltiplica."]];
function vistaGlossario() {
  APP.innerHTML = back4("#/profilo", "Profilo") + `<h2>Glossario</h2><div class="card"><input class="linea" id="glq" placeholder="Cerca una parola" style="margin:0"></div><div id="glr"></div>`;
  const d = () => { const q = $("#glq").value.trim().toLowerCase(); $("#glr").innerHTML = `<div class="card" style="padding:4px 12px">${GLOSSARIO.filter(([t, s]) => !q || (t + s).toLowerCase().includes(q)).map(([t, s], i) => `<div class="rg" style="padding:10px 0;${i ? "" : "border-top:0"}"><b>${t}</b><div class="s" style="margin-top:2px">${s}</div></div>`).join("")}</div>`; };
  $("#glq").oninput = d; d();
}
window.RIDEE.push([/^\/glossario/, vistaGlossario]);

// ---- 46. indicatore offline: i dati salvati restano visibili e lo si dice
function bannerOffline() { const el = document.getElementById("offl"); if (navigator.onLine) { if (el) el.remove(); return; } if (el) return; const d = document.createElement("div"); d.id = "offl"; d.textContent = "Sei offline: vedi gli ultimi dati salvati"; d.style.cssText = "position:fixed;top:0;left:0;right:0;background:var(--am);color:#000;text-align:center;font-size:13px;font-weight:600;padding:4px;z-index:98"; document.body.appendChild(d); }
addEventListener("online", bannerOffline); addEventListener("offline", bannerOffline); bannerOffline();
