# Inngest Quick Start

## ✅ What's Done

- ✅ Inngest SDK installed (v3.46.0)
- ✅ Inngest client created (`src/lib/inngest.ts`)
- ✅ Environment variables configured (placeholders)
- ✅ Verification script ready (`pnpm verify:inngest`)

## 🚀 Quick Setup (5 minutes)

### 1. Create Account
```
https://www.inngest.com/ → Sign Up
```

### 2. Create App
```
Dashboard → Create App → Name: "trivia-nft"
```

### 3. Get Keys
```
Dashboard → Your App → Settings → Keys
- Copy Event Key
- Copy Signing Key
```

### 4. Update Local Environment
Edit `services/api/.env.local`:
```bash
INNGEST_EVENT_KEY=your_actual_event_key
INNGEST_SIGNING_KEY=your_actual_signing_key
```

### 5. Verify
```bash
cd services/api
pnpm verify:inngest
```

Should show: ✅ All checks passed!

## 🔗 Connect to Vercel

### Option A: Automatic (Recommended)
```
Inngest Dashboard → Integrations → Connect Vercel
→ Select your project → Done!
```

### Option B: Manual
```
Vercel Dashboard → Your Project → Settings → Environment Variables
→ Add INNGEST_EVENT_KEY (all environments)
→ Add INNGEST_SIGNING_KEY (all environments)
```

## 🧪 Local Development

No keys needed for local dev! Just run:
```bash
npx inngest-cli@latest dev
```

Opens UI at: http://localhost:8288

## 📖 Full Documentation

- Setup Guide: `INNGEST_SETUP.md`
- Task Summary: `INNGEST_TASK_SUMMARY.md`
- Inngest Docs: https://www.inngest.com/docs

## ⚡ Next Tasks

1. ✅ Task 3 - Inngest setup (DONE)
2. ➡️ Task 4 - Configure Vercel environment variables
3. ➡️ Task 8 - Create Inngest API endpoint
4. ➡️ Task 9 - Implement mint workflow
5. ➡️ Task 10 - Implement forge workflow
