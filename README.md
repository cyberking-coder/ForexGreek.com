# ForexGreek Trading Academy — Olympian Ascension

Production-ready course landing page + enrollment + Razorpay payment + Make.com automation.

---

## Tech Stack

- **Frontend**: HTML + Tailwind CSS (CDN) + Vanilla JS
- **Backend**: Node.js + Express
- **Database**: MySQL via `mysql2`
- **Payments**: Razorpay
- **Automation**: Make.com webhooks
- **Auth**: bcrypt + express-session

---

## Setup Guide

### 1. Install Dependencies

```bash
npm install
```

### 2. MySQL Setup

Create a database and run the schema:

```bash
mysql -u root -p < database/schema.sql
```

Or manually in MySQL:

```sql
CREATE DATABASE IF NOT EXISTS forexgreek;
USE forexgreek;
-- then paste contents of database/schema.sql
```

### 3. Configure Environment

Copy the example env file and fill it in:

```bash
cp .env.example .env
```

Then edit `.env`:

```
PORT=3000
BASE_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=forexgreek

RAZORPAY_KEY_ID=rzp_test_xxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

MAKE_WEBHOOK_PAID=https://hook.eu1.make.com/xxxxxxxxxx
MAKE_WEBHOOK_FAILED=https://hook.eu1.make.com/xxxxxxxxxx

SESSION_SECRET=a_random_string_of_at_least_32_characters

COURSE_OFFER_PRICE=4999
COURSE_ORIGINAL_PRICE=19999
```

### 4. Razorpay Setup

1. Go to [dashboard.razorpay.com](https://dashboard.razorpay.com)
2. Create a free account (no charges for test mode)
3. Navigate to **Settings → API Keys**
4. Click **Generate Test Key** — copy both `Key ID` and `Key Secret`
5. Paste them as `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in your `.env`
6. For production, switch to **Live mode** and generate live keys

**Test card details (Razorpay test mode):**
- Card: `4111 1111 1111 1111`
- Expiry: Any future date
- CVV: Any 3 digits
- OTP: `1234`

### 5. Make.com Setup

Make.com replaces Twilio/SMS. It sends WhatsApp messages via your configured WhatsApp integration.

#### Create a Free Account

1. Go to [make.com](https://make.com) and create a free account
2. Free plan: 1,000 operations/month (~500 enrollments — 2 ops each)
3. Upgrade to **Core ($9/mo)** for 10,000 ops if volume grows

---

#### SCENARIO 1 — "ForexGreek: Payment Success"

This fires when a student pays successfully.

**Step-by-step:**

1. Click **Create a new scenario**
2. Add module: **Webhooks → Custom Webhook**
   - Click **Add** → name it "ForexGreek Paid"
   - Copy the generated webhook URL
   - Paste it as `MAKE_WEBHOOK_PAID` in your `.env`
3. Add **Router** module (to run multiple branches in parallel)
4. **Branch A — Student WhatsApp notification:**
   - Add: **WhatsApp (360dialog / WhatsBoost / Meta Cloud API)** → Send Message
   - To: `{{1.phone}}` (the phone field from webhook)
   - Message body:
     ```
     🎉 Congratulations {{1.name}}! You have been successfully enrolled in
     ForexGreek Trading Academy. Welcome to the temple of elite trading.
     Your journey starts now. Reply to this message for support.
     ```
5. **Branch B — Owner WhatsApp notification:**
   - Add: **WhatsApp** → Send Message
   - To: your own number (hardcoded in the scenario)
   - Message body:
     ```
     ✅ New enrollment! {{1.name}} just paid ₹{{1.amount}}.
     Phone: {{1.phone}} | Email: {{1.email}}
     ```
6. **(Optional) Branch C — Google Sheets logging:**
   - Add: **Google Sheets → Add a Row**
   - Columns: Name, Email, Phone, Amount, Enrolled At
   - Map: `{{1.name}}`, `{{1.email}}`, `{{1.phone}}`, `{{1.amount}}`, `{{1.enrolled_at}}`
7. Click **Run once** to test, then **Toggle ON** the scenario

---

#### SCENARIO 2 — "ForexGreek: Payment Failed / Timeout"

This fires when a student abandons checkout or the 5-minute payment timer expires.

**Step-by-step:**

1. Click **Create a new scenario**
2. Add module: **Webhooks → Custom Webhook**
   - Name it "ForexGreek Failed"
   - Copy webhook URL → paste as `MAKE_WEBHOOK_FAILED` in `.env`
3. Add: **WhatsApp** → Send Message
   - To: `{{1.phone}}`
   - Message body:
     ```
     ⏰ Hey {{1.name}}, your ForexGreek enrollment is incomplete!
     Complete your payment before the price rises to ₹19,999.
     Pay now: {{1.payment_link}}
     The markets wait for no one.
     ```
4. **(Optional)** Add **Google Sheets → Add a Row** for failed attempts logging
5. **Toggle ON** the scenario

---

#### WhatsApp Integration Options for Make.com (India)

- **360dialog** — Best for India. Free trial available. [360dialog.com](https://360dialog.com)
- **WhatsBoost** — Simple, pay-per-message. [whatsboost.com](https://whatsboost.com)
- **Meta Cloud API** (directly) — Free but more setup. Requires Facebook Business verification.

In Make.com, search for your WhatsApp provider in the module search. All three work with Make.com natively.

---

### 6. Add the Intro Video

Place your intro video as `public/intro-video.mp4`. The server serves it as a static file.

```bash
cp /path/to/your/intro-video.mp4 public/intro-video.mp4
```

### 7. Start the Server

```bash
npm start
```

Visit [http://localhost:3000](http://localhost:3000)

### 8. Test the Full Flow

1. Open [http://localhost:3000](http://localhost:3000)
2. Watch the intro video (or wait for it to end)
3. The urgency modal appears after 1.5s with 5-minute countdown
4. Click "Claim Offer & Enroll Now"
5. Fill in the enrollment form
6. Razorpay checkout opens
7. Use test card: `4111 1111 1111 1111`, any expiry, CVV `123`
8. OTP: `1234`
9. On success → redirected to `/success`
10. Check Make.com → execution log shows the webhook was received

---

## Deploy on Railway

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
3. Select your repo
4. Railway auto-detects Node.js via `Procfile`
5. Add environment variables in Railway dashboard (all from `.env`)
6. Add a **MySQL** plugin in Railway (or use PlanetScale/ClearDB)
7. Update `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` with Railway MySQL credentials
8. Set `BASE_URL` to your Railway domain (e.g., `https://forexgreek.up.railway.app`)
9. Deploy — Railway gives you a live HTTPS URL

**One-click deploy alternative:** Render.com also supports this setup with `render.yaml`.

---

## Security Notes

- Passwords are stored as **bcrypt hashes only** (12 salt rounds) — never plaintext
- Rate limiting on `/api/enroll`: max 5 requests per IP per hour
- Razorpay signature verified server-side with HMAC-SHA256
- Make.com webhooks are non-blocking — failures never crash payment flow
- CORS configured for production domain via `ALLOWED_ORIGIN` env var
- Session cookies are `httpOnly: true` and `secure: true` in production

---

## Project Structure

```
forexgreek/
  index.html          ← Main landing page (all 6 phases)
  payment.html        ← Payment completion page
  success.html        ← Enrollment success page
  server.js           ← Express server
  routes/
    enroll.js         ← POST /api/enroll
    payment.js        ← POST /api/payment/verify, /failed, GET /order
  services/
    makeWebhook.js    ← Make.com webhook fire function
    db.js             ← mysql2 connection pool
  database/
    schema.sql        ← MySQL schema
  public/
    intro-video.mp4   ← Place your video here
  .env.example
  package.json
  Procfile            ← Railway/Heroku deployment
  railway.json        ← Railway config
  README.md
```
