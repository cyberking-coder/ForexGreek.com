const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../services/db');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, password_hash, payment_status, razorpay_order_id, plan_price FROM students WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.payment_status === 'paid') {
      return res.json({ status: 'paid', message: 'Already enrolled' });
    }

    // pending or failed — allow resuming payment
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

module.exports = router;
