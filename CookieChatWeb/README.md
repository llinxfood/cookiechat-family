# CookieChatWeb (Private Family PWA)

This version runs on iPad, Mac, Android, and PC without publishing to the App Store.

## 0) Get the code

```bash
git clone git@github.com:<your-github-user>/cookiechat-family.git
cd cookiechat-family
```

## 1) Requirements

- Firebase project
- Node.js + npm
- Firebase CLI (`npm install -g firebase-tools`)

## 2) Create a Firebase project

1. Create a Firebase project.
2. Enable `Authentication > Sign-in method > Email/Password`.
3. Enable `Firestore Database` (production mode).
4. Create a Web app and copy its configuration.

## 3) Configure the web app

1. Copy config template:

```bash
cp CookieChatWeb/config/firebase-config.example.js CookieChatWeb/config/firebase-config.js
```

2. Edit `CookieChatWeb/config/firebase-config.js` with real values.
3. Adjust `familyId` if needed.

## 4) Create family users

1. In `Authentication > Users`, create accounts for parents, child, grandparents.
2. Copy each user's `uid`.

Alternative: users can register from the app (`New user`) and stay in `pending` status until an admin approves.

## 5) Create family document

Create `families/family_demo_1` in Firestore with this structure:

```json
{
  "name": "Cookie Family",
  "admins": {
    "uid_mama": true,
    "uid_papa": true
  },
  "members": {
    "uid_mama": "admin",
    "uid_papa": "admin",
    "uid_abuela": "adult",
    "uid_abuelo": "adult",
    "uid_hija": "child"
  },
  "status": "active"
}
```

Create `families/family_demo_1/rooms/family_main`:

```json
{
  "title": "Family chat",
  "createdAt": "<timestamp>"
}
```

## 6) Run locally

```bash
cd CookieChatWeb
python3 -m http.server 5173
```

Open: `http://localhost:5173`

## 7) Deploy security rules

From repo root:

```bash
firebase deploy --project <your-firebase-project-id> --only firestore:rules --config CookieChatWeb/firebase.json
```

## 8) Deploy hosting

```bash
firebase deploy --project <your-firebase-project-id> --only hosting --config CookieChatWeb/firebase.json
```

## 9) Optional: Email alerts for admins (Cloud Functions)

If you want admins to receive an email when a new user submits a join request:

1. Configure SMTP:

```bash
cp functions/.env.example functions/.env.<your-firebase-project-id>
```

2. Fill SMTP values in that file (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`).

3. Install dependencies:

```bash
cd functions
npm install
cd ..
```

4. Deploy:

```bash
firebase deploy --project <your-firebase-project-id> --only functions --config CookieChatWeb/firebase.json
```

## 10) Install as an app

1. Open the Hosting URL in Safari/Chrome.
2. iPad/iPhone: Share > `Add to Home Screen`.
3. Mac (Safari): File > `Add to Dock`.

## Security

- Only authenticated users listed in `members` can enter.
- External users cannot read/write messages even if they know the URL.
- Security is enforced by `CookieChatWeb/firestore.rules`.
- Signup approval flow uses `families/{familyId}/joinRequests/{uid}` and only admins can approve/reject.
