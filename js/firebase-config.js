// تهيئة Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDPSXK02S0Em-0ZLl2zhH6M6loW3VYpReA",
  authDomain: "anime-gallery-b0a34.firebaseapp.com",
  databaseURL: "https://anime-gallery-b0a34-default-rtdb.firebaseio.com/",
  projectId: "anime-gallery-b0a34",
  storageBucket: "anime-gallery-b0a34.appspot.com",
  messagingSenderId: "39241660436",
  appId: "1:39241660436:web:c35efd2748674b5a824f01",
  measurementId: "G-FH2B5ZDFRQ"
};

// تهيئة Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase:", error);
}