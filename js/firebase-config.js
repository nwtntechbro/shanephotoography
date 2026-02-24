// Firebase configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDaQPjsrogumeqJqvqzcTq-8ED8HQ4vOaw",
    authDomain: "shanephotoography.firebaseapp.com",
    projectId: "shanephotoography",
    storageBucket: "shanephotoography.firebasestorage.app",
    messagingSenderId: "805767315119",
    appId: "1:805767315119:web:c78be1772226e44efbde5a",
    measurementId: "G-YEWW94JC63"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
