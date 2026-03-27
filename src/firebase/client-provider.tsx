"use client";

import React, { type ReactNode, useMemo } from "react";
import { FirebaseProvider } from "@/firebase/provider";
import { initializeFirebase } from "@/firebase/index";

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * This provider is the key to making Firebase work with Next.js SSR.
 * It ensures Firebase is initialized only once on the client and provides
 * the services to the main FirebaseProvider.
 * @param root0
 * @param root0.children
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // Memoize the initialization to ensure it runs only once.
  const instances = useMemo(() => {
    return initializeFirebase();
  }, []);

  return <FirebaseProvider {...instances}>{children}</FirebaseProvider>;
}
