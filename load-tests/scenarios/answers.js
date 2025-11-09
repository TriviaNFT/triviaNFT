/**
 * Answer Submission Load Test Scenario
 * 
 * Tests answer submission under high concurrency
 * Validates Requirement 47: API latency metrics for answer endpoints
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';
import { config, generateAnonId, randomCategory, randomSleep } from '../config.js';

// Custom metrics
const answerSubmissionSuccess = new Rate('answer_submission_success');
const totalAnswers = new Counter('total_answers_submitted');

export const options = {
  stages: config.stages.stress,
  thresholds: {
    ...config.thresholds,
    'http_req_duration{endpoint:answers}': ['p(95)<300', 'p(99)<500'],
  },
};

export default function () {
  const anonId = generateAnonId();
  const categoryId = randomCategory();
  
  // Create a session first
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
  
  if (startSessionRes.status !== 201) {
    console.error(`Failed to create session: ${startSessionRes.status}`);
    sleep(randomSleep(1, 2));
    return;
  }
  
  const session = startSessionRes.json();
  
  // Rapid-fire answer submissions to test concurrency
  for (let i = 0; i < session.questions.length; i++) {
    const answerIndex = Math.floor(Math.random() * 4);
    const timeMs = Math.floor(Math.random() * 9000) + 1000;
    
    const answerRes = http.post(
      `${config.baseUrl}/sessions/${session.id}/answer`,
      JSON.stringify({
        questionIndex: i,
        optionIndex: answerIndex,
        timeMs: timeMs,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { endpoint: 'answers' },
      }
    );
    
    const success = check(answerRes, {
      'answer accepted': (r) => r.status === 200,
      'has correct flag': (r) => r.json('correct') !== undefined,
      'has correct index': (r) => r.json('correctIndex') !== undefined,
      'has explanation': (r) => r.json('explanation') !== undefined,
    });
    
    answerSubmissionSuccess.add(success);
    totalAnswers.add(1);
    
    // Minimal delay between answers (stress test)
    sleep(0.5);
  }
  
  // Complete session
  http.post(
    `${config.baseUrl}/sessions/${session.id}/complete`,
    null,
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'sessions' },
    }
  );
  
  sleep(randomSleep(0.5, 1));
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'results/answers-summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  
  let summary = '\n' + indent + '=== Answer Submission Load Test Summary ===\n\n';
  
  // Request metrics
  if (data.metrics.http_reqs) {
    summary += indent + `Total Requests: ${data.metrics.http_reqs.values.count}\n`;
    summary += indent + `Requests/sec: ${data.metrics.http_reqs.values.rate.toFixed(2)}\n\n`;
  }
  
  // Answer-specific latency (Requirement 47)
  const answerMetrics = Object.keys(data.metrics).find(k => 
    k.includes('http_req_duration') && k.includes('endpoint:answers')
  );
  
  if (answerMetrics && data.metrics[answerMetrics]) {
    summary += indent + 'Answer Submission Latency:\n';
    summary += indent + `  p50: ${data.metrics[answerMetrics].values['p(50)'].toFixed(2)}ms\n`;
    summary += indent + `  p95: ${data.metrics[answerMetrics].values['p(95)'].toFixed(2)}ms\n`;
    summary += indent + `  p99: ${data.metrics[answerMetrics].values['p(99)'].toFixed(2)}ms\n`;
    summary += indent + `  avg: ${data.metrics[answerMetrics].values.avg.toFixed(2)}ms\n\n`;
  }
  
  // Answer submission metrics
  if (data.metrics.total_answers_submitted) {
    summary += indent + `Total Answers Submitted: ${data.metrics.total_answers_submitted.values.count}\n`;
  }
  
  if (data.metrics.answer_submission_success) {
    const successRate = data.metrics.answer_submission_success.values.rate * 100;
    summary += indent + `Answer Submission Success Rate: ${successRate.toFixed(2)}%\n\n`;
  }
  
  // Error rate
  if (data.metrics.http_req_failed) {
    const errorRate = data.metrics.http_req_failed.values.rate * 100;
    summary += indent + `Error Rate: ${errorRate.toFixed(2)}%\n`;
  }
  
  return summary;
}
