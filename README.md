# CookieChat

CookieChat es ahora una **PWA privada** (no App Store), con backend en Firebase.

## Stack activo

- Frontend: HTML, CSS, JavaScript (PWA)
- Auth: Firebase Authentication (Email/Password)
- Datos: Firestore
- Hosting: Firebase Hosting

## Estructura del repo

- `CookieChatWeb/` app web completa (source of truth)
- `CookieChatWeb/index.html` UI principal
- `CookieChatWeb/app.js` logica de auth/chat/aprobaciones
- `CookieChatWeb/firestore.rules` reglas de seguridad
- `CookieChatWeb/firebase.json` configuracion de deploy

## Flujo de acceso

- `Acceso`: usuarios aprobados en `families/{familyId}.members`
- `Nuevo usuario`: crea solicitud en `joinRequests` con estado `pending`
- `Admin`: aprueba/rechaza solicitudes desde la UI

## Ejecutar local

```bash
cd /Users/maria/cookiechat-family/CookieChatWeb
python3 -m http.server 5173
```

Abrir: `http://localhost:5173`

## Deploy

```bash
cd /Users/maria/cookiechat-family
firebase deploy --project cookiechat-1b1e9 --only firestore:rules --config CookieChatWeb/firebase.json
firebase deploy --project cookiechat-1b1e9 --only hosting --config CookieChatWeb/firebase.json
```

## Nota

Se ha eliminado el codigo legacy SwiftUI (`CookieChat/`) para evitar doble mantenimiento.
