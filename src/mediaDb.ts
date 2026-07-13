// IndexedDB database utility for local caching of Author and Book media files (images, audio, video).
// This enables rich uploads of covers, audio readings, and performance clips.

export function initMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("zauq_media_db", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("media_blobs")) {
        db.createObjectStore("media_blobs");
      }
    };
  });
}

export async function saveMediaFile(id: string, file: Blob): Promise<void> {
  try {
    const db = await initMediaDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("media_blobs", "readwrite");
      const store = tx.objectStore("media_blobs");
      const request = store.put(file, id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (err) {
    console.error("IndexedDB save error in mediaDb:", err);
    throw err;
  }
}

export async function getMediaFile(id: string): Promise<Blob | null> {
  try {
    const db = await initMediaDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("media_blobs", "readonly");
      const store = tx.objectStore("media_blobs");
      const request = store.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (err) {
    console.error("IndexedDB fetch error in mediaDb:", err);
    return null;
  }
}

export async function deleteMediaFile(id: string): Promise<void> {
  try {
    const db = await initMediaDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("media_blobs", "readwrite");
      const store = tx.objectStore("media_blobs");
      const request = store.delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (err) {
    console.error("IndexedDB delete error in mediaDb:", err);
  }
}

export async function getAllCachedKeys(): Promise<string[]> {
  try {
    const db = await initMediaDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("media_blobs", "readonly");
      const store = tx.objectStore("media_blobs");
      const request = store.getAllKeys();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve((request.result || []) as string[]);
    });
  } catch (err) {
    console.error("IndexedDB getAllKeys error in mediaDb:", err);
    return [];
  }
}
