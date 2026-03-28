# Setup en Xcode (CookieChat)

## 1) Crear proyecto

- Abrir Xcode > New Project > App.
- Product Name: `CookieChat`.
- Interface: `SwiftUI`.
- Language: `Swift`.
- Deployment target recomendado: iPadOS 17+.

## 2) Copiar scaffold

- Copia el contenido de `CookieChat/` dentro de tu proyecto Xcode.
- Verifica que todos los `.swift` esten agregados al target principal.

## 3) Ejecutar en modo mock

- Build and Run en simulador iPad.
- Usa los botones de `SignInView` para entrar como admin/adult/child.
- Verifica que solo admin vea el boton `Padres`.

## 4) Activar Firebase (opcional siguiente paso)

- Anade Firebase por Swift Package Manager:
  - `https://github.com/firebase/firebase-ios-sdk`
  - Productos: `FirebaseAuth`, `FirebaseFirestore`, `FirebaseCore`.
- Incluye `GoogleService-Info.plist`.
- Inicializa Firebase en `CookieChatApp` (por ejemplo con `FirebaseApp.configure()`).
- En `RootView`, cambia el repositorio de `MockChatRepository()` a `FirestoreChatRepository(familyId: "tu_family_id")`.
- Despliega reglas de seguridad con el archivo `CookieChat/Setup/firestore.rules`.
  - Ejemplo CLI: `firebase deploy --only firestore:rules`.

## 5) Validacion minima

- Cuenta child puede leer/enviar en `family_main`.
- Cuenta child no puede gestionar miembros.
- No existe UI para crear otros chats.
- Firestore Rules de `CookieChat/Setup/firestore.rules` estan desplegadas.

## 6) Seguridad para produccion

- El login demo por rol es solo para `DEBUG`.
- En `Release`, la app no permite acceso demo; debes integrar `FirebaseAuth` y recuperar la familia del usuario autenticado.
