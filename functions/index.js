const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

function parseRecipients(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

async function resolveAdminEmails(familyId) {
  const familyRef = admin.firestore().doc(`families/${familyId}`);
  const familySnap = await familyRef.get();
  if (!familySnap.exists) {
    throw new Error(`Family document not found: families/${familyId}`);
  }

  const familyData = familySnap.data() || {};
  const adminsMap = familyData.admins || {};
  const adminUids = Object.keys(adminsMap).filter((uid) => adminsMap[uid] === true);

  if (!adminUids.length) return [];

  const emails = [];
  for (let i = 0; i < adminUids.length; i += 100) {
    const batch = adminUids.slice(i, i + 100);
    const result = await admin.auth().getUsers(batch.map((uid) => ({ uid })));
    for (const user of result.users) {
      if (user.email) emails.push(user.email.toLowerCase());
    }
  }

  return emails;
}

function makeTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true" || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("Missing SMTP config. Required: SMTP_HOST, SMTP_USER, SMTP_PASS");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });
}

exports.notifyAdminsOnJoinRequest = onDocumentCreated(
  {
    document: "families/{familyId}/joinRequests/{requestUserId}",
    region: "europe-west1"
  },
  async (event) => {
    const snap = event.data;
    if (!snap) {
      logger.warn("No snapshot data received");
      return;
    }

    const join = snap.data() || {};
    const familyId = event.params.familyId;
    const requestUserId = event.params.requestUserId;

    const adminEmailsFromAuth = await resolveAdminEmails(familyId);
    const extraRecipients = parseRecipients(process.env.ADMIN_NOTIFICATION_EMAILS);
    const recipients = [...new Set([...adminEmailsFromAuth, ...extraRecipients])];

    if (!recipients.length) {
      logger.warn("No admin recipients found", { familyId, requestUserId });
      return;
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const displayName = join.displayName || "Unknown";
    const email = join.email || "unknown-email";
    const requestedRole = join.requestedRole || "adult";

    const subject = `[CookieChat] New join request (${familyId})`;
    const text = [
      "A new join request is waiting for approval.",
      "",
      `Family: ${familyId}`,
      `UID: ${requestUserId}`,
      `Name: ${displayName}`,
      `Email: ${email}`,
      `Requested role: ${requestedRole}`,
      "",
      "Open CookieChat admin panel to approve or reject the request."
    ].join("\n");

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.45;color:#1b2a42">
        <h2 style="margin:0 0 12px">New CookieChat join request</h2>
        <p>A new user is waiting for admin approval.</p>
        <ul>
          <li><strong>Family:</strong> ${familyId}</li>
          <li><strong>UID:</strong> ${requestUserId}</li>
          <li><strong>Name:</strong> ${displayName}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Requested role:</strong> ${requestedRole}</li>
        </ul>
        <p>Open CookieChat admin panel to approve or reject this request.</p>
      </div>
    `;

    const transporter = makeTransport();
    await transporter.sendMail({
      from,
      to: recipients.join(","),
      subject,
      text,
      html
    });

    logger.info("Join request notification sent", {
      familyId,
      requestUserId,
      recipientsCount: recipients.length
    });
  }
);
