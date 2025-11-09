# TriviaNFT

Blockchain-based trivia gaming platform built on Cardano that rewards players with NFTs for perfect gameplay.

## Project Structure

This is a monorepo managed with pnpm workspaces:

```
trivia-nft-game/
├── apps/
│   ├── web/          # Expo Web PWA
│   └── mobile/       # Expo Mobile App
├── services/
│   └── api/          # Lambda functions
├── packages/
│   └── shared/       # Shared types and utilities
└── infra/            # AWS CDK infrastructure
```

## Prerequisites

- Node.js 20+
- pnpm 8+
- AWS CLI (for infrastructure deployment)

## Getting Started

### Install dependencies

```bash
pnpm install
```

### Development

Run all apps in development mode:

```bash
pnpm dev
```

### Build

Build all packages:

```bash
pnpm build
```

### Linting and Formatting

```bash
pnpm lint
pnpm format
pnpm format:check
```

### Testing

```bash
pnpm test
pnpm test:watch
```

### Type Checking

```bash
pnpm type-check
```

## Workspace Commands

Run commands in specific workspaces:

```bash
# Web app
pnpm --filter @trivia-nft/web dev

# Mobile app
pnpm --filter @trivia-nft/mobile dev

# API services
pnpm --filter @trivia-nft/api build

# Infrastructure
pnpm --filter @trivia-nft/infra synth
```

## CI/CD

GitHub Actions workflow runs on push and pull requests:
- Linting
- Type checking
- Testing
- Building

## License

Private - All rights reserved
