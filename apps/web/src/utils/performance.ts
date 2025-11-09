/**
 * Performance monitoring utilities for tracking app performance.
 */

export interface PerformanceMetrics {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private marks: Map<string, number> = new Map();
  private metrics: PerformanceMetrics[] = [];

  /**
   * Start measuring a performance metric.
   */
  mark(name: string): void {
    this.marks.set(name, Date.now());
  }

  /**
   * End measuring and record the metric.
   */
  measure(name: string): number | null {
    const startTime = this.marks.get(name);
    if (!startTime) {
      console.warn(`Performance mark "${name}" not found`);
      return null;
    }

    const duration = Date.now() - startTime;
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
    });

    this.marks.delete(name);
    return duration;
  }

  /**
   * Get all recorded metrics.
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by name.
   */
  getMetricsByName(name: string): PerformanceMetrics[] {
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * Clear all metrics.
   */
  clear(): void {
    this.marks.clear();
    this.metrics = [];
  }

  /**
   * Log performance summary to console.
   */
  logSummary(): void {
    const summary = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = {
          count: 0,
          total: 0,
          min: Infinity,
          max: -Infinity,
        };
      }

      const stats = acc[metric.name];
      stats.count++;
      stats.total += metric.duration;
      stats.min = Math.min(stats.min, metric.duration);
      stats.max = Math.max(stats.max, metric.duration);

      return acc;
    }, {} as Record<string, { count: number; total: number; min: number; max: number }>);

    console.group('Performance Summary');
    Object.entries(summary).forEach(([name, stats]) => {
      console.log(`${name}:`, {
        count: stats.count,
        avg: Math.round(stats.total / stats.count),
        min: stats.min,
        max: stats.max,
      });
    });
    console.groupEnd();
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator for measuring component render time.
 */
export function measureRender(componentName: string) {
  return function <T extends { new(...args: any[]): any }>(constructor: T) {
    return class extends constructor {
      componentDidMount() {
        performanceMonitor.measure(`${componentName}-mount`);
        if (super.componentDidMount) {
          super.componentDidMount();
        }
      }

      componentWillMount() {
        performanceMonitor.mark(`${componentName}-mount`);
        if (super.componentWillMount) {
          super.componentWillMount();
        }
      }
    };
  };
}

/**
 * Measure async operation performance.
 */
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  performanceMonitor.mark(name);
  try {
    const result = await operation();
    performanceMonitor.measure(name);
    return result;
  } catch (error) {
    performanceMonitor.measure(name);
    throw error;
  }
}

/**
 * Check if device is on slow network (3G or slower).
 */
export function isSlowNetwork(): boolean {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return false;
  }

  const connection = (navigator as any).connection;
  if (!connection) return false;

  // Check effective connection type
  const effectiveType = connection.effectiveType;
  return effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';
}

/**
 * Get network information.
 */
export function getNetworkInfo(): {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
} {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return {};
  }

  const connection = (navigator as any).connection;
  if (!connection) return {};

  return {
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData,
  };
}

/**
 * Debounce function for performance optimization.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance optimization.
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
