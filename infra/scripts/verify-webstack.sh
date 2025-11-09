#!/bin/bash

# WebStack Verification Script
# This script verifies that the WebStack is properly configured

set -e

ENVIRONMENT=${1:-staging}
DISTRIBUTION_ID=${2}

echo "🔍 Verifying WebStack for environment: $ENVIRONMENT"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Get stack outputs
echo "📋 Getting stack outputs..."
STACK_NAME="TriviaNFT-Web-${ENVIRONMENT}"

BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucketName'].OutputValue" \
    --output text 2>/dev/null || echo "")

DIST_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='DistributionDomainName'].OutputValue" \
    --output text 2>/dev/null || echo "")

DIST_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
    --output text 2>/dev/null || echo "")

if [ -z "$BUCKET_NAME" ]; then
    error "Stack not found or not deployed: $STACK_NAME"
    exit 1
fi

success "Stack found: $STACK_NAME"
echo "  Bucket: $BUCKET_NAME"
echo "  Distribution: $DIST_DOMAIN"
echo "  Distribution ID: $DIST_ID"
echo ""

# Verify S3 bucket
echo "🪣 Verifying S3 bucket..."

# Check versioning
VERSIONING=$(aws s3api get-bucket-versioning --bucket "$BUCKET_NAME" --query "Status" --output text 2>/dev/null || echo "")
if [ "$VERSIONING" = "Enabled" ]; then
    success "Versioning is enabled"
else
    error "Versioning is not enabled"
fi

# Check public access block
PUBLIC_ACCESS=$(aws s3api get-public-access-block --bucket "$BUCKET_NAME" 2>/dev/null || echo "")
if echo "$PUBLIC_ACCESS" | grep -q "BlockPublicAcls.*true"; then
    success "Public access is blocked"
else
    error "Public access is not properly blocked"
fi

# Check encryption
ENCRYPTION=$(aws s3api get-bucket-encryption --bucket "$BUCKET_NAME" 2>/dev/null || echo "")
if [ -n "$ENCRYPTION" ]; then
    success "Encryption is enabled"
else
    warning "Encryption status could not be verified"
fi

echo ""

# Verify CloudFront distribution
echo "🌐 Verifying CloudFront distribution..."

DIST_CONFIG=$(aws cloudfront get-distribution --id "$DIST_ID" 2>/dev/null || echo "")

if [ -z "$DIST_CONFIG" ]; then
    error "Could not retrieve distribution configuration"
else
    success "Distribution configuration retrieved"
    
    # Check if WAF is attached
    if echo "$DIST_CONFIG" | grep -q "WebACLId"; then
        success "WAF WebACL is attached"
    else
        warning "WAF WebACL attachment could not be verified"
    fi
    
    # Check if Origin Shield is enabled
    if echo "$DIST_CONFIG" | grep -q "OriginShield"; then
        success "Origin Shield is configured"
    else
        warning "Origin Shield configuration could not be verified"
    fi
    
    # Check if compression is enabled
    if echo "$DIST_CONFIG" | grep -q "Compress.*true"; then
        success "Compression is enabled"
    else
        warning "Compression status could not be verified"
    fi
fi

echo ""

# Test distribution if it's deployed
echo "🧪 Testing distribution..."

if [ -n "$DIST_DOMAIN" ]; then
    # Test HTTPS redirect
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$DIST_DOMAIN" 2>/dev/null || echo "000")
    if [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ] || [ "$HTTP_STATUS" = "307" ]; then
        success "HTTP redirects to HTTPS"
    else
        warning "HTTP redirect status: $HTTP_STATUS (expected 301/302/307)"
    fi
    
    # Test HTTPS
    HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$DIST_DOMAIN" 2>/dev/null || echo "000")
    if [ "$HTTPS_STATUS" = "200" ] || [ "$HTTPS_STATUS" = "403" ]; then
        success "HTTPS is accessible (status: $HTTPS_STATUS)"
    else
        warning "HTTPS status: $HTTPS_STATUS"
    fi
    
    # Test compression support
    COMPRESSION=$(curl -s -H "Accept-Encoding: gzip,br" -I "https://$DIST_DOMAIN" 2>/dev/null | grep -i "content-encoding" || echo "")
    if [ -n "$COMPRESSION" ]; then
        success "Compression is working: $COMPRESSION"
    else
        warning "Compression could not be verified (may need content in bucket)"
    fi
    
    # Test security headers
    SECURITY_HEADERS=$(curl -s -I "https://$DIST_DOMAIN" 2>/dev/null | grep -i "x-frame-options\|strict-transport-security\|x-content-type-options" || echo "")
    if [ -n "$SECURITY_HEADERS" ]; then
        success "Security headers are present"
        echo "$SECURITY_HEADERS" | sed 's/^/    /'
    else
        warning "Security headers could not be verified"
    fi
else
    warning "Distribution domain not available for testing"
fi

echo ""
echo "✅ Verification complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Build your frontend application"
echo "  2. Upload to S3: aws s3 sync dist/ s3://$BUCKET_NAME/ --delete"
echo "  3. Invalidate cache: aws cloudfront create-invalidation --distribution-id $DIST_ID --paths '/*'"
echo ""
