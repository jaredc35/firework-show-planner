// src/firebase/firestoreService.js
import { db } from './config';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, orderBy, serverTimestamp,
  getDocs,
} from 'firebase/firestore';

// ─── Fireworks ────────────────────────────────────────────────────────────────
// Fireworks are per-user, but admins can see all.
// Each firework doc lives in /fireworks/{id}

export function subscribeFireworks(userId, isAdmin, callback) {
  let q;
  if (isAdmin) {
    q = query(collection(db, 'fireworks'), orderBy('name'));
  } else {
    q = query(collection(db, 'fireworks'), where('userId', '==', userId), orderBy('name'));
  }
  return onSnapshot(q, (snapshot) => {
    const fireworks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(fireworks);
  });
}

export async function addFirework(userId, data) {
  return addDoc(collection(db, 'fireworks'), {
    ...data,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateFirework(id, data) {
  return updateDoc(doc(db, 'fireworks', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteFirework(id) {
  return deleteDoc(doc(db, 'fireworks', id));
}

// ─── Shows ────────────────────────────────────────────────────────────────────
// Shows are per-user, but admins can see all.
// Each show doc lives in /shows/{id}
// Show items are stored as a subcollection: /shows/{showId}/items/{itemId}

export function subscribeShows(userId, isAdmin, callback) {
  let q;
  if (isAdmin) {
    q = query(collection(db, 'shows'), orderBy('createdAt', 'desc'));
  } else {
    q = query(collection(db, 'shows'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  }
  return onSnapshot(q, (snapshot) => {
    const shows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(shows);
  });
}

export async function addShow(userId, name) {
  return addDoc(collection(db, 'shows'), {
    name,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateShow(id, data) {
  return updateDoc(doc(db, 'shows', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteShow(id) {
  // Delete all items in the show first
  const itemsSnapshot = await getDocs(collection(db, 'shows', id, 'items'));
  const deletePromises = itemsSnapshot.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletePromises);
  return deleteDoc(doc(db, 'shows', id));
}

// ─── Show Items (subcollection) ───────────────────────────────────────────────
export function subscribeShowItems(showId, callback) {
  const q = query(
    collection(db, 'shows', showId, 'items'),
    orderBy('startTime')
  );
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(items);
  });
}

export async function addShowItem(showId, data) {
  return addDoc(collection(db, 'shows', showId, 'items'), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateShowItem(showId, itemId, data) {
  return updateDoc(doc(db, 'shows', showId, 'items', itemId), data);
}

export async function deleteShowItem(showId, itemId) {
  return deleteDoc(doc(db, 'shows', showId, 'items', itemId));
}

// Batch reorder: update all items' startTime-based order
export async function reorderShowItems(showId, items) {
  const promises = items.map((item, index) =>
    updateDoc(doc(db, 'shows', showId, 'items', item.id), {
      sortOrder: index,
    })
  );
  return Promise.all(promises);
}
