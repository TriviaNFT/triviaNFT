/**
 * Leaderboard Query Load Test Scenario
 * 
 * Tests leaderboard queries under high concurrency
 * Validates Requirement 47: API latency metrics for leaderboard endpoints
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';
import { config, randomCategory, randomSleep } from '../config.js';

// Custom metrics
const leaderboardQuerySuccess = new Rate('leaderboard_query_success');
const totalQueries = new Counter('total_leaderboard_queries');

export const options = {
  stages: config.stages.stress,
  thresholds: {
    ...config.thresholds,
    'http_req_duration{endpoint:leaderboard}': ['p(95)<400', 'p(99)<800'],
  },
};

export default function () {
  // Test global leaderboard
  const globalRes = http.get(
    `${config.baseUrl}/leaderboard/global?limit=50&offset=0`,
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'leaderboard', type: 'global' },
    }
  );
  
  const globalSuccess = check(globalRes, {
    'global leaderboard loaded': (r) => r.status === 200,
    'has entries': (r) => Array.isArray(r.json('entries')),
    'has pagination': (r) => r.json('total') !== undefined,
  });
  
  leaderboardQuerySuccess.add(globalSuccess);
  totalQueries.add(1);
  
  sleep(randomSleep(0.5, 1));
  
  // Test category leaderboard
  const categoryId = randomCategory();
  const categoryRes = http.get(
    `${config.baseUrl}/leaderboard/category/${categoryId}?limit=50&offset=0`,
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'leaderboard', type: 'category' },
    }
  );
  
  const categorySuccess = check(categoryRes, {
    'category leaderboard loaded': (r) => r.status === 200,
    'has entries': (r) => Array.isArray(r.json('entries')),
  });
  
  leaderboardQuerySuccess.add(categorySuccess);
  totalQueries.add(1);
  
  sleep(randomSleep(0.5, 1));
  
  // Test pagination (simulate scrolling)
  const pages = Math.floor(Math.random() * 3) + 1; // 1-3 pages
  for (let page = 1; page <= pages; page++) {
    const offset = page * 50;
    
    const pageRes = http.get(
      `${config.baseUrl}/leaderboard/global?limit=50&offset=${offset}`,
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { endpoint: 'leaderboard', type: 'global-paginated' },
      }
    );
    
    const pageSuccess = check(pageRes, {
      'page loaded': (r) => r.status === 200,
    });
    
    leaderboardQuerySuccess.add(pageSuccess);
    totalQueries.add(1);
    
    sleep(randomSleep(0.3, 0.7));
  }
  
  // Test season leaderboard
  const seasonRes = http.get(
    `${config.baseUrl}/leaderboard/season/current`,
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'leaderboard', type: 'season' },
    }
  );
  
  const seasonSuccess = check(seasonRes, {
    'season leaderboard loaded': (r) => r.status === 200,
  });
  
  leaderboardQuerySuccess.add(seasonSuccess);
  totalQueries.add(1);
  
  sleep(randomSleep(1, 2));
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'results/leaderboard-summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  
  let summary = '\n' + indent + '=== Leaderboard Query Load Test Summary ===\n\n';
  
  // Request metrics
  if (data.metrics.http_reqs) {
    summary += indent + `Total Requests: ${data.metrics.http_reqs.values.count}\n`;
    summary += indent + `Requests/sec: ${data.metrics.http_reqs.values.rate.toFixed(2)}\n\n`;
  }
  
  // Leaderboard-specific latency (Requirement 47)
  const leaderboardMetrics = Object.keys(data.metrics).find(k => 
    k.includes('http_req_duration') && k.includes('endpoint:leaderboard')
  );
  
  if (leaderboardMetrics && data.metrics[leaderboardMetrics]) {
    summary += indent + 'Leaderboard Query Latency:\n';
    summary += indent + `  p50: ${data.metrics[leaderboardMetrics].values['p(50)'].toFixed(2)}ms\n`;
    summary += indent + `  p95: ${data.metrics[leaderboardMetrics].values['p(95)'].toFixed(2)}ms\n`;
    summary += indent + `  p99: ${data.metrics[leaderboardMetrics].values['p(99)'].toFixed(2)}ms\n`;
    summary += indent + `  avg: ${data.metrics[leaderboardMetrics].values.avg.toFixed(2)}ms\n\n`;
  }
  
  // Query metrics
  if (data.metrics.total_leaderboard_queries) {
    summary += indent + `Total Leaderboard Queries: ${data.metrics.total_leaderboard_queries.values.count}\n`;
  }
  
  if (data.metrics.leaderboard_query_success) {
    const successRate = data.metrics.leaderboard_query_success.values.rate * 100;
    summary += indent + `Query Success Rate: ${successRate.toFixed(2)}%\n\n`;
  }
  
  // Error rate
  if (data.metrics.http_req_failed) {
    const errorRate = data.metrics.http_req_failed.values.rate * 100;
    summary += indent + `Error Rate: ${errorRate.toFixed(2)}%\n`;
  }
  
  // Breakdown by leaderboard type
  summary += '\n' + indent + 'Query Breakdown by Type:\n';
  const types = ['global', 'category', 'season', 'global-paginated'];
  types.forEach(type => {
    const typeMetric = Object.keys(data.metrics).find(k => 
      k.includes('http_req_duration') && k.includes(`type:${type}`)
    );
    if (typeMetric && data.metrics[typeMetric]) {
      summary += indent + `  ${type}: ${data.metrics[typeMetric].values.count} requests, `;
      summary += `avg ${data.metrics[typeMetric].values.avg.toFixed(2)}ms\n`;
    }
  });
  
  return summary;
}
