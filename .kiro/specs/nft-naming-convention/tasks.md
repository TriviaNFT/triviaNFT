# Implementation Plan

- [x] 1. Create core naming utility module





  - Create `src/utils/nft-naming.ts` with builder, parser, and validator functions
  - Implement `buildAssetName()` function that generates asset names for all four tiers
  - Implement `parseAssetName()` function that extracts components from asset names
  - Implement `validateAssetName()` function that checks format compliance
  - Implement `generateHexId()` function that creates 8-character hex IDs
  - Define TypeScript interfaces for all naming-related types
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1-6.7, 7.1-7.7_

- [x] 1.1 Write property test for asset name format consistency


  - **Property 1: Asset name format consistency**
  - **Validates: Requirements 1.1, 1.4**

- [x] 1.2 Write property test for asset name length constraint


  - **Property 2: Asset name length constraint**
  - **Validates: Requirements 1.2**

- [x] 1.3 Write property test for asset name character set


  - **Property 3: Asset name character set**
  - **Validates: Requirements 1.3**

- [x] 1.4 Write property test for build-parse round trip


  - **Property 4: Build-parse round trip**
  - **Validates: Requirements 1.5, 6.1-6.7**

- [x] 1.5 Write property test for hex ID format


  - **Property 12: Hex ID format**
  - **Validates: Requirements 1.4**

- [x] 1.6 Write property test for validation rejection


  - **Property 11: Validation rejects invalid formats**
  - **Validates: Requirements 7.1-7.7**

- [x] 2. Create category code mapping module

  - Create `src/utils/category-codes.ts` with mapping functions
  - Define `CategoryCode` and `CategorySlug` types
  - Implement `CATEGORY_CODE_MAP` constant with all 10 category mappings
  - Implement `CATEGORY_SLUG_MAP` constant for reverse lookup
  - Implement `getCategoryCode()` function to convert slug to code
  - Implement `getCategorySlug()` function to convert code to slug
  - _Requirements: 2.1-2.11_

- [x] 2.1 Write property test for category code bidirectional mapping


  - **Property 5: Category code bidirectional mapping**
  - **Validates: Requirements 2.1-2.11**

- [x] 3. Create season code utilities module





  - Create `src/utils/season-codes.ts` with season code functions
  - Define `SeasonCode` type and `SeasonInfo` interface
  - Implement `getSeasonCode()` function to generate codes from season IDs
  - Implement `parseSeasonCode()` function to extract season information
  - Support season codes WI1, SP1, SU1, FA1 and future seasons
  - _Requirements: 4.1-4.6_

- [x] 3.1 Write property test for season code round trip


  - **Property 10: Season code round trip**
  - **Validates: Requirements 4.1-4.6**

- [x] 4. Create error handling classes




  - Create `src/utils/asset-name-errors.ts` with custom error classes
  - Implement `AssetNameValidationError` class with error codes
  - Define `ERROR_CODES` constant with all validation error types
  - Add error messages and details for each error code
  - _Requirements: 7.1-7.7_

- [x] 5. Create database migration for schema updates




  - Create migration file `add-nft-naming-convention-fields.sql`
  - Add `display_name` column to `nft_catalog` table
  - Add `category_code` column to `categories` table with unique index
  - Add `type_code` column to `player_nfts` table
  - Update `token_name` column length to VARCHAR(64) in `player_nfts` and `mints`
  - Populate `category_code` values for all 10 categories
  - Migrate existing `name` values to `display_name` in `nft_catalog`
  - _Requirements: 8.1-8.6_

- [x] 5.1 Write integration test for database migration


  - Test migration on sample database with existing NFTs
  - Verify all columns are created correctly
  - Verify data is migrated without loss
  - _Requirements: 8.1-8.6_


- [x] 6. Update minting service to use new naming convention


  - Update `src/services/minting-service.ts` to use `buildAssetName()`
  - Generate hex ID for each new mint
  - Get category code from category slug
  - Build asset name with tier='category', categoryCode, and id
  - Update CIP-25 metadata to include both asset_name and display_name
  - Store both token_name (asset_name) and display_name in database
  - Update metadata attributes to include CategoryCode and TierCode
  - _Requirements: 1.1-1.5, 3.1, 5.1-5.6, 6.1-6.7_

- [x] 6.1 Write property test for Tier 1 format correctness


  - **Property 6: Tier 1 format correctness**
  - **Validates: Requirements 3.1**

- [x] 6.2 Write integration test for minting with new asset names


  - Test minting a Category NFT end-to-end
  - Verify asset name format in database
  - Verify metadata includes both names
  - _Requirements: 5.1-5.6_

- [x] 7. Update forging service for Category Ultimate NFTs





  - Update `src/services/forging-service.ts` for category forge type
  - Generate hex ID for forged Ultimate NFT
  - Get category code from input NFTs
  - Build asset name with tier='category_ultimate', categoryCode, and id
  - Update CIP-25 metadata for Ultimate NFTs
  - Store asset_name and display_name in database
  - _Requirements: 1.1-1.5, 3.2, 5.1-5.6, 6.1-6.7_

- [x] 7.1 Write property test for Tier 2 format correctness


  - **Property 7: Tier 2 format correctness**
  - **Validates: Requirements 3.2**

- [x] 7.2 Write integration test for Category Ultimate forging


  - Test forging a Category Ultimate NFT end-to-end
  - Verify asset name format matches specification
  - Verify metadata is correct
  - _Requirements: 5.1-5.6_

- [x] 8. Update forging service for Master Ultimate NFTs





  - Update `src/services/forging-service.ts` for master forge type
  - Generate hex ID for forged Master Ultimate NFT
  - Build asset name with tier='master_ultimate' and id (no category)
  - Update CIP-25 metadata for Master Ultimate NFTs
  - Store asset_name and display_name in database
  - _Requirements: 1.1-1.5, 3.3, 5.1-5.6, 6.1-6.7_

- [x] 8.1 Write property test for Tier 3 format correctness


  - **Property 8: Tier 3 format correctness**
  - **Validates: Requirements 3.3**

- [x] 8.2 Write integration test for Master Ultimate forging


  - Test forging a Master Ultimate NFT end-to-end
  - Verify asset name format matches specification
  - Verify metadata is correct
  - _Requirements: 5.1-5.6_

- [x] 9. Update forging service for Seasonal Ultimate NFTs





  - Update `src/services/forging-service.ts` for season forge type
  - Generate hex ID for forged Seasonal Ultimate NFT
  - Get season code from season ID
  - Build asset name with tier='seasonal_ultimate', seasonCode, and id
  - Update CIP-25 metadata for Seasonal Ultimate NFTs
  - Include seasonCode in metadata attributes
  - Store asset_name and display_name in database
  - _Requirements: 1.1-1.5, 3.4, 4.1-4.6, 5.1-5.6, 6.1-6.7_

- [x] 9.1 Write property test for Tier 4 format correctness


  - **Property 9: Tier 4 format correctness**
  - **Validates: Requirements 3.4**

- [x] 9.2 Write integration test for Seasonal Ultimate forging


  - Test forging a Seasonal Ultimate NFT end-to-end
  - Verify asset name format includes season code
  - Verify metadata is correct
  - _Requirements: 4.1-4.6, 5.1-5.6_

- [x] 10. Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Update COMPLETE_NFT_SYSTEM_GUIDE.md with new naming convention





  - Replace "NFT Naming Convention" section with new specification
  - Document all four asset name patterns with examples
  - Add table mapping category slugs to category codes
  - Add table mapping tier names to tier codes
  - Add table showing season code format
  - Explain separation between asset_name and display_name
  - Update all SQL examples to use new token_name format
  - Update all code examples to use new naming functions
  - Add examples of CIP-25 metadata with new format
  - _Requirements: 9.1-9.6_

- [x] 12. Add backward compatibility support





  - Update `parseAssetName()` to support legacy token name formats
  - Implement `parseLegacyFormat()` function for old naming convention
  - Add fallback logic to try new format first, then legacy
  - Update database queries to handle both formats
  - Add tests for legacy format parsing
  - _Requirements: 1.5, 6.6_

- [x] 13. Add monitoring and logging





  - Add logging for all asset name generation events
  - Add logging for validation failures with error codes
  - Add logging for parse failures with input details
  - Add metrics tracking for generation/parse/validation success rates
  - Add alerts for high failure rates
  - _Requirements: 7.1-7.7_

- [x] 14. Create API documentation





  - Document `buildAssetName()` function with examples
  - Document `parseAssetName()` function with examples
  - Document `validateAssetName()` function with examples
  - Document category code mapping functions
  - Document season code utilities
  - Add usage examples for each tier type
  - _Requirements: 6.1-6.7, 9.1-9.6_

- [x] 15. Final checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.
