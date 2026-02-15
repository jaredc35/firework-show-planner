# PyroPlanner - Setup Guide

## Prerequisites

On your new Windows machine, you'll need:

### 1. Install WSL (if not already)
Open PowerShell as Administrator:
```powershell
wsl --install
```
Restart, then open Ubuntu from the Start menu.

### 2. Install Node.js in WSL
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # should show v20.x
```

### 3. Install Firebase CLI
```bash
sudo npm install -g firebase-tools
```

### 4. Install GitHub CLI (optional but easiest for auth)
```bash
sudo apt-get install -y gh
```

---

## Step-by-Step Deployment

### Step 1: Authenticate with GitHub
```bash
gh auth login
# Choose: GitHub.com → HTTPS → Login with browser
```
Or use a Personal Access Token:
```bash
# Go to github.com → Settings → Developer settings → Personal access tokens → Generate new
git config --global credential.helper store
# Then git will prompt for credentials on first push
```

### Step 2: Clone your repo (or create new)
If using the existing repo:
```bash
git clone https://github.com/YOUR_USERNAME/richards-fireworks.git
cd richards-fireworks
```
Or create a fresh one:
```bash
mkdir pyro-planner && cd pyro-planner
git init
git remote add origin https://github.com/YOUR_USERNAME/pyro-planner.git
```

### Step 3: Copy project files
Copy all the files from the downloaded zip into the repo folder, replacing any existing files.

### Step 4: Get your Firebase config values
1. Go to https://console.firebase.google.com/project/richards-fireworks-60589/settings/general
2. Scroll to "Your apps" → click the web app (or create one if none exists)
3. Copy the config values

### Step 5: Create your .env file
```bash
cp .env.example .env
```
Edit `.env` and fill in your actual Firebase values:
```
REACT_APP_FIREBASE_API_KEY=AIzaSy...
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Step 6: Update src/firebase/config.js
The config.js reads from environment variables, but as a fallback update the hardcoded values too.

### Step 7: Install dependencies and test locally
```bash
npm install
npm start
```
This opens http://localhost:3000 — verify the app works.

### Step 8: Authenticate with Firebase
```bash
firebase login
```
This opens a browser for Google sign-in. Use the account that owns the Firebase project.

### Step 9: Deploy Firestore rules & indexes
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### Step 10: Enable Email/Password auth (if not already)
1. Go to Firebase Console → Authentication → Sign-in method
2. Enable "Email/Password"

### Step 11: Build and deploy
```bash
npm run build
firebase deploy --only hosting
```
Your app is now live at: `https://richards-fireworks-60589.web.app`

---

## Set Up Auto-Deploy (GitHub Actions)

### Add GitHub Secrets
1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Add these secrets:

| Secret Name | Where to Get It |
|---|---|
| `FIREBASE_API_KEY` | Firebase Console → Project Settings |
| `FIREBASE_MESSAGING_SENDER_ID` | Firebase Console → Project Settings |
| `FIREBASE_APP_ID` | Firebase Console → Project Settings |
| `FIREBASE_SERVICE_ACCOUNT` | See below |

### Generate Firebase Service Account key:
```bash
firebase init hosting:github
```
This will:
- Ask which GitHub repo to connect
- Automatically create the service account
- Add the secret to your GitHub repo

Alternatively, generate manually:
1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Copy the ENTIRE JSON contents as the `FIREBASE_SERVICE_ACCOUNT` secret

### Push to deploy
```bash
git add .
git commit -m "Initial PyroPlanner deployment"
git push origin main
```
GitHub Actions will auto-build and deploy on every push to `main`.

---

## Setting Up Admin Users

After your first user signs up:
1. Go to Firebase Console → Firestore
2. Find the `users` collection
3. Click on your user document
4. Change `role` from `"user"` to `"admin"`

Admin users can:
- See ALL users' fireworks and shows
- Edit/delete any firework or show
- See owner names in the UI

Regular users can only see and manage their own data.

---

## Security Model

The Firestore security rules enforce:
- **Users** can only read/write their own fireworks, shows, and show items
- **Admins** can read/write ALL fireworks, shows, and show items
- **Show items** inherit permissions from their parent show
- **Users cannot change their own role** (only admins can promote)
- **All data requires authentication** — no anonymous access

---

## Project Structure
```
pyro-planner/
├── .github/workflows/firebase-deploy.yml   # Auto-deploy on push
├── public/index.html                        # HTML shell
├── src/
│   ├── index.js                             # React entry point
│   ├── App.js                               # Main app (all views + Firestore)
│   ├── components/Login.js                  # Auth screen
│   ├── contexts/AuthContext.js              # Auth state management
│   └── firebase/
│       ├── config.js                        # Firebase initialization
│       └── firestoreService.js              # All Firestore CRUD operations
├── firebase.json                            # Firebase hosting config
├── firestore.rules                          # Security rules
├── firestore.indexes.json                   # Required indexes
├── .firebaserc                              # Points to your project
├── .env.example                             # Template for env vars
└── package.json
```
