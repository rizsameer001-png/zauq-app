// IndexedDB utility for caching or storing uploaded video files locally.
// This allows the admin to upload MP4/WebM video files directly and play them,
// working around Firestore's 1MB document storage limit.

export function initVideoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("zauq_video_db", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("video_blobs")) {
        db.createObjectStore("video_blobs");
      }
    };
  });
}

export async function saveVideoFile(id: string, file: Blob): Promise<void> {
  try {
    const db = await initVideoDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("video_blobs", "readwrite");
      const store = tx.objectStore("video_blobs");
      const request = store.put(file, id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (err) {
    console.error("IndexedDB save error:", err);
    throw err;
  }
}

export async function getVideoFile(id: string): Promise<Blob | null> {
  try {
    const db = await initVideoDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("video_blobs", "readonly");
      const store = tx.objectStore("video_blobs");
      const request = store.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (err) {
    console.error("IndexedDB fetch error:", err);
    return null;
  }
}

export async function deleteVideoFile(id: string): Promise<void> {
  try {
    const db = await initVideoDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("video_blobs", "readwrite");
      const store = tx.objectStore("video_blobs");
      const request = store.delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (err) {
    console.error("IndexedDB delete error:", err);
  }
}
