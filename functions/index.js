import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import corsLib from "cors";

admin.initializeApp();
const db = admin.firestore();
const cors = corsLib({ origin: true });

// Callable: create user with role (super_admin only)
export const createUserWithRole = functions.https.onCall( async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required.');
  }
  const callerUid = context.auth.uid;
  // check caller role in Firestore
  const callerDoc = await db.collection('users').doc(callerUid).get();
  const callerRole = callerDoc.exists ? callerDoc.data().role : 'viewer';
  if (callerRole !== 'super_admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only super_admin can create users.');
  }

  const { email, password, name, role } = data || {};
  if (!email || !password) {
    throw new functions.https.HttpsError('invalid-argument', 'email and password are required');
  }
  const finalRole = role || 'viewer';
  try {
    const userRecord = await admin.auth().createUser({ email, password, displayName: name || '' });
    const uid = userRecord.uid;
    await db.collection('users').doc(uid).set({
      email, name: name || '', role: finalRole, createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return { uid, email, role: finalRole };
  } catch (e) {
    console.error('createUserWithRole error', e);
    throw new functions.https.HttpsError('internal', e.message || 'create user failed');
  }
});
