import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, getDocFromServer, collection, setDoc, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Enable client-side offline persistence for Firestore
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Firestore offline persistence failed: Multiple tabs open.");
    } else if (err.code === 'unimplemented') {
      console.warn("Firestore offline persistence is not supported by this browser.");
    } else {
      console.error("Firestore offline persistence error:", err);
    }
  });
}
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);
storage.maxUploadRetryTime = 120000; // 2 minutes maximum upload retry time
storage.maxOperationRetryTime = 120000; // 2 minutes maximum operation retry time

export async function uploadToStorage(path: string, file: Blob): Promise<string> {
  try {
    const formData = new FormData();
    const fileName = (file as File).name || path.split("/").pop() || "upload_file";
    formData.append("file", file, fileName);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      if (data.url) return data.url;
    }
  } catch (apiErr) {
    console.warn("Backend local API upload failed, trying Firebase Storage fallback:", apiErr);
  }

  // Fallback to Firebase Storage
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

export function uploadToStorageWithProgress(
  path: string,
  file: Blob,
  onProgress: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Try our high-speed local backend first
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    const fileName = (file as File).name || path.split("/").pop() || "upload_file";
    formData.append("file", file, fileName);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        onProgress(percentComplete);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          onProgress(100);
          resolve(response.url);
        } catch (e) {
          fallbackToFirebase();
        }
      } else {
        fallbackToFirebase();
      }
    });

    xhr.addEventListener("error", () => {
      fallbackToFirebase();
    });

    function fallbackToFirebase() {
      console.warn("Express backend upload failed. Falling back to Firebase Storage.");
      // Start a progress simulation for Firebase Storage fallback
      let currentProgress = 0;
      onProgress(0);
      
      const interval = setInterval(() => {
        if (currentProgress < 30) {
          currentProgress += 10;
        } else if (currentProgress < 75) {
          currentProgress += 5;
        } else if (currentProgress < 95) {
          currentProgress += 2;
        } else if (currentProgress < 99) {
          currentProgress += 0.5;
        }
        onProgress(Math.min(99, currentProgress));
      }, 100);

      const storageRef = ref(storage, path);
      uploadBytes(storageRef, file)
        .then(async (snapshot) => {
          clearInterval(interval);
          onProgress(100);
          const downloadUrl = await getDownloadURL(snapshot.ref);
          resolve(downloadUrl);
        })
        .catch((error) => {
          clearInterval(interval);
          reject(error);
        });
    }

    xhr.open("POST", "/api/upload");
    xhr.send(formData);
  });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test helper as specified in the Firebase integration skill guidelines
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection checked successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration: Client is offline.");
    }
  }
}

export function resolveBookUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("local://")) return url;
  
  // Convert absolute upload paths to relative paths so they work on any domain
  const match = url.indexOf("/uploads/");
  if (match !== -1) {
    return url.substring(match);
  }
  
  // If the URL contains localhost:3000 or 127.0.0.1:3000 but we are on a real domain,
  // rewrite it to use the current browser's origin.
  try {
    if (url.includes("localhost:3000") || url.includes("127.0.0.1:3000")) {
      const parsed = new URL(url);
      return `${window.location.origin}${parsed.pathname}${parsed.search}`;
    }
  } catch (e) {
    console.warn("Failed to parse URL for resolution:", url, e);
  }
  return url;
}

export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === undefined) return null as any;
  if (obj === null) return null as any;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore) as any;
  }
  if (typeof obj === "object" && obj !== null) {
    // For Firestore special types like Timestamp or FieldValue, do not sanitize recursively
    if (obj.constructor && (obj.constructor.name === "FieldValue" || obj.constructor.name === "Timestamp" || obj.constructor.name === "eo")) {
      return obj;
    }
    const res: any = {};
    for (const key of Object.keys(obj)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        res[key] = sanitizeForFirestore(val);
      }
    }
    return res;
  }
  return obj;
}

export async function logUserActivity(
  action: string,
  details: string,
  customUserInfo?: { uid?: string; email?: string | null; displayName?: string | null }
) {
  try {
    const currentUser = auth.currentUser;
    const uid = customUserInfo?.uid || currentUser?.uid || "anonymous";
    const email = customUserInfo?.email !== undefined ? customUserInfo.email : (currentUser?.email || "anonymous@zauq.com");
    const name = customUserInfo?.displayName !== undefined ? customUserInfo.displayName : (currentUser?.displayName || "Guest User");
    
    const logsRef = collection(db, "audit_logs");
    const newLogRef = doc(logsRef);
    
    await setDoc(newLogRef, {
      id: newLogRef.id,
      userId: uid,
      userEmail: email,
      userName: name,
      action: action,
      details: details,
      timestamp: new Date().toISOString(),
      ipAddress: "127.0.0.1"
    });
  } catch (err) {
    console.error("Error logging user activity:", err);
  }
}

