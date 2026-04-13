import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "PUT_HERE",
  authDomain: "PUT_HERE",
  projectId: "PUT_HERE",
  storageBucket: "PUT_HERE",
  messagingSenderId: "PUT_HERE",
  appId: "PUT_HERE"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
