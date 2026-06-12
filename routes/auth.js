const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcrypt');
const crypto   = require('crypto');
const nodemailer = require('nodemailer');
const pool     = require('../services/db');

// ── Mailer ────────────────────────────────────────────────────────────
function getMailer() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// ── POST /api/auth/login ──────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(401).json({ error: 'Invalid email or password' });

  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, password_hash, payment_status, razorpay_order_id, plan_price FROM students WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (!rows.length)
      return res.status(401).json({ error: 'Invalid email or password' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ error: 'Invalid email or password' });

    if (user.payment_status === 'paid')
      return res.json({ status: 'paid', message: 'Already enrolled' });

    return res.json({
      status: 'pending',
      user_id: user.id,
      razorpay_order_id: user.razorpay_order_id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      amount: user.plan_price * 100,
      razorpay_key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── POST /api/auth/forgot-password ───────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const [rows] = await pool.query(
      'SELECT id, name FROM students WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    // Always respond success to prevent email enumeration
    if (!rows.length)
      return res.json({ message: 'If that email is registered, a reset link has been sent.' });

    const user = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'UPDATE students SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [token, expires, user.id]
    );

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    const mailer = getMailer();
    await mailer.sendMail({
      from: `"ForexGreek Academy" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Reset Your ForexGreek Password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f1410;padding:36px;border-radius:16px;border:1px solid rgba(0,200,83,0.2);">
          <h2 style="color:#00c853;margin-bottom:8px;">Password Reset</h2>
          <p style="color:#9ca3af;margin-bottom:24px;">Hi ${user.name}, click the button below to reset your password. This link expires in <strong style="color:#fff;">1 hour</strong>.</p>
          <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#00c853,#00a152);color:#000;font-weight:700;padding:14px 32px;border-radius:999px;text-decoration:none;font-size:15px;">Reset Password →</a>
          <p style="color:#4b5563;font-size:12px;margin-top:24px;">If you didn't request this, ignore this email. Your password won't change.</p>
          <p style="color:#4b5563;font-size:11px;margin-top:8px;">Or copy this link: <a href="${resetLink}" style="color:#00c853;">${resetLink}</a></p>
        </div>
      `,
    });

    return res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    console.error('[Auth] Forgot password error:', err.message);
    return res.status(500).json({ error: 'Could not send email. Please contact support.' });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 8)
    return res.status(400).json({ error: 'Invalid request' });

  try {
    const [rows] = await pool.query(
      'SELECT id FROM students WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );

    if (!rows.length)
      return res.status(400).json({ error: 'Reset link is invalid or has expired.' });

    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE students SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hash, rows[0].id]
    );

    return res.json({ message: 'Password updated successfully. You can now sign in.' });
  } catch (err) {
    console.error('[Auth] Reset password error:', err.message);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

module.exports = router;
