"use client";

// This file serves as a "barrel" for all Firebase-related modules.
// It re-exports everything from the other files, providing a single
// point of import for the rest of the application.

import { getApps, initializeApp, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseConfig } from "./config";

interface FirebaseServices {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

let firebaseServices: FirebaseServices | null = null;

/**
 * Initializes all Firebase services and returns them.
 * Ensures services are initialized only once.
 */
export function initializeFirebase(): FirebaseServices {
  if (firebaseServices) {
    return firebaseServices;
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const firestore = getFirestore(app);

  firebaseServices = { firebaseApp: app, auth, firestore };
  return firebaseServices;
}


export * from "./provider";
export * from "./client-provider";
export * from "./hooks/use-memo-firebase";
export * from "./firestore/use-collection";
export * from "./firestore/use-doc";
export * from "./errors";
export * from "./error-emitter";
