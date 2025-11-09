/**
 * Load Testing Configuration
 * 
 * Centralized configuration for all k6 test scenarios
 */

export const config = {
  // API endpoint (override with API_BASE_URL env var)
  baseUrl: __ENV.API_BASE_URL || 'http://localhost:3000',
  
  // Test data
  testCategories: [
    'science',
    'history',
    'geography',
    'sports',
    'arts',
    'entertainment',
    'technology',
    'literature',
    'general'
  ],
  
  // Performance thresholds (Requirement 47)
  thresholds: {
    // API latency requirements
    'http_req_duration{endpoint:sessions}': ['p(95)<500', 'p(99)<1000'],
    'http_req_duration{endpoint:answers}': ['p(95)<300', 'p(99)<500'],
    'http_req_duration{endpoint:leaderboard}': ['p(95)<400', 'p(99)<800'],
    
    // Error rate requirements
    'http_req_failed': ['rate<0.01'], // Less than 1% errors
    
    // Success rate requirements
    'session_creation_success': ['rate>0.95'], // 95% success rate
    'answer_submission_success': ['rate>0.98'], // 98% success rate
  },
  
  // Load test stages
  stages: {
    // Smoke test: minimal load
    smoke: [
      { duration: '30s', target: 1 },
    ],
    
    // Load test: normal traffic
    load: [
      { duration: '1m', target: 50 },   // Ramp up to 50 users
      { duration: '3m', target: 50 },   // Stay at 50 users
      { duration: '1m', target: 0 },    // Ramp down
    ],
    
    // Stress test: high traffic (Requirement 47)
    stress: [
      { duration: '2m', target: 100 },   // Ramp up to 100
      { duration: '2m', target: 500 },   // Ramp up to 500
      { duration: '3m', target: 1000 },  // Ramp up to 1000 users
      { duration: '3m', target: 1000 },  // Stay at 1000 users
      { duration: '2m', target: 0 },     // Ramp down
    ],
    
    // Spike test: sudden traffic surge
    spike: [
      { duration: '30s', target: 50 },
      { duration: '30s', target: 1000 }, // Sudden spike
      { duration: '1m', target: 1000 },
      { duration: '30s', target: 50 },
      { duration: '30s', target: 0 },
    ],
  },
};

/**
 * Generate a random test user identifier
 */
export function generateUserId() {
  return `test-user-${Math.random().toString(36).substring(7)}`;
}

/**
 * Generate a random stake key for testing
 */
export function generateStakeKey() {
  return `stake_test1${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Generate a random anonymous ID for guest users
 */
export function generateAnonId() {
  return `anon-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Select a random category
 */
export function randomCategory() {
  return config.testCategories[Math.floor(Math.random() * config.testCategories.length)];
}

/**
 * Sleep for a random duration between min and max seconds
 */
export function randomSleep(min = 1, max = 5) {
  return min + Math.random() * (max - min);
}
