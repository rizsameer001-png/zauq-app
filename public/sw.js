// Zauq-e-Shayari Background Service Worker for Daily Couplet Alerts
const CACHE_NAME = "zauq-offline-cache-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html"
];

// Configuration Cache for persistence across Service Worker restarts
const CONFIG_CACHE_NAME = "zauq-notif-config";
const CONFIG_FILE_PATH = "/notif-config.json";

// Save config to cache
async function saveConfigToCache(config) {
  try {
    const cache = await caches.open(CONFIG_CACHE_NAME);
    const response = new Response(JSON.stringify(config));
    await cache.put(CONFIG_FILE_PATH, response);
  } catch (e) {
    console.error("Failed to save config to cache", e);
  }
}

// Get config from cache
async function getConfigFromCache() {
  try {
    const cache = await caches.open(CONFIG_CACHE_NAME);
    const response = await cache.match(CONFIG_FILE_PATH);
    if (response) {
      return await response.json();
    }
  } catch (e) {
    console.error("Failed to get config from cache", e);
  }
  return null;
}

// Fetch a random or daily Sher from the database APIs or offline caches
async function fetchRandomSher() {
  try {
    // 1. Try daily couplets first
    const response = await fetch("/api/daily-couplets");
    if (response.ok) {
      const couplets = await response.json();
      if (couplets && couplets.length > 0) {
        const randomIndex = Math.floor(Math.random() * couplets.length);
        return couplets[randomIndex];
      }
    }
  } catch (e) {
    console.warn("Failed to fetch daily-couplets from network:", e);
  }

  try {
    // 2. Try daily couplets cache fallback
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match("/api/daily-couplets");
    if (cachedResponse) {
      const couplets = await cachedResponse.json();
      if (couplets && couplets.length > 0) {
        const randomIndex = Math.floor(Math.random() * couplets.length);
        return couplets[randomIndex];
      }
    }
  } catch (e) {
    console.error("Failed to read daily-couplets from offline cache:", e);
  }

  try {
    // 3. Try to fetch all ghazals and extract a random sher
    const response = await fetch("/api/ghazals");
    if (response.ok) {
      const ghazals = await response.json();
      const allShers = [];
      if (ghazals && ghazals.length > 0) {
        ghazals.forEach((g) => {
          if (g.shers) {
            g.shers.forEach((s) => {
              allShers.push({
                ...s,
                poet: s.poet || g.poet
              });
            });
          }
        });
      }
      if (allShers.length > 0) {
        const randomIndex = Math.floor(Math.random() * allShers.length);
        return allShers[randomIndex];
      }
    }
  } catch (e) {
    console.warn("Failed to fetch ghazals from network:", e);
  }

  try {
    // 4. Try ghazals cache fallback
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match("/api/ghazals");
    if (cachedResponse) {
      const ghazals = await cachedResponse.json();
      const allShers = [];
      if (ghazals && ghazals.length > 0) {
        ghazals.forEach((g) => {
          if (g.shers) {
            g.shers.forEach((s) => {
              allShers.push({
                ...s,
                poet: s.poet || g.poet
              });
            });
          }
        });
      }
      if (allShers.length > 0) {
        const randomIndex = Math.floor(Math.random() * allShers.length);
        return allShers[randomIndex];
      }
    }
  } catch (e) {
    console.error("Failed to read ghazals from offline cache:", e);
  }

  // Ultimate classic fallback couplet
  return {
    urdu: "لائی حیات آئے قضا لے چلی چلے\nअपनी खुशियों से न आए न अपनी खुशी चले",
    roman: "Layi hayat aaye qaza le chali chale\nApni khushi na aaye na apni khushi chale",
    poet: "Sheikh Mohammad Ibrahim Zauq"
  };
}

// Triggers the actual daily sher push/notification
async function triggerDailySherNotification() {
  const sher = await fetchRandomSher();
  const title = "Sher of the Day • ذوقِ شاعری";
  
  // Format body beautifully
  let body = "";
  if (sher) {
    const firstLineUrdu = sher.urdu ? sher.urdu.split("\n")[0] : "";
    const firstLineRoman = sher.roman ? sher.roman.split("\n")[0] : "";
    
    if (firstLineUrdu) {
      body += `${firstLineUrdu}\n`;
    }
    if (firstLineRoman) {
      body += `"${firstLineRoman}..."\n`;
    } else if (sher.english) {
      body += `"${sher.english.substring(0, 50)}..."\n`;
    }
    body += `— ${sher.poet || "Classic Poet"}`;
  } else {
    body = "Expand your literary soul with today's chosen Urdu couplet.";
  }

  const options = {
    body: body,
    icon: "/assets/.aistudio/logo.png" || "https://img.icons8.com/color/96/urdu-alphabet.png",
    badge: "https://img.icons8.com/color/96/urdu-alphabet.png",
    tag: "zauq-daily-sher",
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: {
      url: self.registration.scope
    }
  };

  await self.registration.showNotification(title, options);
}

// Check time schedule and trigger if conditions are met
async function checkAndTriggerDailyNotification() {
  const config = await getConfigFromCache();
  if (!config || !config.enabled) {
    return;
  }

  const now = new Date();
  const currentHourStr = String(now.getHours()).padStart(2, "0");
  const currentMinStr = String(now.getMinutes()).padStart(2, "0");
  const currentTimeStr = `${currentHourStr}:${currentMinStr}`;

  if (currentTimeStr === config.time) {
    const todayDateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

    // Prevent double notifications on the same day
    if (config.lastNotifiedDate !== todayDateStr) {
      await triggerDailySherNotification();
      
      config.lastNotifiedDate = todayDateStr;
      await saveConfigToCache(config);

      // Inform active tabs to synchronize state
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientsList) {
        client.postMessage({
          type: "SYNC_NOTIFICATION_CONFIG",
          config: config
        });
      }
    }
  }
}

// Background checking interval
let notificationCheckInterval = null;
function startNotificationTimer() {
  if (notificationCheckInterval) {
    clearInterval(notificationCheckInterval);
  }
  notificationCheckInterval = setInterval(checkAndTriggerDailyNotification, 30000);
}

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
          if (key !== CACHE_NAME && key !== CONFIG_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      startNotificationTimer();
      return self.clients.claim();
    })
  );
});

// Start checking on evaluation/load
startNotificationTimer();

// Fetch Event - Handle robust offline browsing and trigger timing check
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Perform lightweight check asynchronously on fetch trigger to keep service worker alive
  event.waitUntil(checkAndTriggerDailyNotification());

  // 1. Bypass non-GET requests (like POST uploads, login, etc.)
  if (event.request.method !== "GET") {
    return;
  }

  // 2. REST API Endpoints: Network-First with Cache Fallback for key poetry collections
  if (url.pathname.startsWith("/api/")) {
    // Skip caching for Gemini AI routes or uploads
    if (url.pathname.includes("/gemini/") || url.pathname.includes("/upload")) {
      return;
    }

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // 3. Navigation Requests: Network-First, then fallback to index.html/root
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match("/index.html") || caches.match("/");
        })
    );
    return;
  }

  // 4. Static Assets & External resources (CSS, JS, Fonts, Images): Cache-First / Stale-While-Revalidate
  const isStaticAsset = 
    url.pathname.includes("/assets/") || 
    url.hostname.includes("fonts.googleapis.com") || 
    url.hostname.includes("fonts.gstatic.com") || 
    /\.(js|css|png|jpg|jpeg|svg|gif|ico|woff|woff2|json)$/i.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Silently absorb fetch errors for background updates
        });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 5. Default Strategy: Network-first
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});

// Listen for messages from the client tab
self.addEventListener("message", (event) => {
  const data = event.data;

  if (!data) return;

  if (data.type === "TRIGGER_LOCAL_NOTIFICATION") {
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

  if (data.type === "SET_NOTIFICATION_CONFIG") {
    event.waitUntil(
      saveConfigToCache(data.config).then(() => {
        return checkAndTriggerDailyNotification();
      })
    );
  }

  if (data.type === "TRIGGER_DAILY_SHER_TEST") {
    event.waitUntil(
      triggerDailySherNotification()
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
