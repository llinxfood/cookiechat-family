# CookieChat

CookieChat is an open-source **private family chat PWA** built with Firebase.
It is designed for small trusted groups with an approval-based onboarding flow and simple cross-device access.

## Highlights

- Private access with Firebase Authentication
- Admin approval flow for new users
- Real-time chat powered by Firestore
- Optional email notifications to admins when a new join request is created
- Installable as an app on iOS, Android, macOS, and desktop browsers
- Lightweight frontend (vanilla HTML/CSS/JS)

## Tech stack

- Frontend: HTML, CSS, JavaScript (PWA)
- Auth: Firebase Authentication (Email/Password)
- Database: Cloud Firestore
- Hosting: Firebase Hosting
- Optional backend worker: Firebase Cloud Functions (Node.js)

## Project structure

- `CookieChatWeb/` web app (single source of truth)
- `CookieChatWeb/index.html` UI structure
- `CookieChatWeb/styles.css` design system and layout
- `CookieChatWeb/app.js` auth/chat/approvals/install/update logic
- `CookieChatWeb/config/firebase-config.example.js` Firebase client config template
- `CookieChatWeb/firestore.rules` security rules
- `CookieChatWeb/firebase.json` Firebase deploy config
- `functions/` Cloud Functions (admin email notifications)

## Quick start

### 1) Clone the repository

```bash
git clone git@github.com:<your-github-user>/cookiechat-family.git
cd cookiechat-family
```

### 2) Requirements

- A Firebase project
- Node.js + npm (for Firebase CLI)
- Python 3 (for local static server) or any static server

Install Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
```

### 3) Configure Firebase project

1. In Firebase Console, create a project (Spark plan is enough to start).
2. Enable `Authentication > Sign-in method > Email/Password`.
3. Enable `Firestore Database` in production mode.
4. Register a **Web app** and copy its SDK config.
5. Copy the config template:

```bash
cp CookieChatWeb/config/firebase-config.example.js CookieChatWeb/config/firebase-config.js
```

6. Paste your Firebase values into `CookieChatWeb/config/firebase-config.js`.
7. Confirm `familyId` and `roomId` in that file (defaults: `family_demo_1`, `family_main`).

### 4) Seed your first admin

1. Create one auth user in `Authentication > Users`.
2. Copy that user's UID.
3. In Firestore, create `families/family_demo_1` with:
   - `admins.<UID> = true`
   - `members.<UID> = "admin"`
   - `memberNames.<UID> = "Your Name"`
   - `name = "Cookie Family"`
   - `status = "active"`
4. Create `families/family_demo_1/rooms/family_main` with:
   - `title = "Family chat"`

## Local development

```bash
cd CookieChatWeb
python3 -m http.server 5173
```

Open: `http://localhost:5173`

## Deployment runbook

### 1) Authenticate Firebase CLI

```bash
firebase login --reauth
```

### 2) Deploy Firestore rules first

```bash
cd /path/to/cookiechat-family
firebase deploy --project <your-firebase-project-id> --only firestore:rules --config CookieChatWeb/firebase.json
```

### 3) Deploy Hosting

```bash
firebase deploy --project <your-firebase-project-id> --only hosting --config CookieChatWeb/firebase.json
```

### 4) (Optional) Deploy Cloud Functions for admin email alerts

```bash
cd functions
npm install
cp .env.example .env.<your-firebase-project-id>
# fill SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM
cd ..
firebase deploy --project <your-firebase-project-id> --only functions --config CookieChatWeb/firebase.json
```

### 5) Verify production

1. Open `https://<your-project-id>.web.app`
2. Register a new user (`New user`)
3. Confirm a `joinRequests` document appears in:
   - `families/<familyId>/joinRequests/<uid>`
4. Login as admin and approve request
5. Confirm approved member can login and send message

## Troubleshooting

### `permission-denied` when creating a join request

Check:

1. `familyId` in `CookieChatWeb/config/firebase-config.js` matches an existing Firestore doc (`families/<familyId>`).
2. Firestore doc contains:
   - `admins.<admin_uid> = true`
   - `members.<admin_uid> = "admin"`
3. Latest rules were published (`firestore:rules` deploy succeeded).

### `auth/api-key-not-valid`

`CookieChatWeb/config/firebase-config.js` has wrong/placeholder values. Recopy values from Firebase Web app settings.

### Firebase CLI says credentials expired

Run:

```bash
firebase login --reauth
```

Then redeploy.

### iOS install behavior

On iPhone/iPad there is no native install prompt button. Users must use:

- Safari -> Share -> Add to Home Screen

### Email verification template shows wrong `%APP_NAME%`

`%APP_NAME%` comes from Google Cloud OAuth Branding. If branding cannot be edited yet, use template text that does not depend on `%APP_NAME%`.

## Security model

- Only users listed in `families/{familyId}.members` can access the chat
- New signups are stored as `pending` join requests
- Only admins can approve or reject join requests
- Firestore rules enforce all access control server-side

## Optional: Admin Email Notifications (Cloud Functions)

When enabled, every new `joinRequests` document triggers an email to admins.

### 1) Configure SMTP

```bash
cp functions/.env.example functions/.env.<your-firebase-project-id>
```

Edit `functions/.env.<your-firebase-project-id>`:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`
- `SMTP_USER`, `SMTP_PASS`
- `SMTP_FROM`
- Optional `ADMIN_NOTIFICATION_EMAILS` (comma-separated fallback addresses)

### 2) Install function dependencies

```bash
cd functions
npm install
cd ..
```

### 3) Deploy functions

```bash
firebase deploy --project <your-firebase-project-id> --only functions --config CookieChatWeb/firebase.json
```
