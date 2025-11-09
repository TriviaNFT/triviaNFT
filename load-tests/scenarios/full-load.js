/**
 * Full Load Test Scenario
 * 
 * Combines all test scenarios to simulate realistic mixed traffic
 * Validates Requirement 47: Complete system performance under load
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';
import { config, generateAnonId, generateStakeKey, randomCategory, randomSleep } from '../config.js';

// Custom metrics (Requirement 47)
const sessionCreationSuccess = new Rate('session_creation_success');
const answerSubmissionSuccess = new Rate('answer_submission_success');
const leaderboardQuerySuccess = new Rate('leaderboard_query_success');
const activeConcurrentSessions = new Counter('active_concurrent_sessions');
const sessionCompletionRate = new Rate('session_completion_rate');
const mintSuccessRate = new Rate('mint_success_rate');

export const options = {
  stages: config.stages.stress,
  thresholds: {
    ...config.thresholds,
    'session_completion_rate': ['rate>0.95'],
    'active_concurrent_sessions': ['count>0'],
  },
};

/**
 * Simulate a guest user playing a session
 */
function guestUserScenario() {
  const anonId = generateAnonId();
  const categoryId = randomCategory();
  
  // Start session
  const startRes = http.post(
    `${config.baseUrl}/sessions/start`,
    JSON.stringify({ anonId, categoryId }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'sessions', user_type: 'guest' },
    }
  );
  
  const sessionCreated = check(startRes, {
    'session created': (r) => r.status === 201,
  });
  
  sessionCreationSuccess.add(sessionCreated);
  
  if (!sessionCreated) {
    return;
  }
  
  const session = startRes.json();
  activeConcurrentSessions.add(1);
  
  // Answer questions
  for (let i = 0; i < session.questions.length; i++) {
    sleep(randomSleep(2, 8)); // Thinking time
    
    const answerRes = http.post(
      `${config.baseUrl}/sessions/${session.id}/answer`,
      JSON.stringify({
        questionIndex: i,
        optionIndex: Math.floor(Math.random() * 4),
        timeMs: Math.floor(Math.random() * 9000) + 1000,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { endpoint: 'answers', user_type: 'guest' },
      }
    );
    
    answerSubmissionSuccess.add(check(answerRes, {
      'answer submitted': (r) => r.status === 200,
    }));
  }
  
  // Complete session
  const completeRes = http.post(
    `${config.baseUrl}/sessions/${session.id}/complete`,
    null,
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'sessions', user_type: 'guest' },
    }
  );
  
  sessionCompletionRate.add(check(completeRes, {
    'session completed': (r) => r.status === 200,
  }));
  
  activeConcurrentSessions.add(-1);
}

/**
 * Simulate a connected user playing a session
 */
function connectedUserScenario() {
  const stakeKey = generateStakeKey();
  const categoryId = randomCategory();
  
  // Connect wallet (simplified - in real scenario would use JWT)
  const connectRes = http.post(
    `${config.baseUrl}/auth/connect`,
    JSON.stringify({ stakeKey }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'auth' },
    }
  );
  
  if (connectRes.status !== 200) {
    return;
  }
  
  const token = connectRes.json('token');
  
  // Start session
  const startRes = http.post(
    `${config.baseUrl}/sessions/start`,
    JSON.stringify({ stakeKey, categoryId }),
    {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      tags: { endpoint: 'sessions', user_type: 'connected' },
    }
  );
  
  const sessionCreated = check(startRes, {
    'session created': (r) => r.status === 201,
  });
  
  sessionCreationSuccess.add(sessionCreated);
  
  if (!sessionCreated) {
    return;
  }
  
  const session = startRes.json();
  activeConcurrentSessions.add(1);
  
  // Answer questions (simulate perfect score occasionally)
  const isPerfectAttempt = Math.random() < 0.1; // 10% try for perfect
  
  for (let i = 0; i < session.questions.length; i++) {
    sleep(randomSleep(2, 8));
    
    const answerRes = http.post(
      `${config.baseUrl}/sessions/${session.id}/answer`,
      JSON.stringify({
        questionIndex: i,
        optionIndex: isPerfectAttempt ? 0 : Math.floor(Math.random() * 4), // Simplified
        timeMs: Math.floor(Math.random() * 9000) + 1000,
      }),
      {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        tags: { endpoint: 'answers', user_type: 'connected' },
      }
    );
    
    answerSubmissionSuccess.add(check(answerRes, {
      'answer submitted': (r) => r.status === 200,
    }));
  }
  
  // Complete session
  const completeRes = http.post(
    `${config.baseUrl}/sessions/${session.id}/complete`,
    null,
    {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      tags: { endpoint: 'sessions', user_type: 'connected' },
    }
  );
  
  const completed = check(completeRes, {
    'session completed': (r) => r.status === 200,
  });
  
  sessionCompletionRate.add(completed);
  activeConcurrentSessions.add(-1);
  
  // Check for eligibility
  if (completed && completeRes.json('eligibilityId')) {
    sleep(randomSleep(1, 3));
    
    // Attempt to mint
    const mintRes = http.post(
      `${config.baseUrl}/mint/${completeRes.json('eligibilityId')}`,
      null,
      {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        tags: { endpoint: 'mint' },
      }
    );
    
    mintSuccessRate.add(check(mintRes, {
      'mint initiated': (r) => r.status === 202,
    }));
  }
}

/**
 * Simulate a user browsing leaderboards
 */
function leaderboardBrowserScenario() {
  // View global leaderboard
  const globalRes = http.get(
    `${config.baseUrl}/leaderboard/global?limit=50&offset=0`,
    {
      tags: { endpoint: 'leaderboard', type: 'global' },
    }
  );
  
  leaderboardQuerySuccess.add(check(globalRes, {
    'leaderboard loaded': (r) => r.status === 200,
  }));
  
  sleep(randomSleep(2, 4));
  
  // View category leaderboard
  const categoryRes = http.get(
    `${config.baseUrl}/leaderboard/category/${randomCategory()}?limit=50&offset=0`,
    {
      tags: { endpoint: 'leaderboard', type: 'category' },
    }
  );
  
  leaderboardQuerySuccess.add(check(categoryRes, {
    'category leaderboard loaded': (r) => r.status === 200,
  }));
  
  sleep(randomSleep(1, 2));
}

/**
 * Main test function - randomly selects a scenario
 */
export default function () {
  const scenario = Math.random();
  
  if (scenario < 0.5) {
    // 50% guest users
    guestUserScenario();
  } else if (scenario < 0.85) {
    // 35% connected users
    connectedUserScenario();
  } else {
    // 15% leaderboard browsers
    leaderboardBrowserScenario();
  }
  
  sleep(randomSleep(1, 3));
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'results/full-load-summary.json': JSON.stringify(data),
    'results/full-load-summary.html': htmlSummary(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  
  let summary = '\n' + indent + '=== Full Load Test Summary (1000 Concurrent Users) ===\n\n';
  
  // Overall metrics
  if (data.metrics.http_reqs) {
    summary += indent + `Total Requests: ${data.metrics.http_reqs.values.count}\n`;
    summary += indent + `Requests/sec: ${data.metrics.http_reqs.values.rate.toFixed(2)}\n`;
    summary += indent + `Duration: ${(data.state.testRunDurationMs / 1000).toFixed(0)}s\n\n`;
  }
  
  // API Latency (Requirement 47)
  if (data.metrics.http_req_duration) {
    summary += indent + 'Overall API Latency:\n';
    summary += indent + `  p50: ${data.metrics.http_req_duration.values['p(50)'].toFixed(2)}ms\n`;
    summary += indent + `  p95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
    summary += indent + `  p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
    summary += indent + `  max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms\n\n`;
  }
  
  // Success rates (Requirement 47)
  summary += indent + 'Success Rates:\n';
  
  if (data.metrics.session_creation_success) {
    const rate = data.metrics.session_creation_success.values.rate * 100;
    summary += indent + `  Session Creation: ${rate.toFixed(2)}%\n`;
  }
  
  if (data.metrics.session_completion_rate) {
    const rate = data.metrics.session_completion_rate.values.rate * 100;
    summary += indent + `  Session Completion: ${rate.toFixed(2)}%\n`;
  }
  
  if (data.metrics.answer_submission_success) {
    const rate = data.metrics.answer_submission_success.values.rate * 100;
    summary += indent + `  Answer Submission: ${rate.toFixed(2)}%\n`;
  }
  
  if (data.metrics.leaderboard_query_success) {
    const rate = data.metrics.leaderboard_query_success.values.rate * 100;
    summary += indent + `  Leaderboard Queries: ${rate.toFixed(2)}%\n`;
  }
  
  if (data.metrics.mint_success_rate) {
    const rate = data.metrics.mint_success_rate.values.rate * 100;
    summary += indent + `  Mint Initiation: ${rate.toFixed(2)}%\n`;
  }
  
  summary += '\n';
  
  // Concurrent sessions (Requirement 47)
  if (data.metrics.active_concurrent_sessions) {
    summary += indent + `Peak Concurrent Sessions: ${data.metrics.active_concurrent_sessions.values.count}\n\n`;
  }
  
  // Error rate
  if (data.metrics.http_req_failed) {
    const errorRate = data.metrics.http_req_failed.values.rate * 100;
    summary += indent + `Error Rate: ${errorRate.toFixed(2)}%\n`;
  }
  
  // Virtual users
  if (data.metrics.vus) {
    summary += indent + `Peak Virtual Users: ${data.metrics.vus.values.max}\n`;
  }
  
  return summary;
}

function htmlSummary(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Load Test Results</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    .pass { color: green; }
    .fail { color: red; }
  </style>
</head>
<body>
  <h1>Full Load Test Results</h1>
  <p>Test completed at: ${new Date().toISOString()}</p>
  
  <h2>Summary</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Total Requests</td><td>${data.metrics.http_reqs?.values.count || 0}</td></tr>
    <tr><td>Requests/sec</td><td>${data.metrics.http_reqs?.values.rate.toFixed(2) || 0}</td></tr>
    <tr><td>Duration</td><td>${((data.state.testRunDurationMs || 0) / 1000).toFixed(0)}s</td></tr>
  </table>
  
  <h2>Latency (Requirement 47)</h2>
  <table>
    <tr><th>Percentile</th><th>Latency (ms)</th></tr>
    <tr><td>p50</td><td>${data.metrics.http_req_duration?.values['p(50)'].toFixed(2) || 0}</td></tr>
    <tr><td>p95</td><td>${data.metrics.http_req_duration?.values['p(95)'].toFixed(2) || 0}</td></tr>
    <tr><td>p99</td><td>${data.metrics.http_req_duration?.values['p(99)'].toFixed(2) || 0}</td></tr>
  </table>
</body>
</html>
  `;
}
