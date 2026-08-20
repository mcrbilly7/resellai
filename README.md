# ResellAI Accounts

Real user accounts, forgot/reset password, an admin panel, and email sending
through your own Gmail account. Built with Next.js (App Router), Prisma, and
Postgres — the standard stack for exactly what you asked for, and what
deploys cleanly to Vercel.

**Important: this is a separate project from the `resellai.html` / `resellai.jsx`
app you already have.** That app currently stores everything in the browser
(no accounts, no server). This project is the real accounts/database/email
backend. Wiring the two together — so signing in here actually gates access
to that app, and its data saves to this database instead of localStorage —
is the natural next step once this is deployed and working. Say the word and
we'll do that migration next.

## What's included

- Email/password signup and login (passwords hashed with bcrypt, sessions in
  an httpOnly cookie)
- Forgot password → emails a reset link → reset password page
- Settings page: edit name, toggle promotional emails, change password,
  **delete your own account**
- Admin panel (`/admin`): see every account, edit any field, delete
  accounts, and send an email to everyone / only promo-opted-in users /
  specific addresses
- **Teams** (`/team`): add workers by email, assign a role (Viewer / Buyer /
  Seller / Inventory manager) or fine-tune individual permissions, block or
  remove a worker at any time. Workers only ever see what you allow -
  earnings (cost/sale prices) stay hidden unless you turn that on for them.
- **Shared inventory** (`/inventory`): a real, permission-enforced inventory
  table backing the team feature - every read/write checks the requester's
  access on the server, not just in the UI.
- All emails send through your own Gmail account via an "App Password" (see
  below — this is the same mechanism you used before)

## 0. Your admin account

A seed script creates the initial admin account for you:

- Email: `resellaiallin1@gmail.com`
- Temporary password: `12345678`

It's forced to change that password the first time it logs in — logging in
with it goes straight to a "set a new password" screen before anything else
is accessible. Run the seed script after your database is set up (step 3
below): `npm run seed-admin`.

## 1. Get a database

You need a Postgres database. Two free options that work great with Vercel:

- **Vercel Postgres**: in your Vercel project, go to Storage → Create Database → Postgres. It gives you a `DATABASE_URL` automatically.
- **Neon** (neon.tech): free tier, works from anywhere. Copy its connection string.

Either way, you end up with a `DATABASE_URL` that looks like:
`postgresql://user:password@host/dbname?sslmode=require`

## 2. Get a Gmail "App Password" (the long key)

This is exactly what you did on your other site — Gmail won't accept your
normal password for this, it needs a special 16-character App Password:

1. Turn on 2-Step Verification on the Gmail account you want to send from, if it isn't already on: myaccount.google.com/security
2. Go to myaccount.google.com/apppasswords
3. Create a new App Password (name it "ResellAI" or similar)
4. Copy the 16-character code it gives you — that's `GMAIL_APP_PASSWORD`

## 3. Set up locally

```bash
npm install
cp .env.example .env
# edit .env: fill in DATABASE_URL, SESSION_SECRET, GMAIL_USER, GMAIL_APP_PASSWORD
npx prisma migrate dev --name init
npm run dev
```

Generate a `SESSION_SECRET` with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Visit `http://localhost:3000`, then create your admin account:
```bash
npm run seed-admin
```
Log in with `resellaiallin1@gmail.com` / `12345678` - you'll be asked to set
a real password immediately. (You can also promote any other account to
admin the same way as before: `npm run make-admin -- you@example.com`.)

## 4. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## 5. Deploy on Vercel

1. Go to vercel.com, "Add New Project", import your GitHub repo
2. In the project's Settings → Environment Variables, add every variable
   from `.env.example` with your real values (use your production
   `DATABASE_URL`, and set `APP_URL` to your actual Vercel URL, e.g.
   `https://your-app.vercel.app` — you can update this after the first
   deploy once you know the URL)
3. Deploy

After the first deploy, run the migration against your production database
once (from your local machine, with the production `DATABASE_URL` temporarily
in your `.env`):
```bash
npx prisma migrate deploy
```

Then create (or promote) your admin account the same way as above, pointed at production:
```bash
npm run seed-admin
```

## Notes on Gmail sending

Gmail's free sending has practical limits (roughly 500 emails/day per
account) and can flag high-volume or bulk-looking sends. This is fine for
transactional email (welcome, password reset) and modest announcement
sends. If you outgrow it, swapping `lib/email.js` for a dedicated sender
like Resend, Postmark, or SendGrid is a small, contained change — everything
else in this project stays the same.

## Project structure

```
app/
  login/, signup/, forgot-password/, reset-password/, change-password/,
  settings/, admin/, team/, inventory/                -> pages
  api/auth/...        -> signup, login, logout, forgot-password, reset-password
  api/user/...         -> get/update own settings, change password, delete own account
  api/admin/...         -> list/edit/delete any user, send bulk email
  api/team/...           -> list/add/edit/remove workers, list accounts you work for
  api/items/...          -> shared inventory CRUD + buy/sell actions, all permission-checked
lib/
  db.js               -> Prisma client
  auth.js             -> password hashing, sessions
  email.js            -> Gmail sending via Nodemailer
  roles.js            -> role presets (Viewer/Buyer/Seller/Inventory manager)
  permissions.js      -> resolves what a worker can see/do on an owner's account
prisma/schema.prisma   -> User, Membership (team/roles), Item (inventory), PasswordResetToken
scripts/
  seed-admin.js       -> creates the resellaiallin1@gmail.com admin account
  make-admin.js       -> promotes any existing account to admin
```
