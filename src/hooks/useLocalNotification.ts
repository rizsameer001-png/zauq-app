import { useState, useEffect, useCallback } from "react";
import { Sher, Ghazal } from "../types";

export interface NotificationConfig {
  enabled: boolean;
  time: string; // "HH:MM" format
  lastNotifiedDate: string | null; // "YYYY-MM-DD"
}

export function useLocalNotification(ghazals: Ghazal[]) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [config, setConfig] = useState<NotificationConfig>({
    enabled: false,
    time: "09:00", // Default 9:00 AM
    lastNotifiedDate: null
  });

  // Load configuration and permissions
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("Notification" in window) {
        setPermission(Notification.permission);
      }

      const stored = localStorage.getItem("zauq_notification_config");
      if (stored) {
        try {
          setConfig(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse notification config", e);
        }
      }
    }
  }, []);

  // Save config to localStorage
  const saveConfig = useCallback((newConfig: NotificationConfig) => {
    setConfig(newConfig);
    localStorage.setItem("zauq_notification_config", JSON.stringify(newConfig));
  }, []);

  // Request browser notification permission
  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("This browser does not support desktop notifications.");
      return "denied" as NotificationPermission;
    }

    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      return res;
    } catch (e) {
      console.error("Error requesting notification permission", e);
      return "default" as NotificationPermission;
    }
  }, []);

  // Extract today's daily sher to display in the notification body
  const getTodaySher = useCallback((): Sher | null => {
    if (!ghazals || ghazals.length === 0) return null;
    
    // Flatten all shers
    const allShers: Sher[] = [];
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

    if (allShers.length === 0) return null;

    // Deterministic selection based on date
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = (hash << 5) - hash + dateStr.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % allShers.length;
    return allShers[index];
  }, [ghazals]);

  // Dispatch standard or Service Worker notification
  const dispatchNotification = useCallback((title: string, body: string) => {
    // Attempt via Service Worker first (for background focus-on-click support)
    if (typeof window !== "undefined" && "serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "TRIGGER_LOCAL_NOTIFICATION",
        title: title,
        body: body
      });
    } else if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      // Fallback to standard window Notification
      const notification = new Notification(title, {
        body: body,
        icon: "https://img.icons8.com/color/96/urdu-alphabet.png",
        badge: "https://img.icons8.com/color/96/urdu-alphabet.png",
        tag: "zauq-daily-sher",
        requireInteraction: true
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }, []);

  // Trigger test notification immediately
  const triggerTestNotification = useCallback(() => {
    const todaySher = getTodaySher();
    const title = "Zauq-e-Shayari • ذوق";
    const body = todaySher 
      ? `"${todaySher.roman || todaySher.urdu.substring(0, 45)}..." — ${todaySher.poet || "Classic Poet"}`
      : "Your daily spiritual couplet is waiting for you. Tap to read now.";
    
    dispatchNotification(title, body);
  }, [getTodaySher, dispatchNotification]);

  // Scheduler interval to check and trigger the daily reminder
  useEffect(() => {
    if (!config.enabled || permission !== "granted") return;

    const checkAndTrigger = () => {
      const now = new Date();
      const currentHourStr = String(now.getHours()).padStart(2, "0");
      const currentMinStr = String(now.getMinutes()).padStart(2, "0");
      const currentTimeStr = `${currentHourStr}:${currentMinStr}`;

      if (currentTimeStr === config.time) {
        const todayDateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
        
        // Prevent double triggers on the exact same minute or date
        if (config.lastNotifiedDate !== todayDateStr) {
          const todaySher = getTodaySher();
          const title = "Daily Sher selection is ready! • ذوق";
          const body = todaySher
            ? `"${todaySher.roman || todaySher.urdu.substring(0, 45)}..." — ${todaySher.poet}`
            : "Expand your literary soul with today's chosen Urdu couplet.";

          dispatchNotification(title, body);

          // Update config to record this notification as sent today
          saveConfig({
            ...config,
            lastNotifiedDate: todayDateStr
          });
        }
      }
    };

    // Run initial check and then poll every 30 seconds
    checkAndTrigger();
    const interval = setInterval(checkAndTrigger, 30000);

    return () => clearInterval(interval);
  }, [config, permission, getTodaySher, dispatchNotification, saveConfig]);

  return {
    permission,
    config,
    requestPermission,
    saveConfig,
    triggerTestNotification
  };
}
