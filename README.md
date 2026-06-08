# ForexGreek Trading Academy — Olympian Ascension

Production-ready course landing page + enrollment + Razorpay payment + Make.com automation.

## Tech Stack
- **Frontend**: HTML + Tailwind CSS (CDN) + Vanilla JS
- **Backend**: Node.js + Express
- **Database**: MySQL via `mysql2`
- **Payments**: Razorpay
- **Automation**: Make.com webhooks
- **Auth**: bcrypt + express-session

## Quick Start

```bash
npm install
cp .env.example .env   # fill in your keys
mysql -u root -p < database/schema.sql
npm start
```

## Deploy on Railway
1. Push to GitHub
2. railway.app → New Project → Deploy from GitHub repo
3. Add MySQL plugin
4. Set all env vars from .env.example
5. Run schema.sql in Railway MySQL console
6. Set BASE_URL to your Railway domain
