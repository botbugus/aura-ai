const firebaseConfig = {
  apiKey: "AIzaSyDnBXxA1OB5ycvZconZZsAyLJOPMmjeh2Y",
  authDomain: "fireassist-x6z4a.firebaseapp.com",
  databaseURL: "https://fireassist-x6z4a-default-rtdb.firebaseio.com",
  projectId: "fireassist-x6z4a",
  storageBucket: "fireassist-x6z4a.firebasestorage.app",
  messagingSenderId: "63835497426",
  appId: "1:63835497426:web:49356023d59f9514cfde0b"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
