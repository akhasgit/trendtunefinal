import { useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously, User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

/**
 * Ensures the user is always authenticated (anonymously if needed).
 * Returns the current Firebase user and a loading flag.
 */
export function useAnonymousAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setLoading(false);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          const u = cred.user;

          const userDoc = await getDoc(doc(db, "users", u.uid));
          if (!userDoc.exists()) {
            await setDoc(doc(db, "users", u.uid), {
              uid: u.uid,
              name: "Guest User",
              email: "",
              current_plan: "free",
              date_joined: serverTimestamp(),
              isAnonymous: true,
            });
          }

          setUser(u);
        } catch (err) {
          console.error("Anonymous auth failed:", err);
        } finally {
          setLoading(false);
        }
      }
    });
    return unsub;
  }, []);

  return { user, loading };
}
