import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  reload,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig, familyId, roomId } from "./config/firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const statusEl = document.querySelector("#status");
const installCardEl = document.querySelector("#install-card");
const installTitleEl = document.querySelector("#install-title");
const installBtnEl = document.querySelector("#install-btn");
const installHintEl = document.querySelector("#install-hint");
const installStepsEl = document.querySelector("#install-steps");
const updateCardEl = document.querySelector("#update-card");
const updateBtnEl = document.querySelector("#update-btn");
const authCard = document.querySelector("#auth-card");
const landingLayoutEl = document.querySelector("#landing-layout");
const pendingCard = document.querySelector("#pending-card");
const chatCard = document.querySelector("#chat-card");
const loginForm = document.querySelector("#login-form");
const modeLoginBtn = document.querySelector("#mode-login");
const modeRegisterBtn = document.querySelector("#mode-register");
const authSubmitBtn = document.querySelector("#auth-submit");
const displayNameLabel = document.querySelector("#display-name-label");
const requestedRoleLabel = document.querySelector("#requested-role-label");
const displayNameEl = document.querySelector("#display-name");
const requestedRoleEl = document.querySelector("#requested-role");
const pendingMessageEl = document.querySelector("#pending-message");
const verifyEmailBtn = document.querySelector("#verify-email-btn");
const pendingLogoutBtn = document.querySelector("#pending-logout-btn");
const logoutBtn = document.querySelector("#logout-btn");
const e2eeKeyBtn = document.querySelector("#e2ee-key-btn");
const e2eeIndicatorEl = document.querySelector("#e2ee-indicator");
const messagesEl = document.querySelector("#messages");
const composer = document.querySelector("#composer");
const draftEl = document.querySelector("#draft");
const emojiBarEl = document.querySelector("#emoji-bar");
const emojiToggleBtn = document.querySelector("#emoji-toggle");
const adminPanel = document.querySelector("#admin-panel");
const adminPanelTitleEl = document.querySelector("#admin-panel h3");
const joinRequestsEl = document.querySelector("#join-requests");

let currentUserRole = null;
let currentUserId = null;
let currentUserName = "Usuario";
let currentUserIsAdmin = false;
let authMode = "login";
let unsubscribeMessages = null;
let unsubscribeRequests = null;
let installPromptEvent = null;
let waitingServiceWorker = null;
let isSubmittingAuth = false;
let canShowInstallCard = false;
let e2eeKey = null;
let e2eeFingerprint = "";
let latestMessageDocs = [];
let missingE2EEKeyNoticeShown = false;
const frequentEmojis = ["😀", "😂", "😍", "🥰", "🙏", "👍", "❤️", "🎉", "😢", "😘", "😎", "🍪"];
const E2EE_PREFIX = "e2ee:v1:";
const E2EE_SALT_PREFIX = "cookiechat-e2ee-v1";
const MAX_STORED_TEXT_LENGTH = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uint8ToBase64(input) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < input.length; i += chunkSize) {
    binary += String.fromCharCode(...input.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToUint8(base64) {
  const binary = atob(base64);
  const output = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    output[i] = binary.charCodeAt(i);
  }
  return output;
}

function uint8ToHex(input) {
  return Array.from(input)
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}

async function deriveE2EE(passphrase) {
  if (!window.crypto?.subtle) {
    throw new Error("Este navegador no soporta cifrado Web Crypto.");
  }

  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(passphrase);
  const baseKey = await crypto.subtle.importKey("raw", passphraseBytes, "PBKDF2", false, ["deriveKey", "deriveBits"]);
  const salt = encoder.encode(`${E2EE_SALT_PREFIX}:${familyId}:${roomId}`);

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 210000,
      hash: "SHA-256"
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );

  const fingerprintBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 210000,
      hash: "SHA-256"
    },
    baseKey,
    64
  );
  const fingerprint = uint8ToHex(new Uint8Array(fingerprintBits)).slice(0, 8).toUpperCase();

  return { key, fingerprint };
}

function isEncryptedPayload(value) {
  return typeof value === "string" && value.startsWith(E2EE_PREFIX);
}

async function encryptText(plainText) {
  if (!e2eeKey) return plainText;
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, e2eeKey, encoder.encode(plainText));
  const encrypted = new Uint8Array(encryptedBuffer);
  return `${E2EE_PREFIX}${uint8ToBase64(iv)}.${uint8ToBase64(encrypted)}`;
}

async function decryptText(payload) {
  if (!isEncryptedPayload(payload)) return payload;
  if (!e2eeKey) throw new Error("missing-key");

  const encoded = payload.slice(E2EE_PREFIX.length);
  const dotIndex = encoded.indexOf(".");
  if (dotIndex < 1) throw new Error("invalid-payload");
  const iv = base64ToUint8(encoded.slice(0, dotIndex));
  const encrypted = base64ToUint8(encoded.slice(dotIndex + 1));
  const decryptedBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, e2eeKey, encrypted);
  return new TextDecoder().decode(decryptedBuffer);
}

function refreshE2EEIndicator() {
  if (!e2eeIndicatorEl) return;
  e2eeIndicatorEl.textContent = e2eeKey ? `E2EE activa · ${e2eeFingerprint}` : "E2EE desactivado";
}

async function promptAndSetE2EEKey() {
  const typed = window.prompt(
    "Introduce la clave familiar E2EE. Debe ser la misma para toda la familia.",
    ""
  );

  if (typed === null) return false;
  const passphrase = typed.trim();
  if (!passphrase || passphrase.length < 8) {
    setStatus("La clave E2EE debe tener al menos 8 caracteres.", true);
    return false;
  }

  try {
    const { key, fingerprint } = await deriveE2EE(passphrase);
    e2eeKey = key;
    e2eeFingerprint = fingerprint;
    missingE2EEKeyNoticeShown = false;
    refreshE2EEIndicator();
    setStatus(`Clave E2EE configurada (${fingerprint}).`);
    if (latestMessageDocs.length) {
      await renderMessages(latestMessageDocs);
    }
    return true;
  } catch (error) {
    setStatus(`No se pudo configurar E2EE: ${error.message}`, true);
    return false;
  }
}

function roleLabel(role) {
  switch (role) {
    case "admin":
      return "admin";
    case "adult":
      return "adulto";
    case "child":
      return "menor";
    default:
      return "miembro";
  }
}

function inferDisplayName(user) {
  const authName = user?.displayName?.trim();
  if (authName) return authName;

  const email = user?.email || "";
  const emailName = email.split("@")[0]?.trim();
  if (emailName) {
    return emailName.charAt(0).toUpperCase() + emailName.slice(1);
  }

  return "Usuario";
}

function initialsFromName(name) {
  const safe = (name || "").trim();
  if (!safe) return "U";
  const parts = safe.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function renderInstallSteps(steps) {
  installStepsEl.innerHTML = "";
  for (let i = 0; i < steps.length; i += 1) {
    const li = document.createElement("li");
    li.className = "install-step";

    const badge = document.createElement("span");
    badge.className = "install-step-badge";
    badge.textContent = String(i + 1);

    const text = document.createElement("span");
    text.textContent = steps[i];

    li.appendChild(badge);
    li.appendChild(text);
    installStepsEl.appendChild(li);
  }
}

function setupInstallUI() {
  if (isStandalone()) {
    installCardEl.classList.add("hidden");
    return;
  }

  if (isIOS()) {
    canShowInstallCard = true;
    installCardEl.classList.remove("compact-install");
    installCardEl.classList.add("ios-install");
    installCardEl.classList.remove("hidden");
    installBtnEl.classList.add("hidden");
    installTitleEl.textContent = "Instalar en iPhone/iPad";
    installHintEl.textContent = "Anadela a pantalla de inicio para usarla como app.";
    renderInstallSteps([
      "Abre esta pagina en Safari.",
      "Pulsa Compartir y luego Anadir a pantalla de inicio."
    ]);
    installStepsEl.classList.remove("hidden");
    return;
  }

  canShowInstallCard = false;
  installCardEl.classList.remove("ios-install");
  installCardEl.classList.add("compact-install");
  installTitleEl.textContent = "Instalar app";
  installHintEl.textContent = "Instalar CookieChat";
  installStepsEl.classList.add("hidden");
  installBtnEl.classList.remove("hidden");
  installCardEl.classList.add("hidden");
}

function showUpdateBanner(worker) {
  waitingServiceWorker = worker;
  updateCardEl.classList.remove("hidden");
}

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("error", isError);
}

function setView(view) {
  landingLayoutEl.classList.toggle("hidden", view !== "auth");
  authCard.classList.toggle("hidden", view !== "auth");
  pendingCard.classList.toggle("hidden", view !== "pending");
  chatCard.classList.toggle("hidden", view !== "chat");

  // La tarjeta de instalacion solo es util en pantalla de acceso.
  if (view === "auth" && !isStandalone() && canShowInstallCard) {
    installCardEl.classList.remove("hidden");
  } else {
    installCardEl.classList.add("hidden");
  }
}

function setAuthMode(mode) {
  authMode = mode;
  const register = mode === "register";
  document.querySelector("#auth-card h2").textContent = register ? "Nuevo usuario" : "Acceso";
  authSubmitBtn.textContent = register ? "Enviar solicitud" : "Continuar";
  displayNameLabel.classList.toggle("hidden", !register);
  requestedRoleLabel.classList.toggle("hidden", !register);
  displayNameEl.required = register;
  modeLoginBtn.classList.toggle("active", !register);
  modeRegisterBtn.classList.toggle("active", register);
}

function formatDate(rawDate) {
  if (!rawDate) return "";
  const date = rawDate.toDate ? rawDate.toDate() : new Date(rawDate);
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit"
  }).format(date);
}

function insertEmojiAtCursor(emoji) {
  const current = draftEl.value;
  const start = draftEl.selectionStart ?? current.length;
  const end = draftEl.selectionEnd ?? current.length;
  draftEl.value = `${current.slice(0, start)}${emoji}${current.slice(end)}`;
  const next = start + emoji.length;
  draftEl.focus();
  draftEl.setSelectionRange(next, next);
}

function renderEmojiBar() {
  emojiBarEl.innerHTML = "";
  for (const emoji of frequentEmojis) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "emoji-chip";
    chip.textContent = emoji;
    chip.addEventListener("click", () => {
      insertEmojiAtCursor(emoji);
    });
    emojiBarEl.appendChild(chip);
  }
}

async function renderMessages(docs) {
  latestMessageDocs = docs;
  messagesEl.innerHTML = "";
  let hasEncryptedMessages = false;

  for (const docSnap of docs) {
    const message = docSnap.data();
    const item = document.createElement("li");
    const isMine = message.senderId === currentUserId;
    item.className = `message ${isMine ? "message-own" : "message-other"}`;

    const senderName =
      message.senderName ||
      (message.senderId && message.senderId === currentUserId ? currentUserName : "Usuario");
    const roleText = roleLabel(message.senderRole);

    const header = document.createElement("div");
    header.className = "message-header";

    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.textContent = initialsFromName(senderName);

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${senderName} · ${roleText} · ${formatDate(message.createdAt)}`;

    const text = document.createElement("p");
    const rawText = typeof message.text === "string" ? message.text : "";
    if (isEncryptedPayload(rawText)) {
      hasEncryptedMessages = true;
    }

    try {
      text.textContent = await decryptText(rawText);
    } catch {
      text.textContent = isEncryptedPayload(rawText)
        ? "Mensaje cifrado. Configura o revisa la clave E2EE."
        : rawText;
    }

    header.appendChild(avatar);
    header.appendChild(meta);
    item.appendChild(header);
    item.appendChild(text);
    messagesEl.appendChild(item);
  }

  messagesEl.scrollTop = messagesEl.scrollHeight;

  if (hasEncryptedMessages && !e2eeKey && !missingE2EEKeyNoticeShown) {
    missingE2EEKeyNoticeShown = true;
    setStatus("Hay mensajes cifrados. Pulsa 'Clave E2EE' para leerlos.");
  }
}

async function loadMembership(user) {
  const familyRef = doc(db, "families", familyId);
  const familySnap = await getDoc(familyRef);

  if (!familySnap.exists()) {
    throw new Error("No se encontro el grupo configurado.");
  }

  const family = familySnap.data();
  const role = family?.members?.[user.uid];
  const isAdmin = family?.admins?.[user.uid] === true;
  const storedName = family?.memberNames?.[user.uid];

  if (!role) {
    throw new Error("Esta cuenta no esta aprobada en este grupo.");
  }

  let resolvedName = (storedName && String(storedName).trim()) || "";
  if (!resolvedName) {
    const ownRequestRef = doc(db, "families", familyId, "joinRequests", user.uid);
    const ownRequestSnap = await getDoc(ownRequestRef);
    const requestName = ownRequestSnap.exists() ? ownRequestSnap.data()?.displayName : "";
    resolvedName = requestName ? String(requestName).trim() : "";
  }

  currentUserRole = role;
  currentUserName = resolvedName || inferDisplayName(user);
  currentUserIsAdmin = isAdmin || role === "admin";
}

async function loadOwnJoinRequest(userId) {
  const reqRef = doc(db, "families", familyId, "joinRequests", userId);
  const reqSnap = await getDoc(reqRef);
  return reqSnap.exists() ? reqSnap.data() : null;
}

function watchMessages() {
  const messagesRef = collection(db, "families", familyId, "rooms", roomId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"), limit(200));

  unsubscribeMessages = onSnapshot(
    q,
    (snapshot) => {
      void renderMessages(snapshot.docs);
    },
    (error) => {
      setStatus(`Error cargando mensajes: ${error.message}`, true);
    }
  );
}

function renderJoinRequests(snapshot) {
  joinRequestsEl.innerHTML = "";
  const pendingDocs = snapshot.docs.filter((docSnap) => docSnap.data().status === "pending");
  adminPanelTitleEl.textContent = `Solicitudes de acceso (${pendingDocs.length})`;

  if (!pendingDocs.length) {
    const empty = document.createElement("li");
    empty.textContent = "No hay solicitudes pendientes.";
    joinRequestsEl.appendChild(empty);
    return;
  }

  for (const docSnap of pendingDocs) {
    const request = docSnap.data();
    const li = document.createElement("li");
    const requestedRole = request.requestedRole || "adult";
    const requestedName = request.displayName || "Sin nombre";
    const displayName = request.displayName || "Sin nombre";
    const email = request.email || "sin-email";

    const meta = document.createElement("p");
    meta.className = "request-meta";
    meta.textContent = `${displayName} · ${email} · solicita rol ${roleLabel(requestedRole)}`;

    const actions = document.createElement("div");
    actions.className = "request-actions";

    const approveBtn = document.createElement("button");
    approveBtn.type = "button";
    approveBtn.textContent = "Aprobar";
    approveBtn.addEventListener("click", async () => {
      await reviewJoinRequest(docSnap.id, requestedRole, "approved", requestedName);
    });

    const rejectBtn = document.createElement("button");
    rejectBtn.type = "button";
    rejectBtn.className = "reject";
    rejectBtn.textContent = "Rechazar";
    rejectBtn.addEventListener("click", async () => {
      await reviewJoinRequest(docSnap.id, requestedRole, "rejected");
    });

    actions.appendChild(approveBtn);
    actions.appendChild(rejectBtn);
    li.appendChild(meta);
    li.appendChild(actions);
    joinRequestsEl.appendChild(li);
  }
}

function watchJoinRequests() {
  const requestsRef = collection(db, "families", familyId, "joinRequests");
  unsubscribeRequests = onSnapshot(
    requestsRef,
    (snapshot) => {
      renderJoinRequests(snapshot);
    },
    (error) => {
      setStatus(`Error cargando solicitudes: ${error.message}`, true);
    }
  );
}

async function createJoinRequest(user, displayName, requestedRole) {
  const reqRef = doc(db, "families", familyId, "joinRequests", user.uid);
  await setDoc(
    reqRef,
    {
      uid: user.uid,
      email: user.email || "",
      displayName,
      requestedRole,
      status: "pending",
      requestedAt: serverTimestamp()
    },
    { merge: true }
  );

  // Confirma que el documento existe para evitar carreras de UI justo tras el alta.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const check = await getDoc(reqRef);
    if (check.exists()) return;
    await sleep(500);
  }

  throw new Error("join-request-not-visible-yet");
}

async function reviewJoinRequest(targetUserId, role, action, displayName = "Usuario") {
  if (!auth.currentUser || !currentUserId || !currentUserIsAdmin) return;
  const familyRef = doc(db, "families", familyId);
  const requestRef = doc(db, "families", familyId, "joinRequests", targetUserId);
  const batch = writeBatch(db);

  if (action === "approved") {
    batch.set(
      familyRef,
      {
        members: {
          [targetUserId]: role
        },
        memberNames: {
          [targetUserId]: String(displayName).trim() || "Usuario"
        }
      },
      { merge: true }
    );
  }

  batch.set(
    requestRef,
    {
      status: action,
      reviewedBy: currentUserId,
      reviewedAt: serverTimestamp(),
      approvedRole: action === "approved" ? role : null
    },
    { merge: true }
  );

  await batch.commit();
  setStatus(action === "approved" ? "Usuario aprobado." : "Solicitud rechazada.");
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  if (isSubmittingAuth) return;

  isSubmittingAuth = true;
  authSubmitBtn.disabled = true;
  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;

  try {
    if (authMode === "login") {
      authSubmitBtn.textContent = "Entrando...";
      setStatus("Entrando...");
      await signInWithEmailAndPassword(auth, email, password);
      return;
    }

    const displayName = displayNameEl.value.trim();
    const requestedRole = requestedRoleEl.value;
    if (!displayName) {
      setStatus("Escribe un nombre para la solicitud.", true);
      return;
    }

    authSubmitBtn.textContent = "Creando...";
    setStatus("Creando cuenta...");
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName }).catch(() => {});
    authSubmitBtn.textContent = "Enviando solicitud...";
    await createJoinRequest(credential.user, displayName, requestedRole);
    await sendEmailVerification(credential.user).catch(() => {});
    pendingMessageEl.textContent = "Tu solicitud esta pendiente de aprobacion por un administrador.";
    verifyEmailBtn.classList.remove("hidden");
    setView("pending");
    setStatus("Solicitud enviada. Te hemos enviado un email de verificacion.");
  } catch (error) {
    if (authMode === "register" && auth.currentUser) {
      await signOut(auth);
    }
    if (error?.code === "auth/email-already-in-use") {
      setStatus("Ese email ya existe. Usa Acceso o prueba otro correo.", true);
    } else if (error?.code === "auth/invalid-credential") {
      setStatus("Credenciales no validas. Revisa email/contrasena o usa Nuevo usuario.", true);
    } else if (error?.code === "permission-denied") {
      setStatus(
        `Sin permisos para guardar la solicitud en families/${familyId}/joinRequests. Revisa Firestore Rules, familyId y despliegue de reglas.`,
        true
      );
    } else if (error?.message === "join-request-not-visible-yet") {
      setStatus("La solicitud tarda mas de lo normal. Intenta entrar de nuevo en unos segundos.", true);
    } else {
      setStatus(`No se pudo continuar: ${error.message}`, true);
    }
  } finally {
    isSubmittingAuth = false;
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = authMode === "register" ? "Enviar solicitud" : "Continuar";
  }
}

async function handleSend(event) {
  event.preventDefault();
  const text = draftEl.value.trim();

  if (!text || !auth.currentUser || !currentUserRole) return;

  try {
    const storedText = await encryptText(text);
    if (storedText.length > MAX_STORED_TEXT_LENGTH) {
      setStatus("Mensaje demasiado largo para enviarlo cifrado. Acortalo un poco.", true);
      return;
    }

    const messagesRef = collection(db, "families", familyId, "rooms", roomId, "messages");
    await addDoc(messagesRef, {
      senderId: auth.currentUser.uid,
      senderName: currentUserName,
      senderRole: currentUserRole,
      text: storedText,
      type: "text",
      createdAt: serverTimestamp()
    });
    draftEl.value = "";
  } catch (error) {
    setStatus(`No se pudo enviar: ${error.message}`, true);
  }
}

function handleDraftKeydown(event) {
  // En iOS/iPad algunos teclados no disparan el submit del form con Enter.
  if (event.key !== "Enter" || event.shiftKey) return;
  event.preventDefault();
  composer.requestSubmit();
}

modeLoginBtn.addEventListener("click", () => setAuthMode("login"));
modeRegisterBtn.addEventListener("click", () => setAuthMode("register"));
loginForm.addEventListener("submit", handleAuthSubmit);
composer.addEventListener("submit", handleSend);
draftEl.addEventListener("keydown", handleDraftKeydown);
emojiToggleBtn.addEventListener("click", () => {
  emojiBarEl.classList.toggle("hidden");
  draftEl.focus();
});
installBtnEl.addEventListener("click", async () => {
  if (!installPromptEvent) {
    if (isIOS()) {
      setStatus("En iPhone/iPad: Safari > Compartir > Anadir a pantalla de inicio.");
    } else {
      setStatus("Instalacion no disponible ahora mismo en este navegador.", true);
    }
    return;
  }
  installPromptEvent.prompt();
  try {
    const choice = await installPromptEvent.userChoice;
    if (choice?.outcome === "accepted") {
      setStatus("CookieChat instalada.");
    }
  } finally {
    installPromptEvent = null;
    canShowInstallCard = false;
    installBtnEl.classList.add("hidden");
    installCardEl.classList.add("hidden");
  }
});
updateBtnEl.addEventListener("click", () => {
  if (!waitingServiceWorker) {
    window.location.reload();
    return;
  }
  waitingServiceWorker.postMessage({ type: "SKIP_WAITING" });
});
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});
e2eeKeyBtn.addEventListener("click", async () => {
  if (!e2eeKey) {
    await promptAndSetE2EEKey();
    return;
  }

  const shouldChange = window.confirm("Ya hay una clave E2EE activa. Quieres cambiarla?");
  if (!shouldChange) return;
  e2eeKey = null;
  e2eeFingerprint = "";
  refreshE2EEIndicator();
  await promptAndSetE2EEKey();
});
pendingLogoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});
verifyEmailBtn.addEventListener("click", async () => {
  if (!auth.currentUser) return;
  try {
    await reload(auth.currentUser);
    if (auth.currentUser.emailVerified) {
      setStatus("Email verificado. Ya puedes continuar.", false);
      window.location.reload();
      return;
    }
    await sendEmailVerification(auth.currentUser);
    setStatus("Te hemos reenviado el email de verificacion.");
  } catch (error) {
    setStatus(`No se pudo reenviar el email: ${error.message}`, true);
  }
});

onAuthStateChanged(auth, async (user) => {
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }
  if (unsubscribeRequests) {
    unsubscribeRequests();
    unsubscribeRequests = null;
  }

  if (!user) {
    currentUserRole = null;
    currentUserId = null;
    currentUserName = "Usuario";
    currentUserIsAdmin = false;
    e2eeKey = null;
    e2eeFingerprint = "";
    latestMessageDocs = [];
    missingE2EEKeyNoticeShown = false;
    refreshE2EEIndicator();
    adminPanel.classList.add("hidden");
    setView("auth");
    setStatus("");
    verifyEmailBtn.classList.add("hidden");
    return;
  }

  currentUserId = user.uid;
  currentUserName = inferDisplayName(user);

  try {
    setStatus("Validando acceso...");
    await loadMembership(user);
    if (!user.emailVerified) {
      verifyEmailBtn.classList.remove("hidden");
      pendingMessageEl.textContent =
        "Tu cuenta esta aprobada, pero necesitas verificar tu email antes de entrar al chat.";
      setView("pending");
      setStatus("Verifica tu email para activar el acceso.");
      await sendEmailVerification(user).catch(() => {});
      return;
    }

    verifyEmailBtn.classList.add("hidden");
    setView("chat");
    setStatus("Conectada.");
    watchMessages();

    if (currentUserIsAdmin) {
      adminPanel.classList.remove("hidden");
      watchJoinRequests();
    } else {
      adminPanel.classList.add("hidden");
    }
    return;
  } catch {
    // Si no es miembro, comprobamos si tiene solicitud pendiente.
  }

  try {
    const request = await loadOwnJoinRequest(user.uid);
    if (!request) {
      // Evita carrera justo despues de registro: esperamos y reintentamos varias veces.
      let retriedRequest = null;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        await sleep(500);
        retriedRequest = await loadOwnJoinRequest(user.uid);
        if (retriedRequest) break;
      }
      if (!retriedRequest) {
        await signOut(auth);
        setStatus("Acceso denegado: no eres miembro y no hay solicitud activa.", true);
        return;
      }

      pendingMessageEl.textContent = "Tu solicitud esta pendiente de aprobacion por un administrador.";
      setView("pending");
      setStatus("Esperando aprobacion.");
      return;
    }

    if (request.status === "rejected") {
      pendingMessageEl.textContent = "Tu solicitud fue rechazada. Contacta con una administradora.";
      verifyEmailBtn.classList.add("hidden");
    } else if (request.status === "approved") {
      pendingMessageEl.textContent = user.emailVerified
        ? "Tu solicitud fue aprobada. Cierra sesion y vuelve a entrar."
        : "Tu solicitud fue aprobada. Verifica tu email y vuelve a entrar.";
      verifyEmailBtn.classList.toggle("hidden", user.emailVerified);
      if (!user.emailVerified) {
        await sendEmailVerification(user).catch(() => {});
      }
    } else {
      pendingMessageEl.textContent = "Tu solicitud esta pendiente de aprobacion por una administradora.";
      verifyEmailBtn.classList.remove("hidden");
    }

    setView("pending");
    setStatus("Esperando aprobacion.");
  } catch (error) {
    await signOut(auth);
    setStatus(`Acceso denegado: ${error.message}`, true);
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((registration) => {
        if (registration.waiting) {
          showUpdateBanner(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              showUpdateBanner(newWorker);
            }
          });
        });

        // Busca nueva version de forma periodica para que usuarios vean cambios antes.
        setInterval(() => {
          registration.update().catch(() => {});
        }, 60000);
      })
      .catch(() => {
        // No bloqueamos por fallo de SW.
      });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPromptEvent = event;
  canShowInstallCard = true;
  installCardEl.classList.remove("ios-install");
  installCardEl.classList.add("compact-install");
  installTitleEl.textContent = "Instalar app";
  installHintEl.textContent = "Instalar CookieChat";
  installStepsEl.classList.add("hidden");
  installBtnEl.classList.remove("hidden");
  if (!isStandalone() && !auth.currentUser) {
    installCardEl.classList.remove("hidden");
  }
});

window.addEventListener("appinstalled", () => {
  canShowInstallCard = false;
  installPromptEvent = null;
  installCardEl.classList.add("hidden");
  setStatus("CookieChat instalada.");
});

renderEmojiBar();
setupInstallUI();
setAuthMode("login");
refreshE2EEIndicator();
