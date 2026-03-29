# CookieChatWeb

This directory contains the production web app for CookieChat.

Canonical documentation is in the repository root:

- [`../README.md`](../README.md)

## Local run (quick)

From repository root:

```bash
cd CookieChatWeb
python3 -m http.server 5173
```

Open:

- `http://localhost:5173`

## Deploy (quick)

From repository root:

```bash
firebase deploy --project <your-project-id> --only firestore:rules --config CookieChatWeb/firebase.json
firebase deploy --project <your-project-id> --only hosting --config CookieChatWeb/firebase.json
```
