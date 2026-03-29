# CookieChat

CookieChat is an open-source private family messaging PWA focused on **low-friction communication between kids and grandparents**.

It runs in browsers and can be installed as an app (iOS, Android, macOS, desktop) without publishing to mobile stores.

## Product Focus

- Send affection in 1-2 taps with **CookieExpress** templates
- Keep family conversations private with admin approval
- Stay simple for non-technical users

## Features

- Firebase Authentication (Email/Password)
- Admin approval flow for new accounts
- Real-time family chat (Firestore)
- Quick greeting cards with recipient targeting:
  - everyone
  - specific family member
- Separate “received cards” feed (not mixed into chat)
- Optional E2EE key mode (browser-side encryption)
- Drawing message support
- Per-user visual identity in chat (stable color theme + icon)
- Browser-language detection (ES/EN/FR/DE/IT/PT)
- Auto-delete retention window (admin-configurable, hours)
- Install/update UX for PWA
- Optional Cloud Functions email alerts for new join requests

## Tech Stack

- Frontend: Vanilla HTML/CSS/JS (PWA)
- Auth: Firebase Authentication
- Database: Cloud Firestore
- Hosting: Firebase Hosting
- Optional backend: Firebase Cloud Functions (Node.js)

## Repository Structure

- `CookieChatWeb/` Main web application
- `CookieChatWeb/index.html` App layout
- `CookieChatWeb/styles.css` Design system and UI styling
- `CookieChatWeb/app.js` Product logic (auth/chat/cards/admin/profile/PWA)
- `CookieChatWeb/firestore.rules` Access control and write validation
- `CookieChatWeb/firebase.json` Firebase deploy config for web app
- `CookieChatWeb/config/firebase-config.example.js` Public config template
- `functions/` Optional Cloud Functions (admin join-request emails)

## Prerequisites

- Firebase project
- Node.js 18+ and npm
- Firebase CLI (`npm install -g firebase-tools`)
- Python 3 (or any static file server) for local preview

## Quick Start

### 1) Clone

```bash
git clone git@github.com:<your-github-user>/cookiechat-family.git
cd cookiechat-family
```

### 2) Login Firebase CLI

```bash
firebase login
```

### 3) Create Firebase Project

In Firebase Console:

1. Create project
2. Enable Authentication -> Email/Password
3. Create Firestore Database (production mode)
4. Register a Web app and copy SDK config values

### 4) Configure Client

```bash
cp CookieChatWeb/config/firebase-config.example.js CookieChatWeb/config/firebase-config.js
```

Edit `CookieChatWeb/config/firebase-config.js`:

- Fill `firebaseConfig` from your Firebase Web app
- Set `familyId` and `roomId` if needed

Default values:

- `familyId = "family_demo_1"`
- `roomId = "family_main"`

### 5) Seed First Admin

1. Create one user in Firebase Authentication -> Users
2. Copy that user UID
3. Create Firestore document `families/<familyId>` with:

```json
{
  "name": "Cookie Family",
  "status": "active",
  "admins": {
    "<ADMIN_UID>": true
  },
  "members": {
    "<ADMIN_UID>": "admin"
  },
  "memberNames": {
    "<ADMIN_UID>": "Parent Admin"
  }
}
```

4. Create room document `families/<familyId>/rooms/<roomId>`:

```json
{
  "title": "Family chat"
}
```

### 6) Deploy Security Rules

From repo root:

```bash
firebase deploy --project <your-project-id> --only firestore:rules --config CookieChatWeb/firebase.json
```

### 7) Run Locally

```bash
cd CookieChatWeb
python3 -m http.server 5173
```

Open:

- `http://localhost:5173`

### 8) Deploy Hosting

From repo root:

```bash
firebase deploy --project <your-project-id> --only hosting --config CookieChatWeb/firebase.json
```

## Optional: Deploy Cloud Functions (Email Alerts)

Use this only if you want admin emails when new join requests arrive.

### Configure environment

```bash
cp functions/.env.example functions/.env.<your-project-id>
```

Set values in `functions/.env.<your-project-id>`:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- Optional: `ADMIN_NOTIFICATION_EMAILS` (comma-separated fallback list)

### Install and deploy

```bash
cd functions
npm install
cd ..
firebase deploy --project <your-project-id> --only functions --config CookieChatWeb/firebase.json
```

## Data Model Overview

- `families/{familyId}`
  - `members`, `admins`, `memberNames`, `settings.retentionHours`
- `families/{familyId}/rooms/{roomId}/messages/{messageId}`
  - chat messages (text or drawing payload), `expiresAt`
- `families/{familyId}/cards/{cardId}`
  - CookieExpress cards, recipient-scoped, `expiresAt`
- `families/{familyId}/templates/{templateId}`
  - admin-managed quick templates
- `families/{familyId}/joinRequests/{uid}`
  - onboarding request lifecycle (`pending`, `approved`, `rejected`)
- `families/{familyId}/userProfiles/{uid}`
  - display names
- `families/{familyId}/deniedUsers/{uid}`
  - rejection audit record

## Security Model

- Being an Auth user is not enough: user must be in `families/{familyId}.members`
- Firestore rules validate sender identity/role, content limits, recipient fields, and timestamps
- Only admins can approve/reject join requests
- Rejected users are removed from membership maps
- Expired messages/cards can be deleted by admin cleanup logic

## Notes on Encryption

- E2EE mode is optional and client-managed
- Key is entered in browser and never stored server-side by this app
- Without E2EE key configured, messages are stored as plaintext in Firestore

## PWA Install Notes

- iPhone/iPad: Safari -> Share -> Add to Home Screen
- Chrome desktop/macOS: install/open from browser prompt or app header button
- Service worker update checks run periodically; a refresh may still be needed after deploy

## Troubleshooting

### `auth/api-key-not-valid`

`CookieChatWeb/config/firebase-config.js` has placeholder or wrong config. Recopy values from Firebase Web app settings.

### `permission-denied` on join request

Check:

1. `familyId` in config matches Firestore document
2. Admin UID exists in both `admins` and `members` maps
3. Latest rules are deployed

### Firestore console “error loading documents”

- Confirm correct Firebase project/account
- Reload console in private window
- Disable ad blockers/extensions for console

### New deploy not visible on mobile

- Reopen browser and hard refresh
- Remove old home-screen shortcut and add again
- Ensure you are loading the correct Hosting URL

## Current Roadmap Note

Planned but intentionally not implemented yet:

- Full server-side push notifications per user/device with Cloud Functions + FCM and cost guardrails.
