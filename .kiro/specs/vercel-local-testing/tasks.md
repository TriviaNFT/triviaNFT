# Implementation Plan

- [x] 1. Update Playwright configuration to use Vercel Dev





  - Modify `apps/web/playwright.config.ts` to use `vercel dev` command
  - Update URL to `http://localhost:3000`
  - Set timeout to 120000ms for slower Vercel Dev startup
  - Configure `reuseExistingServer` based on CI environment
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 2. Update package.json scripts for Vercel Dev workflow





  - Change `dev` script from `expo start` to `vercel dev` in `apps/web/package.json`
  - Add `dev:ui` script for optional Metro usage: `expo start`
  - Add `verify` script that runs both unit and E2E tests
  - Ensure `test:e2e` script works with new Playwright config
  - _Requirements: 4.1, 4.3, 8.2_

- [x] 3. Create comprehensive Vercel setup documentation





  - Create `VERCEL_SETUP.md` with step-by-step Vercel CLI installation instructions
  - Document the `vercel link` process with expected prompts
  - Include platform-specific installation commands (Windows, macOS, Linux)
  - Add troubleshooting section for common setup issues
  - _Requirements: 2.1, 2.2, 2.3_


- [x] 4. Update main README.md with Vercel Dev quick start




  - Add "Quick Start" section featuring Vercel Dev as primary approach
  - Include one-command setup: `npm i -g vercel && cd apps/web && vercel link && vercel dev`
  - Link to detailed VERCEL_SETUP.md for first-time users
  - Update existing development instructions to reference Vercel Dev
  - _Requirements: 8.4_

- [x] 5. Enhance LOCAL_DEV_GUIDE.md with Vercel Dev workflow





  - Expand Vercel Dev section with detailed daily workflow
  - Add section on when to use Vercel Dev vs Metro
  - Include complete workflow examples (morning UI work, afternoon API testing)
  - Document expected behavior (what works, what doesn't, timing expectations)
  - Add decision matrix for choosing development tool
  - _Requirements: 2.4, 2.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 6. Create TROUBLESHOOTING.md documentation





  - Document "Command not found: vercel" error with solutions
  - Add "Port 3000 already in use" troubleshooting with platform-specific commands
  - Include "Environment variables not found" section with validation steps
  - Document "Vercel project not linked" error and resolution
  - Add "Slow startup" explanation and mitigation strategies
  - Include database connection failure troubleshooting
  - _Requirements: 2.3_

- [x] 7. Create environment variable validation script





  - Create `scripts/verify-env-vars.ts` to check required variables
  - Validate presence of DATABASE_URL, REDIS_URL, REDIS_TOKEN, INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY
  - Provide clear error messages for missing variables
  - Reference VERCEL_SETUP.md in error output
  - _Requirements: 6.1, 6.2_

- [x] 8. Update .env.local.example with all required variables





  - Add all required environment variables with placeholder values
  - Include comments explaining each variable's purpose
  - Document where to obtain each credential
  - Ensure variable names match production configuration
  - _Requirements: 6.3, 6.4_

- [x] 9. Verify .gitignore includes .env.local




  - Check `.gitignore` contains `.env.local` entry
  - Add entry if missing
  - Verify `.vercel` directory is also gitignored
  - _Requirements: 6.5_
-

- [x] 10. Create database connectivity test script




  - Implement `scripts/test-database-connectivity.ts` as shown in design
  - Test connection using DATABASE_URL from environment
  - Provide clear success/failure messages
  - Add to troubleshooting workflow
  - _Requirements: 5.5_


- [x] 11. Implement Property 1: API Route Consistency test




  - **Property 1: API Route Consistency**
  - **Validates: Requirements 1.2**
  - Create `apps/web/tests/properties/api-consistency.test.ts`
  - Use fast-check to generate random API routes from a predefined list
  - Verify each route returns valid JSON with appropriate status codes
  - Configure to run 100 iterations
  - Tag test with: `Feature: vercel-local-testing, Property 1: API Route Consistency`

- [x] 12. Implement Property 2: Configuration File Consistency test




  - **Property 2: Configuration File Consistency**
  - **Validates: Requirements 8.1, 8.2, 8.3**
  - Create `apps/web/tests/properties/config-consistency.test.ts`
  - Use fast-check to test multiple config files (package.json, playwright.config.ts)
  - Verify each file contains references to "vercel dev"
  - Configure to run 100 iterations
  - Tag test with: `Feature: vercel-local-testing, Property 2: Configuration File Consistency`


- [x] 13. Add property testing script to package.json




  - Add `test:properties` script to `apps/web/package.json`
  - Script should run property-based tests using Playwright
  - Update `verify` script to include property tests
  - _Requirements: 8.2_

- [x] 14. Create example E2E test for Vercel Dev validation



  - Create `apps/web/e2e/vercel-dev-validation.spec.ts`
  - Test that server responds at http://localhost:3000
  - Verify landing page loads correctly
  - Test that at least one API route is accessible
  - Verify environment variables are loaded
  - _Requirements: 1.1, 1.3, 1.5_

- [x] 15. Create example E2E test for Inngest integration





  - Create `apps/web/e2e/inngest-integration.spec.ts`
  - Test that Inngest workflows can be triggered
  - Verify workflow execution completes
  - Check workflow results are persisted
  - _Requirements: 1.4_

- [x] 16. Update vercel.json configuration if needed




  - Review existing `vercel.json` configuration
  - Ensure it specifies correct build and dev commands
  - Add any missing configuration for optimal Vercel Dev experience
  - _Requirements: 8.1_

- [x] 17. Create migration guide for existing developers




  - Create `MIGRATION_TO_VERCEL_DEV.md` document
  - Provide step-by-step migration instructions
  - Include commands for installing Vercel CLI and linking project
  - Explain what changes and what stays the same
  - Add FAQ section for common migration questions
  - _Requirements: 8.1_
-

- [x] 18. Add Vercel Dev startup check to package.json




  - Create pre-dev script that checks if Vercel CLI is installed
  - Provide helpful error message if not installed
  - Suggest installation command or npx alternative
  - _Requirements: 1.1_

- [x] 19. Document hot reload behavior and workarounds




  - Add section to LOCAL_DEV_GUIDE.md about hot reload differences
  - Explain when to use Metro for rapid UI iteration
  - Document the workflow for switching between tools
  - Clarify that Vercel Dev testing is required before committing
  - _Requirements: 4.2, 7.4_

- [x] 20. Create workflow diagram for documentation




  - Create Mermaid diagram showing developer workflow
  - Include decision points for tool selection
  - Show integration between Vercel Dev, tests, and deployment
  - Add to LOCAL_DEV_GUIDE.md
  - _Requirements: 7.5_
-

- [x] 21. Checkpoint - Verify all configuration changes work



  - Ensure all tests pass, ask the user if questions arise
  - Run `vercel dev` and verify it starts successfully
  - Run `pnpm test:e2e` and verify Playwright connects correctly
  - Check that all documentation is accurate and complete

- [x] 22. Update CI/CD configuration for Vercel Dev




  - Review GitHub Actions or CI configuration
  - Ensure CI uses Vercel Dev for E2E tests
  - Verify CI doesn't reuse existing server (fresh instance each time)
  - Test CI pipeline with new configuration
  - _Requirements: 3.4_

- [x] 23. Create performance comparison documentation




  - Document startup time differences between Metro and Vercel Dev
  - Explain resource usage differences
  - Provide recommendations for system requirements
  - Add to LOCAL_DEV_GUIDE.md
  - _Requirements: 4.2_

- [x] 24. Final Checkpoint - Complete validation




  - Ensure all tests pass, ask the user if questions arise
  - Run complete test suite: unit, E2E, and property tests
  - Verify all documentation is complete and accurate
  - Confirm Vercel Dev is the default development approach
  - Test that a new developer can follow docs and get running


- [x] 25. Resolve Metro Bundler SHA-1 Cache Error




  - Created `apps/web/scripts/clean-cache.js` to remove NativeWind cache directories
  - Updated `apps/web/package.json` build script to run cache cleanup before expo export
  - Enhanced `apps/web/metro.config.js` with `isCSSEnabled: true` for proper CSS handling
  - Verified script successfully removes `.cache` directories from node_modules
  - _Issue: Metro SHA-1 error with react-native-css-interop cache files_

- [x] 26. Resolve Peer Dependency Warnings




  - Aligned vitest versions across workspace: updated to `vitest@1.6.1` and `@vitest/ui@1.6.1`
  - Updated `packages/shared/package.json` with matching vitest versions
  - Updated `services/api/package.json` with matching vitest versions
  - Created `apps/web/.npmrc` with peer dependency resolution configuration
  - _Issue: Peer dependency mismatches causing build warnings_

- [x] 27. Document build fixes and troubleshooting




  - Created `VERCEL_BUILD_FIXES.md` with comprehensive resolution summary
  - Updated `TROUBLESHOOTING.md` with Metro SHA-1 and peer dependency sections
  - Documented root causes, solutions, and verification steps
  - Added testing checklist for future builds
  - _Documentation: Build issue resolution and prevention_
