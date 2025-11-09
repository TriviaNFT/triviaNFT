#!/bin/bash

# Load Testing Runner Script
# Helps run k6 tests with proper configuration and result collection

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
TEST_TYPE="smoke"
API_URL="${API_BASE_URL:-http://localhost:3000}"
RESULTS_DIR="results"

# Create results directory
mkdir -p "$RESULTS_DIR"

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if k6 is installed
check_k6() {
    if ! command -v k6 &> /dev/null; then
        print_error "k6 is not installed"
        echo ""
        echo "Install k6:"
        echo "  macOS:   brew install k6"
        echo "  Windows: choco install k6"
        echo "  Linux:   See https://k6.io/docs/get-started/installation/"
        exit 1
    fi
    print_info "k6 version: $(k6 version)"
}

# Function to check if API is reachable
check_api() {
    print_info "Checking API at $API_URL..."
    
    if curl -s -f -o /dev/null "$API_URL/health" 2>/dev/null; then
        print_info "API is reachable"
    else
        print_warning "API health check failed - tests may fail"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Function to run a test
run_test() {
    local test_name=$1
    local scenario=$2
    local vus=$3
    local duration=$4
    
    print_info "Running $test_name test..."
    print_info "  Scenario: $scenario"
    print_info "  Virtual Users: $vus"
    print_info "  Duration: $duration"
    print_info "  API: $API_URL"
    echo ""
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local result_file="$RESULTS_DIR/${test_name}_${timestamp}"
    
    # Run k6 test
    API_BASE_URL="$API_URL" k6 run \
        --vus "$vus" \
        --duration "$duration" \
        --out "json=${result_file}.json" \
        "scenarios/${scenario}.js" \
        | tee "${result_file}.txt"
    
    print_info "Results saved to:"
    print_info "  JSON: ${result_file}.json"
    print_info "  Text: ${result_file}.txt"
    echo ""
}

# Function to display usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Run k6 load tests for TriviaNFT API

OPTIONS:
    -t, --type TYPE         Test type: smoke, load, stress, spike (default: smoke)
    -u, --url URL          API base URL (default: http://localhost:3000)
    -s, --scenario NAME    Specific scenario: sessions, answers, leaderboard, full-load
    -v, --vus NUMBER       Number of virtual users (overrides test type)
    -d, --duration TIME    Test duration (overrides test type)
    -h, --help             Show this help message

EXAMPLES:
    # Run smoke test
    $0 --type smoke

    # Run stress test with 1000 users
    $0 --type stress

    # Run specific scenario
    $0 --scenario sessions --vus 100 --duration 5m

    # Test against staging
    $0 --url https://api-staging.trivia-nft.com --type load

EOF
}

# Parse command line arguments
SCENARIO=""
VUS=""
DURATION=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            TEST_TYPE="$2"
            shift 2
            ;;
        -u|--url)
            API_URL="$2"
            shift 2
            ;;
        -s|--scenario)
            SCENARIO="$2"
            shift 2
            ;;
        -v|--vus)
            VUS="$2"
            shift 2
            ;;
        -d|--duration)
            DURATION="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Set defaults based on test type if not specified
if [ -z "$SCENARIO" ]; then
    SCENARIO="full-load"
fi

if [ -z "$VUS" ] || [ -z "$DURATION" ]; then
    case $TEST_TYPE in
        smoke)
            VUS="${VUS:-1}"
            DURATION="${DURATION:-30s}"
            ;;
        load)
            VUS="${VUS:-50}"
            DURATION="${DURATION:-5m}"
            ;;
        stress)
            VUS="${VUS:-1000}"
            DURATION="${DURATION:-10m}"
            ;;
        spike)
            VUS="${VUS:-1000}"
            DURATION="${DURATION:-3m}"
            ;;
        *)
            print_error "Invalid test type: $TEST_TYPE"
            usage
            exit 1
            ;;
    esac
fi

# Main execution
print_info "=== TriviaNFT Load Testing ==="
echo ""

check_k6
check_api

run_test "$TEST_TYPE" "$SCENARIO" "$VUS" "$DURATION"

print_info "Test complete!"
print_info "Review results in $RESULTS_DIR/"
print_info "See ANALYSIS_GUIDE.md for help analyzing results"
