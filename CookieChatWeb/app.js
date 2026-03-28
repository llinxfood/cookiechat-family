import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
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
const authCard = document.querySelector("#auth-card");
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
const pendingLogoutBtn = document.querySelector("#pending-logout-btn");
const logoutBtn = document.querySelector("#logout-btn");
const messagesEl = document.querySelector("#messages");
const composer = document.querySelector("#composer");
const draftEl = document.querySelector("#draft");
const adminPanel = document.querySelector("#admin-panel");
const joinRequestsEl = document.querySelector("#join-requests");

let currentUserRole = null;
let currentUserId = null;
let authMode = "login";
let unsubscribeMessages = null;
let unsubscribeRequests = null;

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("error", isError);
}

function setView(view) {
  authCard.classList.toggle("hidden", view !== "auth");
  pendingCard.classList.toggle("hidden", view !== "pending");
  chatCard.classList.toggle("hidden", view !== "chat");
}

function setAuthMode(mode) {
  authMode = mode;
  const register = mode === "register";
  document.querySelector("#auth-card h2").textContent = register ? "Registrarse" : "Entrar";
  authSubmitBtn.textContent = register ? "Enviar solicitud" : "Entrar";
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

function renderMessages(docs) {
  messagesEl.innerHTML = "";

  for (const docSnap of docs) {
    const message = docSnap.data();
    const item = document.createElement("li");
    item.className = "message";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${message.senderRole || "member"} · ${message.senderId || "uid"} · ${formatDate(message.createdAt)}`;

    const text = document.createElement("p");
    text.textContent = message.text || "";

    item.appendChild(meta);
    item.appendChild(text);
    messagesEl.appendChild(item);
  }

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function loadMembership(user) {
  const familyRef = doc(db, "families", familyId);
  const familySnap = await getDoc(familyRef);

  if (!familySnap.exists()) {
    throw new Error("No existe la familia configurada.");
  }

  const family = familySnap.data();
  const role = family?.members?.[user.uid];

  if (!role) {
    throw new Error("Este usuario no pertenece a la familia autorizada.");
  }

  currentUserRole = role;
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
      renderMessages(snapshot.docs);
    },
    (error) => {
      setStatus(`Error cargando mensajes: ${error.message}`, true);
    }
  );
}

function renderJoinRequests(snapshot) {
  joinRequestsEl.innerHTML = "";
  const pendingDocs = snapshot.docs.filter((docSnap) => docSnap.data().status === "pending");

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
    const displayName = request.displayName || "Sin nombre";
    const email = request.email || "sin-email";

    const meta = document.createElement("p");
    meta.className = "request-meta";
    meta.textContent = `${displayName} · ${email} · pide rol ${requestedRole}`;

    const actions = document.createElement("div");
    actions.className = "request-actions";

    const approveBtn = document.createElement("button");
    approveBtn.type = "button";
    approveBtn.textContent = "Aprobar";
    approveBtn.addEventListener("click", async () => {
      await reviewJoinRequest(docSnap.id, requestedRole, "approved");
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
}

async function reviewJoinRequest(targetUserId, role, action) {
  if (!auth.currentUser || !currentUserId) return;
  const familyRef = doc(db, "families", familyId);
  const requestRef = doc(db, "families", familyId, "joinRequests", targetUserId);
  const batch = writeBatch(db);

  if (action === "approved") {
    batch.set(
      familyRef,
      {
        members: {
          [targetUserId]: role
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
  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;

  try {
    if (authMode === "login") {
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

    setStatus("Creando cuenta...");
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await createJoinRequest(credential.user, displayName, requestedRole);
    setStatus("Solicitud enviada. Esperando aprobacion.");
  } catch (error) {
    setStatus(`No se pudo continuar: ${error.message}`, true);
  }
}

async function handleSend(event) {
  event.preventDefault();
  const text = draftEl.value.trim();

  if (!text || !auth.currentUser || !currentUserRole) return;

  try {
    const messagesRef = collection(db, "families", familyId, "rooms", roomId, "messages");
    await addDoc(messagesRef, {
      senderId: auth.currentUser.uid,
      senderRole: currentUserRole,
      text,
      type: "text",
      createdAt: serverTimestamp()
    });
    draftEl.value = "";
  } catch (error) {
    setStatus(`No se pudo enviar: ${error.message}`, true);
  }
}

modeLoginBtn.addEventListener("click", () => setAuthMode("login"));
modeRegisterBtn.addEventListener("click", () => setAuthMode("register"));
loginForm.addEventListener("submit", handleAuthSubmit);
composer.addEventListener("submit", handleSend);
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});
pendingLogoutBtn.addEventListener("click", async () => {
  await signOut(auth);
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
    adminPanel.classList.add("hidden");
    setView("auth");
    setStatus("");
    return;
  }

  currentUserId = user.uid;

  try {
    setStatus("Validando acceso familiar...");
    await loadMembership(user);
    setView("chat");
    setStatus("Conectada al chat familiar.");
    watchMessages();

    if (currentUserRole === "admin") {
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
      await signOut(auth);
      setStatus("Acceso denegado: no eres miembro y no hay solicitud activa.", true);
      return;
    }

    if (request.status === "rejected") {
      pendingMessageEl.textContent = "Tu solicitud fue rechazada. Contacta con el administrador de la familia.";
    } else if (request.status === "approved") {
      pendingMessageEl.textContent = "Tu solicitud fue aprobada. Cierra sesion y vuelve a entrar.";
    } else {
      pendingMessageEl.textContent = "Tu solicitud esta pendiente de aprobacion por un administrador de la familia.";
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
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // No bloqueamos por fallo de SW.
    });
  });
}

setAuthMode("login");
