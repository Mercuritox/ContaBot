import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import Stripe from 'stripe';
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import crypto from "crypto";
import dotenv from "dotenv";
import cron from "node-cron";
import admin from "firebase-admin";

dotenv.config();

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  try {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "contabot-e7b15";
    
    // Para acceder a un proyecto externo (contabot-e7b15) desde este entorno,
    // se requiere una Service Account Key.
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId
      });
      console.log(`🚀 Firebase Admin inicializado con Service Account Key para el proyecto: ${projectId}`);
    } else {
      console.warn("⚠️ ADVERTENCIA: No se encontró FIREBASE_SERVICE_ACCOUNT_KEY en las variables de entorno.");
      console.warn("⚠️ Firebase Admin intentará usar las credenciales por defecto (ADC), lo cual causará errores de PERMISSION_DENIED al acceder a un proyecto externo como contabot-e7b15.");
      
      admin.initializeApp({ projectId });
      console.log(`🚀 Firebase Admin inicializado (sin Service Account) con Project ID: ${projectId}`);
    }
  } catch (e) {
    console.error("❌ Error inicializando Firebase Admin:", e);
  }
}
const firestore = admin.firestore();

function calculateDailyInterest() {
  console.log("Calculando intereses diarios...");
  const today = new Date().toISOString().split('T')[0];
  
  const users = db.prepare("SELECT id, settings FROM users").all();
  
  const insertEvent = db.prepare(`
    INSERT INTO events (id, user_id, amount, description, category, kind, occurred_at, account_name, currency, timezone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const checkDuplicate = db.prepare(`
    SELECT id FROM events 
    WHERE user_id = ? AND account_name = ? AND category = 'Interés' AND date(occurred_at) = ?
  `);

  for (const user of users as any[]) {
    if (!user.settings) continue;
    try {
      const settings = JSON.parse(user.settings);
      const accounts = settings.accounts || [];
      
      for (const account of accounts) {
        if ((account.type === 'savings' || account.type === 'Inversión') && account.interest_rate) {
          const rate = parseFloat(account.interest_rate);
          if (isNaN(rate) || rate <= 0) continue;

          const duplicate = checkDuplicate.get(user.id, account.name, today);
          if (duplicate) continue;

          const balanceRow = db.prepare(`
            SELECT 
              SUM(CASE WHEN kind = 'income' THEN amount ELSE 0 END) -
              SUM(CASE WHEN kind = 'expense' THEN amount ELSE 0 END) +
              SUM(CASE WHEN kind = 'debt_increase' THEN amount ELSE 0 END) -
              SUM(CASE WHEN kind = 'debt_payment' THEN amount ELSE 0 END) as balance
            FROM events
            WHERE user_id = ? AND account_name = ?
          `).get(user.id, account.name) as any;

          const balance = balanceRow?.balance || 0;
          if (balance <= 0) continue;

          const dailyInterest = balance * (rate / 365 / 100);
          
          if (dailyInterest > 0) {
            const eventId = "int_" + Date.now() + "_" + Math.random().toString(36).substring(7);
            insertEvent.run(
              eventId,
              user.id,
              dailyInterest.toFixed(2),
              "Interés generado automáticamente",
              "Interés",
              "income",
              new Date().toISOString(),
              account.name,
              "MXN",
              "UTC"
            );
            console.log(`Interés generado para ${user.id} en ${account.name}: ${dailyInterest}`);
          }
        }
      }
    } catch (e) {
      console.error("Error calculando interés para usuario", user.id, e);
    }
  }
}

// ============================================================
// CARGAR SECRETOS DESDE SECRET MANAGER (SOLUCIÓN PERMANENTE)
// ============================================================
async function loadSecretsFromGCP() {
  const secrets = [
    "GEMINI_API_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "PRICE_ID_MENSUAL",
    "PRICE_ID_ANUAL"
  ];

  const projectId = "718801037087";
  let access_token = "";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const tokenRes = await fetch(
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
      { 
        headers: { "Metadata-Flavor": "Google" },
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);
    
    if (tokenRes.ok) {
      const data = await tokenRes.json() as { access_token: string };
      access_token = data.access_token;
    }
  } catch (e) {
    console.warn("⚠️ No se pudo obtener token de GCP (posible entorno local o timeout)");
  }

  for (const secretName of secrets) {
    if (process.env[secretName] && process.env[secretName]!.length > 5) {
      console.log(`✅ ${secretName} disponible en entorno`);
      continue;
    }

    if (!access_token) continue;

    try {
      const secretRes = await fetch(
        `https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets/${secretName}/versions/latest:access`,
        { headers: { Authorization: `Bearer ${access_token}` } }
      );
      if (secretRes.ok) {
        const { payload } = await secretRes.json() as { payload: { data: string } };
        const value = Buffer.from(payload.data, "base64").toString("utf-8").trim();
        if (value) {
          process.env[secretName] = value;
          const maskedValue = value.length > 8 ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : "****";
          console.log(`✅ ${secretName} cargada desde Secret Manager: ${maskedValue}`);
        }
      }
    } catch (e: any) {
      console.warn(`⚠️ Error cargando ${secretName}:`, e.message);
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("finance.db");

let stripe: Stripe;

function getStripe() {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY || '';
    if (!key) console.warn("⚠️ STRIPE_SECRET_KEY no configurada");
    stripe = new Stripe(key, {
      apiVersion: '2024-06-20' as any,
    });
  }
  return stripe;
}

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    settings TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    kind TEXT NOT NULL,
    amount REAL,
    currency TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    timezone TEXT NOT NULL,
    description TEXT,
    category TEXT,
    payment_method TEXT,
    merchant_name TEXT,
    account_name TEXT,
    raw_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    emoji TEXT,
    color TEXT,
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0,
    deadline TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    account_name TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    firebase_uid TEXT PRIMARY KEY,
    is_premium INTEGER DEFAULT 0,
    stripe_customer_id TEXT,
    subscription_id TEXT,
    premium_until TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Ensure all columns exist in events table
const tableInfo = db.prepare("PRAGMA table_info(events)").all() as any[];
const columns = tableInfo.map(c => c.name);

if (!columns.includes('user_id')) {
  db.exec("ALTER TABLE events ADD COLUMN user_id TEXT");
}
if (!columns.includes('account_name')) {
  db.exec("ALTER TABLE events ADD COLUMN account_name TEXT");
}
if (!columns.includes('merchant_name')) {
  db.exec("ALTER TABLE events ADD COLUMN merchant_name TEXT");
}

// Migration for goals table
const goalsTableInfo = db.prepare("PRAGMA table_info(goals)").all() as any[];
const goalsColumns = goalsTableInfo.map(c => c.name);
if (goalsColumns.length > 0 && !goalsColumns.includes('completed_at')) {
  db.exec("ALTER TABLE goals ADD COLUMN completed_at DATETIME");
}
if (goalsColumns.length > 0 && !goalsColumns.includes('account_name')) {
  db.exec("ALTER TABLE goals ADD COLUMN account_name TEXT");
}

// Migration for users table
const userTableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
const userColumns = userTableInfo.map(c => c.name);
if (!userColumns.includes('settings')) {
  db.exec("ALTER TABLE users ADD COLUMN settings TEXT");
}

// Simple migration for existing data to fix analytics
try {
  const eventsToMigrate = db.prepare("SELECT id, kind, raw_data FROM events WHERE account_name IS NULL").all() as any[];
  for (const event of eventsToMigrate) {
    const raw = JSON.parse(event.raw_data || '{}');
    let accountName = raw.accounts?.primary_account_ref?.name;
    if (!accountName) {
      if (event.kind === 'income') accountName = raw.accounts?.to_account_ref?.name;
      else if (event.kind === 'expense') accountName = raw.accounts?.from_account_ref?.name;
    }
    if (accountName) {
      db.prepare("UPDATE events SET account_name = ? WHERE id = ?").run(accountName, event.id);
    }
  }
} catch (e) {
  console.error("Migration error:", e);
}

async function startServer() {
  // Cargar secretos de GCP antes de iniciar el servidor
  await loadSecretsFromGCP();

  const app = express();
  const PORT = 3000;

  // ===== STRIPE WEBHOOK (debe ir ANTES de express.json) =====
  // IMPORTANTE: Este endpoint necesita el body raw, agrégalo ANTES 
  // del app.use(express.json()) existente
  app.post('/api/stripe/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const sig = req.headers['stripe-signature'] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      let event: Stripe.Event;

      console.log("🔔 Webhook de Stripe recibido");

      try {
        if (webhookSecret) {
          event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
          console.log("✅ Firma de webhook verificada");
        } else {
          console.warn("⚠️ Sin STRIPE_WEBHOOK_SECRET, procesando sin verificar firma");
          event = JSON.parse(req.body.toString()) as Stripe.Event;
        }
      } catch (err: any) {
        console.error('❌ Error en firma de webhook:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      console.log(`📦 Evento recibido: ${event.type}`);

      try {
        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            const firebaseUid = session.client_reference_id;
            const subscriptionId = session.subscription as string;

            console.log("💳 Checkout completado:", { firebaseUid, subscriptionId });

            if (firebaseUid && subscriptionId) {
              const subscription = await getStripe().subscriptions.retrieve(subscriptionId) as any;
              const premiumUntil = new Date(
                subscription.current_period_end * 1000
              ).toISOString();

              // Update SQLite (for local cache/interest calculation)
              const result = db.prepare(`
                INSERT INTO subscriptions 
                  (firebase_uid, is_premium, stripe_customer_id, subscription_id, premium_until, updated_at)
                VALUES (?, 1, ?, ?, ?, datetime('now'))
                ON CONFLICT(firebase_uid) DO UPDATE SET
                  is_premium = 1,
                  stripe_customer_id = excluded.stripe_customer_id,
                  subscription_id = excluded.subscription_id,
                  premium_until = excluded.premium_until,
                  updated_at = datetime('now')
              `).run(firebaseUid, session.customer as string, subscriptionId, premiumUntil);

              // Update Firestore (PERMANENT STORAGE)
              try {
                await firestore.collection('subscriptions').doc(firebaseUid).set({
                  isPremium: true,
                  stripeCustomerId: session.customer as string,
                  subscriptionId: subscriptionId,
                  premiumUntil: premiumUntil,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                console.log(`🔥 Firestore: Usuario ${firebaseUid} actualizado a Premium.`);
              } catch (fsError) {
                console.error("❌ Error actualizando Firestore:", fsError);
              }

              console.log(`✅ Usuario ${firebaseUid} actualizado a Premium. Cambios en DB: ${result.changes}`);
            } else {
              console.warn("⚠️ Checkout completado pero falta firebaseUid o subscriptionId", { firebaseUid, subscriptionId });
            }
            break;
          }

          case 'customer.subscription.deleted': {
            const subscription = event.data.object as Stripe.Subscription;
            db.prepare(`
              UPDATE subscriptions 
              SET is_premium = 0, subscription_id = NULL, premium_until = NULL, updated_at = datetime('now')
              WHERE subscription_id = ?
            `).run(subscription.id);

            // Update Firestore
            try {
              const subSnap = await firestore.collection('subscriptions')
                .where('subscriptionId', '==', subscription.id)
                .limit(1)
                .get();
              
              if (!subSnap.empty) {
                await subSnap.docs[0].ref.update({
                  isPremium: false,
                  subscriptionId: null,
                  premiumUntil: null,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
              }
            } catch (fsError) {
              console.error("❌ Error actualizando Firestore (delete):", fsError);
            }

            console.log(`❌ Subscription ${subscription.id} cancelled — Premium deactivated`);
            break;
          }

          case 'invoice.payment_failed': {
            const invoice = event.data.object as any;
            const subId = invoice.subscription as string;
            db.prepare(`
              UPDATE subscriptions 
              SET is_premium = 0, updated_at = datetime('now')
              WHERE subscription_id = ?
            `).run(subId);

            // Update Firestore
            try {
              const subSnap = await firestore.collection('subscriptions')
                .where('subscriptionId', '==', subId)
                .limit(1)
                .get();
              
              if (!subSnap.empty) {
                await subSnap.docs[0].ref.update({
                  isPremium: false,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
              }
            } catch (fsError) {
              console.error("❌ Error actualizando Firestore (failed):", fsError);
            }

            console.log(`⚠️ Payment failed for subscription ${subId} — Premium paused`);
            break;
          }
        }
      } catch (err) {
        console.error('Error processing webhook event:', err);
      }

      res.json({ received: true });
    }
  );

  app.use(express.json({ limit: '50mb' }));

  // Auth Routes (Mock for now, but functional)
  app.post("/api/auth/register", (req, res) => {
    const { username, password } = req.body;
    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    try {
      db.prepare("INSERT INTO users (id, username, password) VALUES (?, ?, ?)").run(id, username, password);
      res.json({ id, username });
    } catch (e) {
      res.status(400).json({ error: "User already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    if (user) {
      res.json({ id: user.id, username: user.username, settings: JSON.parse(user.settings || '{}') });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/user/settings", (req, res) => {
    const { userId, settings } = req.body;
    
    // First check if user exists
    const existingUser = db.prepare("SELECT settings FROM users WHERE id = ?").get(userId) as any;
    
    let mergedSettings = settings;
    if (existingUser && existingUser.settings) {
      try {
        const currentSettings = JSON.parse(existingUser.settings);
        mergedSettings = { ...currentSettings, ...settings };
      } catch (e) {
        // Ignore parse error
      }
    }
    
    db.prepare(`
      INSERT INTO users (id, username, password, settings) 
      VALUES (?, ?, ?, ?) 
      ON CONFLICT(id) DO UPDATE SET settings = ?
    `).run(userId, userId, '', JSON.stringify(mergedSettings), JSON.stringify(mergedSettings));
    res.json({ success: true });
  });

  app.post("/api/user/profile", (req, res) => {
    const { userId, username, email, phone, avatar, password } = req.body;
    
    try {
      if (password) {
        db.prepare("UPDATE users SET username = ?, password = ?, settings = json_set(COALESCE(settings, '{}'), '$.email', ?, '$.phone', ?, '$.avatar', ?) WHERE id = ?")
          .run(username, password, email, phone, avatar, userId);
      } else {
        db.prepare("UPDATE users SET username = ?, settings = json_set(COALESCE(settings, '{}'), '$.email', ?, '$.phone', ?, '$.avatar', ?) WHERE id = ?")
          .run(username, email, phone, avatar, userId);
      }
      
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
      res.json({ 
        id: user.id, 
        username: user.username, 
        settings: JSON.parse(user.settings || '{}') 
      });
    } catch (e) {
      res.status(400).json({ error: "Error al actualizar perfil" });
    }
  });

  // OAuth Routes
  app.get('/api/auth/:provider/url', (req, res) => {
    const { provider } = req.params;
    const appUrl = process.env.APP_URL || `http://localhost:3000`;
    const redirectUri = `${appUrl}/auth/callback`;
    
    let authUrl = '';
    if (provider === 'google') {
      const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || 'PENDING_CONFIG',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent'
      });
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    } else if (provider === 'apple') {
      const params = new URLSearchParams({
        client_id: process.env.APPLE_CLIENT_ID || 'PENDING_CONFIG',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'name email',
        response_mode: 'form_post'
      });
      authUrl = `https://appleid.apple.com/auth/authorize?${params}`;
    }

    res.json({ url: authUrl });
  });

  app.all('/auth/callback', async (req, res) => {
    // This is a simplified mock of the callback handler
    // In a real app, you'd exchange the code for tokens here
    const code = req.query.code || req.body?.code;
    
    // For demo purposes, we'll just create/login a mock user
    // In production, you'd verify the ID token from Google/Apple
    const mockId = `oauth_${Math.random().toString(36).substring(2, 9)}`;
    const mockUsername = `User_${Math.random().toString(36).substring(2, 5)}`;
    
    try {
      // Check if user exists or create new one
      db.prepare("INSERT OR IGNORE INTO users (id, username, password) VALUES (?, ?, ?)").run(mockId, mockUsername, 'oauth_managed');
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(mockId) as any;
      
      const userData = { id: user.id, username: user.username, settings: JSON.parse(user.settings || '{}') };

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  user: ${JSON.stringify(userData)} 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Autenticación exitosa. Esta ventana se cerrará automáticamente.</p>
          </body>
        </html>
      `);
    } catch (e) {
      res.status(500).send("Error en la autenticación");
    }
  });

  app.get("/api/config", (req, res) => {
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOG_API_KEY;
    console.log("Config request. Keys found:", {
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      API_KEY: !!process.env.API_KEY,
      VITE_GEMINI_API_KEY: !!process.env.VITE_GEMINI_API_KEY,
      GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
      GOOG_API_KEY: !!process.env.GOOG_API_KEY
    });
    res.json({
      geminiApiKey: key || null,
      status: key ? "found" : "not_found",
      source: process.env.GEMINI_API_KEY ? "GEMINI_API_KEY" : (process.env.API_KEY ? "API_KEY" : (process.env.VITE_GEMINI_API_KEY ? "VITE_GEMINI_API_KEY" : "none"))
    });
  });

  // Debug endpoint to check env vars (safely)
  app.get("/api/debug/env", (req, res) => {
    const safeEnv = Object.keys(process.env).reduce((acc, key) => {
      if (key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN')) {
        acc[key] = process.env[key] ? `[REDACTED: ${process.env[key]?.substring(0, 5)}...]` : 'undefined';
      } else {
        acc[key] = process.env[key];
      }
      return acc;
    }, {} as any);
    res.json(safeEnv);
  });

  // API Routes
  app.post("/api/events/sync", express.json({ limit: '50mb' }), (req, res) => {
    const { events } = req.body;
    if (!Array.isArray(events)) {
      return res.status(400).json({ error: "Invalid events array" });
    }

    const insertEvent = db.prepare(`
      INSERT INTO events (id, user_id, kind, amount, currency, occurred_at, timezone, description, category, payment_method, merchant_name, account_name, raw_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        user_id = excluded.user_id,
        kind = excluded.kind,
        amount = excluded.amount,
        currency = excluded.currency,
        occurred_at = excluded.occurred_at,
        timezone = excluded.timezone,
        description = excluded.description,
        category = excluded.category,
        payment_method = excluded.payment_method,
        merchant_name = excluded.merchant_name,
        account_name = excluded.account_name,
        raw_data = excluded.raw_data
    `);

    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (id, username, password) VALUES (?, ?, ?)
    `);

    try {
      db.transaction(() => {
        for (const ev of events) {
          if (ev.user_id) {
            insertUser.run(ev.user_id, ev.user_id, '');
          }
          insertEvent.run(
            ev.id,
            ev.user_id,
            ev.kind,
            ev.amount,
            ev.currency || 'MXN',
            ev.occurred_at || new Date().toISOString(),
            ev.timezone || 'UTC',
            ev.description,
            ev.category,
            ev.payment_method,
            ev.merchant_name,
            ev.account_name,
            JSON.stringify(ev)
          );
        }
      })();
      res.json({ success: true, count: events.length });
    } catch (err) {
      console.error("Error syncing events:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/events/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM events WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting event:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/events", (req, res) => {
    const userId = (req.query.userId as string) || null;
    const startDate = (req.query.startDate as string) || '1970-01-01';
    const endDate = (req.query.endDate as string) || '9999-12-31';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10000;
    try {
      const events = db.prepare("SELECT * FROM events WHERE (user_id = ? OR user_id IS NULL) AND occurred_at BETWEEN ? AND ? ORDER BY occurred_at DESC LIMIT ?").all(userId, startDate, endDate, limit);
      res.json(events.map(e => ({
        ...e,
        raw_data: e.raw_data ? JSON.parse(e.raw_data as string) : {}
      })));
    } catch (err) {
      console.error("Error fetching events:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const capitalize = (s: any) => {
    if (typeof s !== 'string' || s.length === 0) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  app.post("/api/events", (req, res) => {
    const data = req.body;
    const userIdRaw = req.query.userId as string;
    let userId = (userIdRaw && userIdRaw !== '' && userIdRaw !== 'null' && userIdRaw !== 'undefined') ? userIdRaw : null;

    // Verify user exists to avoid FOREIGN KEY constraint failed
    if (userId) {
      db.prepare("INSERT OR IGNORE INTO users (id, username, password) VALUES (?, ?, ?)").run(userId, userId, '');
    }

    try {
      if (data.isUpdate && data.target?.event_id) {
        // Handle Update
        const existing = db.prepare("SELECT * FROM events WHERE id = ?").get(data.target.event_id) as any;
        if (!existing) {
          return res.status(404).json({ error: "Movimiento no encontrado para actualizar" });
        }

        const eventData = JSON.parse(existing.raw_data || '{}');
        
        // Apply patches
        if (Array.isArray(data.patch)) {
          data.patch.forEach((p: any) => {
            const keys = p.path.split('.');
            let current = eventData;
            for (let i = 0; i < keys.length - 1; i++) {
              if (!current[keys[i]]) current[keys[i]] = {};
              current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = p.new_value;
          });
        }

        // Determine the best account name for analytics
        let accountName = eventData.accounts?.primary_account_ref?.name;
        if (!accountName) {
          if (eventData.kind === 'income') accountName = eventData.accounts?.to_account_ref?.name;
          else if (eventData.kind === 'expense') accountName = eventData.accounts?.from_account_ref?.name;
        }

        // Update the record
        const stmt = db.prepare(`
          UPDATE events SET 
            kind = ?, amount = ?, currency = ?, occurred_at = ?, timezone = ?, 
            description = ?, category = ?, payment_method = ?, merchant_name = ?, 
            account_name = ?, raw_data = ?
          WHERE id = ?
        `);

        stmt.run(
          eventData.kind || 'expense',
          eventData.amount || 0,
          eventData.currency || 'MXN',
          eventData.occurred_at || new Date().toISOString(),
          eventData.timezone || 'UTC',
          eventData.description || null,
          capitalize(eventData.category || 'Otros'),
          eventData.payment_method || null,
          eventData.merchant?.name || null,
          accountName || null,
          JSON.stringify(eventData),
          data.target.event_id
        );

        return res.json({ success: true });
      }

      // Handle Create
      const event = data;
      // Always generate a new ID for creation to avoid accidental overwrites from Gemini generic IDs
      const eventId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      
      // Determine the best account name for analytics
      let accountName = null;
      const primaryRef = event.accounts?.primary_account_ref;
      
      if (primaryRef) {
        accountName = typeof primaryRef === 'string' ? primaryRef : primaryRef.name;
      }
      
      if (!accountName) {
        const fromRef = event.accounts?.from_account_ref;
        const toRef = event.accounts?.to_account_ref;
        
        if (event.kind === 'income' && toRef) {
          accountName = typeof toRef === 'string' ? toRef : toRef.name;
        } else if (event.kind === 'expense' && fromRef) {
          accountName = typeof fromRef === 'string' ? fromRef : fromRef.name;
        }
      }

      const stmt = db.prepare(`
        INSERT OR REPLACE INTO events (id, user_id, kind, amount, currency, occurred_at, timezone, description, category, payment_method, merchant_name, account_name, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const description = event.description || event.merchant?.name || 'Movimiento';
      
      stmt.run(
        eventId,
        userId || null,
        event.kind || 'expense',
        event.amount || 0,
        event.currency || 'MXN',
        event.occurred_at || new Date().toISOString(),
        event.timezone || 'UTC',
        description,
        capitalize(event.category || 'Otros'),
        event.payment_method || null,
        event.merchant?.name || null,
        accountName || 'Efectivo',
        JSON.stringify(event)
      );
      res.status(201).json({ success: true });
    } catch (error: any) {
      console.error("Error processing event:", error);
      res.status(500).json({ error: `Error al procesar el movimiento: ${error.message}` });
    }
  });

  app.put("/api/events/:id", (req, res) => {
    const { id } = req.params;
    const data = req.body;
    const userId = (req.query.userId as string) || null;

    try {
      const existing = db.prepare("SELECT * FROM events WHERE id = ?").get(id) as any;
      if (!existing) {
        return res.status(404).json({ error: "Movimiento no encontrado" });
      }

      // Merge data
      const eventData = JSON.parse(existing.raw_data || '{}');
      const updatedEvent = { ...eventData, ...data };
      
      // Ensure occurred_at is in ISO format if it's just a date
      if (updatedEvent.occurred_at && !updatedEvent.occurred_at.includes('T')) {
        updatedEvent.occurred_at = new Date(updatedEvent.occurred_at).toISOString();
      }

      const stmt = db.prepare(`
        UPDATE events SET 
          kind = ?, amount = ?, currency = ?, occurred_at = ?, timezone = ?, 
          description = ?, category = ?, payment_method = ?, merchant_name = ?, 
          account_name = ?, raw_data = ?
        WHERE id = ?
      `);

      stmt.run(
        updatedEvent.kind || 'expense',
        updatedEvent.amount || 0,
        updatedEvent.currency || 'MXN',
        updatedEvent.occurred_at || new Date().toISOString(),
        updatedEvent.timezone || 'UTC',
        updatedEvent.description || updatedEvent.merchant?.name || 'Movimiento',
        capitalize(updatedEvent.category || 'Otros'),
        updatedEvent.payment_method || null,
        updatedEvent.merchant?.name || null,
        updatedEvent.account_name || 'Efectivo',
        JSON.stringify(updatedEvent),
        id
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating event:", error);
      res.status(500).json({ error: `Error al actualizar el movimiento: ${error.message}` });
    }
  });

  app.delete("/api/events/:id", (req, res) => {
    const { id } = req.params;
    const userId = (req.query.userId as string) || null;

    try {
      const stmt = db.prepare("DELETE FROM events WHERE id = ? AND (user_id = ? OR user_id IS NULL)");
      const result = stmt.run(id, userId);
      
      if (result.changes === 0) {
        return res.status(404).json({ error: "Movimiento no encontrado o no autorizado" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting event:", error);
      res.status(500).json({ error: `Error al eliminar el movimiento: ${error.message}` });
    }
  });

  app.get("/api/analytics", (req, res) => {
    const userId = (req.query.userId as string) || null;
    const startDate = (req.query.startDate as string) || '1970-01-01';
    const endDate = (req.query.endDate as string) || '9999-12-31';
    try {
      const incomeByAccount = db.prepare(`
        SELECT account_name as name, SUM(amount) as value 
        FROM events 
        WHERE (user_id = ? OR user_id IS NULL) 
          AND kind IN ('income', 'refund', 'loan_repayment_received') 
          AND account_name IS NOT NULL
          AND occurred_at BETWEEN ? AND ?
        GROUP BY account_name
      `).all(userId, startDate, endDate);

      const expensesByCategory = db.prepare(`
        SELECT category as name, SUM(amount) as value 
        FROM events 
        WHERE (user_id = ? OR user_id IS NULL) 
          AND kind IN ('expense', 'debt_increase', 'debt_payment', 'loss', 'loan_given') 
          AND category IS NOT NULL
          AND occurred_at BETWEEN ? AND ?
        GROUP BY category
      `).all(userId, startDate, endDate);

      const debtsByCounterparty = db.prepare(`
        SELECT 
          CASE 
            WHEN kind = 'debt_increase' AND account_name NOT IN ('Efectivo', 'Cash', 'cash', 'efectivo') THEN account_name
            ELSE COALESCE(merchant_name, description) 
          END as name, 
          SUM(CASE WHEN kind = 'debt_increase' THEN amount ELSE -amount END) as value 
        FROM events 
        WHERE (user_id = ? OR user_id IS NULL) 
          AND kind IN ('debt_increase', 'debt_payment')
          AND occurred_at BETWEEN ? AND ?
        GROUP BY name
        HAVING value > 0
      `).all(userId, startDate, endDate);

      const loansByDebtor = db.prepare(`
        SELECT 
          COALESCE(merchant_name, description) as name, 
          SUM(CASE WHEN kind = 'loan_given' THEN amount ELSE -amount END) as value 
        FROM events 
        WHERE (user_id = ? OR user_id IS NULL) 
          AND kind IN ('loan_given', 'loan_repayment_received')
          AND occurred_at BETWEEN ? AND ?
        GROUP BY name
        HAVING value > 0
      `).all(userId, startDate, endDate);

      res.json({ incomeByAccount, expensesByCategory, debtsByCounterparty, loansByDebtor });
    } catch (err) {
      console.error("Error fetching analytics:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/summary", (req, res) => {
    const userId = (req.query.userId as string) || null;
    const startDate = (req.query.startDate as string) || '1970-01-01';
    const endDate = (req.query.endDate as string) || '9999-12-31';
    try {
      const summary = {
        balance: db.prepare("SELECT SUM(amount) as total FROM events WHERE (user_id = ? OR user_id IS NULL) AND kind IN ('income', 'refund', 'loan_repayment_received') AND occurred_at BETWEEN ? AND ?").get(userId, startDate, endDate) as any,
        expenses: db.prepare("SELECT SUM(amount) as total FROM events WHERE (user_id = ? OR user_id IS NULL) AND kind IN ('expense', 'debt_increase', 'debt_payment', 'loss', 'loan_given') AND occurred_at BETWEEN ? AND ?").get(userId, startDate, endDate) as any,
        debts: db.prepare("SELECT SUM(CASE WHEN kind = 'debt_increase' THEN amount ELSE -amount END) as total FROM events WHERE (user_id = ? OR user_id IS NULL) AND kind IN ('debt_increase', 'debt_payment') AND occurred_at BETWEEN ? AND ?").get(userId, startDate, endDate) as any,
        loans: db.prepare("SELECT SUM(CASE WHEN kind = 'loan_given' THEN amount ELSE -amount END) as total FROM events WHERE (user_id = ? OR user_id IS NULL) AND kind IN ('loan_given', 'loan_repayment_received') AND occurred_at BETWEEN ? AND ?").get(userId, startDate, endDate) as any,
      };
      res.json(summary);
    } catch (err) {
      console.error("Error fetching summary:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Goals API
  app.get("/api/goals", (req, res) => {
    const userId = (req.query.userId as string) || null;
    try {
      const goals = db.prepare("SELECT * FROM goals WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC").all(userId) as any[];
      
      // Calculate current_amount dynamically based on account_name
      const enhancedGoals = goals.map(goal => {
        if (goal.account_name) {
          // Calculate balance for this account
          const balanceRow = db.prepare(`
            SELECT SUM(CASE WHEN kind IN ('income', 'refund', 'loan_repayment_received') THEN amount ELSE -amount END) as balance
            FROM events
            WHERE (user_id = ? OR user_id IS NULL) AND account_name = ? AND kind IN ('income', 'refund', 'loan_repayment_received', 'expense', 'loss', 'loan_given', 'debt_payment')
          `).get(userId, goal.account_name) as any;
          
          goal.current_amount = balanceRow?.balance || 0;
          
          // Check if goal is completed
          if (goal.current_amount >= goal.target_amount && !goal.completed_at) {
            goal.completed_at = new Date().toISOString();
            db.prepare("UPDATE goals SET completed_at = ? WHERE id = ?").run(goal.completed_at, goal.id);
          } else if (goal.current_amount < goal.target_amount && goal.completed_at) {
            goal.completed_at = null;
            db.prepare("UPDATE goals SET completed_at = NULL WHERE id = ?").run(goal.id);
          }
        }
        return goal;
      });
      
      res.json(enhancedGoals);
    } catch (err) {
      console.error("Error fetching goals:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/goals", (req, res) => {
    const { userId, name, emoji, color, target_amount, current_amount, deadline, account_name } = req.body;
    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    
    try {
      if (userId) {
        db.prepare("INSERT OR IGNORE INTO users (id, username, password) VALUES (?, ?, ?)").run(userId, userId, '');
      }
      db.prepare(`
        INSERT INTO goals (id, user_id, name, emoji, color, target_amount, current_amount, deadline, account_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, userId || null, name, emoji, color, target_amount, current_amount || 0, deadline, account_name || null);
      
      const goal = db.prepare("SELECT * FROM goals WHERE id = ?").get(id);
      res.status(201).json(goal);
    } catch (err) {
      console.error("Error creating goal:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/goals/:id", (req, res) => {
    const { id } = req.params;
    const { current_amount, name, emoji, color, target_amount, deadline, completed_at, account_name } = req.body;
    
    try {
      const existing = db.prepare("SELECT * FROM goals WHERE id = ?").get(id) as any;
      if (!existing) return res.status(404).json({ error: "Goal not found" });

      const stmt = db.prepare(`
        UPDATE goals SET 
          current_amount = COALESCE(?, current_amount),
          name = COALESCE(?, name),
          emoji = COALESCE(?, emoji),
          color = COALESCE(?, color),
          target_amount = COALESCE(?, target_amount),
          deadline = COALESCE(?, deadline),
          completed_at = COALESCE(?, completed_at),
          account_name = COALESCE(?, account_name)
        WHERE id = ?
      `);
      
      stmt.run(current_amount, name, emoji, color, target_amount, deadline, completed_at, account_name, id);
      const updated = db.prepare("SELECT * FROM goals WHERE id = ?").get(id);
      res.json(updated);
    } catch (err) {
      console.error("Error updating goal:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/goals/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM goals WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting goal:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ===== CREAR SESIÓN DE PAGO =====
  app.post('/api/stripe/create-checkout-session', async (req, res) => {
    let { priceId, planType, userId } = req.body;
    
    // Si viene planType, determinamos el priceId desde el servidor
    if (planType === 'mensual') {
      priceId = process.env.PRICE_ID_MENSUAL;
    } else if (planType === 'anual') {
      priceId = process.env.PRICE_ID_ANUAL;
    }

    // Mejorar el log para depuración
    console.log("🔍 Intento de checkout:", { 
      planType,
      resolvedPriceId: priceId ? `${priceId.substring(0, 6)}...` : 'FALTA',
      userId,
      envMensual: process.env.PRICE_ID_MENSUAL ? 'Configurado' : 'FALTA',
      envAnual: process.env.PRICE_ID_ANUAL ? 'Configurado' : 'FALTA'
    });

    if (!priceId || !userId) {
      const missing = !priceId ? (planType === 'anual' ? 'PRICE_ID_ANUAL' : 'PRICE_ID_MENSUAL') : 'userId';
      console.error(`❌ Error: Falta ${missing}`);
      return res.status(400).json({ 
        error: `Configuración incompleta: Falta el secreto '${missing}'. Por favor, agrégalo en la configuración de la app.` 
      });
    }

    try {
      const stripeInstance = getStripe();
      
      // Verificar que el priceId existe en Stripe antes de intentar crear la sesión
      try {
        await stripeInstance.prices.retrieve(priceId);
      } catch (e: any) {
        console.error(`❌ El Price ID '${priceId}' no es válido en Stripe:`, e.message);
        return res.status(400).json({ error: `El ID de precio '${priceId}' no existe en tu cuenta de Stripe. Verifica el ID en tu Dashboard de Stripe.` });
      }

      const existing = db.prepare(
        'SELECT stripe_customer_id FROM subscriptions WHERE firebase_uid = ?'
      ).get(userId) as any;

      let customerId = existing?.stripe_customer_id;

      if (!customerId) {
        const customer = await stripeInstance.customers.create({
          metadata: { firebaseUid: userId },
        });
        customerId = customer.id;
      }

      // Obtener la URL base dinámicamente
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers['host'];
      const baseUrl = `${protocol}://${host}`;
      const appUrl = process.env.APP_URL || baseUrl;

      console.log("🚀 Creando sesión de Stripe con:", {
        customerId,
        priceId,
        appUrl
      });

      const session = await stripeInstance.checkout.sessions.create({
        customer: customerId,
        client_reference_id: userId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${appUrl}/?premium=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/`,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error('❌ Error creating checkout session:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ===== CONSULTAR SUSCRIPCIÓN =====
  app.get('/api/user/subscription/:userId', async (req, res) => {
    const { userId } = req.params;
    console.log(`🔍 Consultando suscripción para UID: ${userId}`);
    try {
      // 1. Intentar obtener de SQLite (caché rápida)
      let sub = db.prepare(
        'SELECT * FROM subscriptions WHERE firebase_uid = ?'
      ).get(userId) as any;

      // 2. Si no está en SQLite o es una nueva instancia (Cloud Run), consultar Firestore
      if (!sub) {
        console.log(`ℹ️ No en SQLite, consultando Firestore para ${userId}...`);
        try {
          const fsDoc = await firestore.collection('subscriptions').doc(userId).get();
          
          if (fsDoc.exists) {
            const fsData = fsDoc.data();
            console.log(`✅ Suscripción recuperada de Firestore para ${userId}`);
            
            // Sincronizar de vuelta a SQLite para futuras consultas rápidas
            db.prepare(`
              INSERT INTO subscriptions 
                (firebase_uid, is_premium, stripe_customer_id, subscription_id, premium_until, updated_at)
              VALUES (?, ?, ?, ?, ?, datetime('now'))
              ON CONFLICT(firebase_uid) DO UPDATE SET
                is_premium = excluded.is_premium,
                stripe_customer_id = excluded.stripe_customer_id,
                subscription_id = excluded.subscription_id,
                premium_until = excluded.premium_until,
                updated_at = datetime('now')
            `).run(
              userId, 
              fsData?.isPremium ? 1 : 0, 
              fsData?.stripeCustomerId || null, 
              fsData?.subscriptionId || null, 
              fsData?.premiumUntil || null
            );

            return res.json({
              isPremium: fsData?.isPremium || false,
              subscriptionId: fsData?.subscriptionId || null,
              premiumUntil: fsData?.premiumUntil || null,
              stripeCustomerId: fsData?.stripeCustomerId || null,
            });
          }
        } catch (fsError: any) {
          console.error(`⚠️ Error al consultar Firestore para ${userId}:`, fsError.message);
          console.warn("⚠️ Si el error es PERMISSION_DENIED, asegúrate de haber configurado FIREBASE_SERVICE_ACCOUNT_KEY en las variables de entorno.");
          // Continuar con sub = null para devolver el estado por defecto
        }
      }

      // 3. Fallback a Stripe si no se encontró en SQLite ni en Firestore
      if (!sub) {
        console.log(`ℹ️ No en Firestore, consultando Stripe como último recurso para ${userId}...`);
        try {
          const stripeInstance = getStripe();
          // Buscar cliente por metadata
          const customers = await stripeInstance.customers.search({
            query: `metadata['firebaseUid']:'${userId}'`,
            limit: 1
          });
          
          if (customers.data.length > 0) {
            const customer = customers.data[0];
            // Buscar suscripciones activas del cliente
            const subscriptions = await stripeInstance.subscriptions.list({
              customer: customer.id,
              status: 'active',
              limit: 1
            });
            
            if (subscriptions.data.length > 0) {
              const activeSub = subscriptions.data[0] as any;
              const premiumUntil = new Date(activeSub.current_period_end * 1000).toISOString();
              
              console.log(`✅ Suscripción recuperada de Stripe para ${userId}`);
              
              // Guardar en SQLite para futuras consultas
              db.prepare(`
                INSERT INTO subscriptions 
                  (firebase_uid, is_premium, stripe_customer_id, subscription_id, premium_until, updated_at)
                VALUES (?, 1, ?, ?, ?, datetime('now'))
                ON CONFLICT(firebase_uid) DO UPDATE SET
                  is_premium = 1,
                  stripe_customer_id = excluded.stripe_customer_id,
                  subscription_id = excluded.subscription_id,
                  premium_until = excluded.premium_until,
                  updated_at = datetime('now')
              `).run(userId, customer.id, activeSub.id, premiumUntil);
              
              return res.json({
                isPremium: true,
                subscriptionId: activeSub.id,
                premiumUntil: premiumUntil,
                stripeCustomerId: customer.id,
              });
            }
          }
        } catch (stripeError: any) {
          console.error(`⚠️ Error al consultar Stripe para ${userId}:`, stripeError.message);
        }
      }

      if (!sub) {
        console.log(`ℹ️ Usuario ${userId} no tiene una suscripción activa (esto es normal para usuarios nuevos o gratuitos).`);
        return res.json({
          isPremium: false,
          subscriptionId: null,
          premiumUntil: null,
          stripeCustomerId: null,
        });
      }

      console.log(`✅ Suscripción encontrada para ${userId}:`, { isPremium: sub.is_premium === 1 });
      return res.json({
        isPremium: sub.is_premium === 1,
        subscriptionId: sub.subscription_id || null,
        premiumUntil: sub.premium_until || null,
        stripeCustomerId: sub.stripe_customer_id || null,
      });
    } catch (err) {
      console.error('Error fetching subscription:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ===== VERIFICAR SESIÓN DE STRIPE (Fallback para Webhooks) =====
  app.get('/api/stripe/verify-session/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    
    try {
      const stripeInstance = getStripe();
      const session = await stripeInstance.checkout.sessions.retrieve(sessionId);
      
      console.log("🔍 Verificando sesión manualmente:", { 
        id: session.id, 
        status: session.status, 
        payment_status: session.payment_status,
        firebaseUid: session.client_reference_id
      });

      if (session.status === 'complete' && session.payment_status === 'paid') {
        const firebaseUid = session.client_reference_id;
        const subscriptionId = session.subscription as string;

        if (firebaseUid && subscriptionId) {
          const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId) as any;
          const premiumUntil = new Date(
            subscription.current_period_end * 1000
          ).toISOString();

          db.prepare(`
            INSERT INTO subscriptions 
              (firebase_uid, is_premium, stripe_customer_id, subscription_id, premium_until, updated_at)
            VALUES (?, 1, ?, ?, ?, datetime('now'))
            ON CONFLICT(firebase_uid) DO UPDATE SET
              is_premium = 1,
              stripe_customer_id = excluded.stripe_customer_id,
              subscription_id = excluded.subscription_id,
              premium_until = excluded.premium_until,
              updated_at = datetime('now')
          `).run(firebaseUid, session.customer as string, subscriptionId, premiumUntil);

          console.log(`✅ Verificación manual exitosa para ${firebaseUid}`);
          return res.json({ success: true, isPremium: true });
        }
      }

      res.json({ success: true, isPremium: false, status: session.status });
    } catch (err: any) {
      console.error('❌ Error verificando sesión:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: Serve static files but intercept index.html to inject API key
    app.use(express.static(path.join(__dirname, "dist"), { index: false }));
    
    app.get("*", (req, res) => {
      try {
        const indexPath = path.join(__dirname, "dist", "index.html");
        if (fs.existsSync(indexPath)) {
          let html = fs.readFileSync(indexPath, "utf-8");
          const key = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOG_API_KEY || "";
          
          // Inject key into window object before any other script runs
          const injectionScript = `<script>window._SERVER_GEMINI_API_KEY = ${JSON.stringify(key)}; console.log("API Key injected by server: " + (window._SERVER_GEMINI_API_KEY ? "YES" : "NO"));</script>`;
          html = html.replace("</head>", `${injectionScript}</head>`);
          
          res.send(html);
        } else {
          res.status(404).send("Application not built (dist/index.html missing)");
        }
      } catch (e) {
        console.error("Error serving index.html:", e);
        res.status(500).send("Internal Server Error");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Calculate interest after server starts listening
    setTimeout(() => {
      calculateDailyInterest();
      // Schedule to run every 24 hours (at midnight)
      cron.schedule("0 0 * * *", calculateDailyInterest);
    }, 1000);
  });
}

startServer();