#!/bin/bash

# Results Analysis Script
# Analyzes k6 test results and generates reports

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    print_error "jq is not installed (required for JSON parsing)"
    echo "Install: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 1
fi

# Get the most recent result file
RESULTS_DIR="results"
RESULT_FILE=""

if [ $# -eq 0 ]; then
    # Find most recent JSON file
    RESULT_FILE=$(ls -t "$RESULTS_DIR"/*.json 2>/dev/null | head -1)
    if [ -z "$RESULT_FILE" ]; then
        print_error "No result files found in $RESULTS_DIR/"
        exit 1
    fi
    print_info "Analyzing most recent result: $RESULT_FILE"
else
    RESULT_FILE="$1"
    if [ ! -f "$RESULT_FILE" ]; then
        print_error "File not found: $RESULT_FILE"
        exit 1
    fi
fi

echo ""
print_info "=== Load Test Analysis ==="
echo ""

# Extract key metrics
echo "📊 Overall Metrics:"
echo "-------------------"

# Total requests
total_reqs=$(jq -r '.metrics.http_reqs.values.count // 0' "$RESULT_FILE")
echo "Total Requests: $total_reqs"

# Request rate
req_rate=$(jq -r '.metrics.http_reqs.values.rate // 0' "$RESULT_FILE")
printf "Requests/sec: %.2f\n" "$req_rate"

# Duration
duration=$(jq -r '.state.testRunDurationMs // 0' "$RESULT_FILE")
duration_sec=$(echo "scale=0; $duration / 1000" | bc)
echo "Duration: ${duration_sec}s"

echo ""
echo "⏱️  API Latency (Requirement 47):"
echo "-------------------"

# Latency metrics
p50=$(jq -r '.metrics.http_req_duration.values["p(50)"] // 0' "$RESULT_FILE")
p95=$(jq -r '.metrics.http_req_duration.values["p(95)"] // 0' "$RESULT_FILE")
p99=$(jq -r '.metrics.http_req_duration.values["p(99)"] // 0' "$RESULT_FILE")
avg=$(jq -r '.metrics.http_req_duration.values.avg // 0' "$RESULT_FILE")
max=$(jq -r '.metrics.http_req_duration.values.max // 0' "$RESULT_FILE")

printf "p50 (median): %.2fms " "$p50"
if (( $(echo "$p50 < 200" | bc -l) )); then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC}"
fi

printf "p95: %.2fms " "$p95"
if (( $(echo "$p95 < 500" | bc -l) )); then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

printf "p99: %.2fms " "$p99"
if (( $(echo "$p99 < 1000" | bc -l) )); then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

printf "avg: %.2fms\n" "$avg"
printf "max: %.2fms\n" "$max"

echo ""
echo "✅ Success Rates:"
echo "-------------------"

# Session creation success
session_success=$(jq -r '.metrics.session_creation_success.values.rate // 0' "$RESULT_FILE")
session_pct=$(echo "scale=2; $session_success * 100" | bc)
printf "Session Creation: %.2f%% " "$session_pct"
if (( $(echo "$session_success > 0.95" | bc -l) )); then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Answer submission success
answer_success=$(jq -r '.metrics.answer_submission_success.values.rate // 0' "$RESULT_FILE")
if [ "$answer_success" != "0" ]; then
    answer_pct=$(echo "scale=2; $answer_success * 100" | bc)
    printf "Answer Submission: %.2f%% " "$answer_pct"
    if (( $(echo "$answer_success > 0.98" | bc -l) )); then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
    fi
fi

# Session completion
completion_rate=$(jq -r '.metrics.session_completion_rate.values.rate // 0' "$RESULT_FILE")
if [ "$completion_rate" != "0" ]; then
    completion_pct=$(echo "scale=2; $completion_rate * 100" | bc)
    printf "Session Completion: %.2f%% " "$completion_pct"
    if (( $(echo "$completion_rate > 0.95" | bc -l) )); then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
    fi
fi

echo ""
echo "❌ Error Metrics:"
echo "-------------------"

# Error rate
error_rate=$(jq -r '.metrics.http_req_failed.values.rate // 0' "$RESULT_FILE")
error_pct=$(echo "scale=2; $error_rate * 100" | bc)
printf "Error Rate: %.2f%% " "$error_pct"
if (( $(echo "$error_rate < 0.01" | bc -l) )); then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Failed requests
failed_reqs=$(jq -r '.metrics.http_req_failed.values.passes // 0' "$RESULT_FILE")
echo "Failed Requests: $failed_reqs"

echo ""
echo "👥 Concurrency:"
echo "-------------------"

# Virtual users
vus_max=$(jq -r '.metrics.vus.values.max // 0' "$RESULT_FILE")
echo "Peak Virtual Users: $vus_max"

# Concurrent sessions
concurrent=$(jq -r '.metrics.active_concurrent_sessions.values.count // 0' "$RESULT_FILE")
if [ "$concurrent" != "0" ]; then
    echo "Peak Concurrent Sessions: $concurrent"
fi

echo ""
echo "🎯 Threshold Results:"
echo "-------------------"

# Check thresholds
thresholds=$(jq -r '.root_group.checks // []' "$RESULT_FILE")
passed=$(echo "$thresholds" | jq '[.[] | select(.passes > 0)] | length')
failed=$(echo "$thresholds" | jq '[.[] | select(.fails > 0)] | length')

echo "Passed: $passed"
echo "Failed: $failed"

if [ "$failed" -gt 0 ]; then
    echo ""
    print_warning "Some checks failed. Review the full results for details."
fi

echo ""
print_info "Analysis complete!"
print_info "For detailed analysis guidance, see ANALYSIS_GUIDE.md"
