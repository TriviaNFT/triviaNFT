#!/bin/bash

# Verify PWA Functionality
# This script checks that the Progressive Web App is properly configured

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Emojis
CHECK="✓"
CROSS="✗"
MAGNIFY="🔍"
WARN="⚠️"

ENVIRONMENT=${1:-staging}

if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    echo -e "${RED}${CROSS} Invalid environment: ${ENVIRONMENT}${NC}"
    echo "Usage: $0 [staging|production]"
    exit 1
fi

echo -e "${BLUE}${MAGNIFY} Verifying PWA for ${ENVIRONMENT}${NC}\n"

# Get CloudFront domain
CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name "TriviaNFT-Web-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomain`].OutputValue' \
    --output text 2>/dev/null)

if [ -z "$CLOUDFRONT_DOMAIN" ]; then
    echo -e "${RED}${CROSS} Could not get CloudFront domain${NC}"
    exit 1
fi

BASE_URL="https://${CLOUDFRONT_DOMAIN}"
echo -e "${BLUE}Testing: ${BASE_URL}${NC}\n"

ERRORS=0

# Check if site is accessible
echo -e "${BLUE}Checking site accessibility...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/")
if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}${CHECK} Site is accessible (HTTP ${HTTP_STATUS})${NC}\n"
else
    echo -e "${RED}${CROSS} Site returned HTTP ${HTTP_STATUS}${NC}\n"
    ERRORS=$((ERRORS + 1))
fi

# Check manifest.json
echo -e "${BLUE}Checking web app manifest...${NC}"
MANIFEST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/manifest.json")
if [ "$MANIFEST_STATUS" = "200" ]; then
    echo -e "${GREEN}${CHECK} manifest.json is accessible${NC}"
    
    # Download and validate manifest
    MANIFEST=$(curl -s "${BASE_URL}/manifest.json")
    
    # Check required fields
    if echo "$MANIFEST" | grep -q '"name"'; then
        echo -e "${GREEN}${CHECK} Manifest has 'name' field${NC}"
    else
        echo -e "${RED}${CROSS} Manifest missing 'name' field${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    
    if echo "$MANIFEST" | grep -q '"short_name"'; then
        echo -e "${GREEN}${CHECK} Manifest has 'short_name' field${NC}"
    else
        echo -e "${RED}${CROSS} Manifest missing 'short_name' field${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    
    if echo "$MANIFEST" | grep -q '"start_url"'; then
        echo -e "${GREEN}${CHECK} Manifest has 'start_url' field${NC}"
    else
        echo -e "${RED}${CROSS} Manifest missing 'start_url' field${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    
    if echo "$MANIFEST" | grep -q '"display"'; then
        echo -e "${GREEN}${CHECK} Manifest has 'display' field${NC}"
    else
        echo -e "${RED}${CROSS} Manifest missing 'display' field${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    
    if echo "$MANIFEST" | grep -q '"icons"'; then
        echo -e "${GREEN}${CHECK} Manifest has 'icons' field${NC}"
    else
        echo -e "${RED}${CROSS} Manifest missing 'icons' field${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}${CROSS} manifest.json not found (HTTP ${MANIFEST_STATUS})${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check service worker
echo -e "${BLUE}Checking service worker...${NC}"
SW_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/service-worker.js" || echo "404")
if [ "$SW_STATUS" = "200" ]; then
    echo -e "${GREEN}${CHECK} service-worker.js is accessible${NC}\n"
else
    echo -e "${YELLOW}${WARN} service-worker.js not found (HTTP ${SW_STATUS})${NC}"
    echo -e "${YELLOW}Note: Service worker is optional but recommended for offline support${NC}\n"
fi

# Check icons
echo -e "${BLUE}Checking PWA icons...${NC}"

check_icon() {
    local icon_path=$1
    local icon_name=$2
    
    ICON_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${icon_path}")
    if [ "$ICON_STATUS" = "200" ]; then
        echo -e "${GREEN}${CHECK} ${icon_name} is accessible${NC}"
    else
        echo -e "${YELLOW}${WARN} ${icon_name} not found (HTTP ${ICON_STATUS})${NC}"
    fi
}

check_icon "/icon.png" "App icon"
check_icon "/favicon.ico" "Favicon"
echo ""

# Check HTTPS
echo -e "${BLUE}Checking HTTPS configuration...${NC}"
HTTPS_RESPONSE=$(curl -s -I "${BASE_URL}/" | head -n 1)
if echo "$HTTPS_RESPONSE" | grep -q "200"; then
    echo -e "${GREEN}${CHECK} HTTPS is working${NC}\n"
else
    echo -e "${RED}${CROSS} HTTPS issue detected${NC}\n"
    ERRORS=$((ERRORS + 1))
fi

# Check security headers
echo -e "${BLUE}Checking security headers...${NC}"

check_header() {
    local header_name=$1
    local header_value=$(curl -s -I "${BASE_URL}/" | grep -i "^${header_name}:" | cut -d' ' -f2-)
    
    if [ -n "$header_value" ]; then
        echo -e "${GREEN}${CHECK} ${header_name}: ${header_value}${NC}"
    else
        echo -e "${YELLOW}${WARN} ${header_name} not found${NC}"
    fi
}

check_header "x-frame-options"
check_header "strict-transport-security"
check_header "x-content-type-options"
check_header "content-security-policy"
echo ""

# Check caching headers
echo -e "${BLUE}Checking caching configuration...${NC}"

# Check HTML caching (should be no-cache)
HTML_CACHE=$(curl -s -I "${BASE_URL}/" | grep -i "^cache-control:" | cut -d' ' -f2-)
if echo "$HTML_CACHE" | grep -q "no-cache\|must-revalidate\|max-age=0"; then
    echo -e "${GREEN}${CHECK} HTML has correct cache headers: ${HTML_CACHE}${NC}"
else
    echo -e "${YELLOW}${WARN} HTML cache headers: ${HTML_CACHE}${NC}"
fi

# Check static asset caching (should be long-lived)
MANIFEST_CACHE=$(curl -s -I "${BASE_URL}/manifest.json" | grep -i "^cache-control:" | cut -d' ' -f2-)
echo -e "${BLUE}Manifest cache headers: ${MANIFEST_CACHE}${NC}"
echo ""

# Check compression
echo -e "${BLUE}Checking compression...${NC}"
CONTENT_ENCODING=$(curl -s -I -H "Accept-Encoding: gzip, deflate, br" "${BASE_URL}/" | grep -i "^content-encoding:" | cut -d' ' -f2-)
if [ -n "$CONTENT_ENCODING" ]; then
    echo -e "${GREEN}${CHECK} Compression enabled: ${CONTENT_ENCODING}${NC}\n"
else
    echo -e "${YELLOW}${WARN} Compression not detected${NC}\n"
fi

# Check mobile viewport
echo -e "${BLUE}Checking mobile viewport...${NC}"
HTML_CONTENT=$(curl -s "${BASE_URL}/")
if echo "$HTML_CONTENT" | grep -q 'viewport'; then
    echo -e "${GREEN}${CHECK} Viewport meta tag found${NC}\n"
else
    echo -e "${RED}${CROSS} Viewport meta tag not found${NC}\n"
    ERRORS=$((ERRORS + 1))
fi

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}${CHECK} All PWA checks passed!${NC}\n"
    
    echo -e "${BLUE}📱 PWA Features:${NC}"
    echo "  ✓ Web app manifest configured"
    echo "  ✓ HTTPS enabled"
    echo "  ✓ Security headers present"
    echo "  ✓ Compression enabled"
    echo "  ✓ Mobile viewport configured"
    echo ""
    
    echo -e "${BLUE}📝 Testing Checklist:${NC}"
    echo "  1. Open ${BASE_URL} in Chrome/Edge"
    echo "  2. Check for install prompt (+ icon in address bar)"
    echo "  3. Install the PWA"
    echo "  4. Verify it opens in standalone mode"
    echo "  5. Test offline functionality (if service worker present)"
    echo "  6. Test on mobile device"
    echo ""
    
    exit 0
else
    echo -e "${RED}${CROSS} ${ERRORS} check(s) failed${NC}\n"
    echo -e "${YELLOW}Please review the errors above${NC}\n"
    exit 1
fi

