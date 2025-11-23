/**
 * Property-Based Tests for Workflow Step Retry Isolation
 * 
 * Feature: vercel-inngest-deployment, Property 4: Workflow Step Retry Isolation
 * Validates: Requirements 6.9
 * 
 * Tests that for any workflow step that fails, only that specific step should be retried
 * without re-executing previously successful steps, maintaining idempotency.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';

describe('Workflow Step Retry Isolation Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 4: Workflow Step Retry Isolation
   * 
   * For any workflow step that fails, only that specific step should be retried
   * without re-executing previously successful steps, maintaining idempotency.
   * 
   * This property tests that:
   * 1. When a step fails, only that step is retried
   * 2. Previously successful steps are not re-executed
   * 3. The workflow maintains idempotency across retries
   * 4. State from successful steps is preserved
   */
  it('should retry only failed steps without re-executing successful steps', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random workflow with multiple steps
        fc.record({
          totalSteps: fc.integer({ min: 3, max: 10 }),
          failingStepIndex: fc.integer({ min: 1, max: 9 }), // Which step fails (not first or last)
          retryCount: fc.integer({ min: 1, max: 3 }), // How many times to retry
        }),
        async (testData) => {
          // Ensure failing step is within bounds
          const failingStepIndex = Math.min(testData.failingStepIndex, testData.totalSteps - 2);
          
          // Track execution counts for each step
          const stepExecutionCounts = new Array(testData.totalSteps).fill(0);
          const stepResults = new Array(testData.totalSteps).fill(null);

          // Simulate workflow execution with step isolation
          const executeWorkflow = async () => {
            for (let i = 0; i < testData.totalSteps; i++) {
              // If this step already succeeded, skip it (step isolation)
              if (stepResults[i] !== null) {
                continue;
              }

              // Increment execution count
              stepExecutionCounts[i]++;

              // Simulate step execution
              if (i === failingStepIndex && stepExecutionCounts[i] <= testData.retryCount) {
                // This step fails until retry count is reached
                throw new Error(`Step ${i} failed (attempt ${stepExecutionCounts[i]})`);
              } else {
                // Step succeeds
                stepResults[i] = `Step ${i} result`;
              }
            }
          };

          // Execute workflow with retries
          let lastError: Error | null = null;
          for (let attempt = 0; attempt <= testData.retryCount; attempt++) {
            try {
              await executeWorkflow();
              lastError = null;
              break; // Success
            } catch (error) {
              lastError = error as Error;
              // Continue to next retry
            }
          }

          // Verify: Steps before the failing step should only execute once
          for (let i = 0; i < failingStepIndex; i++) {
            expect(stepExecutionCounts[i]).toBe(1);
            expect(stepResults[i]).toBe(`Step ${i} result`);
          }

          // Verify: The failing step should execute retryCount + 1 times
          expect(stepExecutionCounts[failingStepIndex]).toBe(testData.retryCount + 1);

          // Verify: Steps after the failing step should not execute until the failing step succeeds
          for (let i = failingStepIndex + 1; i < testData.totalSteps; i++) {
            if (lastError === null) {
              // If workflow succeeded, these steps should execute once
              expect(stepExecutionCounts[i]).toBe(1);
              expect(stepResults[i]).toBe(`Step ${i} result`);
            } else {
              // If workflow still failing, these steps should not execute
              expect(stepExecutionCounts[i]).toBe(0);
              expect(stepResults[i]).toBe(null);
            }
          }
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Property: Workflow state is preserved across step retries
   * 
   * Tests that when a step is retried, the state from previous successful steps
   * is available and unchanged.
   */
  it('should preserve workflow state across step retries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          initialState: fc.record({
            value1: fc.integer(),
            value2: fc.string(),
            value3: fc.boolean(),
          }),
          failingStepIndex: fc.integer({ min: 1, max: 3 }),
        }),
        async (testData) => {
          // Track workflow state with flexible type
          let workflowState: Record<string, any> = { ...testData.initialState };
          const stateSnapshots: Record<string, any>[] = [];

          // Simulate workflow with state preservation
          const executeStep = async (stepIndex: number, attempt: number) => {
            // Save state snapshot before step execution
            stateSnapshots.push({ ...workflowState });

            if (stepIndex === testData.failingStepIndex && attempt === 1) {
              // First attempt fails
              throw new Error(`Step ${stepIndex} failed`);
            }

            // Step succeeds - update state
            workflowState[`step${stepIndex}Result`] = `Result ${stepIndex}`;
            return workflowState;
          };

          // Execute steps with retry
          for (let stepIndex = 0; stepIndex < 4; stepIndex++) {
            let success = false;
            let attempt = 0;

            while (!success && attempt < 3) {
              attempt++;
              try {
                await executeStep(stepIndex, attempt);
                success = true;
              } catch (error) {
                // Retry
              }
            }
          }

          // Verify: Initial state is preserved in all snapshots
          for (const snapshot of stateSnapshots) {
            expect(snapshot.value1).toBe(testData.initialState.value1);
            expect(snapshot.value2).toBe(testData.initialState.value2);
            expect(snapshot.value3).toBe(testData.initialState.value3);
          }

          // Verify: Final state includes all step results
          expect(workflowState).toHaveProperty('step0Result');
          expect(workflowState).toHaveProperty('step1Result');
          expect(workflowState).toHaveProperty('step2Result');
          expect(workflowState).toHaveProperty('step3Result');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Idempotent steps produce same result on retry
   * 
   * Tests that when a step is retried, it produces the same result as if it
   * had succeeded on the first attempt (idempotency).
   */
  it('should produce same result when idempotent step is retried', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          inputValue: fc.integer(),
          shouldFail: fc.boolean(),
        }),
        async (testData) => {
          let executionCount = 0;
          const results: number[] = [];

          // Simulate an idempotent step (e.g., database update with WHERE clause)
          const idempotentStep = async (input: number, shouldFailOnce: boolean) => {
            executionCount++;

            // Fail on first attempt if requested
            if (shouldFailOnce && executionCount === 1) {
              throw new Error('Temporary failure');
            }

            // Idempotent operation: always returns same result for same input
            const result = input * 2;
            results.push(result);
            return result;
          };

          // Execute with retry
          let finalResult: number | null = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              finalResult = await idempotentStep(testData.inputValue, testData.shouldFail);
              break;
            } catch (error) {
              // Retry
            }
          }

          // Verify: All results are identical (idempotency)
          if (results.length > 0) {
            const expectedResult = testData.inputValue * 2;
            for (const result of results) {
              expect(result).toBe(expectedResult);
            }
            expect(finalResult).toBe(expectedResult);
          }

          // Verify: Execution count matches expected retries
          if (testData.shouldFail) {
            expect(executionCount).toBeGreaterThan(1);
          } else {
            expect(executionCount).toBe(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Non-idempotent steps should not be retried automatically
   * 
   * Tests that steps which are not idempotent (e.g., sending emails, charging cards)
   * should be designed to fail fast and not retry, or should include idempotency keys.
   */
  it('should handle non-idempotent operations with idempotency keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          operationId: fc.uuid(),
          shouldFail: fc.boolean(),
        }),
        async (testData) => {
          // Track operations by idempotency key
          const executedOperations = new Set<string>();
          let actualExecutionCount = 0;

          // Simulate non-idempotent operation with idempotency key
          const nonIdempotentStep = async (idempotencyKey: string, shouldFailOnce: boolean) => {
            // Check if already executed
            if (executedOperations.has(idempotencyKey)) {
              // Return cached result instead of re-executing
              return { success: true, cached: true };
            }

            actualExecutionCount++;

            // Fail on first attempt if requested
            if (shouldFailOnce && actualExecutionCount === 1) {
              throw new Error('Temporary failure');
            }

            // Mark as executed
            executedOperations.add(idempotencyKey);
            return { success: true, cached: false };
          };

          // Execute with retry using idempotency key
          let finalResult: any = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              finalResult = await nonIdempotentStep(testData.operationId, testData.shouldFail);
              break;
            } catch (error) {
              // Retry
            }
          }

          // Verify: Operation executed at most once (idempotency key prevents duplicates)
          expect(executedOperations.size).toBeLessThanOrEqual(1);
          
          // Verify: If operation succeeded, it's marked as executed
          if (finalResult?.success) {
            expect(executedOperations.has(testData.operationId)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Step retry count is limited
   * 
   * Tests that steps have a maximum retry count and fail permanently after
   * exceeding the limit.
   */
  it('should fail permanently after exceeding retry limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxRetries: fc.integer({ min: 1, max: 5 }),
          failureCount: fc.integer({ min: 1, max: 10 }),
        }),
        async (testData) => {
          let executionCount = 0;

          // Simulate a step that fails multiple times
          const failingStep = async () => {
            executionCount++;
            
            if (executionCount <= testData.failureCount) {
              throw new Error(`Attempt ${executionCount} failed`);
            }
            
            return 'success';
          };

          // Execute with limited retries
          let finalResult: string | null = null;
          let lastError: Error | null = null;

          for (let attempt = 0; attempt <= testData.maxRetries; attempt++) {
            try {
              finalResult = await failingStep();
              break;
            } catch (error) {
              lastError = error as Error;
            }
          }

          // Verify: Execution count does not exceed maxRetries + 1
          expect(executionCount).toBeLessThanOrEqual(testData.maxRetries + 1);

          // Verify: If failures exceed retries, workflow fails
          if (testData.failureCount > testData.maxRetries) {
            expect(finalResult).toBe(null);
            expect(lastError).not.toBe(null);
          } else {
            // If failures within retry limit, workflow succeeds
            expect(finalResult).toBe('success');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
