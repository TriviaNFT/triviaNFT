# Requirements Document

## Introduction

This specification defines a new standardized naming convention for TriviaNFT's on-chain Cardano asset names (token_name). The goal is to create short, fixed-length, ASCII-only identifiers that are consistent and easy to parse, while moving human-friendly names and descriptive information into metadata and database storage.

## Glossary

- **Asset Name**: The on-chain identifier for a Cardano native token (also called token_name), limited to 32 bytes
- **Token Name**: Synonym for asset_name in Cardano context
- **Asset Fingerprint**: CIP-14 format unique identifier (44 characters, format: asset1...)
- **Category NFT**: Tier 1 NFT earned by achieving a perfect 10/10 quiz score
- **Category Ultimate NFT**: Tier 2 NFT forged by burning 10 Category NFTs from the same category
- **Master Ultimate NFT**: Tier 3 NFT forged by burning 10 Category NFTs, one from each of the 10 categories
- **Seasonal Ultimate NFT**: Tier 4 NFT forged by burning 20 seasonal Category NFTs (2 from each category)
- **Display Name**: Human-friendly NFT name stored in metadata and database (e.g., "Quantum Explorer")
- **Category Code**: Short 3-5 character code representing a trivia category (e.g., SCI for Science)
- **Tier Code**: Short 3-4 character code representing the NFT tier (REG, ULT, MAST, SEAS)
- **Season Code**: Short 3 character code representing a season (e.g., WI1 for Winter Season 1)
- **Hex ID**: 8-character lowercase hexadecimal identifier for uniqueness

## Requirements

### Requirement 1

**User Story:** As a blockchain developer, I want all NFT asset names to follow a consistent, parseable format, so that I can reliably identify and categorize NFTs programmatically.

#### Acceptance Criteria

1. WHEN an NFT asset_name is generated THEN the system SHALL use the format `TNFT_V1_{...}_{id}` where TNFT is the project prefix and V1 is the version
2. WHEN an NFT asset_name is generated THEN the system SHALL ensure the total length does not exceed 32 bytes
3. WHEN an NFT asset_name is generated THEN the system SHALL use only ASCII characters from the set A-Z, 0-9, and underscore
4. WHEN an NFT asset_name is generated THEN the system SHALL include an 8-character lowercase hexadecimal ID for uniqueness
5. WHEN an NFT asset_name is parsed THEN the system SHALL extract the project prefix, version, tier information, and unique ID

### Requirement 2

**User Story:** As a system architect, I want category information encoded in asset names using short codes, so that NFTs can be categorized without reading metadata.

#### Acceptance Criteria

1. WHEN a Category NFT or Category Ultimate NFT is created THEN the system SHALL include the appropriate category code (ARTS, ENT, GEO, HIST, MYTH, NAT, SCI, SPORT, TECH, WEIRD)
2. WHEN the category code ARTS is used THEN the system SHALL map it to the Arts & Literature category
3. WHEN the category code ENT is used THEN the system SHALL map it to the Entertainment category
4. WHEN the category code GEO is used THEN the system SHALL map it to the Geography category
5. WHEN the category code HIST is used THEN the system SHALL map it to the History category
6. WHEN the category code MYTH is used THEN the system SHALL map it to the Mythology category
7. WHEN the category code NAT is used THEN the system SHALL map it to the Nature category
8. WHEN the category code SCI is used THEN the system SHALL map it to the Science category
9. WHEN the category code SPORT is used THEN the system SHALL map it to the Sports category
10. WHEN the category code TECH is used THEN the system SHALL map it to the Technology category
11. WHEN the category code WEIRD is used THEN the system SHALL map it to the Weird & Wonderful category

### Requirement 3

**User Story:** As a system architect, I want tier information encoded in asset names using short codes, so that NFT rarity can be determined from the asset name alone.

#### Acceptance Criteria

1. WHEN a Tier 1 Category NFT is created THEN the system SHALL use the format `TNFT_V1_{CAT}_REG_{id}`
2. WHEN a Tier 2 Category Ultimate NFT is created THEN the system SHALL use the format `TNFT_V1_{CAT}_ULT_{id}`
3. WHEN a Tier 3 Master Ultimate NFT is created THEN the system SHALL use the format `TNFT_V1_MAST_{id}`
4. WHEN a Tier 4 Seasonal Ultimate NFT is created THEN the system SHALL use the format `TNFT_V1_SEAS_{SeasonCode}_ULT_{id}`
5. WHEN the tier code REG is used THEN the system SHALL identify the NFT as a Tier 1 Category NFT
6. WHEN the tier code ULT is used with a category code THEN the system SHALL identify the NFT as a Tier 2 Category Ultimate NFT
7. WHEN the tier code MAST is used THEN the system SHALL identify the NFT as a Tier 3 Master Ultimate NFT
8. WHEN the tier code SEAS is used THEN the system SHALL identify the NFT as a Tier 4 Seasonal Ultimate NFT

### Requirement 4

**User Story:** As a system architect, I want seasonal information encoded in Seasonal Ultimate NFT asset names, so that different seasons can be distinguished on-chain.

#### Acceptance Criteria

1. WHEN a Winter Season 1 Ultimate NFT is created THEN the system SHALL use the season code WI1
2. WHEN a Spring Season 1 Ultimate NFT is created THEN the system SHALL use the season code SP1
3. WHEN a Summer Season 1 Ultimate NFT is created THEN the system SHALL use the season code SU1
4. WHEN a Fall Season 1 Ultimate NFT is created THEN the system SHALL use the season code FA1
5. WHEN subsequent seasons are created THEN the system SHALL increment the season number (e.g., WI2, SP2, SU2, FA2)
6. WHEN a Seasonal Ultimate NFT asset_name is parsed THEN the system SHALL extract the season code

### Requirement 5

**User Story:** As a developer, I want human-friendly NFT names stored in metadata and database, so that users see descriptive names while maintaining short on-chain identifiers.

#### Acceptance Criteria

1. WHEN an NFT is minted THEN the system SHALL store the display name (e.g., "Quantum Explorer") in the nft_catalog.display_name field
2. WHEN an NFT is minted THEN the system SHALL include the display name in the CIP-25 metadata name field
3. WHEN an NFT is minted THEN the system SHALL include the category name in the CIP-25 metadata attributes
4. WHEN an NFT is minted THEN the system SHALL include the tier information in the CIP-25 metadata attributes
5. WHEN an NFT is minted THEN the system SHALL include the typeCode (REG, ULT, MAST, SEAS) in the CIP-25 metadata attributes
6. WHEN a Seasonal Ultimate NFT is minted THEN the system SHALL include the seasonCode in the CIP-25 metadata attributes

### Requirement 6

**User Story:** As a developer, I want helper functions to build and parse asset names, so that naming convention logic is centralized and consistent.

#### Acceptance Criteria

1. WHEN the buildAssetName function is called with tier, categoryCode, seasonCode, and id parameters THEN the system SHALL return a properly formatted asset_name string
2. WHEN the buildAssetName function is called for a Category NFT THEN the system SHALL return `TNFT_V1_{categoryCode}_REG_{id}`
3. WHEN the buildAssetName function is called for a Category Ultimate NFT THEN the system SHALL return `TNFT_V1_{categoryCode}_ULT_{id}`
4. WHEN the buildAssetName function is called for a Master Ultimate NFT THEN the system SHALL return `TNFT_V1_MAST_{id}`
5. WHEN the buildAssetName function is called for a Seasonal Ultimate NFT THEN the system SHALL return `TNFT_V1_SEAS_{seasonCode}_ULT_{id}`
6. WHEN the parseAssetName function is called with a valid asset_name THEN the system SHALL return an object containing prefix, version, tier, categoryCode, seasonCode, and id
7. WHEN the parseAssetName function is called with an invalid asset_name THEN the system SHALL throw an error or return null

### Requirement 7

**User Story:** As a developer, I want validation functions to ensure asset names conform to the specification, so that invalid names are caught early.

#### Acceptance Criteria

1. WHEN an asset_name is validated THEN the system SHALL verify it starts with TNFT_V1_
2. WHEN an asset_name is validated THEN the system SHALL verify it contains only A-Z, 0-9, and underscore characters
3. WHEN an asset_name is validated THEN the system SHALL verify the total length does not exceed 32 bytes
4. WHEN an asset_name is validated THEN the system SHALL verify the hex ID is exactly 8 characters of lowercase hexadecimal
5. WHEN an asset_name is validated THEN the system SHALL verify the category code is one of the valid 10 codes (if applicable)
6. WHEN an asset_name is validated THEN the system SHALL verify the tier code is one of REG, ULT, MAST, or SEAS
7. WHEN an asset_name is validated THEN the system SHALL verify seasonal NFTs include a valid season code

### Requirement 8

**User Story:** As a database administrator, I want existing database schemas updated to support the new naming convention, so that all NFT records use consistent identifiers.

#### Acceptance Criteria

1. WHEN the database schema is updated THEN the system SHALL ensure the token_name column can store asset names up to 32 characters
2. WHEN the database schema is updated THEN the system SHALL add a display_name column to nft_catalog if it does not exist
3. WHEN the database schema is updated THEN the system SHALL add a category_code column to categories table
4. WHEN the database schema is updated THEN the system SHALL add a type_code column to track REG, ULT, MAST, SEAS values
5. WHEN existing NFT records are migrated THEN the system SHALL generate new asset names following the convention
6. WHEN existing NFT records are migrated THEN the system SHALL preserve the original display names in the display_name field

### Requirement 9

**User Story:** As a system maintainer, I want comprehensive documentation of the naming convention, so that future developers understand the system.

#### Acceptance Criteria

1. WHEN the COMPLETE_NFT_SYSTEM_GUIDE.md is updated THEN the system SHALL include a dedicated section explaining the asset_name format
2. WHEN the COMPLETE_NFT_SYSTEM_GUIDE.md is updated THEN the system SHALL provide examples of all four tier patterns
3. WHEN the COMPLETE_NFT_SYSTEM_GUIDE.md is updated THEN the system SHALL include a table mapping category slugs to category codes
4. WHEN the COMPLETE_NFT_SYSTEM_GUIDE.md is updated THEN the system SHALL explain the separation between asset_name and display_name
5. WHEN the COMPLETE_NFT_SYSTEM_GUIDE.md is updated THEN the system SHALL update all SQL examples to use the new naming convention
6. WHEN the COMPLETE_NFT_SYSTEM_GUIDE.md is updated THEN the system SHALL update all code examples to use the new naming convention
