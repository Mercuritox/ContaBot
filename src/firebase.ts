import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  enableIndexedDbPersistence
} from "firebase/firestore";
import { 
  getAuth, 
  GoogleAuthProvider
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDpb2jO2jDCS7VG1zsVFuItANuOZjLhHLk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "contabot-e7b15.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "contabot-e7b15",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "contabot-e7b15.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "822742915308",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:822742915308:web:473d3551d6ef2eeb496dc9",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-HY341N3DY6"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, db, auth, googleProvider };

// Habilita la persistencia offline de Firestore
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db)
    .then(() => {
      console.log("Persistencia offline de Firestore habilitada.");
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn("Fallo al habilitar la persistencia: múltiples pestañas abiertas o IndexedDB no disponible.");
      } else if (err.code === 'unimplemented') {
        console.warn("Fallo al habilitar la persistencia: el navegador no soporta todas las características necesarias.");
      } else {
        console.error("Error al habilitar la persistencia de Firestore:", err);
      }
    });
}
