# Configuracion inicial Firestore (plantilla)

## Documento `families/{familyId}`

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

## Documento `families/{familyId}/rooms/family_main`

```json
{
  "title": "Chat familiar",
  "createdAt": "<timestamp>",
  "lastMessageAt": "<timestamp>",
  "lastMessageText": "",
  "lastMessageSenderId": ""
}
```

Importante: despliega tambien `firestore.rules` del paquete `family-chat-mvp` para mantener el chat cerrado.
