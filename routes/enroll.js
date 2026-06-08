const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const Razorpay = require('razorpay');
const pool = require('../services/db');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const validators = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit Indian phone number required'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('confirmPassword').custom((val, { req }) => {
    if (val !== req.body.password) throw new Error('Passwords do not match');
    return true;
  }),
];

router.post('/', validators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { name, email, phone, location, password } = req.body;
  const offerPrice = parseInt(process.env.COURSE_OFFER_PRICE || '4999');
  const originalPrice = parseInt(process.env.COURSE_ORIGINAL_PRICE || '19999');
  const planPrice = req.body.timerExpired === true ? originalPrice : offerPrice;

  try {
    const [existing] = await pool.query('SELECT id FROM students WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered. Please log in or use a different email.' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const [result] = await pool.query(
      `INSERT INTO students (name, email, phone, location, password_hash, plan_price) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, phone, location, password_hash, planPrice]
    );
    const user_id = result.insertId;

    const order = await razorpay.orders.create({
      amount: planPrice * 100,
      currency: 'INR',
      receipt: `fg_${user_id}_${Date.now()}`,
    });

    await pool.query('UPDATE students SET razorpay_order_id = ? WHERE id = ?', [order.id, user_id]);

    return res.json({
      user_id,
      razorpay_order_id: order.id,
      razorpay_key_id: process.env.RAZORPAY_KEY_ID,
      amount: order.amount,
      name, email, phone,
    });
  } catch (err) {
    console.error('[Enroll] Error:', err.message);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

module.exports = router;
