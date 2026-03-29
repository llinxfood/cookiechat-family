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
const profileToggleBtnEl = document.querySelector("#profile-toggle-btn");
const profilePanelEl = document.querySelector("#profile-panel");
const profileFormEl = document.querySelector("#profile-form");
const profileTitleEl = document.querySelector("#profile-title");
const profileNameLabelEl = document.querySelector("#profile-name-label");
const profileNameInputEl = document.querySelector("#profile-name-input");
const profileSaveBtnEl = document.querySelector("#profile-save-btn");
const profileCancelBtnEl = document.querySelector("#profile-cancel-btn");
const messagesEl = document.querySelector("#messages");
const composer = document.querySelector("#composer");
const draftEl = document.querySelector("#draft");
const emojiBarEl = document.querySelector("#emoji-bar");
const emojiToggleBtn = document.querySelector("#emoji-toggle");
const adminPanel = document.querySelector("#admin-panel");
const adminPanelTitleEl = document.querySelector("#admin-panel h3");
const joinRequestsEl = document.querySelector("#join-requests");
const pendingBadgeEl = document.querySelector("#pending-badge");
const notifEnableBtn = document.querySelector("#notif-enable-btn");
const languageSelectEl = document.querySelector("#language-select");
const privacyPillEl = document.querySelector("#privacy-pill");
const quickTemplatesCardEl = document.querySelector("#quick-templates-card");
const quickTemplatesTitleEl = document.querySelector("#quick-templates-title");
const quickTemplatesSubtitleEl = document.querySelector("#quick-templates-subtitle");
const quickTemplateCategoriesEl = document.querySelector("#quick-template-categories");
const quickTemplateListEl = document.querySelector("#quick-template-list");
const templateAdminToggleBtnEl = document.querySelector("#template-admin-toggle-btn");
const templateAdminPanelEl = document.querySelector("#template-admin-panel");
const templateAdminTitleEl = document.querySelector("#template-admin-title");
const templateFormEl = document.querySelector("#template-form");
const templateIdEl = document.querySelector("#template-id");
const templateTitleInputEl = document.querySelector("#template-title-input");
const templateTextInputEl = document.querySelector("#template-text-input");
const templateCategoryInputEl = document.querySelector("#template-category-input");
const templateOrderInputEl = document.querySelector("#template-order-input");
const templateEditableInputEl = document.querySelector("#template-editable-input");
const templateActiveInputEl = document.querySelector("#template-active-input");
const templateSaveBtnEl = document.querySelector("#template-save-btn");
const templateResetBtnEl = document.querySelector("#template-reset-btn");
const templateAdminListEl = document.querySelector("#template-admin-list");
const chatSectionTitleEl = document.querySelector("#chat-section-title");
const chatCollapseBtnEl = document.querySelector("#chat-collapse-btn");
const chatSectionBodyEl = document.querySelector("#chat-section-body");

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
let lastPendingCount = null;
let currentLang = "es";
let unsubscribeTemplates = null;
let templates = [];
let selectedTemplateCategory = "morning";
let hasSeededTemplates = false;
let isChatCollapsed = true;
const frequentEmojis = ["😀", "😂", "😍", "🥰", "🙏", "👍", "❤️", "🎉", "😢", "😘", "😎", "🍪"];
const E2EE_PREFIX = "e2ee:v1:";
const E2EE_SALT_PREFIX = "cookiechat-e2ee-v1";
const MAX_STORED_TEXT_LENGTH = 1000;
const LANG_STORAGE_KEY = "cookiechat.lang";
const SUPPORTED_LANGS = ["es", "en", "fr", "de", "it", "pt"];
const TEMPLATE_CATEGORIES = ["morning", "school", "love", "night"];
const TEMPLATE_DEFAULTS = [
  { title: "Buenos dias, abuelos ☀️", text: "Buenos dias, abuelos. Que tengais un dia precioso ❤️", category: "morning", sortOrder: 10, editable: false },
  { title: "Os quiero mucho ❤️", text: "Os quiero mucho. Luego os cuento mas 😘", category: "love", sortOrder: 20, editable: false },
  { title: "Hoy en el cole...", text: "Hoy en el cole hice [actividad] y me gusto mucho.", category: "school", sortOrder: 30, editable: true },
  { title: "Buenas noches 🌙", text: "Buenas noches, abuelos. Que descanseis.", category: "night", sortOrder: 40, editable: false }
];

const I18N = {
  es: {
    privacyPill: "Privado y por invitacion",
    install: {
      app: "Instalar app",
      cookiechat: "Instalar CookieChat",
      iosTitle: "Instalar en iPhone/iPad",
      iosHint: "Añádela a pantalla de inicio para usarla como app.",
      iosStep1: "Abre esta pagina en Safari.",
      iosStep2: "Pulsa Compartir y luego Añadir a pantalla de inicio."
    },
    update: { available: "Hay una nueva version disponible.", now: "Actualizar ahora" },
    landing: {
      title: "Un chat privado, seguro y sencillo.",
      subtitle: "CookieChat mantiene la conversacion cerrada: solo entran usuarios aprobados por administradores.",
      f1: "Aprobacion manual de nuevos miembros",
      f2: "Acceso privado por cuenta autenticada",
      f3: "Disponible en movil, tablet y ordenador"
    },
    auth: {
      access: "Acceso",
      newUser: "Nuevo usuario",
      sendRequest: "Enviar solicitud",
      continue: "Continuar",
      name: "Nombre",
      email: "Email",
      password: "Contraseña",
      userType: "Tipo de usuario",
      adult: "Adulto",
      child: "Menor"
    },
    pending: {
      title: "Solicitud enviada",
      default: "Tu solicitud esta pendiente de aprobacion por un administrador.",
      resend: "Reenviar email de verificacion",
      logout: "Salir"
    },
    chat: {
      title: "Chat",
      logout: "Salir",
      e2eeOff: "E2EE desactivado",
      e2eeOn: "E2EE activa",
      e2eeBtn: "Clave E2EE",
      requests: "Solicitudes de acceso",
      notify: "Activar avisos",
      draft: "Escribe un mensaje...",
      send: "Enviar"
    },
    roles: { admin: "admin", adult: "adulto", child: "menor", member: "miembro" }
  },
  en: {
    privacyPill: "Private and invitation-only",
    install: {
      app: "Install app",
      cookiechat: "Install CookieChat",
      iosTitle: "Install on iPhone/iPad",
      iosHint: "Add it to your home screen to use it like an app.",
      iosStep1: "Open this page in Safari.",
      iosStep2: "Tap Share and then Add to Home Screen."
    },
    update: { available: "A new version is available.", now: "Update now" },
    landing: {
      title: "A private, safe and simple chat.",
      subtitle: "CookieChat keeps conversations closed: only admin-approved users can join.",
      f1: "Manual approval for new members",
      f2: "Private access with authenticated account",
      f3: "Available on phone, tablet and desktop"
    },
    auth: {
      access: "Sign in",
      newUser: "New user",
      sendRequest: "Send request",
      continue: "Continue",
      name: "Name",
      email: "Email",
      password: "Password",
      userType: "User type",
      adult: "Adult",
      child: "Child"
    },
    pending: {
      title: "Request sent",
      default: "Your request is pending admin approval.",
      resend: "Resend verification email",
      logout: "Log out"
    },
    chat: {
      title: "Chat",
      logout: "Log out",
      e2eeOff: "E2EE off",
      e2eeOn: "E2EE on",
      e2eeBtn: "E2EE key",
      requests: "Access requests",
      notify: "Enable alerts",
      draft: "Write a message...",
      send: "Send"
    },
    roles: { admin: "admin", adult: "adult", child: "child", member: "member" }
  },
  fr: {
    privacyPill: "Prive et sur invitation",
    install: { app: "Installer l'app", cookiechat: "Installer CookieChat", iosTitle: "Installer sur iPhone/iPad", iosHint: "Ajoutez-la a l'ecran d'accueil.", iosStep1: "Ouvrez cette page dans Safari.", iosStep2: "Touchez Partager puis Sur l'ecran d'accueil." },
    update: { available: "Une nouvelle version est disponible.", now: "Mettre a jour" },
    landing: { title: "Un chat prive, sur et simple.", subtitle: "CookieChat garde la conversation fermee.", f1: "Validation manuelle des membres", f2: "Acces prive par compte authentifie", f3: "Disponible sur mobile, tablette et ordinateur" },
    auth: { access: "Acces", newUser: "Nouvel utilisateur", sendRequest: "Envoyer la demande", continue: "Continuer", name: "Nom", email: "Email", password: "Mot de passe", userType: "Type d'utilisateur", adult: "Adulte", child: "Enfant" },
    pending: { title: "Demande envoyee", default: "Votre demande est en attente d'approbation.", resend: "Renvoyer l'email", logout: "Quitter" },
    chat: { title: "Chat", logout: "Quitter", e2eeOff: "E2EE desactive", e2eeOn: "E2EE active", e2eeBtn: "Cle E2EE", requests: "Demandes d'acces", notify: "Activer alertes", draft: "Ecrivez un message...", send: "Envoyer" },
    roles: { admin: "admin", adult: "adulte", child: "enfant", member: "membre" }
  },
  de: {
    privacyPill: "Privat und nur auf Einladung",
    install: { app: "App installieren", cookiechat: "CookieChat installieren", iosTitle: "Auf iPhone/iPad installieren", iosHint: "Zum Home-Bildschirm hinzufugen.", iosStep1: "Diese Seite in Safari offnen.", iosStep2: "Teilen und dann Zum Home-Bildschirm." },
    update: { available: "Eine neue Version ist verfugbar.", now: "Jetzt aktualisieren" },
    landing: { title: "Ein privater, sicherer und einfacher Chat.", subtitle: "CookieChat halt Gesprache geschlossen.", f1: "Manuelle Freigabe neuer Mitglieder", f2: "Privater Zugang mit Konto", f3: "Verfugbar auf Handy, Tablet und Desktop" },
    auth: { access: "Anmelden", newUser: "Neuer Nutzer", sendRequest: "Anfrage senden", continue: "Weiter", name: "Name", email: "E-Mail", password: "Passwort", userType: "Nutzertyp", adult: "Erwachsen", child: "Kind" },
    pending: { title: "Anfrage gesendet", default: "Deine Anfrage wartet auf Freigabe.", resend: "Bestatigung erneut senden", logout: "Abmelden" },
    chat: { title: "Chat", logout: "Abmelden", e2eeOff: "E2EE aus", e2eeOn: "E2EE an", e2eeBtn: "E2EE-Schlussel", requests: "Zugriffsanfragen", notify: "Hinweise aktivieren", draft: "Nachricht schreiben...", send: "Senden" },
    roles: { admin: "admin", adult: "erwachsen", child: "kind", member: "mitglied" }
  },
  it: {
    privacyPill: "Privata e solo su invito",
    install: { app: "Installa app", cookiechat: "Installa CookieChat", iosTitle: "Installa su iPhone/iPad", iosHint: "Aggiungila alla schermata Home.", iosStep1: "Apri questa pagina in Safari.", iosStep2: "Tocca Condividi e poi Aggiungi a Home." },
    update: { available: "E disponibile una nuova versione.", now: "Aggiorna ora" },
    landing: { title: "Una chat privata, sicura e semplice.", subtitle: "CookieChat mantiene la conversazione chiusa.", f1: "Approvazione manuale dei membri", f2: "Accesso privato con account autenticato", f3: "Disponibile su mobile, tablet e desktop" },
    auth: { access: "Accesso", newUser: "Nuovo utente", sendRequest: "Invia richiesta", continue: "Continua", name: "Nome", email: "Email", password: "Password", userType: "Tipo utente", adult: "Adulto", child: "Minore" },
    pending: { title: "Richiesta inviata", default: "La tua richiesta e in attesa di approvazione.", resend: "Reinvia email verifica", logout: "Esci" },
    chat: { title: "Chat", logout: "Esci", e2eeOff: "E2EE disattivata", e2eeOn: "E2EE attiva", e2eeBtn: "Chiave E2EE", requests: "Richieste di accesso", notify: "Attiva avvisi", draft: "Scrivi un messaggio...", send: "Invia" },
    roles: { admin: "admin", adult: "adulto", child: "minore", member: "membro" }
  },
  pt: {
    privacyPill: "Privado e apenas por convite",
    install: { app: "Instalar app", cookiechat: "Instalar CookieChat", iosTitle: "Instalar no iPhone/iPad", iosHint: "Adicione a tela inicial para usar como app.", iosStep1: "Abra esta pagina no Safari.", iosStep2: "Toque em Compartilhar e depois Adicionar a tela inicial." },
    update: { available: "Ha uma nova versao disponivel.", now: "Atualizar agora" },
    landing: { title: "Um chat privado, seguro e simples.", subtitle: "CookieChat mantem a conversa fechada.", f1: "Aprovacao manual de novos membros", f2: "Acesso privado com conta autenticada", f3: "Disponivel em telemovel, tablet e computador" },
    auth: { access: "Entrar", newUser: "Novo utilizador", sendRequest: "Enviar pedido", continue: "Continuar", name: "Nome", email: "Email", password: "Senha", userType: "Tipo de utilizador", adult: "Adulto", child: "Crianca" },
    pending: { title: "Pedido enviado", default: "O seu pedido esta pendente de aprovacao.", resend: "Reenviar email de verificacao", logout: "Sair" },
    chat: { title: "Chat", logout: "Sair", e2eeOff: "E2EE desligado", e2eeOn: "E2EE ligado", e2eeBtn: "Chave E2EE", requests: "Pedidos de acesso", notify: "Ativar alertas", draft: "Escreva uma mensagem...", send: "Enviar" },
    roles: { admin: "admin", adult: "adulto", child: "crianca", member: "membro" }
  }
};

function detectLanguage() {
  const saved = localStorage.getItem(LANG_STORAGE_KEY);
  if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
  const browser = (navigator.language || "es").slice(0, 2).toLowerCase();
  return SUPPORTED_LANGS.includes(browser) ? browser : "es";
}

function t(path, fallback = "") {
  const source = I18N[currentLang] || I18N.es;
  const value = path.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), source);
  if (typeof value === "string") return value;
  if (fallback) return fallback;
  const fallbackValue = path.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), I18N.es);
  return typeof fallbackValue === "string" ? fallbackValue : path;
}

function categoryLabel(category) {
  const isEs = currentLang === "es";
  if (category === "morning") return isEs ? "Mañana" : "Morning";
  if (category === "school") return isEs ? "Cole" : "School";
  if (category === "love") return isEs ? "Cariño" : "Love";
  if (category === "night") return isEs ? "Noche" : "Night";
  return isEs ? "General" : "General";
}

function cleanTemplatePayload(raw) {
  const title = String(raw?.title || "").trim().slice(0, 40);
  const text = String(raw?.text || "").trim().slice(0, 240);
  const category = TEMPLATE_CATEGORIES.includes(raw?.category) ? raw.category : "morning";
  const editable = raw?.editable !== false;
  const active = raw?.active !== false;
  const sortOrder = Number.isFinite(Number(raw?.sortOrder)) ? Math.max(0, Math.min(999, Math.round(Number(raw.sortOrder)))) : 100;

  return {
    title,
    text,
    category,
    editable,
    active,
    sortOrder
  };
}

function makeTemplateId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `tpl_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function applyStaticTranslations() {
  const setLabelPrefix = (labelEl, text) => {
    if (!labelEl) return;
    if (labelEl.firstChild && labelEl.firstChild.nodeType === Node.TEXT_NODE) {
      labelEl.firstChild.nodeValue = `${text} `;
      return;
    }
    labelEl.insertBefore(document.createTextNode(`${text} `), labelEl.firstChild);
  };

  if (privacyPillEl) privacyPillEl.textContent = t("privacyPill");
  if (updateBtnEl) updateBtnEl.textContent = t("update.now");
  if (document.querySelector(".update-text")) document.querySelector(".update-text").textContent = t("update.available");
  if (document.querySelector(".hero h1")) document.querySelector(".hero h1").textContent = t("landing.title");
  if (document.querySelector(".hero p")) document.querySelector(".hero p").textContent = t("landing.subtitle");

  const featureItems = document.querySelectorAll(".feature-list li");
  if (featureItems[0]) featureItems[0].textContent = t("landing.f1");
  if (featureItems[1]) featureItems[1].textContent = t("landing.f2");
  if (featureItems[2]) featureItems[2].textContent = t("landing.f3");

  if (document.querySelector("#auth-card h2")) document.querySelector("#auth-card h2").textContent = authMode === "register" ? t("auth.newUser") : t("auth.access");
  modeLoginBtn.textContent = t("auth.access");
  modeRegisterBtn.textContent = t("auth.newUser");
  setLabelPrefix(displayNameLabel, t("auth.name"));
  setLabelPrefix(requestedRoleLabel, t("auth.userType"));
  setLabelPrefix(document.querySelector("#email")?.closest("label"), t("auth.email"));
  setLabelPrefix(document.querySelector("#password")?.closest("label"), t("auth.password"));
  requestedRoleEl.querySelector('option[value="adult"]').textContent = t("auth.adult");
  requestedRoleEl.querySelector('option[value="child"]').textContent = t("auth.child");

  const pendingTitle = document.querySelector("#pending-card h2");
  if (pendingTitle) pendingTitle.textContent = t("pending.title");
  verifyEmailBtn.textContent = t("pending.resend");
  pendingLogoutBtn.textContent = t("pending.logout");

  const chatTitle = document.querySelector("#chat-card h2");
  if (chatTitle) chatTitle.textContent = t("chat.title");
  logoutBtn.textContent = t("chat.logout");
  e2eeKeyBtn.textContent = t("chat.e2eeBtn");
  if (profileToggleBtnEl) profileToggleBtnEl.textContent = currentLang === "es" ? "Perfil" : "Profile";
  if (profileTitleEl) profileTitleEl.textContent = currentLang === "es" ? "Tu perfil" : "Your profile";
  if (profileNameLabelEl) profileNameLabelEl.textContent = currentLang === "es" ? "Nombre visible" : "Visible name";
  if (profileSaveBtnEl) profileSaveBtnEl.textContent = currentLang === "es" ? "Guardar nombre" : "Save name";
  if (profileCancelBtnEl) profileCancelBtnEl.textContent = currentLang === "es" ? "Cancelar" : "Cancel";
  notifEnableBtn.textContent = t("chat.notify");
  draftEl.placeholder = t("chat.draft");
  if (composer.querySelector('button[type="submit"]')) composer.querySelector('button[type="submit"]').textContent = t("chat.send");
  if (quickTemplatesTitleEl) quickTemplatesTitleEl.textContent = currentLang === "es" ? "Saludos rápidos" : "Quick greetings";
  if (quickTemplatesSubtitleEl) quickTemplatesSubtitleEl.textContent = currentLang === "es" ? "Saluda en 1-2 toques y vuelve a tu día." : "Greet in 1-2 taps and get back to your day.";
  if (chatSectionTitleEl) chatSectionTitleEl.textContent = currentLang === "es" ? "Conversación familiar" : "Family chat";
  if (templateAdminTitleEl) templateAdminTitleEl.textContent = currentLang === "es" ? "Gestionar plantillas" : "Manage templates";
  if (templateAdminToggleBtnEl) templateAdminToggleBtnEl.textContent = currentLang === "es" ? "+ Plantilla" : "+ Template";
  if (templateSaveBtnEl) templateSaveBtnEl.textContent = currentLang === "es" ? "Guardar plantilla" : "Save template";
  if (templateResetBtnEl) templateResetBtnEl.textContent = currentLang === "es" ? "Nueva" : "New";

  if (templateCategoryInputEl && templateCategoryInputEl.options.length === 0) {
    for (const category of TEMPLATE_CATEGORIES) {
      const option = document.createElement("option");
      option.value = category;
      templateCategoryInputEl.appendChild(option);
    }
  }
  if (templateCategoryInputEl) {
    for (let i = 0; i < templateCategoryInputEl.options.length; i += 1) {
      const option = templateCategoryInputEl.options[i];
      option.textContent = categoryLabel(option.value);
    }
  }
}

function setLanguage(lang) {
  const nextLang = SUPPORTED_LANGS.includes(lang) ? lang : "es";
  currentLang = nextLang;
  localStorage.setItem(LANG_STORAGE_KEY, nextLang);
  document.documentElement.lang = nextLang;
  if (languageSelectEl) languageSelectEl.value = nextLang;
  applyStaticTranslations();
  setupInstallUI();
  refreshE2EEIndicator();
  updateNotificationButtonLabel();
  if (currentUserIsAdmin && lastPendingCount !== null) {
    adminPanelTitleEl.textContent = `${t("chat.requests")} (${lastPendingCount})`;
    updatePendingBadge(lastPendingCount);
  }
  renderTemplateCategories();
  renderQuickTemplateButtons();
  if (currentUserIsAdmin) {
    renderTemplateAdminList();
  }
  setChatCollapsed(isChatCollapsed);
}

function setChatCollapsed(collapsed) {
  isChatCollapsed = collapsed;
  if (chatSectionBodyEl) {
    chatSectionBodyEl.classList.toggle("hidden", collapsed);
  }
  if (chatCollapseBtnEl) {
    chatCollapseBtnEl.textContent = collapsed
      ? (currentLang === "es" ? "Abrir chat" : "Open chat")
      : (currentLang === "es" ? "Cerrar chat" : "Close chat");
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function supportsBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

function updateNotificationButtonLabel() {
  if (!notifEnableBtn) return;
  if (!supportsBrowserNotifications()) {
    notifEnableBtn.disabled = true;
    notifEnableBtn.textContent = currentLang === "es" ? "Avisos no compatibles" : "Alerts unsupported";
    return;
  }
  notifEnableBtn.disabled = false;
  notifEnableBtn.textContent = Notification.permission === "granted" ? (currentLang === "es" ? "Avisos activados" : "Alerts enabled") : t("chat.notify");
}

function updatePendingBadge(count) {
  if (!pendingBadgeEl) return;
  if (count <= 0) {
    pendingBadgeEl.classList.add("hidden");
    pendingBadgeEl.textContent = currentLang === "es" ? "0 nuevas" : "0 new";
    return;
  }
  pendingBadgeEl.classList.remove("hidden");
  pendingBadgeEl.textContent = currentLang === "es" ? `${count} pendiente${count === 1 ? "" : "s"}` : `${count} pending`;
}

function notifyNewJoinRequests(newCount, pendingDocs) {
  if (newCount <= 0) return;
  const latest = pendingDocs[0]?.data();
  const who = latest?.displayName || latest?.email || (currentLang === "es" ? "Nuevo usuario" : "New user");
  setStatus(currentLang === "es" ? `Nueva solicitud de acceso: ${who}.` : `New access request: ${who}.`);

  if (supportsBrowserNotifications() && Notification.permission === "granted") {
    const body =
      currentLang === "es"
        ? `${newCount === 1 ? "nueva solicitud" : `${newCount} nuevas solicitudes`}. Abre CookieChat para aprobar o rechazar.`
        : `${newCount === 1 ? "new request" : `${newCount} new requests`}. Open CookieChat to review.`;
    new Notification("CookieChat", { body });
  }

  if (navigator.vibrate) {
    navigator.vibrate(80);
  }
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
    throw new Error(currentLang === "es" ? "Este navegador no soporta cifrado Web Crypto." : "This browser does not support Web Crypto.");
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
  e2eeIndicatorEl.textContent = e2eeKey ? `${t("chat.e2eeOn")} · ${e2eeFingerprint}` : t("chat.e2eeOff");
}

async function promptAndSetE2EEKey() {
  const typed = window.prompt(
    currentLang === "es"
      ? "Introduce la clave familiar E2EE. Debe ser la misma para toda la familia."
      : "Enter the family E2EE key. It must be the same for everyone.",
    ""
  );

  if (typed === null) return false;
  const passphrase = typed.trim();
  if (!passphrase || passphrase.length < 8) {
    setStatus(currentLang === "es" ? "La clave E2EE debe tener al menos 8 caracteres." : "E2EE key must be at least 8 characters.", true);
    return false;
  }

  try {
    const { key, fingerprint } = await deriveE2EE(passphrase);
    e2eeKey = key;
    e2eeFingerprint = fingerprint;
    missingE2EEKeyNoticeShown = false;
    refreshE2EEIndicator();
    setStatus(currentLang === "es" ? `Clave E2EE configurada (${fingerprint}).` : `E2EE key set (${fingerprint}).`);
    if (latestMessageDocs.length) {
      await renderMessages(latestMessageDocs);
    }
    return true;
  } catch (error) {
    setStatus(currentLang === "es" ? `No se pudo configurar E2EE: ${error.message}` : `Failed to configure E2EE: ${error.message}`, true);
    return false;
  }
}

function roleLabel(role) {
  switch (role) {
    case "admin":
      return t("roles.admin");
    case "adult":
      return t("roles.adult");
    case "child":
      return t("roles.child");
    default:
      return t("roles.member");
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

  return currentLang === "es" ? "Usuario" : "User";
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
    installTitleEl.textContent = t("install.iosTitle");
    installHintEl.textContent = t("install.iosHint");
    renderInstallSteps([
      t("install.iosStep1"),
      t("install.iosStep2")
    ]);
    installStepsEl.classList.remove("hidden");
    return;
  }

  canShowInstallCard = false;
  installCardEl.classList.remove("ios-install");
  installCardEl.classList.add("compact-install");
  installTitleEl.textContent = t("install.app");
  installHintEl.textContent = t("install.cookiechat");
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
  document.querySelector("#auth-card h2").textContent = register ? t("auth.newUser") : t("auth.access");
  authSubmitBtn.textContent = register ? t("auth.sendRequest") : t("auth.continue");
  displayNameLabel.classList.toggle("hidden", !register);
  requestedRoleLabel.classList.toggle("hidden", !register);
  displayNameEl.required = register;
  modeLoginBtn.classList.toggle("active", !register);
  modeRegisterBtn.classList.toggle("active", register);
}

function formatDate(rawDate) {
  if (!rawDate) return "";
  const date = rawDate.toDate ? rawDate.toDate() : new Date(rawDate);
  return new Intl.DateTimeFormat(currentLang, {
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

async function sendTextMessage(text) {
  const safeText = String(text || "").trim();
  if (!safeText || !auth.currentUser || !currentUserRole) return;

  const storedText = await encryptText(safeText);
  if (storedText.length > MAX_STORED_TEXT_LENGTH) {
    throw new Error(currentLang === "es" ? "Mensaje demasiado largo para enviarlo cifrado. Acortalo un poco." : "Message too long for encrypted send.");
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
}

function renderTemplateCategories() {
  if (!quickTemplateCategoriesEl) return;
  quickTemplateCategoriesEl.innerHTML = "";
  for (const category of TEMPLATE_CATEGORIES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = selectedTemplateCategory === category ? "active" : "";
    btn.textContent = categoryLabel(category);
    btn.addEventListener("click", () => {
      selectedTemplateCategory = category;
      renderTemplateCategories();
      renderQuickTemplateButtons();
    });
    quickTemplateCategoriesEl.appendChild(btn);
  }
}

async function handleQuickTemplateClick(template) {
  let finalText = template.text;

  if (template.editable) {
    const edited = window.prompt(
      currentLang === "es" ? "Edita el mensaje antes de enviar:" : "Edit message before sending:",
      template.text
    );
    if (edited === null) return;
    finalText = String(edited || "").trim();
  }

  if (!finalText) {
    setStatus(currentLang === "es" ? "El mensaje esta vacio." : "Message is empty.", true);
    return;
  }

  try {
    await sendTextMessage(finalText);
    setStatus(currentLang === "es" ? "Mensaje rapido enviado." : "Quick message sent.");
  } catch (error) {
    setStatus(currentLang === "es" ? `No se pudo enviar: ${error.message}` : `Could not send: ${error.message}`, true);
  }
}

function renderQuickTemplateButtons() {
  if (!quickTemplateListEl) return;
  quickTemplateListEl.innerHTML = "";

  const visible = templates
    .filter((tpl) => tpl.active && tpl.category === selectedTemplateCategory)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));

  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "template-admin-meta";
    empty.textContent = currentLang === "es" ? "No hay plantillas en esta categoria." : "No templates in this category.";
    quickTemplateListEl.appendChild(empty);
    return;
  }

  for (const template of visible) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quick-template-btn";
    btn.textContent = template.title;
    const meta = document.createElement("span");
    meta.className = "quick-template-meta";
    meta.textContent = template.editable ? (currentLang === "es" ? "Editable" : "Editable") : (currentLang === "es" ? "Un toque" : "One tap");
    btn.appendChild(meta);
    btn.addEventListener("click", async () => {
      await handleQuickTemplateClick(template);
    });
    quickTemplateListEl.appendChild(btn);
  }
}

function resetTemplateForm() {
  if (!templateFormEl) return;
  templateIdEl.value = "";
  templateTitleInputEl.value = "";
  templateTextInputEl.value = "";
  templateCategoryInputEl.value = selectedTemplateCategory;
  templateOrderInputEl.value = "100";
  templateEditableInputEl.checked = true;
  templateActiveInputEl.checked = true;
}

function fillTemplateForm(template) {
  templateIdEl.value = template.id;
  templateTitleInputEl.value = template.title;
  templateTextInputEl.value = template.text;
  templateCategoryInputEl.value = template.category;
  templateOrderInputEl.value = String(template.sortOrder);
  templateEditableInputEl.checked = template.editable;
  templateActiveInputEl.checked = template.active;
}

function renderTemplateAdminList() {
  if (!templateAdminListEl) return;
  templateAdminListEl.innerHTML = "";

  const ordered = [...templates].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  if (!ordered.length) {
    const empty = document.createElement("li");
    empty.textContent = currentLang === "es" ? "Todavia no hay plantillas." : "No templates yet.";
    templateAdminListEl.appendChild(empty);
    return;
  }

  for (const template of ordered) {
    const li = document.createElement("li");
    const meta = document.createElement("p");
    meta.className = "template-admin-meta";
    meta.textContent = `${template.title} · ${categoryLabel(template.category)} · ${template.active ? "ON" : "OFF"} · ${template.editable ? (currentLang === "es" ? "editable" : "editable") : (currentLang === "es" ? "fija" : "fixed")}`;

    const actions = document.createElement("div");
    actions.className = "request-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = currentLang === "es" ? "Editar" : "Edit";
    editBtn.addEventListener("click", () => fillTemplateForm(template));

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "secondary";
    toggleBtn.textContent = template.active ? (currentLang === "es" ? "Desactivar" : "Disable") : (currentLang === "es" ? "Activar" : "Enable");
    toggleBtn.addEventListener("click", async () => {
      try {
        await setDoc(
          doc(db, "families", familyId, "templates", template.id),
          { active: !template.active, updatedAt: serverTimestamp() },
          { merge: true }
        );
      } catch (error) {
        setStatus(currentLang === "es" ? `No se pudo actualizar plantilla: ${error.message}` : `Could not update template: ${error.message}`, true);
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(toggleBtn);
    li.appendChild(meta);
    li.appendChild(actions);
    templateAdminListEl.appendChild(li);
  }
}

async function saveTemplateFromForm(event) {
  event.preventDefault();
  if (!currentUserIsAdmin) return;

  const payload = cleanTemplatePayload({
    title: templateTitleInputEl.value,
    text: templateTextInputEl.value,
    category: templateCategoryInputEl.value,
    editable: templateEditableInputEl.checked,
    active: templateActiveInputEl.checked,
    sortOrder: Number(templateOrderInputEl.value || 100)
  });

  if (!payload.title || !payload.text) {
    setStatus(currentLang === "es" ? "Completa titulo y mensaje." : "Fill title and message.", true);
    return;
  }

  const id = templateIdEl.value || makeTemplateId();
  try {
    await setDoc(
      doc(db, "families", familyId, "templates", id),
      {
        ...payload,
        createdBy: currentUserId || "",
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      },
      { merge: true }
    );
    resetTemplateForm();
    setStatus(currentLang === "es" ? "Plantilla guardada." : "Template saved.");
  } catch (error) {
    setStatus(currentLang === "es" ? `No se pudo guardar plantilla: ${error.message}` : `Could not save template: ${error.message}`, true);
  }
}

async function ensureDefaultTemplatesIfNeeded() {
  if (!currentUserIsAdmin || hasSeededTemplates || templates.length > 0) return;
  hasSeededTemplates = true;
  try {
    for (const tpl of TEMPLATE_DEFAULTS) {
      await setDoc(
        doc(db, "families", familyId, "templates", makeTemplateId()),
        {
          ...tpl,
          active: true,
          createdBy: currentUserId || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      );
    }
    setStatus(currentLang === "es" ? "Plantillas base creadas." : "Starter templates created.");
  } catch {
    // no-op
  }
}

function watchTemplates() {
  if (unsubscribeTemplates) {
    unsubscribeTemplates();
    unsubscribeTemplates = null;
  }

  const templatesRef = collection(db, "families", familyId, "templates");
  unsubscribeTemplates = onSnapshot(
    templatesRef,
    async (snapshot) => {
      templates = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...cleanTemplatePayload(docSnap.data()) }));
      renderTemplateCategories();
      renderQuickTemplateButtons();
      if (currentUserIsAdmin) {
        renderTemplateAdminList();
      }
      await ensureDefaultTemplatesIfNeeded();
    },
    (error) => {
      setStatus(currentLang === "es" ? `Error cargando plantillas: ${error.message}` : `Error loading templates: ${error.message}`, true);
    }
  );
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
      (message.senderId && message.senderId === currentUserId ? currentUserName : (currentLang === "es" ? "Usuario" : "User"));
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
        ? (currentLang === "es" ? "Mensaje cifrado. Configura o revisa la clave E2EE." : "Encrypted message. Configure or review your E2EE key.")
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
    setStatus(currentLang === "es" ? "Hay mensajes cifrados. Pulsa 'Clave E2EE' para leerlos." : "There are encrypted messages. Tap 'E2EE key' to read them.");
  }
}

async function loadMembership(user) {
  const familyRef = doc(db, "families", familyId);
  const familySnap = await getDoc(familyRef);

  if (!familySnap.exists()) {
    throw new Error(currentLang === "es" ? "No se encontro el grupo configurado." : "Configured family group was not found.");
  }

  const family = familySnap.data();
  const role = family?.members?.[user.uid];
  const isAdmin = family?.admins?.[user.uid] === true;
  const storedName = family?.memberNames?.[user.uid];

  if (!role) {
    throw new Error(currentLang === "es" ? "Esta cuenta no esta aprobada en este grupo." : "This account is not approved in this family.");
  }

  let resolvedName = "";
  const userProfileRef = doc(db, "families", familyId, "userProfiles", user.uid);
  const userProfileSnap = await getDoc(userProfileRef).catch(() => null);
  if (userProfileSnap?.exists()) {
    const profileName = String(userProfileSnap.data()?.displayName || "").trim();
    if (profileName) {
      resolvedName = profileName;
    }
  }

  if (!resolvedName) {
    resolvedName = (storedName && String(storedName).trim()) || "";
  }
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

async function saveOwnProfileName() {
  if (!auth.currentUser || !currentUserId) return;
  const nextName = String(profileNameInputEl?.value || "").trim();
  if (nextName.length < 2) {
    setStatus(currentLang === "es" ? "El nombre debe tener al menos 2 caracteres." : "Name must have at least 2 characters.", true);
    return;
  }

  try {
    await setDoc(
      doc(db, "families", familyId, "userProfiles", currentUserId),
      {
        displayName: nextName,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    await updateProfile(auth.currentUser, { displayName: nextName }).catch(() => {});
    if (currentUserIsAdmin) {
      await setDoc(
        doc(db, "families", familyId),
        {
          memberNames: { [currentUserId]: nextName }
        },
        { merge: true }
      ).catch(() => {});
    }
    currentUserName = nextName;
    profilePanelEl.classList.add("hidden");
    setStatus(currentLang === "es" ? "Nombre actualizado." : "Name updated.");
  } catch (error) {
    setStatus(currentLang === "es" ? `No se pudo actualizar el nombre: ${error.message}` : `Could not update name: ${error.message}`, true);
  }
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
      setStatus(currentLang === "es" ? `Error cargando mensajes: ${error.message}` : `Error loading messages: ${error.message}`, true);
    }
  );
}

function renderJoinRequests(snapshot) {
  joinRequestsEl.innerHTML = "";
  const pendingDocs = snapshot.docs.filter((docSnap) => docSnap.data().status === "pending");
  const pendingCount = pendingDocs.length;
  adminPanelTitleEl.textContent = `${t("chat.requests")} (${pendingCount})`;
  updatePendingBadge(pendingCount);

  if (lastPendingCount !== null && pendingCount > lastPendingCount) {
    notifyNewJoinRequests(pendingCount - lastPendingCount, pendingDocs);
  }
  lastPendingCount = pendingCount;

  if (!pendingDocs.length) {
    const empty = document.createElement("li");
    empty.textContent = currentLang === "es" ? "No hay solicitudes pendientes." : "No pending requests.";
    joinRequestsEl.appendChild(empty);
    return;
  }

  for (const docSnap of pendingDocs) {
    const request = docSnap.data();
    const li = document.createElement("li");
    const requestedRole = request.requestedRole || "adult";
    const requestedName = request.displayName || (currentLang === "es" ? "Sin nombre" : "No name");
    const displayName = request.displayName || (currentLang === "es" ? "Sin nombre" : "No name");
    const email = request.email || "sin-email";

    const meta = document.createElement("p");
    meta.className = "request-meta";
    meta.textContent =
      currentLang === "es"
        ? `${displayName} · ${email} · solicita rol ${roleLabel(requestedRole)}`
        : `${displayName} · ${email} · requested role ${roleLabel(requestedRole)}`;

    const actions = document.createElement("div");
    actions.className = "request-actions";

    const approveBtn = document.createElement("button");
    approveBtn.type = "button";
    approveBtn.textContent = currentLang === "es" ? "Aprobar" : "Approve";
    approveBtn.addEventListener("click", async () => {
      await reviewJoinRequest(docSnap.id, requestedRole, "approved", requestedName);
    });

    const rejectBtn = document.createElement("button");
    rejectBtn.type = "button";
    rejectBtn.className = "reject";
    rejectBtn.textContent = currentLang === "es" ? "Rechazar" : "Reject";
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
      setStatus(currentLang === "es" ? `Error cargando solicitudes: ${error.message}` : `Error loading requests: ${error.message}`, true);
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

async function reviewJoinRequest(targetUserId, role, action, displayName = "") {
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
          [targetUserId]: String(displayName).trim() || (currentLang === "es" ? "Usuario" : "User")
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
  setStatus(action === "approved" ? (currentLang === "es" ? "Usuario aprobado." : "User approved.") : (currentLang === "es" ? "Solicitud rechazada." : "Request rejected."));
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
      authSubmitBtn.textContent = currentLang === "es" ? "Entrando..." : "Signing in...";
      setStatus(currentLang === "es" ? "Entrando..." : "Signing in...");
      await signInWithEmailAndPassword(auth, email, password);
      return;
    }

    const displayName = displayNameEl.value.trim();
    const requestedRole = requestedRoleEl.value;
    if (!displayName) {
      setStatus(currentLang === "es" ? "Escribe un nombre para la solicitud." : "Write a name for the request.", true);
      return;
    }

    authSubmitBtn.textContent = currentLang === "es" ? "Creando..." : "Creating...";
    setStatus(currentLang === "es" ? "Creando cuenta..." : "Creating account...");
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName }).catch(() => {});
    authSubmitBtn.textContent = currentLang === "es" ? "Enviando solicitud..." : "Sending request...";
    await createJoinRequest(credential.user, displayName, requestedRole);
    await sendEmailVerification(credential.user).catch(() => {});
    pendingMessageEl.textContent = t("pending.default");
    verifyEmailBtn.classList.remove("hidden");
    setView("pending");
    setStatus(currentLang === "es" ? "Solicitud enviada. Te hemos enviado un email de verificacion." : "Request sent. We have sent you a verification email.");
  } catch (error) {
    if (authMode === "register" && auth.currentUser) {
      await signOut(auth);
    }
    if (error?.code === "auth/email-already-in-use") {
      setStatus(currentLang === "es" ? "Ese email ya existe. Usa Acceso o prueba otro correo." : "This email already exists. Use Sign in or try another email.", true);
    } else if (error?.code === "auth/invalid-credential") {
      setStatus(currentLang === "es" ? "Credenciales no válidas. Revisa email/contraseña o usa Nuevo usuario." : "Invalid credentials. Check email/password or use New user.", true);
    } else if (error?.code === "permission-denied") {
      setStatus(
        `Sin permisos para guardar la solicitud en families/${familyId}/joinRequests. Revisa Firestore Rules, familyId y despliegue de reglas.`,
        true
      );
    } else if (error?.message === "join-request-not-visible-yet") {
      setStatus(currentLang === "es" ? "La solicitud tarda mas de lo normal. Intenta entrar de nuevo en unos segundos." : "Request is taking longer than normal. Try again in a few seconds.", true);
    } else {
      setStatus(currentLang === "es" ? `No se pudo continuar: ${error.message}` : `Could not continue: ${error.message}`, true);
    }
  } finally {
    isSubmittingAuth = false;
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = authMode === "register" ? t("auth.sendRequest") : t("auth.continue");
  }
}

async function handleSend(event) {
  event.preventDefault();
  const text = draftEl.value.trim();

  if (!text || !auth.currentUser || !currentUserRole) return;

  try {
    await sendTextMessage(text);
    draftEl.value = "";
  } catch (error) {
    setStatus(currentLang === "es" ? `No se pudo enviar: ${error.message}` : `Could not send: ${error.message}`, true);
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
if (chatCollapseBtnEl) {
  chatCollapseBtnEl.addEventListener("click", () => {
    setChatCollapsed(!isChatCollapsed);
  });
}
if (profileToggleBtnEl) {
  profileToggleBtnEl.addEventListener("click", () => {
    if (!profilePanelEl) return;
    const shouldShow = profilePanelEl.classList.contains("hidden");
    if (shouldShow && profileNameInputEl) {
      profileNameInputEl.value = currentUserName || "";
      profileNameInputEl.focus();
      profileNameInputEl.select();
    }
    profilePanelEl.classList.toggle("hidden", !shouldShow);
  });
}
if (profileCancelBtnEl) {
  profileCancelBtnEl.addEventListener("click", () => {
    profilePanelEl.classList.add("hidden");
  });
}
if (profileFormEl) {
  profileFormEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveOwnProfileName();
  });
}
installBtnEl.addEventListener("click", async () => {
  if (!installPromptEvent) {
    if (isIOS()) {
      setStatus(currentLang === "es" ? "En iPhone/iPad: Safari > Compartir > Añadir a pantalla de inicio." : "On iPhone/iPad: Safari > Share > Add to Home Screen.");
    } else {
      setStatus(currentLang === "es" ? "Instalacion no disponible ahora mismo en este navegador." : "Install is not available right now in this browser.", true);
    }
    return;
  }
  installPromptEvent.prompt();
  try {
    const choice = await installPromptEvent.userChoice;
    if (choice?.outcome === "accepted") {
      setStatus(currentLang === "es" ? "CookieChat instalada." : "CookieChat installed.");
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

  const shouldChange = window.confirm(
    currentLang === "es" ? "Ya hay una clave E2EE activa. Quieres cambiarla?" : "An E2EE key is already active. Do you want to change it?"
  );
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
      setStatus(currentLang === "es" ? "Email verificado. Ya puedes continuar." : "Email verified. You can continue now.", false);
      window.location.reload();
      return;
    }
    await sendEmailVerification(auth.currentUser);
    setStatus(currentLang === "es" ? "Te hemos reenviado el email de verificacion." : "Verification email resent.");
  } catch (error) {
    setStatus(currentLang === "es" ? `No se pudo reenviar el email: ${error.message}` : `Could not resend email: ${error.message}`, true);
  }
});
notifEnableBtn.addEventListener("click", async () => {
  if (!supportsBrowserNotifications()) {
    setStatus(currentLang === "es" ? "Este navegador no soporta notificaciones." : "This browser does not support notifications.", true);
    return;
  }

  if (Notification.permission === "granted") {
    setStatus(currentLang === "es" ? "Avisos ya activados." : "Alerts already enabled.");
    return;
  }

  try {
    const result = await Notification.requestPermission();
    updateNotificationButtonLabel();
    if (result === "granted") {
      setStatus(currentLang === "es" ? "Avisos activados en este navegador." : "Alerts enabled in this browser.");
    } else {
      setStatus(currentLang === "es" ? "Permiso de avisos no concedido." : "Notification permission was not granted.", true);
    }
  } catch (error) {
    setStatus(currentLang === "es" ? `No se pudieron activar avisos: ${error.message}` : `Could not enable alerts: ${error.message}`, true);
  }
});
if (templateFormEl) {
  templateFormEl.addEventListener("submit", saveTemplateFromForm);
}
if (templateResetBtnEl) {
  templateResetBtnEl.addEventListener("click", () => {
    resetTemplateForm();
  });
}
if (templateAdminToggleBtnEl) {
  templateAdminToggleBtnEl.addEventListener("click", () => {
    templateAdminPanelEl.classList.toggle("hidden");
  });
}

onAuthStateChanged(auth, async (user) => {
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }
  if (unsubscribeRequests) {
    unsubscribeRequests();
    unsubscribeRequests = null;
  }
  if (unsubscribeTemplates) {
    unsubscribeTemplates();
    unsubscribeTemplates = null;
  }

  if (!user) {
    currentUserRole = null;
    currentUserId = null;
    currentUserName = currentLang === "es" ? "Usuario" : "User";
    currentUserIsAdmin = false;
    e2eeKey = null;
    e2eeFingerprint = "";
    latestMessageDocs = [];
    missingE2EEKeyNoticeShown = false;
    lastPendingCount = null;
    templates = [];
    hasSeededTemplates = false;
    isChatCollapsed = true;
    refreshE2EEIndicator();
    setChatCollapsed(true);
    adminPanel.classList.add("hidden");
    templateAdminToggleBtnEl.classList.add("hidden");
    templateAdminPanelEl.classList.add("hidden");
    if (profilePanelEl) profilePanelEl.classList.add("hidden");
    setView("auth");
    setStatus("");
    verifyEmailBtn.classList.add("hidden");
    return;
  }

  currentUserId = user.uid;
  currentUserName = inferDisplayName(user);

  try {
    setStatus(currentLang === "es" ? "Validando acceso..." : "Validating access...");
    await loadMembership(user);
    if (profileNameInputEl) {
      profileNameInputEl.value = currentUserName || "";
    }
    if (!user.emailVerified) {
      verifyEmailBtn.classList.remove("hidden");
      pendingMessageEl.textContent =
        currentLang === "es"
          ? "Tu cuenta esta aprobada, pero necesitas verificar tu email antes de entrar al chat."
          : "Your account is approved, but you need to verify your email before entering chat.";
      setView("pending");
      setStatus(currentLang === "es" ? "Verifica tu email para activar el acceso." : "Verify your email to enable access.");
      await sendEmailVerification(user).catch(() => {});
      return;
    }

    verifyEmailBtn.classList.add("hidden");
    setView("chat");
    setChatCollapsed(true);
    setStatus(currentLang === "es" ? "Conectada." : "Connected.");
    watchMessages();
    watchTemplates();

    if (currentUserIsAdmin) {
      adminPanel.classList.remove("hidden");
      templateAdminToggleBtnEl.classList.remove("hidden");
      templateAdminPanelEl.classList.remove("hidden");
      watchJoinRequests();
      resetTemplateForm();
    } else {
      adminPanel.classList.add("hidden");
      templateAdminToggleBtnEl.classList.add("hidden");
      templateAdminPanelEl.classList.add("hidden");
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
        setStatus(currentLang === "es" ? "Acceso denegado: no eres miembro y no hay solicitud activa." : "Access denied: not a member and no active request.", true);
        return;
      }

      pendingMessageEl.textContent = t("pending.default");
      setView("pending");
      setStatus(currentLang === "es" ? "Esperando aprobacion." : "Waiting for approval.");
      return;
    }

    if (request.status === "rejected") {
      pendingMessageEl.textContent = currentLang === "es" ? "Tu solicitud fue rechazada. Contacta con una administradora." : "Your request was rejected. Contact an administrator.";
      verifyEmailBtn.classList.add("hidden");
    } else if (request.status === "approved") {
      pendingMessageEl.textContent = user.emailVerified
        ? (currentLang === "es" ? "Tu solicitud fue aprobada. Cierra sesion y vuelve a entrar." : "Your request was approved. Log out and sign in again.")
        : (currentLang === "es" ? "Tu solicitud fue aprobada. Verifica tu email y vuelve a entrar." : "Your request was approved. Verify your email and sign in again.");
      verifyEmailBtn.classList.toggle("hidden", user.emailVerified);
      if (!user.emailVerified) {
        await sendEmailVerification(user).catch(() => {});
      }
    } else {
      pendingMessageEl.textContent = currentLang === "es" ? "Tu solicitud esta pendiente de aprobacion por una administradora." : "Your request is pending administrator approval.";
      verifyEmailBtn.classList.remove("hidden");
    }

    setView("pending");
    setStatus(currentLang === "es" ? "Esperando aprobacion." : "Waiting for approval.");
  } catch (error) {
    await signOut(auth);
    setStatus(currentLang === "es" ? `Acceso denegado: ${error.message}` : `Access denied: ${error.message}`, true);
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
  installTitleEl.textContent = t("install.app");
  installHintEl.textContent = t("install.cookiechat");
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
  setStatus(currentLang === "es" ? "CookieChat instalada." : "CookieChat installed.");
});

if (languageSelectEl) {
  languageSelectEl.addEventListener("change", (event) => {
    setLanguage(event.target.value);
  });
}

setLanguage(detectLanguage());
renderEmojiBar();
setupInstallUI();
setAuthMode("login");
refreshE2EEIndicator();
updateNotificationButtonLabel();
