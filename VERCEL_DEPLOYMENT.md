# Vercel Deployment Guide — HAB Outreach Dashboard

This project is built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Prisma ORM**, specifically optimized for zero-configuration deployment to **Vercel**.

---

## 1. Quick Deploy to Vercel (Recommended)

### Step 1: Push to GitHub / GitLab
Create a new GitHub repository and push this codebase:

```bash
cd /Users/zains/.gemini/antigravity/scratch/hab-outreach-dashboard
git init
git add .
git commit -m "Initial commit: HAB Outreach Dashboard"
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git branch -M main
git push -u origin main
```

### Step 2: Import into Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Select your GitHub repository.
4. Framework Preset: **Next.js** (detected automatically).

---

## 2. Environment Variables in Vercel

In the Vercel Project Settings, add the following Environment Variables:

| Variable | Recommended Provider | Example Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | **Neon / Supabase / Vercel Postgres** | `postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | Secure Random Key | `hab-outreach-dashboard-secret-key-super-secure-2026` |
| `NEXT_PUBLIC_APP_URL` | Vercel Domain | `https://your-hab-dashboard.vercel.app` |

> **Tip for Database:**
> If you don't have a PostgreSQL database yet, you can create one in 30 seconds for free on [Neon.tech](https://neon.tech) or [Supabase.com](https://supabase.com). Copy the pooled connection string and paste it as `DATABASE_URL`.

---

## 3. Build & Output Settings

In Vercel **Project Settings → General → Build & Development Settings**:

* **Build Command**: `prisma generate && next build`
* **Output Directory**: `.next` (default)
* **Install Command**: `npm install` (default)

---

## 4. Initial Database Migration & Seeding in Production

After your Vercel deployment completes, push your schema and seed the initial HAB team accounts & real data:

```bash
# Push schema to production Postgres
npx prisma db push

# Seed production with Humza, Zain, Fatima, Minahil, Amna, Maryam, Sophia & sheet data
node prisma/seed.js
```

---

## 5. Seed User Logins

| Name | Role | Email | Password |
| :--- | :--- | :--- | :--- |
| **Humza** | Owner | `humza@hiraalibeauty.com` | `password123` |
| **Zain** | Manager | `zain@hiraalibeauty.com` | `password123` |
| **Amna** | Executor | `amna@hiraalibeauty.com` | `password123` |
| **Fatima** | Executor | `fatima@hiraalibeauty.com` | `password123` |
| **Minahil** | Executor | `minahil@hiraalibeauty.com` | `password123` |
| **Sophia** | Executor | `sophia@hiraalibeauty.com` | `password123` |
| **Maryam** | Executor | `maryam@hiraalibeauty.com` | `password123` |

*(You can also use the 1-click Quick Profile buttons on the login page or the navbar user switcher to test any role instantly).*
