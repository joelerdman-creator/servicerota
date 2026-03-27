// IMPORTANT: This file should only be imported by server-side code (e.g., API routes).

import { initializeApp, getApps, App, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let app: App | null = null;
export let initError: Error | null = null;
export let debugInfo: any = {}; // For debugging

function initializeAdminApp(): App {
  if (app) {
    return app;
  }

  const envKey = process.env.FIREBASE_PRIVATE_KEY;
  const envEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const envProjectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!envKey || !envEmail) {
    const errorMessage = "Firebase Admin credentials (FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL) are not set in environment variables. Server-side functionality is disabled.";
    initError = new Error(errorMessage);
    console.error(`[Firebase Admin] ${initError.message}`);
    debugInfo.source = 'error-no-credentials';
    throw initError;
  }

  const serviceAccount: ServiceAccount = {
    projectId: envProjectId, // Can be undefined, firebase-admin can infer
    clientEmail: envEmail,
    privateKey: envKey.replace(/\\n/g, '\n'),
  };

  debugInfo.source = 'environment';
  debugInfo.projectId = serviceAccount.projectId;
  debugInfo.clientEmail = serviceAccount.clientEmail;

  try {
    const existingApp = getApps().find((a) => a.name === "admin-app");
    app =
      existingApp ||
      initializeApp(
        {
          credential: cert(serviceAccount),
          ...(serviceAccount.projectId && { projectId: serviceAccount.projectId }),
        },
        "admin-app",
      );
    return app;
  } catch (error: any) {
    console.error("CRITICAL: Error initializing Firebase Admin App:", error.message);
    initError = error;
    debugInfo.initErrorMessage = error.message;
    throw error;
  }
}


function getAdminAuth(): Auth | null {
  try {
    const adminApp = initializeAdminApp();
    return getAuth(adminApp);
  } catch (error: any) {
    console.warn(`[Firebase Admin] Auth not initialized: ${error.message}`);
    if (!initError) initError = error;
    return null;
  }
}

function getAdminFirestore(): Firestore | null {
  try {
    const adminApp = initializeAdminApp();
    return getFirestore(adminApp);
  } catch (error: any) {
    console.warn(`[Firebase Admin] Firestore not initialized: ${error.message}`);
    return null;
  }
}

// These are evaluated once at import time, but getAdminAuth/getAdminFirestore
// catch all errors internally and return null — they will NOT throw and crash
// the server worker even when env vars are missing.
export const auth = getAdminAuth();
export const firestore = getAdminFirestore();
