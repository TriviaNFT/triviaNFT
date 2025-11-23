/**
 * NFT Naming Metrics Tracking
 * 
 * This module provides metrics tracking for NFT asset name operations.
 * Tracks success rates, failure rates, and performance metrics.
 */

export interface NamingMetrics {
  generation: {
    total: number;
    success: number;
    failure: number;
    byTier: Record<string, { success: number; failure: number }>;
  };
  parsing: {
    total: number;
    success: number;
    failure: number;
    legacyFormat: number;
  };
  validation: {
    total: number;
    valid: number;
    invalid: number;
    byErrorCode: Record<string, number>;
  };
  categoryMapping: {
    total: number;
    success: number;
    failure: number;
  };
  seasonCodeOps: {
    total: number;
    success: number;
    failure: number;
  };
}

/**
 * In-memory metrics store
 * In production, this should be replaced with CloudWatch Metrics or similar
 */
class MetricsStore {
  private metrics: NamingMetrics = {
    generation: {
      total: 0,
      success: 0,
      failure: 0,
      byTier: {},
    },
    parsing: {
      total: 0,
      success: 0,
      failure: 0,
      legacyFormat: 0,
    },
    validation: {
      total: 0,
      valid: 0,
      invalid: 0,
      byErrorCode: {},
    },
    categoryMapping: {
      total: 0,
      success: 0,
      failure: 0,
    },
    seasonCodeOps: {
      total: 0,
      success: 0,
      failure: 0,
    },
  };

  /**
   * Record asset name generation
   */
  recordGeneration(tier: string, success: boolean): void {
    this.metrics.generation.total++;
    if (success) {
      this.metrics.generation.success++;
    } else {
      this.metrics.generation.failure++;
    }

    // Track by tier
    if (!this.metrics.generation.byTier[tier]) {
      this.metrics.generation.byTier[tier] = { success: 0, failure: 0 };
    }
    if (success) {
      this.metrics.generation.byTier[tier].success++;
    } else {
      this.metrics.generation.byTier[tier].failure++;
    }
  }

  /**
   * Record asset name parsing
   */
  recordParsing(success: boolean, isLegacyFormat: boolean = false): void {
    this.metrics.parsing.total++;
    if (success) {
      this.metrics.parsing.success++;
      if (isLegacyFormat) {
        this.metrics.parsing.legacyFormat++;
      }
    } else {
      this.metrics.parsing.failure++;
    }
  }

  /**
   * Record asset name validation
   */
  recordValidation(valid: boolean, errorCode?: string): void {
    this.metrics.validation.total++;
    if (valid) {
      this.metrics.validation.valid++;
    } else {
      this.metrics.validation.invalid++;
      if (errorCode) {
        this.metrics.validation.byErrorCode[errorCode] = 
          (this.metrics.validation.byErrorCode[errorCode] || 0) + 1;
      }
    }
  }

  /**
   * Record category code mapping
   */
  recordCategoryMapping(success: boolean): void {
    this.metrics.categoryMapping.total++;
    if (success) {
      this.metrics.categoryMapping.success++;
    } else {
      this.metrics.categoryMapping.failure++;
    }
  }

  /**
   * Record season code operation
   */
  recordSeasonCodeOp(success: boolean): void {
    this.metrics.seasonCodeOps.total++;
    if (success) {
      this.metrics.seasonCodeOps.success++;
    } else {
      this.metrics.seasonCodeOps.failure++;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): NamingMetrics {
    return { ...this.metrics };
  }

  /**
   * Get success rates
   */
  getSuccessRates(): {
    generation: number;
    parsing: number;
    validation: number;
    categoryMapping: number;
    seasonCodeOps: number;
  } {
    return {
      generation: this.metrics.generation.total > 0
        ? this.metrics.generation.success / this.metrics.generation.total
        : 1,
      parsing: this.metrics.parsing.total > 0
        ? this.metrics.parsing.success / this.metrics.parsing.total
        : 1,
      validation: this.metrics.validation.total > 0
        ? this.metrics.validation.valid / this.metrics.validation.total
        : 1,
      categoryMapping: this.metrics.categoryMapping.total > 0
        ? this.metrics.categoryMapping.success / this.metrics.categoryMapping.total
        : 1,
      seasonCodeOps: this.metrics.seasonCodeOps.total > 0
        ? this.metrics.seasonCodeOps.success / this.metrics.seasonCodeOps.total
        : 1,
    };
  }

  /**
   * Check if any operation has high failure rate (> 1%)
   */
  hasHighFailureRate(): boolean {
    const rates = this.getSuccessRates();
    const threshold = 0.99; // 99% success rate threshold
    
    return (
      rates.generation < threshold ||
      rates.parsing < threshold ||
      rates.validation < threshold ||
      rates.categoryMapping < threshold ||
      rates.seasonCodeOps < threshold
    );
  }

  /**
   * Get failure rate details
   */
  getFailureRateDetails(): {
    operation: string;
    successRate: number;
    failureRate: number;
    total: number;
  }[] {
    const rates = this.getSuccessRates();
    const details = [];

    if (rates.generation < 0.99) {
      details.push({
        operation: 'generation',
        successRate: rates.generation,
        failureRate: 1 - rates.generation,
        total: this.metrics.generation.total,
      });
    }

    if (rates.parsing < 0.99) {
      details.push({
        operation: 'parsing',
        successRate: rates.parsing,
        failureRate: 1 - rates.parsing,
        total: this.metrics.parsing.total,
      });
    }

    if (rates.validation < 0.99) {
      details.push({
        operation: 'validation',
        successRate: rates.validation,
        failureRate: 1 - rates.validation,
        total: this.metrics.validation.total,
      });
    }

    if (rates.categoryMapping < 0.99) {
      details.push({
        operation: 'categoryMapping',
        successRate: rates.categoryMapping,
        failureRate: 1 - rates.categoryMapping,
        total: this.metrics.categoryMapping.total,
      });
    }

    if (rates.seasonCodeOps < 0.99) {
      details.push({
        operation: 'seasonCodeOps',
        successRate: rates.seasonCodeOps,
        failureRate: 1 - rates.seasonCodeOps,
        total: this.metrics.seasonCodeOps.total,
      });
    }

    return details;
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = {
      generation: {
        total: 0,
        success: 0,
        failure: 0,
        byTier: {},
      },
      parsing: {
        total: 0,
        success: 0,
        failure: 0,
        legacyFormat: 0,
      },
      validation: {
        total: 0,
        valid: 0,
        invalid: 0,
        byErrorCode: {},
      },
      categoryMapping: {
        total: 0,
        success: 0,
        failure: 0,
      },
      seasonCodeOps: {
        total: 0,
        success: 0,
        failure: 0,
      },
    };
  }
}

// Singleton instance
const metricsStore = new MetricsStore();

/**
 * Get the metrics store instance
 */
export function getMetricsStore(): MetricsStore {
  return metricsStore;
}

/**
 * Export metrics to CloudWatch (placeholder)
 * In production, this should send metrics to CloudWatch or similar service
 */
export async function exportMetrics(): Promise<void> {
  const metrics = metricsStore.getMetrics();
  const rates = metricsStore.getSuccessRates();

  // Log metrics summary
  console.log('[METRICS] NFT Naming Metrics:', {
    timestamp: new Date().toISOString(),
    metrics,
    successRates: rates,
  });

  // Check for high failure rates and alert
  if (metricsStore.hasHighFailureRate()) {
    const details = metricsStore.getFailureRateDetails();
    console.error('[ALERT] High failure rate detected in NFT naming operations:', details);
  }

  // In production, send to CloudWatch:
  // await cloudwatch.putMetricData({
  //   Namespace: 'TriviaNFT/Naming',
  //   MetricData: [
  //     {
  //       MetricName: 'GenerationSuccessRate',
  //       Value: rates.generation,
  //       Unit: 'Percent',
  //     },
  //     // ... more metrics
  //   ],
  // });
}

/**
 * Schedule periodic metrics export
 * Call this on Lambda initialization to export metrics every N minutes
 */
export function scheduleMetricsExport(intervalMinutes: number = 5): NodeJS.Timeout {
  return setInterval(() => {
    exportMetrics().catch((error) => {
      console.error('[METRICS] Failed to export metrics:', error);
    });
  }, intervalMinutes * 60 * 1000);
}
