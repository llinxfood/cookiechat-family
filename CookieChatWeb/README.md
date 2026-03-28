# CookieChatWeb (PWA privada familiar)

Esta version funciona en iPad, Mac, Android y PC sin publicar app en App Store.

## 1) Crear proyecto Firebase (gratis)

1. Crea un proyecto en Firebase.
2. Activa `Authentication > Sign-in method > Email/Password`.
3. Activa `Firestore Database` (modo produccion).
4. Crea una app web y copia su configuracion.

## 2) Configurar la app web

1. Edita `CookieChatWeb/config/firebase-config.example.js` con tus datos reales.
2. Ajusta `familyId` si quieres otro id de familia.

## 3) Crear usuarios de la familia

1. En `Authentication > Users`, crea cuenta para madre, padre, hija y abuelos.
2. Copia el `uid` de cada usuario.

Alternativa: en la app web, los usuarios pueden usar `Registrarse` y quedaran en estado `pending` hasta que un admin los apruebe.

## 4) Cargar documento de familia

Crea en Firestore el documento `families/family_demo_1` con esta estructura:

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

Crea tambien `families/family_demo_1/rooms/family_main` con:

```json
{
  "title": "Chat familiar",
  "createdAt": "<timestamp>"
}
```

## 5) Desplegar reglas de seguridad

Desde la raiz del repo:

```bash
firebase deploy --only firestore:rules --config CookieChatWeb/firebase.json
```

## 6) Desplegar hosting (web privada)

```bash
firebase deploy --only hosting --config CookieChatWeb/firebase.json
```

## 7) Instalar en iPad/Mac como app

1. Abre la URL de Firebase Hosting en Safari.
2. iPad: Compartir > "Anadir a pantalla de inicio".
3. Mac (Safari): Archivo > "Anadir al Dock".

## Seguridad

- Solo usuarios autenticados y presentes en `members` pueden entrar.
- Nadie externo puede leer o escribir mensajes aunque tenga la URL.
- El control real de seguridad esta en `CookieChatWeb/firestore.rules`.
- Flujo alta con aprobacion: las solicitudes viven en `families/{familyId}/joinRequests/{uid}` y solo admin puede aprobar/rechazar.
