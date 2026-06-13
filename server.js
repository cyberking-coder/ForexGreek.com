require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const enrollRouter = require('./routes/enroll');
const paymentRouter = require('./routes/payment');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Railway's proxy
app.set('trust proxy', 1);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'payment=(), camera=(), microphone=()');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

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
app.use('/api/auth', authRouter);

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

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'reset-password.html'));
});

app.get('/gate', (req, res) => {
  res.sendFile(path.join(__dirname, 'gate.html'));
});

app.get('/payment', (req, res) => {
  res.sendFile(path.join(__dirname, 'payment.html'));
});

app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'success.html'));
});

// Only bind port when running directly (not imported by Vercel)
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ForexGreek] Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
