# CookieChat

CookieChat is an open-source **private family chat PWA** built with Firebase.
It is designed for small trusted groups with an approval-based onboarding flow and simple cross-device access.

## Highlights

- Private access with Firebase Authentication
- Admin approval flow for new users
- Real-time chat powered by Firestore
- Installable as an app on iOS, Android, macOS, and desktop browsers
- Lightweight frontend (vanilla HTML/CSS/JS)

## Tech stack

- Frontend: HTML, CSS, JavaScript (PWA)
- Auth: Firebase Authentication (Email/Password)
- Database: Cloud Firestore
- Hosting: Firebase Hosting

## Project structure

- `CookieChatWeb/` web app (single source of truth)
- `CookieChatWeb/index.html` UI structure
- `CookieChatWeb/styles.css` design system and layout
- `CookieChatWeb/app.js` auth/chat/approvals/install/update logic
- `CookieChatWeb/config/firebase-config.example.js` Firebase client config template
- `CookieChatWeb/firestore.rules` security rules
- `CookieChatWeb/firebase.json` Firebase deploy config

## Security model

- Only users listed in `families/{familyId}.members` can access the chat
- New signups are stored as `pending` join requests
- Only admins can approve or reject join requests
- Firestore rules enforce all access control server-side

## Local development

Create your local Firebase config file first:

```bash
cp CookieChatWeb/config/firebase-config.example.js CookieChatWeb/config/firebase-config.js
```

Then fill `firebase-config.js` with your Firebase project values.

```bash
cd /Users/maria/cookiechat-family/CookieChatWeb
python3 -m http.server 5173
```

Open: `http://localhost:5173`

## Deploy

```bash
cd /Users/maria/cookiechat-family
firebase deploy --project cookiechat-1b1e9 --only firestore:rules --config CookieChatWeb/firebase.json
firebase deploy --project cookiechat-1b1e9 --only hosting --config CookieChatWeb/firebase.json
```
