require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const enrollRouter = require('./routes/enroll');
const paymentRouter = require('./routes/payment');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGIN || '*')
    : true,
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'fg_dev_secret_change_me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

// Rate limiting on enroll endpoint
const enrollLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many enrollment attempts from this IP. Please try again in an hour.' },
});

// Serve /public static assets (intro-video.mp4, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/enroll', enrollLimiter, enrollRouter);
app.use('/api/payment', paymentRouter);

// Pricing config endpoint (used by Vercel healthcheck too)
app.get('/api/config', (req, res) => {
  res.json({
    offerPrice: parseInt(process.env.COURSE_OFFER_PRICE || '4999'),
    originalPrice: parseInt(process.env.COURSE_ORIGINAL_PRICE || '19999'),
  });
});

// HTML page routes — must come after API routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/payment', (req, res) => {
  res.sendFile(path.join(__dirname, 'payment.html'));
});

app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'success.html'));
});

// Only bind port when running directly (not imported by Vercel)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[ForexGreek] Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
