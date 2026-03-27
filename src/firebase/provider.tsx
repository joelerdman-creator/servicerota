"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo } from "react";
import { FirebaseApp } from "firebase/app";
import { Firestore } from "firebase/firestore";
import { Auth, User, onAuthStateChanged, AuthError } from "firebase/auth";
import { FirebaseErrorListener } from "@/components/FirebaseErrorListener";

// Interfaces
interface FirebaseServices {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: AuthError | null;
}

export interface FirebaseContextState extends FirebaseServices, UserAuthState {}

export interface UserHookResult extends UserAuthState {}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

interface FirebaseProviderProps extends FirebaseServices {
  children: ReactNode;
}

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    userError: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });

        // Use relative path for API calls to avoid issues with base URL configuration
        if (firebaseUser) {
          try {
            const idToken = await firebaseUser.getIdToken();
            await fetch(`/api/auth/session`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken }),
            });
          } catch (e) {
            console.error("FirebaseProvider: Failed to set session cookie:", e);
          }
        } else {
          try {
            await fetch(`/api/auth/session`, { method: "DELETE" });
          } catch (e) {
            console.error("FirebaseProvider: Failed to clear session cookie:", e);
          }
        }
      },
      (error: Error) => {
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error as AuthError });
      },
    );

    return () => unsubscribe();
  }, [auth]);

  const contextValue = useMemo(() => ({
    firebaseApp,
    firestore,
    auth,
    ...userAuthState,
  }), [firebaseApp, firestore, auth, userAuthState]);


  if (userAuthState.isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-2">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            <p className="text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }


  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

// Hooks
const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error("useFirebase must be used within a FirebaseProvider.");
  }
  return context;
};

export const useAuth = (): Auth => {
    const { auth } = useFirebase();
    return auth;
};

export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};

export const useFirestore = (): Firestore => {
    const { firestore } = useFirebase();
    return firestore;
};

export const useFirebaseApp = (): FirebaseApp => {
    const { firebaseApp } = useFirebase();
    return firebaseApp;
}
