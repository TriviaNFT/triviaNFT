# Codebase Cleanup Module

This module provides utilities for cleaning up and organizing project files safely.

## Overview

The cleanup module helps maintain a clean, professional codebase by:
- Identifying and removing empty directories
- Organizing loose asset files
- Managing test artifacts
- Ensuring proper .gitignore configuration
- Validating file references before operations

## Architecture

The module follows a safe, incremental approach:

1. **Analysis Phase**: Scan and identify files/directories that need attention
2. **Validation Phase**: Check for references and dependencies
3. **Execution Phase**: Perform file operations (move/delete)
4. **Verification Phase**: Confirm no broken references exist

## Components

### Scanner (`scanner.ts`)
Identifies files and directories that need cleanup.

### Reference Checker (`reference-checker.ts`)
Verifies if files are referenced in the codebase before operations.

### File Organizer (`file-organizer.ts`)
Executes file operations safely with validation.

### GitIgnore Manager (`gitignore-manager.ts`)
Manages .gitignore patterns for build artifacts.

## Testing

The module uses both unit tests and property-based tests:

- **Unit Tests**: Test specific examples and edge cases
- **Property-Based Tests**: Test universal properties across many inputs using fast-check

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run with coverage
pnpm test --coverage
```

## Property-Based Testing

This module uses [fast-check](https://github.com/dubzzz/fast-check) for property-based testing. Each property test:
- Runs a minimum of 100 iterations
- Uses smart generators for realistic test data
- Is tagged with references to design document properties

Example:
```typescript
// Feature: codebase-cleanup, Property 1: Empty directory identification accuracy
fc.assert(
  fc.property(arbDirectoryStructure, (structure) => {
    // Test implementation
  }),
  { numRuns: 100 }
);
```

## Safety Features

All file operations:
- Check for references before deletion
- Support dry-run mode for preview
- Provide detailed logging
- Allow rollback if issues are detected

## Development

### Adding New Functionality

1. Add function to appropriate module
2. Add unit tests in `__tests__/`
3. Add property-based tests if applicable
4. Update this README

### Test Fixtures

Test fixtures are located in `__tests__/fixtures/`:
- `mock-fs.ts` - Mock file system utilities
- `sample-gitignore.txt` - Sample .gitignore for testing
- `sample-code.ts` - Sample code for reference checking tests

## Status

This module is currently under development as part of the codebase-cleanup spec.

### Completed
- ✅ Testing infrastructure setup
- ✅ Module structure
- ✅ Test fixtures and mock utilities

### In Progress
- 🔄 File system scanner implementation
- 🔄 Reference checker implementation
- 🔄 File organizer implementation
- 🔄 GitIgnore manager implementation

## References

- Design Document: `.kiro/specs/codebase-cleanup/design.md`
- Requirements: `.kiro/specs/codebase-cleanup/requirements.md`
- Tasks: `.kiro/specs/codebase-cleanup/tasks.md`
