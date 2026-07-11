// Zauq-e-Shayari Background Service Worker for Daily Couplet Alerts
const CACHE_NAME = "zauq-offline-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Listen for messages from the client tab
self.addEventListener("message", (event) => {
  const data = event.data;

  if (data && data.type === "TRIGGER_LOCAL_NOTIFICATION") {
    const title = data.title || "Daily Sher • ذوق";
    const options = {
      body: data.body || "Open Zauq-e-Shayari to read today's featured poetic couplet.",
      icon: "/assets/.aistudio/logo.png" || data.icon || "https://img.icons8.com/color/96/urdu-alphabet.png",
      badge: "https://img.icons8.com/color/96/urdu-alphabet.png",
      tag: "zauq-daily-sher",
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: {
        url: self.registration.scope
      }
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

// Listen for notification click events to focus/open the application
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const appUrl = event.notification.data ? event.notification.data.url : "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Find if there's already an open tab of the app and focus it
      for (const client of clientList) {
        if (client.url === appUrl && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(appUrl);
      }
    })
  );
});
