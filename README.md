# ♟️ My Chess Work Manager

A private, modern Progressive Web App (PWA) designed for chess coaches and tutors to track daily classes, demo sessions, homework assignments, class statistics, and generate instant, beautifully formatted WhatsApp daily reports.

---

## 🌟 Features

- **Daily Class & Demo Tracking**: Record class time, student name/batch, topic covered, homework given, and classify as *General* or *Demo* class.
- **Dynamic 7-Day Color Themes**: Visual weekday recognition with distinct color accents for Monday through Sunday.
- **Instant WhatsApp Formatted Reports**: 1-click copy for clean daily reports formatted for WhatsApp or messaging apps.
- **Class & Demo Hours Statistics**: Track completed classes, demo sessions, and total teaching duration across custom tracking periods (Today, Weekly, Monthly, All-time).
- **Secure Batch Deletion**: Two-step PIN-protected deletion (`DELETE_PIN`) verified on the backend to prevent accidental removals.
- **Offline First & Local Storage Fallback**: Works completely offline using local device storage and automatically syncs when online.
- **Supabase Cloud Sync & Authentication**: Optional cloud database sync with Row-Level Security (RLS) policies for multi-device access.
- **Installable PWA**: Install on mobile (iOS & Android) and Desktop (Chrome, Edge, Safari) with offline service worker support.

---

## 📋 Prerequisites

Before running the project locally, ensure you have:

- **Node.js**: Version 18.0.0 or higher (Node 20+ or 22+ recommended)
- **npm** (or **bun** / **yarn** / **pnpm**)
- (Optional) A free [Supabase](https://supabase.com) account for cloud database sync

---

## ⚙️ Environment Configuration

1. Create a `.env` file in the root directory by copying `.env.example`:

   ```bash
   cp .env.example .env
   ```

2. Configure the following variables in `.env`:

   ```env
   # Secure Batch Deletion PIN (default: 0000)
   DELETE_PIN="0000"

   # Optional: Supabase Database Cloud Sync
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-public-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

   # Optional: Gemini API Key (if AI features are enabled)
   GEMINI_API_KEY=""
   ```

> **Note**: If Supabase variables are left empty, the application runs seamlessly in **Local / Offline Mode**, storing all batches safely in your browser's local storage.

---

## 🚀 How to Run Locally

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Development Server

```bash
npm run dev
```

- The server starts on **http://localhost:3000** (or `http://0.0.0.0:3000`).
- The dev server runs Express with Vite middleware, supporting hot module compilation and backend API routes (`/api/*`).

### 3. Type Check & Lint

To verify that there are no TypeScript or syntax issues:

```bash
npm run lint
```

---

## 🗄️ Database Setup (Supabase - Optional)

If you wish to enable cross-device cloud sync:

1. Sign in to [Supabase](https://supabase.com) and create a new project.
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Paste and run the following SQL query:

```sql
-- ♟️ MY CHESS WORK MANAGER: POSTGRESQL TABLE & RLS POLICIES
create table if not exists batches (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  work_date date not null,
  start_time text not null,
  end_time text not null,
  class_name text not null,
  topic text not null,
  homework text default '',
  class_type text check (class_type in ('general', 'demo')) not null default 'general',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for fast queries by user and date
create index if not exists idx_batches_user_date on batches(user_id, work_date);

-- Enable Row Level Security (RLS)
alter table batches enable row level security;

-- Strict private user isolation policies
create policy "Users can view their own batches"
on batches for select
using (auth.uid() = user_id);

create policy "Users can insert their own batches"
on batches for insert
with check (auth.uid() = user_id);

create policy "Users can update their own batches"
on batches for update
using (auth.uid() = user_id);

create policy "Users can delete their own batches"
on batches for delete
using (auth.uid() = user_id);
```

4. Retrieve your **Project URL** and **anon public key** from *Project Settings > API*, and add them into your `.env` or paste them into the in-app Supabase Setup modal (click the database icon in the navigation bar).

---

## 🏗️ How to Build for Production

Run the production build script:

```bash
npm run build
```

This compiles:
1. The frontend static assets via `vite build` into `dist/`.
2. The server entrypoint via `esbuild` into a self-contained bundle `dist/server.cjs`.

### Test the Production Build Locally

```bash
npm start
```

Open `http://localhost:3000` to verify the production build.

---

## 🚢 How to Publish & Deploy

### Option 1: AI Studio One-Click Deploy (Google Cloud Run)
If you are using Google AI Studio:
1. Click **Deploy** or **Share** in the top-right corner of Google AI Studio.
2. Select **Cloud Run** as the deployment target.
3. Set your environment secrets (`DELETE_PIN`, `VITE_SUPABASE_URL`, etc.) under the project settings.
4. Your application will be live at a public `https://*.run.app` URL with automatic SSL and scaling.

---

### Option 2: Docker / Container Deployment (Cloud Run, AWS, DigitalOcean, VPS)

Create a `Dockerfile` in the project root:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/server.cjs"]
```

Build and run the container:

```bash
docker build -t chess-work-manager .
docker run -p 3000:3000 -e DELETE_PIN="0000" chess-work-manager
```

---

### Option 3: Deploy to Render / Railway / Fly.io

1. **Repository**: Push your repository to GitHub.
2. **Build Command**: `npm run build`
3. **Start Command**: `npm start`
4. **Port**: Set port to `3000` (or allow the platform to bind `$PORT`).
5. **Environment Variables**: Add `DELETE_PIN`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` in the service dashboard.

---

### Option 4: Static Hosting (Vercel / Netlify)
If you only need client-side local storage without the Node.js backend:
1. **Build Command**: `vite build`
2. **Output Directory**: `dist`
3. Configure environment variables in the Vercel/Netlify dashboard with the `VITE_` prefix.

---

## 📱 How to Install the PWA on Devices

### Android (Google Chrome)
1. Open the app URL in Google Chrome.
2. Tap the **"Install App"** banner at the bottom or top of the page, or tap Chrome's three dots menu (`⋮`) and select **"Add to Home screen"** or **"Install app"**.
3. The app icon will appear on your home screen and run full-screen without browser address bars.

### iOS (Apple Safari)
1. Open the app URL in Safari.
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and select **"Add to Home Screen"**.
4. Tap **Add** in the top-right corner.

### Desktop (Chrome / Edge)
1. Navigate to the app URL.
2. Click the **Install** icon in the browser address bar (top right), or click the **"Install App"** button in the app navigation bar.
3. Launch directly as a standalone desktop application.

---

## 🔒 Security Note: Batch Deletion PIN

Batch deletion requires a security PIN verification.
- The default PIN is `0000`.
- To change the PIN, update the `DELETE_PIN` variable in your `.env` file or hosting environment variables:
  ```env
  DELETE_PIN="9876"
  ```
- The PIN is strictly verified on the backend (`/api/batches/delete` and `/api/verify-delete-pin`) and is never leaked to the client bundle.

---

## 📁 Project Structure

```
├── public/                 # Static assets, PWA icons, manifest
├── src/
│   ├── components/         # UI sub-components (BatchCard, StatsTracker, etc.)
│   ├── hooks/              # Custom hooks (PWA install prompt)
│   ├── lib/                # Utilities (dateUtils, storage, supabase, themes)
│   ├── types.ts            # TypeScript interfaces and data models
│   ├── App.tsx             # Main dashboard view
│   ├── main.tsx            # React application entry point
│   └── index.css           # Tailwind CSS imports and global styles
├── server.ts               # Express backend & Vite middleware
├── vite.config.ts          # Vite & PWA configuration
├── package.json            # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

---

## 📜 License

Apache-2.0
