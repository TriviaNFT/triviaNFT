/**
 * Tests for NFT Naming Metrics Tracking
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getMetricsStore, exportMetrics } from './nft-naming-metrics';

describe('NFT Naming Metrics', () => {
  beforeEach(() => {
    // Reset metrics before each test
    getMetricsStore().reset();
  });

  describe('Generation Metrics', () => {
    it('should track successful generation', () => {
      const metrics = getMetricsStore();
      
      metrics.recordGeneration('category', true);
      metrics.recordGeneration('category', true);
      metrics.recordGeneration('master_ultimate', true);
      
      const current = metrics.getMetrics();
      expect(current.generation.total).toBe(3);
      expect(current.generation.success).toBe(3);
      expect(current.generation.failure).toBe(0);
    });

    it('should track failed generation', () => {
      const metrics = getMetricsStore();
      
      metrics.recordGeneration('category', false);
      metrics.recordGeneration('category', true);
      
      const current = metrics.getMetrics();
      expect(current.generation.total).toBe(2);
      expect(current.generation.success).toBe(1);
      expect(current.generation.failure).toBe(1);
    });

    it('should track generation by tier', () => {
      const metrics = getMetricsStore();
      
      metrics.recordGeneration('category', true);
      metrics.recordGeneration('category', true);
      metrics.recordGeneration('master_ultimate', true);
      metrics.recordGeneration('category', false);
      
      const current = metrics.getMetrics();
      expect(current.generation.byTier['category'].success).toBe(2);
      expect(current.generation.byTier['category'].failure).toBe(1);
      expect(current.generation.byTier['master_ultimate'].success).toBe(1);
      expect(current.generation.byTier['master_ultimate'].failure).toBe(0);
    });
  });

  describe('Parsing Metrics', () => {
    it('should track successful parsing', () => {
      const metrics = getMetricsStore();
      
      metrics.recordParsing(true, false);
      metrics.recordParsing(true, false);
      
      const current = metrics.getMetrics();
      expect(current.parsing.total).toBe(2);
      expect(current.parsing.success).toBe(2);
      expect(current.parsing.failure).toBe(0);
      expect(current.parsing.legacyFormat).toBe(0);
    });

    it('should track legacy format parsing', () => {
      const metrics = getMetricsStore();
      
      metrics.recordParsing(true, true);
      metrics.recordParsing(true, false);
      
      const current = metrics.getMetrics();
      expect(current.parsing.total).toBe(2);
      expect(current.parsing.success).toBe(2);
      expect(current.parsing.legacyFormat).toBe(1);
    });

    it('should track failed parsing', () => {
      const metrics = getMetricsStore();
      
      metrics.recordParsing(false, false);
      metrics.recordParsing(true, false);
      
      const current = metrics.getMetrics();
      expect(current.parsing.total).toBe(2);
      expect(current.parsing.success).toBe(1);
      expect(current.parsing.failure).toBe(1);
    });
  });

  describe('Validation Metrics', () => {
    it('should track successful validation', () => {
      const metrics = getMetricsStore();
      
      metrics.recordValidation(true);
      metrics.recordValidation(true);
      
      const current = metrics.getMetrics();
      expect(current.validation.total).toBe(2);
      expect(current.validation.valid).toBe(2);
      expect(current.validation.invalid).toBe(0);
    });

    it('should track failed validation with error codes', () => {
      const metrics = getMetricsStore();
      
      metrics.recordValidation(false, 'INVALID_LENGTH');
      metrics.recordValidation(false, 'INVALID_HEX_ID');
      metrics.recordValidation(false, 'INVALID_LENGTH');
      
      const current = metrics.getMetrics();
      expect(current.validation.total).toBe(3);
      expect(current.validation.valid).toBe(0);
      expect(current.validation.invalid).toBe(3);
      expect(current.validation.byErrorCode['INVALID_LENGTH']).toBe(2);
      expect(current.validation.byErrorCode['INVALID_HEX_ID']).toBe(1);
    });
  });

  describe('Success Rates', () => {
    it('should calculate success rates correctly', () => {
      const metrics = getMetricsStore();
      
      // 80% success rate for generation
      metrics.recordGeneration('category', true);
      metrics.recordGeneration('category', true);
      metrics.recordGeneration('category', true);
      metrics.recordGeneration('category', true);
      metrics.recordGeneration('category', false);
      
      // 100% success rate for parsing
      metrics.recordParsing(true, false);
      metrics.recordParsing(true, false);
      
      const rates = metrics.getSuccessRates();
      expect(rates.generation).toBe(0.8);
      expect(rates.parsing).toBe(1.0);
    });

    it('should return 1.0 for operations with no data', () => {
      const metrics = getMetricsStore();
      const rates = metrics.getSuccessRates();
      
      expect(rates.generation).toBe(1.0);
      expect(rates.parsing).toBe(1.0);
      expect(rates.validation).toBe(1.0);
    });
  });

  describe('High Failure Rate Detection', () => {
    it('should detect high failure rate', () => {
      const metrics = getMetricsStore();
      
      // 95% success rate (below 99% threshold)
      for (let i = 0; i < 95; i++) {
        metrics.recordGeneration('category', true);
      }
      for (let i = 0; i < 5; i++) {
        metrics.recordGeneration('category', false);
      }
      
      expect(metrics.hasHighFailureRate()).toBe(true);
    });

    it('should not flag normal failure rates', () => {
      const metrics = getMetricsStore();
      
      // 99.5% success rate (above 99% threshold)
      for (let i = 0; i < 199; i++) {
        metrics.recordGeneration('category', true);
      }
      metrics.recordGeneration('category', false);
      
      expect(metrics.hasHighFailureRate()).toBe(false);
    });

    it('should provide failure rate details', () => {
      const metrics = getMetricsStore();
      
      // Create high failure rate for generation
      metrics.recordGeneration('category', true);
      metrics.recordGeneration('category', false);
      metrics.recordGeneration('category', false);
      
      const details = metrics.getFailureRateDetails();
      expect(details.length).toBeGreaterThan(0);
      expect(details[0].operation).toBe('generation');
      expect(details[0].successRate).toBeCloseTo(0.333, 2);
      expect(details[0].failureRate).toBeCloseTo(0.667, 2);
      expect(details[0].total).toBe(3);
    });
  });

  describe('Category Mapping Metrics', () => {
    it('should track category mapping operations', () => {
      const metrics = getMetricsStore();
      
      metrics.recordCategoryMapping(true);
      metrics.recordCategoryMapping(true);
      metrics.recordCategoryMapping(false);
      
      const current = metrics.getMetrics();
      expect(current.categoryMapping.total).toBe(3);
      expect(current.categoryMapping.success).toBe(2);
      expect(current.categoryMapping.failure).toBe(1);
    });
  });

  describe('Season Code Metrics', () => {
    it('should track season code operations', () => {
      const metrics = getMetricsStore();
      
      metrics.recordSeasonCodeOp(true);
      metrics.recordSeasonCodeOp(true);
      metrics.recordSeasonCodeOp(false);
      
      const current = metrics.getMetrics();
      expect(current.seasonCodeOps.total).toBe(3);
      expect(current.seasonCodeOps.success).toBe(2);
      expect(current.seasonCodeOps.failure).toBe(1);
    });
  });

  describe('Metrics Export', () => {
    it('should export metrics without errors', async () => {
      const metrics = getMetricsStore();
      
      metrics.recordGeneration('category', true);
      metrics.recordParsing(true, false);
      metrics.recordValidation(true);
      
      // Should not throw
      await expect(exportMetrics()).resolves.toBeUndefined();
    });
  });

  describe('Metrics Reset', () => {
    it('should reset all metrics', () => {
      const metrics = getMetricsStore();
      
      metrics.recordGeneration('category', true);
      metrics.recordParsing(true, false);
      metrics.recordValidation(true);
      
      metrics.reset();
      
      const current = metrics.getMetrics();
      expect(current.generation.total).toBe(0);
      expect(current.parsing.total).toBe(0);
      expect(current.validation.total).toBe(0);
    });
  });
});
