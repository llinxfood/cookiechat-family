# CookieChatWeb (Private Family PWA)

This version runs on iPad, Mac, Android, and PC without publishing to the App Store.

## 1) Create a Firebase project

1. Create a Firebase project.
2. Enable `Authentication > Sign-in method > Email/Password`.
3. Enable `Firestore Database` (production mode).
4. Create a Web app and copy its configuration.

## 2) Configure the web app

1. Edit `CookieChatWeb/config/firebase-config.example.js` with real values.
2. Adjust `familyId` if needed.

## 3) Create family users

1. In `Authentication > Users`, create accounts for parents, child, grandparents.
2. Copy each user's `uid`.

Alternative: users can register from the app (`New user`) and stay in `pending` status until an admin approves.

## 4) Create family document

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

## 5) Deploy security rules

From repo root:

```bash
firebase deploy --only firestore:rules --config CookieChatWeb/firebase.json
```

## 6) Deploy hosting

```bash
firebase deploy --only hosting --config CookieChatWeb/firebase.json
```

## 7) Install as an app

1. Open the Hosting URL in Safari/Chrome.
2. iPad/iPhone: Share > `Add to Home Screen`.
3. Mac (Safari): File > `Add to Dock`.

## Security

- Only authenticated users listed in `members` can enter.
- External users cannot read/write messages even if they know the URL.
- Security is enforced by `CookieChatWeb/firestore.rules`.
- Signup approval flow uses `families/{familyId}/joinRequests/{uid}` and only admins can approve/reject.
