const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../services/db');
const { makeWebhook } = require('../services/makeWebhook');

// GET /api/payment/order?user_id=X — fetch order data for payment page
router.get('/order', async (req, res) => {
  const userId = parseInt(req.query.user_id, 10);
  if (!userId) return res.status(400).json({ error: 'Missing user_id' });

  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, plan_price, razorpay_order_id, payment_status FROM students WHERE id = ?',
      [userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Student not found' });

    const s = rows[0];
    if (s.payment_status === 'paid') {
      return res.status(409).json({ error: 'Payment already completed' });
    }

    return res.json({
      user_id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      amount: s.plan_price * 100,
      razorpay_order_id: s.razorpay_order_id,
      razorpay_key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('[Payment/order] Error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/verify', async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, user_id } = req.body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !user_id) {
    return res.status(400).json({ error: 'Missing payment verification parameters' });
  }

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  if (expected !== razorpay_signature) {
    return res.status(400).json({ error: 'Payment verification failed — invalid signature' });
  }

  try {
    await pool.query(
      `UPDATE students
       SET payment_status = 'paid', payment_id = ?, payment_completed_at = NOW()
       WHERE id = ?`,
      [razorpay_payment_id, user_id]
    );

    const [rows] = await pool.query('SELECT * FROM students WHERE id = ?', [user_id]);
    if (rows.length > 0) {
      await makeWebhook('paid', rows[0]);
    }

    return res.json({ success: true, redirect: '/success' });
  } catch (err) {
    console.error('[Payment/verify] Error:', err.message);
    return res.status(500).json({ error: 'Server error updating payment status' });
  }
});

router.post('/failed', async (req, res) => {
  const { user_id, razorpay_order_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id' });
  }

  try {
    await pool.query(
      `UPDATE students SET payment_status = 'failed' WHERE id = ? AND payment_status != 'paid'`,
      [user_id]
    );

    const [rows] = await pool.query('SELECT * FROM students WHERE id = ?', [user_id]);
    if (rows.length > 0) {
      await makeWebhook('failed', rows[0]);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[Payment/failed] Error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
