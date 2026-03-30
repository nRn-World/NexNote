import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCanAf3XY1nJDnyqfQhB6dufDp4W6Oovb0",
  authDomain: "nexnote-1.firebaseapp.com",
  projectId: "nexnote-1",
  storageBucket: "nexnote-1.firebasestorage.app",
  messagingSenderId: "950801399914",
  appId: "1:950801399914:web:b8af074a9369d5e0da8a13",
  measurementId: "G-7RRW673DNZ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
<<<<<<< HEAD
  } catch (error: any) {
    console.error("Error signing in with Google", error);
    alert("Inloggningen misslyckades: " + error.message);
=======
  } catch (error) {
    console.error("Error signing in with Google", error);
>>>>>>> origin/main
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
  }
};
