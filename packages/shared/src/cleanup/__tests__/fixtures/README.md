# Test Fixtures

This directory contains test fixtures and utilities for testing the cleanup module.

## Files

- `mock-fs.ts` - Utilities for creating mock file systems for testing
- `sample-gitignore.txt` - Sample .gitignore file for testing gitignore operations
- `sample-code.ts` - Sample TypeScript code for testing reference checking

## Usage

```typescript
import { createMockFileSystem } from './fixtures/mock-fs';

const mockFs = createMockFileSystem({
  'src/index.ts': 'export const foo = "bar";',
  'src/empty-dir/': null, // Creates empty directory
  'assets/logo.png': 'fake-image-data',
});

// Run tests...

mockFs.cleanup(); // Clean up temporary files
```
