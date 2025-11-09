# Design Document

## Overview

This design addresses 61 TypeScript compilation errors in the TriviaNFT codebase. The errors are categorized into 10 distinct types, each requiring a specific fix strategy. The approach prioritizes minimal code changes while ensuring type safety and maintaining existing functionality.

### Error Categories

1. **Property Naming Mismatches** (16 errors): Database snake_case vs TypeScript camelCase
2. **Unused Variables** (24 errors): Variables declared but never used
3. **Missing Exports** (1 error): verifyJWT not exported from jwt.js
4. **API Gateway Event Types** (2 errors): Wrong event type for authorizer
5. **Enum Type Mismatches** (4 errors): String literals vs enum types
6. **Generic Type Constraints** (2 errors): Type T doesn't satisfy QueryResultRow
7. **JWT Payload Access** (2 errors): Accessing properties on Promise instead of awaited result
8. **Missing Interface Properties** (3 errors): tier and attributes missing from NFTCatalog
9. **Unknown Type Handling** (1 error): ipfsResult is of type unknown
10. **Optional Parameter Handling** (2 errors): Passing undefined where string required

## Architecture

### Fix Strategy

The fixes will be applied in dependency order to minimize compilation errors during the process:

1. **Phase 1: Type Definitions** - Fix interfaces, enums, and exports
2. **Phase 2: Database Layer** - Fix generic constraints and property mappings
3. **Phase 3: Service Layer** - Fix property access and type usage
4. **Phase 4: Handler Layer** - Fix event types and parameter handling
5. **Phase 5: Cleanup** - Remove unused variables and imports

### Affected Files

**Shared Types** (packages/shared):
- `src/types/index.ts` - Add missing interface properties and enum values

**Database Layer** (services/api):
- `src/db/connection.ts` - Fix generic type constraints

**Utilities** (services/api):
- `src/utils/jwt.ts` - Export verifyJWT function

**Services** (services/api):
- `src/services/auth-service.ts` - Fix property naming (16 occurrences)
- `src/services/forge-service.ts` - Fix enum types and remove unused imports
- `src/services/question-service.ts` - Fix enum type
- `src/services/season-service.ts` - Remove unused variable

**Handlers** (services/api):
- `src/handlers/auth/authorizer.ts` - Fix event type and export
- `src/handlers/mint/get-eligibilities.ts` - Fix JWT payload access
- `src/handlers/mint/workflow/select-nft.ts` - Fix property access
- `src/handlers/mint/workflow/upload-to-ipfs.ts` - Fix unknown type
- `src/handlers/mint/workflow/check-confirmation.ts` - Remove unused variable
- `src/handlers/mint/workflow/submit-transaction.ts` - Remove unused variable
- `src/handlers/leaderboard/get-category.ts` - Fix optional parameter
- `src/handlers/leaderboard/get-global.ts` - Fix optional parameter
- `src/handlers/seasons/get-current.ts` - Remove unused imports
- `src/handlers/forge/workflow/*.ts` - Remove unused variables (11 files)

**Tests** (services/api):
- `src/__tests__/integration/minting-flow.test.ts` - Fix property access and remove unused variables
- `src/__tests__/integration/forging-flow.test.ts` - Remove unused import

## Components and Interfaces

### 1. Type Definition Updates

**NFTCatalog Interface Enhancement**:
```typescript
// packages/shared/src/types/index.ts
export interface NFTCatalog {
  id: string;
  categoryId: string;
  name: string;
  s3ArtKey: string;
  s3MetaKey: string;
  ipfsCid?: string;
  isMinted: boolean;
  mintedAt?: Date;
  // ADD THESE:
  tier?: string;
  attributes?: Record<string, any>;
}
```

**Enum Definitions**:
```typescript
// Ensure these enums exist and are exported
export enum ForgeType {
  CATEGORY = 'category',
  MASTER = 'master',
  SEASON = 'season'
}

export enum QuestionSource {
  BEDROCK = 'bedrock',
  MANUAL = 'manual'
}
```

### 2. Database Connection Generic Fix

**Problem**: Generic type T doesn't satisfy QueryResultRow constraint

**Solution**: Add explicit constraint to generic parameter
```typescript
// src/db/connection.ts
import { QueryResultRow } from 'pg';

// Change from:
async query<T>(sql: string, params?: any[]): Promise<T[]>

// To:
async query<T extends QueryResultRow>(sql: string, params?: any[]): Promise<T[]>
```

### 3. JWT Utility Export

**Problem**: verifyJWT is not exported

**Solution**: Ensure function is exported
```typescript
// src/utils/jwt.ts
export async function verifyJWT(token: string): Promise<JWTPayload> {
  // existing implementation
}
```

### 4. API Gateway Authorizer Event Type

**Problem**: Using wrong event type (missing routeArn property)

**Solution**: Use correct event type for HTTP API
```typescript
// src/handlers/auth/authorizer.ts
import { 
  APIGatewayRequestAuthorizerEventV2,
  APIGatewayAuthorizerResult 
} from 'aws-lambda';

export async function handler(
  event: APIGatewayRequestAuthorizerEventV2
): Promise<APIGatewayAuthorizerResult> {
  // Access event.routeArn correctly
}
```

### 5. Property Naming Mapping Strategy

**Problem**: Database returns snake_case, TypeScript expects camelCase

**Solution**: Map properties in query result processing

**Option A - SQL Alias** (Preferred):
```typescript
// In auth-service.ts
const result = await db.query<Player>(`
  SELECT 
    id,
    stake_key as "stakeKey",
    anon_id as "anonId",
    username,
    email,
    created_at as "createdAt",
    last_seen_at as "lastSeenAt"
  FROM players
  WHERE stake_key = $1
`, [stakeKey]);
```

**Option B - Manual Mapping**:
```typescript
// Transform after query
const dbRow = await db.query(...);
const player: Player = {
  id: dbRow.id,
  stakeKey: dbRow.stake_key,
  anonId: dbRow.anon_id,
  createdAt: dbRow.created_at,
  lastSeenAt: dbRow.last_seen_at,
  username: dbRow.username,
  email: dbRow.email
};
```

**Decision**: Use Option A (SQL aliases) for cleaner code and better performance.

### 6. JWT Payload Access Fix

**Problem**: Accessing .sub on Promise<JWTPayload> instead of JWTPayload

**Solution**: Await the promise before property access
```typescript
// src/handlers/mint/get-eligibilities.ts

// Change from:
const payload = verifyJWT(token);
const stakeKey = payload.sub;

// To:
const payload = await verifyJWT(token);
const stakeKey = payload.sub;
```

### 7. Enum Type Usage

**Problem**: Using string literals where enum types expected

**Solution**: Use enum members
```typescript
// src/services/forge-service.ts

// Change from:
type: 'category'

// To:
type: ForgeType.CATEGORY

// Or if ForgeType is a union type:
type: 'category' as ForgeType
```

### 8. Unknown Type Handling

**Problem**: ipfsResult is of type unknown

**Solution**: Add type assertion with validation
```typescript
// src/handlers/mint/workflow/upload-to-ipfs.ts

// Change from:
const cid = ipfsResult.ipfs_hash;

// To:
interface IPFSResult {
  ipfs_hash: string;
  name: string;
  size: string;
}

const result = ipfsResult as IPFSResult;
const cid = result.ipfs_hash;
```

### 9. Optional Parameter Handling

**Problem**: Passing string | undefined where string required

**Solution**: Add null check or default value
```typescript
// src/handlers/leaderboard/get-category.ts

// Change from:
const seasonId = event.queryStringParameters?.seasonId;
await leaderboardService.getCategoryLadder(categoryId, seasonId, limit, offset);

// To:
const seasonId = event.queryStringParameters?.seasonId || 'current';
await leaderboardService.getCategoryLadder(categoryId, seasonId, limit, offset);

// Or with validation:
if (!seasonId) {
  return {
    statusCode: 400,
    body: JSON.stringify({ error: 'seasonId is required' })
  };
}
```

### 10. Unused Variable Removal

**Strategy**: Remove all unused variables while preserving code structure

**Examples**:
```typescript
// Remove unused imports
import { vi } from 'vitest'; // REMOVE if not used

// Remove unused destructured parameters
const { forgeId, stakeKey } = event; // REMOVE if not used

// Remove unused variables
const testCatalogId = 'test-123'; // REMOVE if not used

// Keep structure but remove unused
const { burnTxHash } = event; // If only burnTxHash unused, remove entire line
```

## Data Models

No data model changes required. All fixes are type-level corrections.

## Error Handling

### Compilation Error Prevention

1. **Incremental Compilation**: Run `pnpm type-check` after each phase
2. **Rollback Strategy**: Keep git commits small for easy rollback
3. **Test Validation**: Run tests after each phase to ensure no runtime breaks

### Runtime Safety

1. **Type Assertions**: Only use type assertions where runtime validation exists
2. **Optional Chaining**: Use ?. for optional properties
3. **Null Checks**: Add explicit checks before passing to functions requiring non-null

## Testing Strategy

### Validation Steps

1. **Type Check**: `pnpm type-check` must pass with 0 errors
2. **Unit Tests**: `pnpm test` must pass all existing tests
3. **Integration Tests**: Verify auth, minting, and forging flows still work
4. **Build**: `pnpm build` must complete successfully

### Test Coverage

- No new tests required (fixing existing code)
- Existing tests must continue to pass
- Integration tests validate runtime behavior unchanged

## Implementation Notes

### File-by-File Approach

1. Start with shared types (affects all other files)
2. Fix database layer (affects services)
3. Fix services (affects handlers)
4. Fix handlers (leaf nodes)
5. Fix tests last

### Verification Commands

```bash
# Check specific file
npx tsc --noEmit services/api/src/services/auth-service.ts

# Check all
pnpm type-check

# Run tests
pnpm test

# Build
pnpm build
```

### Risk Mitigation

- **Low Risk**: Unused variable removal (no runtime impact)
- **Medium Risk**: Property naming (could break if SQL aliases wrong)
- **High Risk**: Type assertions (could cause runtime errors if wrong)

**Mitigation**: Test thoroughly after property naming and type assertion changes.
