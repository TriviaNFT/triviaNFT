# Technology Stack — TriviaNFT

## Overview

TriviaNFT is a **serverless**, **type-safe**, Cardano‑integrated trivia platform delivered as a **PWA (web)** and **native (mobile)** app from a single Expo codebase. The backend runs on AWS (API Gateway + Lambda), with **Aurora Serverless v2 (PostgreSQL)** for persistence and **ElastiCache Redis** for session state and leaderboards. Infrastructure is provisioned with **AWS CDK**. Shared **Zod** schemas and TypeScript types ensure end‑to‑end correctness.

---

## Build System

- **Package Manager:** `pnpm` v8+ (workspaces)
- **Node:** 20.x (ESM)
- **Monorepo layout:** `apps/`, `services/`, `packages/`, `infra/`, `docs/`
- **TypeScript:** 5.3+ in **strict** mode across all workspaces
- **Env config:** `.env.local` per app; any public web value must be prefixed `EXPO_PUBLIC_`

---

## Frontend

### Universal App with Expo
- **Framework:** Expo `~50.0.0`
- **Navigation:** `expo-router` (file‑based routes)
- **UI:** React 18.2.0, React Native 0.73.0, **NativeWind** (Tailwind for RN)
- **Design targets:** Responsive PWA + mobile

### Web (PWA)
- **Bundler:** **Webpack** via `@expo/webpack-config` (**not** Metro)
- **Dev:** `pnpm --filter @trivia-nft/web dev` → Expo Webpack Dev Server (commonly `http://localhost:19006`)
- **Build output:** Static site (`apps/web/dist`) for **S3 + CloudFront**
- **PWA:** Service worker & manifest via Expo Web

#### Webpack polyfills (required)
> Webpack 5 no longer polyfills Node built‑ins by default.

Install (dev): `crypto-browserify`, `stream-browserify`, `buffer`, `process`

In `apps/web/webpack.config.js`:
```js
const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const { ProvidePlugin } = require('webpack');

module.exports = async (env, argv) => {
  const config = await createExpoWebpackConfigAsync(env, argv);

  config.resolve.fallback = {
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer'),
    process: require.resolve('process/browser'),
  };

  config.plugins.push(
    new ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    })
  );

  return config;
};
```
At app entry (once) if you use UUIDs/random values:
```ts
import 'react-native-get-random-values';
```

**Assets:** Prefer `.png`/`.webp` for favicons/icons and ensure paths exist:
```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "web": { "favicon": "./public/favicon.png" }
  }
}
```

### Mobile (iOS/Android)
- **Bundler:** **Metro** (Expo Go / EAS)
- **Use Metro only for native** development & builds

### Wallets & Auth (Web/Mobile)
- **Cardano wallets:** CIP‑30 (and compatible connectors)
- **Auth:** Signed wallet flow + **JWT**; client stores short‑lived tokens
- **Networks:** `preprod` (test) and mainnet

### Testing
- **E2E (web):** Playwright
- **Unit:** Vitest (all packages)
- **Lint/format:** ESLint + Prettier (enforced in CI)

---

## Backend

### Runtime & Style
- **AWS Lambda** (Node 20.x), **TypeScript** (`"type":"module"`)
- **Validation:** **Zod** (shared schemas → runtime validation + TS inference)
- **HTTP:** Lightweight handlers behind API Gateway (REST)

### Data Layer
- **Primary DB:** **Aurora Serverless v2 (PostgreSQL 15)**
  - Connection pooling via **RDS Proxy**
  - Migrations: `node-pg-migrate`
- **Cache/State:** **ElastiCache Redis**
  - Session state, daily limits, cooldowns, seen‑question sets
  - Leaderboards via sorted sets (composite score)

### Blockchain & AI
- **Cardano:** Mint/burn & forging; Blockfrost API; Lucid for tx building
- **IPFS:** Blockfrost IPFS (primary) / NFT.Storage (fallback)
- **AI questions:** **AWS Bedrock** (Claude family) → JSON → S3 → indexed to DB

### Security
- **Secrets:** **AWS Secrets Manager** (JWT, DB creds, Blockfrost keys, policy keys)
- **AuthZ:** JWT (short‑lived) with wallet claims
- **Network:** VPC for Lambda→Aurora/Redis; locked security groups
- **WAF:** Rate limiting + CAPTCHA for suspicious traffic
- **CORS:** Allowed origins only; preflight set at API Gateway

---

## Infrastructure & Deployment

### Infrastructure as Code
- **Tool:** **AWS CDK** (TypeScript)
- **Stacks (typical):**
  - **WebStack:** S3 (static web), CloudFront (CDN, TLS, WAF)
  - **ApiStack:** API Gateway (REST), Lambda functions, JWT authorizer
  - **DataStack:** Aurora Serverless v2 + RDS Proxy, ElastiCache Redis
  - **WorkflowStack:** Step Functions (mint/forge)
  - **ObservabilityStack:** CloudWatch dashboards/alarms, X‑Ray
  - **SecurityStack:** WAF, Secrets Manager, IAM roles/policies
- **Outputs:** `infra/outputs.json` consumed during web build to inject API URLs, distribution IDs, etc.

### Deploy Targets
- **Web:** Upload `apps/web/dist` → **S3**, fronted by **CloudFront** (Brotli/Gzip, caching)
- **API:** Packaged Lambda bundles from `services/api/dist`
- **DNS:** Route 53 → CloudFront (A/AAAA), ACM for certs

### CI/CD (recommended)
- **GitHub Actions** (OIDC to AWS) or CodeBuild/CodePipeline
  - Jobs: type‑check → lint → unit → web build → upload S3 → CloudFront invalidation → CDK deploy
- **Bundle size guard:** keep zipped Lambda < 50 MB; prefer modular AWS SDK v3 clients and tree‑shaking

---

## Local Development

### Quick Start
```bash
# 1) Install
pnpm install

# 2) Start local services (docker compose)
docker compose up -d        # postgres:5432, redis:6379

# 3) API
pnpm --filter @trivia-nft/api dev

# 4) Web (Webpack dev server)
pnpm --filter @trivia-nft/web dev
```

### Environment Variables

**Web (`apps/web/.env.local`):**
```env
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_CARDANO_NETWORK=preprod
EXPO_PUBLIC_ENVIRONMENT=development
```

**API (local/dev):**
```env
POSTGRES_URL=postgres://postgres:postgres@localhost:5432/trivianft
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace-me-in-secrets-manager
BLOCKFROST_PROJECT_ID=xxx
```
> In cloud, these come from **Secrets Manager** and are injected as Lambda env vars.

### Windows Tips
- Prefer **WSL2 (Ubuntu)** for best file‑watching & symlink compatibility.
- **Use Webpack for web**; Metro is only for native.

---

## Shared Packages

### `@trivia-nft/shared`
- **Types & Schemas:** Player, Session, Question, Eligibility, Mint/Forge
- **Zod schemas:** Shared across API and clients (single source of truth)
- **Utils:** Time/countdown helpers, error classes, crypto/JWT helpers

---

## Observability & Reliability

- **CloudWatch Dashboards:** API latency/error rate/throughput; DB/Redis health; blockchain tx success
- **Alarms:** API 5xx/error %, Lambda errors/concurrency, DB connection failures, Step Functions failures
- **Tracing:** AWS X‑Ray on API & workflows
- **Logs:** Structured JSON (correlation IDs), PII‑safe, 30‑day retention
- **DR/Backups:** Aurora snapshots (PITR), Redis backups, cross‑region copy (selected resources)

---

## Performance & Cost

- **Web:** CloudFront caching, Brotli, long‑cache static assets; route‑based code splitting
- **API:** Redis caching & rate limiting; optional provisioned concurrency for hot paths
- **DB:** Aurora Serverless v2 auto‑scaling (min 0.5 ACUs), RDS Proxy pooling
- **Redis:** Cluster mode for leaderboards; encryption in‑transit/at‑rest

---

## Commands (Reference)

```bash
# Install
pnpm install

# Dev (root or targeted)
pnpm dev
pnpm --filter @trivia-nft/web dev
pnpm --filter @trivia-nft/mobile dev
pnpm --filter @trivia-nft/api dev

# Build
pnpm build
pnpm --filter @trivia-nft/web build
pnpm --filter @trivia-nft/api build

# Type checking / Lint / Format / Tests
pnpm type-check
pnpm lint
pnpm format
pnpm format:check
pnpm test
pnpm test:watch

# Infra (CDK)
pnpm --filter @trivia-nft/infra synth
pnpm --filter @trivia-nft/infra deploy

# DB (API workspace)
pnpm --filter @trivia-nft/api migrate:up
pnpm --filter @trivia-nft/api migrate:create add_leaderboard_column
pnpm --filter @trivia-nft/api seed:all
```

---

## Version Matrix (locked)

- **Node:** 20.x
- **pnpm:** 8.x
- **Expo:** ~50
- **React:** 18.2
- **React Native:** 0.73
- **TypeScript:** 5.3+

---

## Conventions

- **ESM everywhere** (`"type":"module"`)
- **Strict TS** (no implicit any; no unused locals/params)
- **Zod-first** schemas → inferred TS types
- **Workspace protocol:** `workspace:*` for internal deps
- **Artifacts:** `apps/*/dist`, `services/*/dist`, `infra/cdk.out`
- **Infra outputs:** `infra/outputs.json` consumed at web build time

---

## Notes & Gotchas

- **Webpack vs Metro:** Web uses **Webpack**; **Metro is only for native**. If you see a manifest JSON page, you likely hit the wrong dev server or need polyfills.
- **Favicon errors:** Use `.png` for web favicons and ensure paths exist.
- **Lambda sizes:** Keep zipped bundle < 50 MB; tree‑shake, avoid bundling monolithic deps.
- **Secrets:** Never commit; store in **Secrets Manager**; inject via Lambda env.
