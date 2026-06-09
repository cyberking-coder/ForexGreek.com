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

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGIN || '*')
    : true,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

const enrollLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many enrollment attempts from this IP. Please try again in an hour.' },
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/enroll', enrollLimiter, enrollRouter);
app.use('/api/payment', paymentRouter);

app.get('/api/config', (req, res) => {
  res.json({
    offerPrice: parseInt(process.env.COURSE_OFFER_PRICE || '4999'),
    originalPrice: parseInt(process.env.COURSE_ORIGINAL_PRICE || '19999'),
  });
});

app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/features', (req, res) => res.sendFile(path.join(__dirname, 'features.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/payment', (req, res) => res.sendFile(path.join(__dirname, 'payment.html')));
app.get('/success', (req, res) => res.sendFile(path.join(__dirname, 'success.html')));

if (require.main === module) {
  app.listen(PORT, () => console.log(`[ForexGreek] Server running on http://localhost:${PORT}`));
}

module.exports = app;
