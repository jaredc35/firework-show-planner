import firebase_admin
from firebase_admin import credentials, firestore
import streamlit as st

# Initialize Firebase (only once)
if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()


def save_show_to_firebase(show_name, fireworks_data, user_id="anonymous"):
    """Save firework show to Firebase"""
    try:
        doc_ref = db.collection("shows").document()
        doc_ref.set(
            {
                "name": show_name,
                "fireworks": fireworks_data,
                "user_id": user_id,
                "created_at": firestore.SERVER_TIMESTAMP,
                "updated_at": firestore.SERVER_TIMESTAMP,
            }
        )
        return doc_ref.id
    except Exception as e:
        st.error(f"Error saving to Firebase: {e}")
        return None


def get_user_shows(user_id="anonymous"):
    """Get all shows for a user"""
    try:
        shows_ref = db.collection("shows")
        query = shows_ref.where("user_id", "==", user_id).order_by(
            "updated_at", direction=firestore.Query.DESCENDING
        )
        shows = []
        for doc in query.stream():
            show_data = doc.to_dict()
            show_data["id"] = doc.id
            shows.append(show_data)
        return shows
    except Exception as e:
        st.error(f"Error getting shows: {e}")
        return []


def load_show_from_firebase(show_id):
    """Load firework show from Firebase"""
    try:
        doc_ref = db.collection("shows").document(show_id)
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict()
        return None
    except Exception as e:
        st.error(f"Error loading from Firebase: {e}")
        return None
