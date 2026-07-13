import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA9rs382C3vfNYhdscy7xLVw1WQ7F-vCf4",
  authDomain: "taxi-khanaqin-3.firebaseapp.com",
  projectId: "taxi-khanaqin-3",
  storageBucket: "taxi-khanaqin-3.firebasestorage.app",
  messagingSenderId: "708459732598",
  appId: "1:708459732598:web:5c5bfcf6c055918caa0957",
  measurementId: "G-3R7MHV5ETW",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export default app;
