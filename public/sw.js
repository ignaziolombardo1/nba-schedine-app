const V = "nba-v113";
const SHELL = ["/", "/style.css", "/core.js", "/mia.js", "/partite.js", "/conto.js", "/statistiche.js", "/strumenti.js", "/giocatore.js", "/live.js", "/esplora.js", "/idee1.js", "/idee2.js", "/idee3.js", "/idee4.js", "/app.js", "/manifest.webmanifest", "/icon-192.png", "/apple-touch-icon.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/")) return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(V).then((ch) => ch.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});

// notifiche: il server avvisa senza testo, qui si scarica l'ultimo avviso e lo si mostra
self.addEventListener("push", (e) => {
  e.waitUntil((async () => {
    let a = { titolo: "NBA Schedine", testo: "Apri l'app per vedere le giocate", url: "/#/" };
    try {
      let id = "";
      try { const sb = await self.registration.pushManager.getSubscription(); if (sb) id = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sb.endpoint)))].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join(""); } catch {}
      const r = await fetch("/api/ultimo-avviso?id=" + id, { cache: "no-store" }); if (r.ok) a = await r.json();
    } catch {}
    const tag = a.tag || (/partita\/\d+/.exec(a.url || "") || [])[0]; // stessa partita: la notifica nuova sostituisce la vecchia
    await self.registration.showNotification(a.titolo, { body: a.testo, icon: "/icon-192.png", badge: "/icon-192.png", data: { url: a.url || "/#/" }, ...(tag ? { tag, renotify: true } : {}) });
  })());
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/#/";
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((l) => { for (const c of l) if ("focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); } return clients.openWindow(url); }));
});
