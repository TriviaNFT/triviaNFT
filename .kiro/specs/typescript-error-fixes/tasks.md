# Implementation Plan

- [x] 1. Fix shared type definitions and enums




  - Add tier and attributes properties to NFTCatalog interface
  - Verify ForgeType enum has CATEGORY, MASTER, SEASON values
  - Verify QuestionSource enum has BEDROCK, MANUAL values
  - Export all enums properly
  - _Requirements: 5, 8_

- [x] 2. Fix database connection generic constraints

  - Add QueryResultRow constraint to generic type T in query methods
  - Import QueryResultRow from 'pg' package
  - Test that database queries still compile
  - _Requirements: 6_

- [x] 3. Export verifyJWT function from jwt utility

  - Ensure verifyJWT function is exported in src/utils/jwt.ts
  - Verify return type is Promise<JWTPayload>
  - _Requirements: 3_

- [x] 4. Fix API Gateway authorizer event type

  - Import APIGatewayRequestAuthorizerEventV2 from 'aws-lambda'
  - Update handler function signature to use correct event type
  - Update routeArn property access to match event type
  - _Requirements: 4_

- [x] 5. Fix auth-service property naming issues

  - Update all SQL queries to use column aliases (snake_case AS "camelCase")
  - Change stake_key to "stakeKey" in SELECT statements
  - Change anon_id to "anonId" in SELECT statements
  - Change created_at to "createdAt" in SELECT statements
  - Change last_seen_at to "lastSeenAt" in SELECT statements
  - Remove all direct references to snake_case properties in TypeScript code
  - _Requirements: 1_

- [x] 6. Fix JWT payload access in mint handlers

  - Add await keyword before verifyJWT calls in get-eligibilities.ts
  - Access payload.sub only after awaiting the promise
  - Ensure proper error handling for JWT verification
  - _Requirements: 7_

- [x] 7. Fix enum type assignments in forge-service


  - Change string literal 'category' to ForgeType.CATEGORY
  - Change string literal 'master' to ForgeType.MASTER
  - Change string literal 'season' to ForgeType.SEASON
  - Remove unused NotFoundError and ValidationError imports
  - _Requirements: 5, 2_

- [x] 8. Fix enum type assignment in question-service




  - Change string literal 'bedrock' to QuestionSource.BEDROCK
  - Ensure QuestionSource enum is imported
  - _Requirements: 5_

- [x] 9. Fix NFTCatalog property access in mint workflow





  - Update select-nft.ts to handle optional attributes property
  - Add null check or default value for attributes access
  - _Requirements: 8_

- [x] 10. Fix unknown type handling in upload-to-ipfs




  - Define IPFSResult interface with ipfs_hash property
  - Add type assertion for ipfsResult with proper validation
  - Handle potential type mismatch errors
  - _Requirements: 9_

- [x] 11. Fix optional parameter handling in leaderboard handlers


  - Add null check or default value for seasonId in get-category.ts
  - Add null check or default value for seasonId in get-global.ts
  - Ensure seasonId is never undefined when passed to service methods
  - _Requirements: 10_

- [x] 12. Remove unused variables from forge workflow handlers





  - Remove unused forgeId from build-burn-tx.ts
  - Remove unused stakeKey from build-burn-tx.ts
  - Remove unused nfts from build-burn-tx.ts
  - Remove unused forgeId from build-mint-ultimate.ts
  - Remove unused stakeKey from build-mint-ultimate.ts
  - Remove unused burnTxHash from check-burn-confirmation.ts
  - Remove unused blockfrostUrl from check-burn-confirmation.ts
  - Remove unused mintTxHash from check-mint-confirmation.ts
  - Remove unused blockfrostUrl from check-mint-confirmation.ts
  - Remove unused forgeId from sign-burn-tx.ts
  - Remove unused forgeId from sign-mint-tx.ts
  - Remove unused destructured elements from submit-burn.ts
  - Remove unused blockfrostUrl from submit-burn.ts
  - Remove unused destructured elements from submit-mint.ts
  - Remove unused blockfrostUrl from submit-mint.ts
  - Remove unused forgeId from validate-ownership.ts
  - _Requirements: 2_

- [x] 13. Remove unused variables from mint workflow handlers




  - Remove unused blockfrostUrl from check-confirmation.ts
  - Remove unused blockfrostUrl from submit-transaction.ts
  - _Requirements: 2_

- [x] 14. Remove unused variables from season handler





  - Remove unused RedisService import from get-current.ts
  - Remove unused event parameter from handler function
  - _Requirements: 2_

- [x] 15. Remove unused variable from season-service




  - Remove unused seasonId parameter from method
  - _Requirements: 2_

- [x] 16. Fix test file issues




  - Remove unused vi import from forging-flow.test.ts
  - Remove unused vi import from minting-flow.test.ts
  - Remove unused testCatalogId from minting-flow.test.ts
  - Fix tier property access in minting-flow.test.ts
  - Fix attributes property access in minting-flow.test.ts
  - Remove unused elig1 variable from minting-flow.test.ts
  - Remove unused elig2 variable from minting-flow.test.ts
  - _Requirements: 2, 8_

- [x] 17. Verify all TypeScript errors are resolved





  - Run pnpm type-check and confirm 0 errors
  - Review any remaining errors and fix
  - _Requirements: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10_


- [x] 18. Run unit tests to verify no runtime breaks




  - Execute pnpm test
  - Fix any test failures caused by type changes
  - Verify all tests pass
  - _Requirements: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10_


- [x] 19. Run integration tests






  - Test authentication flow
  - Test session creation and completion
  - Test minting workflow
  - Test forging workflow
  - Verify no runtime errors
  - _Requirements: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10_


- [x] 20. Build all packages

  - Run pnpm build
  - Verify successful compilation
  - Check for any build warnings
  - _Requirements: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10_
