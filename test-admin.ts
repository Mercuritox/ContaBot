import admin from "firebase-admin";
try {
  admin.initializeApp({
    projectId: "contabot-e7b15"
  });
  console.log("Admin initialized");
  const db = admin.firestore();
  db.collection('users').limit(1).get().then(snap => {
    console.log("Got users:", snap.size);
  }).catch(e => console.error("Firestore error:", e));
} catch (e) {
  console.error(e);
}
