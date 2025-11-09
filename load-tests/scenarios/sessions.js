/**
 * Session Load Test Scenario
 * 
 * Tests concurrent session creation and management
 * Validates Requirement 47: API latency metrics
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { config, generateAnonId, randomCategory, randomSleep } from '../config.js';

// Custom metrics
const sessionCreationSuccess = new Rate('session_creation_success');
const sessionDuration = new Trend('session_duration', true);

export const options = {
  stages: config.stages.load,
  thresholds: {
    ...config.thresholds,
    'session_duration': ['p(95)<15000'], // Sessions should complete within 15s
  },
};

export default function () {
  const anonId = generateAnonId();
  const categoryId = randomCategory();
  
  // Test session creation
  const startSessionRes = http.post(
    `${config.baseUrl}/sessions/start`,
    JSON.stringify({
      anonId: anonId,
      categoryId: categoryId,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'sessions' },
    }
  );
  
  const sessionCreated = check(startSessionRes, {
    'session created': (r) => r.status === 201,
    'session has ID': (r) => r.json('id') !== undefined,
    'session has questions': (r) => r.json('questions') && r.json('questions').length === 10,
  });
  
  sessionCreationSuccess.add(sessionCreated);
  
  if (!sessionCreated) {
    console.error(`Failed to create session: ${startSessionRes.status} - ${startSessionRes.body}`);
    sleep(randomSleep(1, 3));
    return;
  }
  
  const session = startSessionRes.json();
  const sessionStartTime = Date.now();
  
  // Simulate answering questions
  for (let i = 0; i < session.questions.length; i++) {
    // Random answer (0-3)
    const answerIndex = Math.floor(Math.random() * 4);
    
    // Simulate thinking time (2-8 seconds)
    sleep(randomSleep(2, 8));
    
    const answerRes = http.post(
      `${config.baseUrl}/sessions/${session.id}/answer`,
      JSON.stringify({
        questionIndex: i,
        optionIndex: answerIndex,
        timeMs: Math.floor(Math.random() * 9000) + 1000, // 1-10 seconds
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { endpoint: 'answers' },
      }
    );
    
    check(answerRes, {
      'answer submitted': (r) => r.status === 200,
      'answer has result': (r) => r.json('correct') !== undefined,
    });
  }
  
  // Complete session
  const completeRes = http.post(
    `${config.baseUrl}/sessions/${session.id}/complete`,
    null,
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'sessions' },
    }
  );
  
  const sessionCompleted = check(completeRes, {
    'session completed': (r) => r.status === 200,
    'has final score': (r) => r.json('score') !== undefined,
    'has status': (r) => ['won', 'lost'].includes(r.json('status')),
  });
  
  if (sessionCompleted) {
    const sessionEndTime = Date.now();
    sessionDuration.add(sessionEndTime - sessionStartTime);
  }
  
  // Cooldown between sessions
  sleep(randomSleep(1, 3));
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'results/sessions-summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;
  
  let summary = '\n' + indent + '=== Session Load Test Summary ===\n\n';
  
  // Request metrics
  if (data.metrics.http_reqs) {
    summary += indent + `Total Requests: ${data.metrics.http_reqs.values.count}\n`;
    summary += indent + `Requests/sec: ${data.metrics.http_reqs.values.rate.toFixed(2)}\n\n`;
  }
  
  // Latency metrics (Requirement 47)
  if (data.metrics.http_req_duration) {
    summary += indent + 'API Latency:\n';
    summary += indent + `  p50: ${data.metrics.http_req_duration.values['p(50)'].toFixed(2)}ms\n`;
    summary += indent + `  p95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
    summary += indent + `  p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
    summary += indent + `  avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n\n`;
  }
  
  // Session metrics
  if (data.metrics.session_creation_success) {
    const successRate = data.metrics.session_creation_success.values.rate * 100;
    summary += indent + `Session Creation Success Rate: ${successRate.toFixed(2)}%\n`;
  }
  
  if (data.metrics.session_duration) {
    summary += indent + `Session Duration (avg): ${(data.metrics.session_duration.values.avg / 1000).toFixed(2)}s\n\n`;
  }
  
  // Error rate
  if (data.metrics.http_req_failed) {
    const errorRate = data.metrics.http_req_failed.values.rate * 100;
    summary += indent + `Error Rate: ${errorRate.toFixed(2)}%\n`;
  }
  
  return summary;
}
