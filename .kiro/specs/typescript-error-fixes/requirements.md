# Requirements Document

## Introduction

The TriviaNFT codebase has 61 TypeScript compilation errors that must be resolved before deployment to staging. These errors fall into several categories: property naming mismatches between database columns (snake_case) and TypeScript interfaces (camelCase), unused variable declarations, missing type exports, and type mismatches for enums and interfaces.

## Glossary

- **System**: The TriviaNFT TypeScript codebase
- **Type Error**: A TypeScript compilation error preventing successful build
- **Snake Case**: Naming convention using underscores (e.g., stake_key)
- **Camel Case**: Naming convention using capital letters (e.g., stakeKey)
- **Unused Variable**: A declared variable that is never referenced in code
- **Type Mismatch**: When a value's type doesn't match the expected type definition

## Requirements

### Requirement 1: Property Naming Consistency

**User Story:** As a developer, I want consistent property naming between database queries and TypeScript interfaces, so that the code compiles without errors.

#### Acceptance Criteria

1. WHEN the System queries database columns with snake_case names, THE System SHALL map them to camelCase properties in TypeScript interfaces
2. THE System SHALL use camelCase property names (stakeKey, anonId, createdAt, lastSeenAt) consistently in all TypeScript code
3. THE System SHALL not reference snake_case properties (stake_key, anon_id, created_at, last_seen_at) in TypeScript code
4. THE System SHALL ensure all Player interface property references use correct camelCase names
5. THE System SHALL ensure all NFTCatalog interface property references use correct camelCase names

### Requirement 2: Unused Variable Removal

**User Story:** As a developer, I want to remove unused variable declarations, so that the code passes TypeScript strict checks.

#### Acceptance Criteria

1. WHEN a variable is declared but never used, THE System SHALL remove the declaration
2. THE System SHALL remove unused destructured parameters from function signatures
3. THE System SHALL remove unused imports from module declarations
4. THE System SHALL preserve variables that are used in the code
5. THE System SHALL maintain code functionality after removing unused variables

### Requirement 3: Type Export Corrections

**User Story:** As a developer, I want all required types to be properly exported, so that modules can import them without errors.

#### Acceptance Criteria

1. WHEN a module imports verifyJWT from jwt.js, THE System SHALL ensure verifyJWT is exported
2. THE System SHALL export all types and functions that are imported by other modules
3. THE System SHALL ensure JWT utility functions are properly exported
4. THE System SHALL maintain type safety across module boundaries
5. THE System SHALL not create circular dependencies when adding exports

### Requirement 4: API Gateway Event Type Corrections

**User Story:** As a developer, I want to use the correct AWS Lambda event types, so that API Gateway integrations work properly.

#### Acceptance Criteria

1. WHEN handling API Gateway authorizer events, THE System SHALL use the correct event type with routeArn property
2. THE System SHALL import APIGatewayRequestAuthorizerEventV2 or appropriate type for HTTP API
3. THE System SHALL access event properties that exist on the correct event type
4. THE System SHALL handle authorization context correctly
5. THE System SHALL maintain compatibility with API Gateway HTTP API

### Requirement 5: Enum Type Corrections

**User Story:** As a developer, I want enum values to match their type definitions, so that type checking passes.

#### Acceptance Criteria

1. WHEN assigning a ForgeType value, THE System SHALL use values that match the ForgeType enum definition
2. WHEN assigning a QuestionSource value, THE System SHALL use values that match the QuestionSource enum definition
3. THE System SHALL ensure all enum assignments use valid enum members
4. THE System SHALL maintain type safety for all enum usages
5. THE System SHALL not use string literals where enum types are expected

### Requirement 6: Generic Type Constraint Fixes

**User Story:** As a developer, I want generic type parameters to satisfy their constraints, so that database query methods compile correctly.

#### Acceptance Criteria

1. WHEN using generic type T in database query methods, THE System SHALL ensure T extends QueryResultRow
2. THE System SHALL add appropriate type constraints to generic parameters
3. THE System SHALL maintain type safety in database query results
4. THE System SHALL ensure query result types are compatible with pg library types
5. THE System SHALL not break existing database query functionality

### Requirement 7: JWT Payload Type Corrections

**User Story:** As a developer, I want to properly await JWT verification results, so that I can access payload properties.

#### Acceptance Criteria

1. WHEN calling verifyJWT, THE System SHALL await the Promise result before accessing properties
2. THE System SHALL access the 'sub' property only after awaiting the JWT payload
3. THE System SHALL handle JWT verification errors appropriately
4. THE System SHALL maintain type safety for JWT payload access
5. THE System SHALL ensure authentication flows work correctly

### Requirement 8: Interface Property Additions

**User Story:** As a developer, I want all required properties to exist on interfaces, so that property access doesn't cause errors.

#### Acceptance Criteria

1. WHEN accessing NFTCatalog properties, THE System SHALL ensure tier and attributes properties exist on the interface
2. THE System SHALL add missing properties to interface definitions
3. THE System SHALL ensure property types match their usage
4. THE System SHALL maintain backward compatibility with existing code
5. THE System SHALL document any new properties added to interfaces

### Requirement 9: Type Assertion Corrections

**User Story:** As a developer, I want to properly type unknown values, so that type checking passes.

#### Acceptance Criteria

1. WHEN receiving unknown types from external APIs, THE System SHALL add appropriate type assertions or guards
2. THE System SHALL validate IPFS API responses before using them
3. THE System SHALL handle unknown types safely
4. THE System SHALL maintain runtime safety when asserting types
5. THE System SHALL not use unsafe type assertions

### Requirement 10: Optional Parameter Handling

**User Story:** As a developer, I want to handle optional parameters correctly, so that undefined values don't cause errors.

#### Acceptance Criteria

1. WHEN passing optional parameters to functions, THE System SHALL check for undefined before passing
2. THE System SHALL add null checks for seasonId parameters
3. THE System SHALL provide default values or guards for optional parameters
4. THE System SHALL maintain type safety with optional parameters
5. THE System SHALL not pass undefined where string is required
