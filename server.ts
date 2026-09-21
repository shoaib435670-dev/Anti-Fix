import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Data directory and Database file
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial Database Structure
interface DatabaseSchema {
  users: Array<{
    id: string;
    username: string;
    email: string;
    password_hash: string;
    salt: string;
    account_created_at: string;
    account_status: 'active' | 'blocked';
    is_admin: boolean;
  }>;
  subscriptions: Array<{
    id: string;
    user_id: string;
    feature_id: string;
    plan_type: 'weekly' | 'monthly' | 'gift' | 'free';
    status: 'active' | 'expired' | 'revoked';
    start_date: string;
    expiry_date: string;
    source: 'payment' | 'admin_gift' | 'system';
  }>;
  features: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    enabled: boolean;
    is_paid: boolean;
    weekly_price: number;
    monthly_price: number;
  }>;
  payments: Array<{
    id: string;
    user_id: string;
    username: string;
    email: string;
    feature_id: string;
    feature_name: string;
    plan_type: 'weekly' | 'monthly';
    amount: number;
    payment_method: 'easypaisa' | 'jazzcash' | 'bank_transfer';
    transaction_id: string;
    screenshot_url: string;
    note?: string;
    status: 'pending' | 'approved' | 'rejected';
    rejection_reason?: string;
    created_at: string;
    reviewed_at?: string;
  }>;
  payment_methods: Array<{
    id: 'easypaisa' | 'jazzcash' | 'bank_transfer';
    name: string;
    enabled: boolean;
    account_number: string;
    account_holder_name: string;
    bank_name?: string;
    iban?: string;
    instructions: string;
  }>;
  files: Array<{
    id: string;
    user_id: string;
    name: string;
    size: number;
    created_at: string;
    modified_at: string;
    file_type: string;
    data_url: string;
    page_count?: number;
  }>;
  notifications: Array<{
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    is_read: boolean;
    created_at: string;
  }>;
  audit_logs: Array<{
    id: string;
    action: string;
    target_user_id?: string;
    target_user_email?: string;
    action_type: string;
    details: string;
    created_at: string;
  }>;
}

const DEFAULT_DB: DatabaseSchema = {
  users: [],
  subscriptions: [],
  features: [
    {
      id: 'image-to-pdf',
      name: 'Image to PDF',
      description: 'Convert JPG, PNG, WEBP images into clean, customized PDFs with orientation and margin settings.',
      icon: 'Images',
      enabled: true,
      is_paid: false,
      weekly_price: 50,
      monthly_price: 150,
    },
    {
      id: 'edit-pdf',
      name: 'Edit PDF',
      description: 'Interactive PDF editing canvas with zoom, annotations, page management, and export.',
      icon: 'FileEdit',
      enabled: true,
      is_paid: true,
      weekly_price: 100,
      monthly_price: 300,
    },
    {
      id: 'rename-pdf',
      name: 'Rename PDF',
      description: 'Quickly standardize, validate, and rename PDF files with automatic extension safety.',
      icon: 'FileText',
      enabled: true,
      is_paid: false,
      weekly_price: 30,
      monthly_price: 90,
    },
    {
      id: 'lock-pdf',
      name: 'Lock PDF',
      description: 'Protect sensitive PDF files with military-grade user & owner password encryption.',
      icon: 'Lock',
      enabled: true,
      is_paid: true,
      weekly_price: 70,
      monthly_price: 200,
    },
    {
      id: 'edit-pdf-text',
      name: 'Edit PDF Text',
      description: 'Detect, select, edit, and format native PDF text or run smart OCR detection on image pages.',
      icon: 'Type',
      enabled: true,
      is_paid: true,
      weekly_price: 150,
      monthly_price: 400,
    },
    {
      id: 'draw-on-pdf',
      name: 'Draw on PDF',
      description: 'Freehand pen, highlighter, shapes, lines, arrows, opacity and stroke controls burned into PDF.',
      icon: 'PenTool',
      enabled: true,
      is_paid: true,
      weekly_price: 80,
      monthly_price: 220,
    },
    {
      id: 'delete-pdf-pages',
      name: 'Delete PDF Pages',
      description: 'Interactive visual page grid. Select and delete single or multiple pages instantly.',
      icon: 'Trash2',
      enabled: true,
      is_paid: false,
      weekly_price: 40,
      monthly_price: 120,
    },
  ],
  payments: [],
  payment_methods: [
    {
      id: 'easypaisa',
      name: 'EasyPaisa',
      enabled: true,
      account_number: '0345-1234567',
      account_holder_name: 'Muzamil Ahmad',
      instructions: 'Send money to our EasyPaisa account via App or USSD *786#. Take a screenshot of the transaction receipt and note the Transaction ID.',
    },
    {
      id: 'jazzcash',
      name: 'JazzCash',
      enabled: true,
      account_number: '0300-7654321',
      account_holder_name: 'Muzamil Ahmad',
      instructions: 'Transfer payment via JazzCash App or *786#. Ensure you attach the payment screenshot and copy the 12-digit TID.',
    },
    {
      id: 'bank_transfer',
      name: 'Bank Transfer / Raast',
      enabled: true,
      bank_name: 'Meezan Bank Limited',
      account_number: '0101-0102030405',
      account_holder_name: 'Muzamil Ahmad',
      iban: 'PK36MEZN0001010102030405',
      instructions: 'Transfer through Internet Banking or Raast Instant Pay. Upload the digital transfer receipt screenshot below.',
    },
  ],
  files: [],
  notifications: [],
  audit_logs: [
    {
      id: 'log_init',
      action: 'AntiFix Database Initialized',
      action_type: 'admin_login',
      details: 'System initialized with default feature pricing and payment configuration.',
      created_at: new Date().toISOString(),
    },
  ],
};

function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2));
      return JSON.parse(JSON.stringify(DEFAULT_DB));
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading db:', err);
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

function writeDb(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Error writing db:', err);
  }
}

// Password hashing helpers
function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
}

// Token session manager
const userSessions = new Map<string, { userId: string; email: string; expiresAt: number }>();
const adminSessions = new Map<string, { email: string; expiresAt: number }>();

function createSession(userId: string, email: string): string {
  const token = 'usr_token_' + crypto.randomBytes(32).toString('hex');
  userSessions.set(token, {
    userId,
    email,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  return token;
}

function createAdminSession(email: string): string {
  const token = 'adm_token_' + crypto.randomBytes(32).toString('hex');
  adminSessions.set(token, {
    email,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });
  return token;
}

// Auth Middleware for normal users
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  const session = userSessions.get(token);

  if (!session || session.expiresAt < Date.now()) {
    if (session) userSessions.delete(token);
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  const db = readDb();
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) {
    return res.status(401).json({ error: 'User no longer exists.' });
  }

  if (user.account_status === 'blocked') {
    return res.status(403).json({ error: 'Your account has been blocked. Please contact support.' });
  }

  (req as any).user = user;
  next();
}

// Admin Auth Middleware
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authorization required' });
  }

  const token = authHeader.split(' ')[1];
  const session = adminSessions.get(token);

  if (!session || session.expiresAt < Date.now()) {
    if (session) adminSessions.delete(token);
    return res.status(401).json({ error: 'Admin session expired. Please authenticate with PIN.' });
  }

  const authorizedEmail = process.env.ADMIN_EMAIL || 'muzamilanki@gmail.com';
  if (session.email.toLowerCase() !== authorizedEmail.toLowerCase()) {
    return res.status(403).json({ error: 'Access Denied. Unauthorized administrator.' });
  }

  next();
}

// Middlewares
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Helper to log admin actions
function logAdminAction(action: string, action_type: string, details: string, target_user_id?: string, target_user_email?: string) {
  const db = readDb();
  db.audit_logs.unshift({
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    action,
    action_type,
    details,
    target_user_id,
    target_user_email,
    created_at: new Date().toISOString(),
  });
  writeDb(db);
}

// -------------------------------------------------------------
// PUBLIC & FEATURE ROUTES
// -------------------------------------------------------------

app.get('/api/features', (req, res) => {
  const db = readDb();
  res.json({ features: db.features });
});

app.get('/api/payment-methods', (req, res) => {
  const db = readDb();
  const activeMethods = db.payment_methods.filter((pm) => pm.enabled);
  res.json({ payment_methods: activeMethods });
});

// -------------------------------------------------------------
// AUTHENTICATION ROUTES
// -------------------------------------------------------------

app.post('/api/auth/register', (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const db = readDb();
    const existing = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const { hash, salt } = hashPassword(password);
    const userId = 'usr_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const newUser = {
      id: userId,
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password_hash: hash,
      salt: salt,
      account_created_at: new Date().toISOString(),
      account_status: 'active' as const,
      is_admin: email.trim().toLowerCase() === (process.env.ADMIN_EMAIL || 'muzamilanki@gmail.com').toLowerCase(),
    };

    db.users.push(newUser);

    // Initial welcome notification
    db.notifications.push({
      id: 'notif_' + Date.now(),
      user_id: userId,
      title: 'Welcome to AntiFix!',
      message: 'Your account has been created. Enjoy full control over your PDF documents with our modern utility suite.',
      type: 'success',
      is_read: false,
      created_at: new Date().toISOString(),
    });

    writeDb(db);

    const token = createSession(newUser.id, newUser.email);
    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        account_created_at: newUser.account_created_at,
        account_status: newUser.account_status,
        is_admin: newUser.is_admin,
        subscriptions: [],
        unread_notifications_count: 1,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const db = readDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = verifyPassword(password, user.password_hash, user.salt);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.account_status === 'blocked') {
      return res.status(403).json({ error: 'Your account has been blocked. Please contact support.' });
    }

    const token = createSession(user.id, user.email);

    // Clean up expired subscriptions
    const now = new Date().toISOString();
    const userSubs = db.subscriptions
      .filter((s) => s.user_id === user.id)
      .map((s) => {
        if (s.status === 'active' && s.expiry_date < now) {
          s.status = 'expired';
        }
        return s;
      });

    const unreadCount = db.notifications.filter((n) => n.user_id === user.id && !n.is_read).length;

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        account_created_at: user.account_created_at,
        account_status: user.account_status,
        is_admin: user.is_admin,
        subscriptions: userSubs,
        unread_notifications_count: unreadCount,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = (req as any).user;
  const db = readDb();

  const now = new Date().toISOString();
  const userSubs = db.subscriptions
    .filter((s) => s.user_id === user.id)
    .map((s) => {
      if (s.status === 'active' && s.expiry_date < now) {
        s.status = 'expired';
      }
      return s;
    });

  const unreadCount = db.notifications.filter((n) => n.user_id === user.id && !n.is_read).length;

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      account_created_at: user.account_created_at,
      account_status: user.account_status,
      is_admin: user.is_admin,
      subscriptions: userSubs,
      unread_notifications_count: unreadCount,
    },
  });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const db = readDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

  // For security, always respond with a success confirmation
  if (!user) {
    return res.json({ message: 'If an account exists with that email, a password reset link has been dispatched.' });
  }

  // Generate simulated recovery token
  const resetToken = 'rst_' + crypto.randomBytes(16).toString('hex');
  res.json({
    message: 'Password reset link sent to your email. (Simulated token provided for demo reset).',
    reset_token: resetToken,
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const db = readDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const { hash, salt } = hashPassword(newPassword);
  user.password_hash = hash;
  user.salt = salt;
  writeDb(db);

  res.json({ message: 'Password has been updated successfully. Please log in.' });
});

app.post('/api/auth/update-profile', requireAuth, (req, res) => {
  const { username } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username cannot be empty.' });
  }

  const user = (req as any).user;
  const db = readDb();
  const dbUser = db.users.find((u) => u.id === user.id);
  if (!dbUser) return res.status(404).json({ error: 'User not found.' });

  dbUser.username = username.trim();
  writeDb(db);

  res.json({ message: 'Profile updated successfully.', username: dbUser.username });
});

app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new passwords are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  const user = (req as any).user;
  const db = readDb();
  const dbUser = db.users.find((u) => u.id === user.id);
  if (!dbUser) return res.status(404).json({ error: 'User not found.' });

  if (!verifyPassword(currentPassword, dbUser.password_hash, dbUser.salt)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  const { hash, salt } = hashPassword(newPassword);
  dbUser.password_hash = hash;
  dbUser.salt = salt;
  writeDb(db);

  res.json({ message: 'Password changed successfully.' });
});

app.delete('/api/auth/account', requireAuth, (req, res) => {
  const user = (req as any).user;
  const db = readDb();

  // Delete user files, notifications, subscriptions, payments, and account
  db.users = db.users.filter((u) => u.id !== user.id);
  db.files = db.files.filter((f) => f.user_id !== user.id);
  db.notifications = db.notifications.filter((n) => n.user_id !== user.id);
  db.subscriptions = db.subscriptions.filter((s) => s.user_id !== user.id);
  writeDb(db);

  res.json({ message: 'Account permanently deleted.' });
});

// -------------------------------------------------------------
// USER FILES MANAGEMENT (STRICT USER ISOLATION)
// -------------------------------------------------------------

app.get('/api/files', requireAuth, (req, res) => {
  const user = (req as any).user;
  const db = readDb();
  const userFiles = db.files
    .filter((f) => f.user_id === user.id)
    .map((f) => ({
      id: f.id,
      name: f.name,
      size: f.size,
      created_at: f.created_at,
      modified_at: f.modified_at,
      file_type: f.file_type,
      page_count: f.page_count,
    }));
  res.json({ files: userFiles });
});

app.post('/api/files', requireAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const { name, size, file_type, data_url, page_count } = req.body;

    if (!name || !data_url) {
      return res.status(400).json({ error: 'Name and file data are required.' });
    }

    let safeName = name.trim();
    if (!safeName.toLowerCase().endsWith('.pdf')) {
      safeName += '.pdf';
    }

    const db = readDb();
    const fileId = 'file_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const newFile = {
      id: fileId,
      user_id: user.id,
      name: safeName,
      size: size || data_url.length,
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
      file_type: file_type || 'application/pdf',
      data_url,
      page_count: page_count || 1,
    };

    db.files.unshift(newFile);
    writeDb(db);

    res.status(201).json({
      file: {
        id: newFile.id,
        name: newFile.name,
        size: newFile.size,
        created_at: newFile.created_at,
        modified_at: newFile.modified_at,
        file_type: newFile.file_type,
        page_count: newFile.page_count,
      },
      message: 'PDF saved to My Files successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save file.' });
  }
});

app.get('/api/files/:id', requireAuth, (req, res) => {
  const user = (req as any).user;
  const db = readDb();
  const file = db.files.find((f) => f.id === req.params.id && f.user_id === user.id);
  if (!file) {
    return res.status(404).json({ error: 'File not found or unauthorized.' });
  }
  res.json({ file });
});

app.patch('/api/files/:id/rename', requireAuth, (req, res) => {
  const user = (req as any).user;
  const { newName } = req.body;
  if (!newName || !newName.trim()) {
    return res.status(400).json({ error: 'New name is required.' });
  }

  let safeName = newName.trim();
  if (!safeName.toLowerCase().endsWith('.pdf')) {
    safeName += '.pdf';
  }

  const db = readDb();
  const file = db.files.find((f) => f.id === req.params.id && f.user_id === user.id);
  if (!file) {
    return res.status(404).json({ error: 'File not found.' });
  }

  file.name = safeName;
  file.modified_at = new Date().toISOString();
  writeDb(db);

  res.json({ message: 'File renamed successfully.', file });
});

app.delete('/api/files/:id', requireAuth, (req, res) => {
  const user = (req as any).user;
  const db = readDb();
  const fileIndex = db.files.findIndex((f) => f.id === req.params.id && f.user_id === user.id);
  if (fileIndex === -1) {
    return res.status(404).json({ error: 'File not found.' });
  }

  db.files.splice(fileIndex, 1);
  writeDb(db);

  res.json({ message: 'File deleted successfully.' });
});

// -------------------------------------------------------------
// USER PAYMENTS & SUBSCRIPTION SUBMISSION
// -------------------------------------------------------------

app.post('/api/payments/submit', requireAuth, (req, res) => {
  try {
    const user = (req as any).user;
    const { feature_id, plan_type, payment_method, transaction_id, screenshot_url, note } = req.body;

    if (!feature_id || !plan_type || !payment_method || !transaction_id || !screenshot_url) {
      return res.status(400).json({ error: 'All payment fields and screenshot receipt are required.' });
    }

    const db = readDb();
    const feature = db.features.find((f) => f.id === feature_id);
    if (!feature) {
      return res.status(404).json({ error: 'Selected feature not found.' });
    }

    const amount = plan_type === 'weekly' ? feature.weekly_price : feature.monthly_price;

    const paymentId = 'pay_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const newPayment = {
      id: paymentId,
      user_id: user.id,
      username: user.username,
      email: user.email,
      feature_id,
      feature_name: feature.name,
      plan_type,
      amount,
      payment_method,
      transaction_id: transaction_id.trim(),
      screenshot_url,
      note: note ? note.trim() : '',
      status: 'pending' as const,
      created_at: new Date().toISOString(),
    };

    db.payments.unshift(newPayment);

    // Notify user that payment was submitted
    db.notifications.unshift({
      id: 'notif_' + Date.now(),
      user_id: user.id,
      title: 'Payment Request Submitted',
      message: `Your payment of Rs. ${amount} for ${feature.name} (${plan_type}) has been submitted. Admin will review and activate your plan shortly.`,
      type: 'info',
      is_read: false,
      created_at: new Date().toISOString(),
    });

    writeDb(db);

    res.status(201).json({
      message: 'Your payment request has been submitted.',
      payment: newPayment,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Payment submission failed.' });
  }
});

app.get('/api/payments/my', requireAuth, (req, res) => {
  const user = (req as any).user;
  const db = readDb();
  const myPayments = db.payments.filter((p) => p.user_id === user.id);
  res.json({ payments: myPayments });
});

// -------------------------------------------------------------
// USER NOTIFICATIONS
// -------------------------------------------------------------

app.get('/api/notifications', requireAuth, (req, res) => {
  const user = (req as any).user;
  const db = readDb();
  const notifs = db.notifications.filter((n) => n.user_id === user.id);
  res.json({ notifications: notifs });
});

app.post('/api/notifications/:id/read', requireAuth, (req, res) => {
  const user = (req as any).user;
  const db = readDb();
  const notif = db.notifications.find((n) => n.id === req.params.id && n.user_id === user.id);
  if (notif) {
    notif.is_read = true;
    writeDb(db);
  }
  res.json({ success: true });
});

app.post('/api/notifications/read-all', requireAuth, (req, res) => {
  const user = (req as any).user;
  const db = readDb();
  db.notifications.forEach((n) => {
    if (n.user_id === user.id) n.is_read = true;
  });
  writeDb(db);
  res.json({ success: true });
});

// -------------------------------------------------------------
// ADMIN SECURE ENDPOINTS
// Authorized Email: muzamilanki@gmail.com
// Admin PIN: 786590 (Validated strictly on backend, never sent to frontend)
// -------------------------------------------------------------

app.post('/api/admin/login', (req, res) => {
  const { email, pin } = req.body;
  const targetEmail = process.env.ADMIN_EMAIL || 'muzamilanki@gmail.com';
  const targetPin = process.env.ADMIN_PIN || '786590';

  if (!email || !pin) {
    return res.status(400).json({ error: 'Admin Email and PIN are required.' });
  }

  if (email.trim().toLowerCase() !== targetEmail.toLowerCase() || String(pin).trim() !== targetPin) {
    // Log failed attempt
    logAdminAction('Failed Admin Login Attempt', 'admin_login', `Attempted with email: ${email}`);
    return res.status(403).json({ error: 'Access Denied. Invalid Administrator credentials or PIN.' });
  }

  const adminToken = createAdminSession(email.trim());
  logAdminAction('Admin Login Successful', 'admin_login', `Authorized administrator ${email} logged into Admin Panel.`);

  res.json({
    token: adminToken,
    admin: {
      email: targetEmail,
      role: 'Super Administrator',
    },
  });
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const db = readDb();

  const totalUsers = db.users.length;
  const activeUsers = db.users.filter((u) => u.account_status === 'active').length;
  const blockedUsers = db.users.filter((u) => u.account_status === 'blocked').length;

  const now = new Date().toISOString();
  const activeSubsUserIds = new Set(
    db.subscriptions.filter((s) => s.status === 'active' && s.expiry_date >= now).map((s) => s.user_id)
  );
  const premiumUsers = activeSubsUserIds.size;

  const pendingPayments = db.payments.filter((p) => p.status === 'pending').length;
  const approvedPayments = db.payments.filter((p) => p.status === 'approved').length;
  const totalPayments = db.payments.length;

  const activeFeatures = db.features.filter((f) => f.enabled).length;
  const freeFeatures = db.features.filter((f) => f.enabled && !f.is_paid).length;
  const paidFeatures = db.features.filter((f) => f.enabled && f.is_paid).length;

  const revenue = db.payments
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  res.json({
    stats: {
      total_users: totalUsers,
      active_users: activeUsers,
      blocked_users: blockedUsers,
      premium_users: premiumUsers,
      pending_payments: pendingPayments,
      approved_payments: approvedPayments,
      total_payments: totalPayments,
      active_features: activeFeatures,
      free_features: freeFeatures,
      paid_features: paidFeatures,
      revenue,
    },
  });
});

// Admin Users List (Never sends password hashes)
app.get('/api/admin/users', requireAdmin, (req, res) => {
  const db = readDb();
  const now = new Date().toISOString();

  const usersList = db.users.map((u) => {
    const userSubs = db.subscriptions.filter((s) => s.user_id === u.id);
    const activeSubs = userSubs.filter((s) => s.status === 'active' && s.expiry_date >= now);

    return {
      id: u.id,
      username: u.username,
      email: u.email,
      account_created_at: u.account_created_at,
      account_status: u.account_status,
      is_admin: u.is_admin,
      active_plans: activeSubs.map((s) => {
        const feat = db.features.find((f) => f.id === s.feature_id);
        return {
          id: s.id,
          feature_id: s.feature_id,
          feature_name: feat ? feat.name : s.feature_id,
          plan_type: s.plan_type,
          expiry_date: s.expiry_date,
          source: s.source,
        };
      }),
      total_files: db.files.filter((f) => f.user_id === u.id).length,
    };
  });

  res.json({ users: usersList });
});

// Admin Block/Unblock User
app.post('/api/admin/users/:id/block', requireAdmin, (req, res) => {
  const { block } = req.body;
  const db = readDb();
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  user.account_status = block ? 'blocked' : 'active';

  // If blocking, notify user
  if (block) {
    db.notifications.unshift({
      id: 'notif_' + Date.now(),
      user_id: user.id,
      title: 'Account Blocked',
      message: 'Your account has been blocked. Please contact support.',
      type: 'error',
      is_read: false,
      created_at: new Date().toISOString(),
    });
  } else {
    db.notifications.unshift({
      id: 'notif_' + Date.now(),
      user_id: user.id,
      title: 'Account Re-activated',
      message: 'Your account has been unblocked by the administrator.',
      type: 'success',
      is_read: false,
      created_at: new Date().toISOString(),
    });
  }

  logAdminAction(
    block ? 'Blocked User' : 'Unblocked User',
    block ? 'block_user' : 'unblock_user',
    `User ${user.email} (${user.username}) was ${block ? 'blocked' : 'unblocked'}.`,
    user.id,
    user.email
  );

  writeDb(db);
  res.json({ message: `User ${block ? 'blocked' : 'unblocked'} successfully.`, status: user.account_status });
});

// Admin Gift Plan to User
app.post('/api/admin/users/:id/gift', requireAdmin, (req, res) => {
  const { feature_id, plan_type, duration_days } = req.body;
  if (!feature_id) {
    return res.status(400).json({ error: 'Feature ID is required.' });
  }

  const db = readDb();
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const feature = db.features.find((f) => f.id === feature_id);
  const featName = feature ? feature.name : feature_id;

  const days = duration_days || (plan_type === 'monthly' ? 30 : 7);
  const startDate = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(startDate.getDate() + days);

  const subId = 'sub_gift_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  db.subscriptions.push({
    id: subId,
    user_id: user.id,
    feature_id,
    plan_type: plan_type || 'gift',
    status: 'active',
    start_date: startDate.toISOString(),
    expiry_date: expiryDate.toISOString(),
    source: 'admin_gift',
  });

  db.notifications.unshift({
    id: 'notif_' + Date.now(),
    user_id: user.id,
    title: 'Gift Received!',
    message: `You have received a complimentary ${days}-day premium pass for ${featName} gifted by AntiFix Administrator!`,
    type: 'success',
    is_read: false,
    created_at: new Date().toISOString(),
  });

  logAdminAction(
    'Gifted Feature Plan',
    'gift_plan',
    `Gifted ${days} days of ${featName} to ${user.email}.`,
    user.id,
    user.email
  );

  writeDb(db);
  res.json({ message: `Successfully gifted ${featName} to ${user.username}.` });
});

// Admin Revoke User Plan
app.post('/api/admin/users/:id/revoke-plan', requireAdmin, (req, res) => {
  const { subscription_id } = req.body;
  const db = readDb();
  const sub = db.subscriptions.find((s) => s.id === subscription_id && s.user_id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found.' });

  sub.status = 'revoked';
  logAdminAction('Revoked Feature Plan', 'revoke_plan', `Revoked subscription ${subscription_id} for user ${req.params.id}.`, req.params.id);
  writeDb(db);

  res.json({ message: 'Plan access revoked.' });
});

// Admin Delete User Permanently
app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  // Delete all records associated
  db.users = db.users.filter((u) => u.id !== user.id);
  db.files = db.files.filter((f) => f.user_id !== user.id);
  db.notifications = db.notifications.filter((n) => n.user_id !== user.id);
  db.subscriptions = db.subscriptions.filter((s) => s.user_id !== user.id);
  db.payments = db.payments.filter((p) => p.user_id !== user.id);

  logAdminAction('Deleted User Permanently', 'delete_user', `Permanently deleted account and all associated data for ${user.email} (${user.username}).`, user.id, user.email);

  writeDb(db);
  res.json({ message: `User ${user.username} deleted permanently.` });
});

// Admin Payment Requests List
app.get('/api/admin/payments', requireAdmin, (req, res) => {
  const db = readDb();
  const { status, method, feature } = req.query;

  let list = [...db.payments];
  if (status && status !== 'all') {
    list = list.filter((p) => p.status === status);
  }
  if (method && method !== 'all') {
    list = list.filter((p) => p.payment_method === method);
  }
  if (feature && feature !== 'all') {
    list = list.filter((p) => p.feature_id === feature);
  }

  res.json({ payments: list });
});

// Admin Approve Payment Request
app.post('/api/admin/payments/:id/approve', requireAdmin, (req, res) => {
  const db = readDb();
  const payment = db.payments.find((p) => p.id === req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment request not found.' });

  if (payment.status === 'approved') {
    return res.status(400).json({ error: 'Payment has already been approved.' });
  }

  payment.status = 'approved';
  payment.reviewed_at = new Date().toISOString();

  // Activate feature plan for user
  const days = payment.plan_type === 'monthly' ? 30 : 7;
  const startDate = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(startDate.getDate() + days);

  const subId = 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  db.subscriptions.push({
    id: subId,
    user_id: payment.user_id,
    feature_id: payment.feature_id,
    plan_type: payment.plan_type,
    status: 'active',
    start_date: startDate.toISOString(),
    expiry_date: expiryDate.toISOString(),
    source: 'payment',
  });

  // Notify user
  db.notifications.unshift({
    id: 'notif_' + Date.now(),
    user_id: payment.user_id,
    title: 'Payment Approved - Premium Active!',
    message: `Your payment of Rs. ${payment.amount} for ${payment.feature_name} (${payment.plan_type}) has been approved! Your premium access is now active until ${expiryDate.toLocaleDateString()}.`,
    type: 'success',
    is_read: false,
    created_at: new Date().toISOString(),
  });

  logAdminAction(
    'Approved Payment',
    'approve_payment',
    `Approved payment ${payment.id} of Rs. ${payment.amount} for ${payment.feature_name} by ${payment.email}.`,
    payment.user_id,
    payment.email
  );

  writeDb(db);
  res.json({ message: 'Payment approved and feature activated successfully.', payment });
});

// Admin Reject Payment Request
app.post('/api/admin/payments/:id/reject', requireAdmin, (req, res) => {
  const { reason } = req.body;
  const db = readDb();
  const payment = db.payments.find((p) => p.id === req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment request not found.' });

  payment.status = 'rejected';
  payment.rejection_reason = reason || 'Payment receipt or transaction ID could not be verified.';
  payment.reviewed_at = new Date().toISOString();

  // Notify user
  db.notifications.unshift({
    id: 'notif_' + Date.now(),
    user_id: payment.user_id,
    title: 'Payment Request Rejected',
    message: `Your payment request for ${payment.feature_name} was rejected. Reason: ${payment.rejection_reason}`,
    type: 'error',
    is_read: false,
    created_at: new Date().toISOString(),
  });

  logAdminAction(
    'Rejected Payment',
    'reject_payment',
    `Rejected payment ${payment.id} for ${payment.email}. Reason: ${payment.rejection_reason}`,
    payment.user_id,
    payment.email
  );

  writeDb(db);
  res.json({ message: 'Payment marked as rejected.', payment });
});

// Admin Feature Management
app.get('/api/admin/features', requireAdmin, (req, res) => {
  const db = readDb();
  res.json({ features: db.features });
});

app.put('/api/admin/features/:id', requireAdmin, (req, res) => {
  const { enabled, is_paid, weekly_price, monthly_price, name, description } = req.body;
  const db = readDb();
  const feat = db.features.find((f) => f.id === req.params.id);
  if (!feat) return res.status(404).json({ error: 'Feature not found.' });

  if (typeof enabled === 'boolean') feat.enabled = enabled;
  if (typeof is_paid === 'boolean') feat.is_paid = is_paid;
  if (typeof weekly_price === 'number') feat.weekly_price = Math.max(0, weekly_price);
  if (typeof monthly_price === 'number') feat.monthly_price = Math.max(0, monthly_price);
  if (name) feat.name = name.trim();
  if (description) feat.description = description.trim();

  logAdminAction(
    'Updated Feature Settings',
    'update_feature',
    `Updated feature ${feat.name} (${feat.id}): Paid=${feat.is_paid}, Weekly=Rs.${feat.weekly_price}, Monthly=Rs.${feat.monthly_price}`
  );

  writeDb(db);
  res.json({ message: 'Feature settings updated successfully.', feature: feat });
});

// Admin Payment Settings
app.get('/api/admin/payment-settings', requireAdmin, (req, res) => {
  const db = readDb();
  res.json({ payment_methods: db.payment_methods });
});

app.put('/api/admin/payment-settings', requireAdmin, (req, res) => {
  const { methods } = req.body;
  if (!Array.isArray(methods)) {
    return res.status(400).json({ error: 'Methods array required.' });
  }

  const db = readDb();
  db.payment_methods = methods;

  logAdminAction('Updated Payment Gateway Settings', 'update_payment_settings', 'Administrator updated manual payment method credentials and instructions.');

  writeDb(db);
  res.json({ message: 'Payment methods updated successfully.', payment_methods: db.payment_methods });
});

// Admin Audit Logs
app.get('/api/admin/audit-logs', requireAdmin, (req, res) => {
  const db = readDb();
  res.json({ logs: db.audit_logs });
});

// -------------------------------------------------------------
// VITE INTEGRATION & SERVER STARTUP
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AntiFix Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
