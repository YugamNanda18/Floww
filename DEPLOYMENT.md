# 🚀 FLOWW (LedgerX) — Step-by-Step Production Deployment Guide

This guide walks you through deploying **FLOWW (LedgerX)** into a production environment using modern, standard cloud hosting platforms:
- **Frontend**: [Vercel](https://vercel.com) or [Render](https://render.com) (Static Site / SPA)
- **Backend API**: [Render](https://render.com) or [Railway](https://railway.app) (Node.js Web Service)
- **Database**: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Managed Cloud Replica Set)
- **Queue / Cache**: [Redis Cloud](https://redis.io) (Managed Redis Cloud)

---

## 📋 Table of Contents
1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [Step 1: Push Code to GitHub](#step-1-push-code-to-github)
3. [Step 2: Deploy Backend Web Service (Render / Railway)](#step-2-deploy-backend-web-service-render--railway)
4. [Step 3: Deploy Frontend SPA (Vercel)](#step-3-deploy-frontend-spa-vercel)
5. [Step 4: Connect Frontend & Backend (CORS & Cookies)](#step-4-connect-frontend--backend-cors--cookies)
6. [Step 5: Configure Razorpay Webhook](#step-5-configure-razorpay-webhook)
7. [Step 6: Post-Deployment Smoke Test](#step-6-post-deployment-smoke-test)

---

## 1. Pre-Deployment Checklist

Before pushing to production, verify that:
- [x] All `.env` files are ignored in `.gitignore` (never commit active secrets).
- [x] SPA routing fallback files are in place:
  - `client/vercel.json` (Vercel rewrites)
  - `client/public/_redirects` (Netlify / Render static rewrites)
- [x] Application ErrorBoundary is active in `client/src/App.jsx`.
- [x] Frontend build compiles cleanly (`npm run build` exits with code 0).
- [x] Automated E2E test suite passes (`node test_e2e_flow.js` exits with code 0).

---

## Step 1: Push Code to GitHub

Initialize your git repository if not already done, commit, and push to GitHub:

```bash
# In the project root (c:\Users\Acer\OneDrive\Desktop\Legderx)
git init
git add .
git commit -m "feat: production-ready Floww platform with real-time sync, double-entry ledger & idempotency"

# Link to your GitHub repository
git remote add origin https://github.com/YugamNanda18/Floww.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy Backend Web Service (Render / Railway)

### Using Render (Recommended & Free/Low Cost):
1. Go to [dashboard.render.com](https://dashboard.render.com) and log in.
2. Click **New +** $\rightarrow$ **Web Service**.
3. Connect your GitHub repository.
4. Configure the service settings:
   - **Name**: `floww-api`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start` (or `node server.js`)
   - **Instance Type**: `Free` or `Starter`

5. Add **Environment Variables** in the Render dashboard:

| Variable Name | Example / Production Value | Purpose |
|---|---|---|
| `NODE_ENV` | `production` | Enables secure cookies & optimized caching |
| `PORT` | `5000` | Server listening port |
| `CLIENT_URL` | `https://floww.vercel.app` *(update after Step 3)* | Whitelisted CORS origin for cookies & frontend API requests |
| `MONGO_URI` | `mongodb+srv://<user>:<password>@cluster0.bom5obd.mongodb.net/ledgerx?retryWrites=true&w=majority` | Your MongoDB Atlas connection URI |
| `REDIS_HOST` | `redis-17180.c305.ap-south-1-1.ec2.redns.redis-cloud.com` | Redis Cloud host |
| `REDIS_PORT` | `17180` | Redis Cloud port |
| `REDIS_PASSWORD` | `<your-redis-password>` | Redis Cloud authentication password |
| `JWT_SECRET` | *(64-character random string)* | Access token cryptographic signature |
| `JWT_REFRESH_SECRET` | *(64-character random string)* | Refresh token cryptographic signature |
| `JWT_EXPIRES_IN` | `15m` | Access token duration |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token duration |
| `RECEIPT_HASH_SALT` | *(Random secret salt)* | Salt for tamper-proof SHA-256 receipt hashing |
| `RAZORPAY_KEY_ID` | `rzp_live_...` or `rzp_test_...` | Razorpay API Key ID |
| `RAZORPAY_KEY_SECRET` | `<your-razorpay-secret>` | Razorpay Key Secret |
| `RAZORPAY_WEBHOOK_SECRET` | `<your-webhook-secret>` | Razorpay Webhook signature verification secret |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP email server |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | `finance@yourcollege.edu` | Master sender email |
| `SMTP_PASS` | `<app-password>` | 16-character Gmail App Password |

6. Click **Create Web Service**. Wait for the build and deployment logs to display:
   ```
   ✅ MongoDB connected: ...
   ✅ Redis is online. Initializing BullMQ jobs...
   🚀 Floww API running on http://0.0.0.0:5000
   ```
7. Note down your backend URL (e.g., `https://floww-api.onrender.com`).

---

## Step 3: Deploy Frontend SPA (Vercel)

### Using Vercel (Fastest & Zero Configuration for SPAs):
1. Go to [vercel.com](https://vercel.com) and log in with GitHub.
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import your `floww-ledgerx` repository.
4. In the Project Configuration screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select **`client`**
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:

| Variable Name | Value | Purpose |
|---|---|---|
| `VITE_API_URL` | `https://floww-api.onrender.com/api` | Directs all frontend API calls to your live backend |

6. Click **Deploy**.
7. Vercel will bundle the application and assign a live production URL (e.g., `https://floww-ledgerx.vercel.app`).

*Note: The included `client/vercel.json` and `client/public/_redirects` automatically configure SPA rewrite rules, ensuring direct URL navigation, refreshes, and browser back/forward buttons never return 404 or blank pages.*

---

## Step 4: Connect Frontend & Backend (CORS & Cookies)

Now that your frontend has a live production domain:
1. Go back to your **Render Dashboard** $\rightarrow$ **Environment Variables**.
2. Update **`CLIENT_URL`** to match your exact Vercel URL (e.g., `https://floww-ledgerx.vercel.app`, with no trailing slash).
3. Save changes. Render will automatically redeploy with the updated CORS whitelist.

This ensures:
- Preflight CORS requests are accepted.
- Cross-origin credentials (`withCredentials: true`) and httpOnly cookies function properly.

---

## Step 5: Configure Razorpay Webhook

To ensure asynchronous payments (UPI apps, NetBanking callbacks, QR scans) are confirmed even if the student closes their browser window:
1. Log in to the [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Navigate to **Settings** $\rightarrow$ **Webhooks** $\rightarrow$ **Add New Webhook**.
3. Set the following fields:
   - **Webhook URL**: `https://floww-api.onrender.com/api/payment/webhook`
   - **Secret**: *(Enter the same secret string configured in your `RAZORPAY_WEBHOOK_SECRET`)*
   - **Active Events**: Check:
     - `payment.captured`
     - `payment.failed`
4. Click **Create Webhook**.

---

## Step 6: Post-Deployment Smoke Test

Once deployed, run through this 5-minute sanity test on your live URL:

1. **Health Ping**:
   Open `https://floww-api.onrender.com/api/health` in your browser.  
   *Expected Response:* `{"status":"ok","service":"Floww API"}`.

2. **Dean Login (Superuser Governance)**:
   - Open `https://floww-ledgerx.vercel.app/login`
   - Sign in as `super@demo.com` / `admin123`.
   - Verify institute-wide analytics dashboard loads with chart metrics.

3. **HOD Student Onboarding (Academic Department)**:
   - Log in as `super.cse@demo.com` / `admin123`.
   - Go to **Add Student** (`/superuser/add-student`).
   - Create a test student in Semester 3.
   - Verify cohort auto-calculation displays Year 2, Batch 2024-2028, and creates fee demands and caution money.

4. **Finance Admin Audit (Finance Operations)**:
   - Log in as `admin@demo.com` / `admin123`.
   - Open **General Ledger** (`/admin/ledger`).
   - Verify the double-entry assessment for the new student appears and balances (`Debit === Credit`).

5. **Student Payment & Defaulter Clearance**:
   - Log in as `geeta@demo.com` / `demo123`.
   - Verify Defaulter Clearance screen locks access until payment or compliance grace is resolved.
   - Make a test payment or resolve grace $\rightarrow$ verify immediate redirection to student dashboard.

6. **Browser Navigation & Deep Links**:
   - Navigate to `/admin/ledger`, reload the browser $\rightarrow$ *Must not show 404*.
   - Press the browser **Back** and **Forward** buttons $\rightarrow$ *Must remain on the app with zero blank screens*.

---

### 🎉 Your FLOWW (LedgerX) Platform is Officially Live!
