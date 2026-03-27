"use client";

import { Toaster } from "react-hot-toast";
import React from "react";
import dynamic from "next/dynamic";

// Dynamically import the FirebaseClientProvider with SSR turned off.
// This is the key to ensuring Firebase client-side SDK is not initialized on the server.
const FirebaseClientProvider = dynamic(
  () => import("@/firebase/client-provider").then((mod) => mod.FirebaseClientProvider),
  { ssr: false },
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      {children}
      <Toaster position="bottom-center" />
    </FirebaseClientProvider>
  );
}
