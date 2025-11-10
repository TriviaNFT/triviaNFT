# Project Structure

## Monorepo Organization

```
trivia-nft-game/
├── apps/                    # User-facing applications
│   ├── web/                # Expo Web PWA
│   └── mobile/             # Expo Mobile (iOS/Android)
├── services/               # Backend services
│   └── api/                # Lambda functions (REST API)
├── packages/               # Shared code
│   └── shared/             # Types, utilities, Zod schemas
├── infra/                  # AWS CDK infrastructure
├── docs/                   # Documentation
├── load-tests/             # Performance testing
└── dist/                   # Build output
```

## Workspace Naming

All workspaces use the `@trivia-nft/*` scope:
- `@trivia-nft/web`
- `@trivia-nft/mobile`
- `@trivia-nft/api`
- `@trivia-nft/shared`
- `@trivia-nft/infra`

## Key Directories

### `/apps/web` & `/apps/mobile`
- Expo applications with expo-router for file-based routing
- Share most code; web includes Playwright E2E tests
- Use `@trivia-nft/shared` for types and utilities

### `/services/api`
- Lambda function handlers in TypeScript
- ES modules with `"type": "module"`
- PostgreSQL migrations in `migrations/`
- Seeding scripts in `scripts/`
- Builds to `dist/` for Lambda deployment

### `/packages/shared`
- Shared TypeScript types and interfaces
- Zod validation schemas
- Common utilities
- Consumed by all apps and services

### `/infra`
- AWS CDK stacks and constructs
- Infrastructure as Code (TypeScript)
- Deployment scripts (PowerShell for Windows)
- CDK outputs in `outputs.json`
- Synthesized CloudFormation in `cdk.out/`

### `/docs`
- API documentation (REST endpoints, schemas)
- Deployment guides (staging, production)
- User guides and FAQs

### `/load-tests`
- Performance and load testing scenarios
- Separate package with own dependencies

## Configuration Files

### Root Level
- `pnpm-workspace.yaml`: Workspace definitions
- `tsconfig.base.json`: Base TypeScript config (extended by workspaces)
- `package.json`: Root scripts and shared devDependencies
- `.eslintrc.json`, `.prettierrc.json`: Code style configs
- `vitest.config.ts`: Test configuration
- `docker-compose.yml`: Local development services

### Workspace Level
Each workspace has its own:
- `package.json`: Dependencies and scripts
- `tsconfig.json`: Extends base config
- Build output in local `dist/` or `build/`

## Build Outputs

- **Apps**: `apps/*/dist` or `apps/*/build`
- **Services**: `services/*/dist` (for Lambda deployment)
- **Packages**: `packages/*/dist` (compiled TypeScript)
- **Infrastructure**: `infra/cdk.out` (synthesized CloudFormation)

## Important Conventions

- All TypeScript with strict mode enabled
- ES modules for API services (`"type": "module"`)
- Workspace dependencies use `workspace:*` protocol
- Build artifacts excluded from git (in `.gitignore`)
- Infrastructure outputs stored in `infra/outputs.json`
