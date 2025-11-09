#!/bin/bash

# Configure AWS Secrets Manager secrets for TriviaNFT
# This script helps set up all required secrets for the staging environment

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
KEY="🔑"
WARN="⚠️"

ENVIRONMENT=${1:-staging}

if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    echo -e "${RED}${CROSS} Invalid environment: ${ENVIRONMENT}${NC}"
    echo "Usage: $0 [staging|production]"
    exit 1
fi

echo -e "${BLUE}${KEY} Configuring Secrets for ${ENVIRONMENT} Environment${NC}\n"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}${CROSS} AWS CLI is not installed${NC}"
    exit 1
fi

# Get AWS region
AWS_REGION=$(aws configure get region || echo "us-east-1")
echo -e "${BLUE}Region: ${AWS_REGION}${NC}\n"

# Function to create or update secret
create_or_update_secret() {
    local secret_name=$1
    local secret_description=$2
    local secret_value=$3
    
    echo -e "${BLUE}Configuring: ${secret_name}${NC}"
    
    # Check if secret exists
    if aws secretsmanager describe-secret --secret-id "${secret_name}" --region "${AWS_REGION}" &> /dev/null; then
        # Update existing secret
        aws secretsmanager put-secret-value \
            --secret-id "${secret_name}" \
            --secret-string "${secret_value}" \
            --region "${AWS_REGION}" > /dev/null
        echo -e "${GREEN}${CHECK} Updated existing secret${NC}\n"
    else
        # Create new secret
        aws secretsmanager create-secret \
            --name "${secret_name}" \
            --description "${secret_description}" \
            --secret-string "${secret_value}" \
            --region "${AWS_REGION}" > /dev/null
        echo -e "${GREEN}${CHECK} Created new secret${NC}\n"
    fi
}

# JWT Secret
echo -e "${YELLOW}${WARN} JWT Secret${NC}"
echo "This secret is used to sign and verify JWT tokens for authentication."
read -p "Enter JWT secret (or press Enter to generate): " JWT_SECRET
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    echo -e "${GREEN}Generated: ${JWT_SECRET}${NC}"
fi
create_or_update_secret \
    "trivia-nft/${ENVIRONMENT}/jwt-secret" \
    "JWT secret for TriviaNFT ${ENVIRONMENT}" \
    "{\"secret\":\"${JWT_SECRET}\"}"

# Blockfrost API Key
echo -e "${YELLOW}${WARN} Blockfrost API Key${NC}"
echo "Get your API key from: https://blockfrost.io/"
if [ "$ENVIRONMENT" = "staging" ]; then
    echo "Use a PREPROD project key for staging"
else
    echo "Use a MAINNET project key for production"
fi
read -p "Enter Blockfrost API key: " BLOCKFROST_KEY
if [ -z "$BLOCKFROST_KEY" ]; then
    echo -e "${RED}${CROSS} Blockfrost API key is required${NC}"
    exit 1
fi
create_or_update_secret \
    "trivia-nft/${ENVIRONMENT}/blockfrost-api-key" \
    "Blockfrost API key for TriviaNFT ${ENVIRONMENT}" \
    "{\"apiKey\":\"${BLOCKFROST_KEY}\"}"

# IPFS/NFT.Storage API Key
echo -e "${YELLOW}${WARN} IPFS/NFT.Storage API Key (Optional)${NC}"
echo "Get your API key from: https://nft.storage/"
echo "Leave empty to use Blockfrost IPFS"
read -p "Enter NFT.Storage API key (optional): " IPFS_KEY
if [ -n "$IPFS_KEY" ]; then
    create_or_update_secret \
        "trivia-nft/${ENVIRONMENT}/ipfs-api-key" \
        "IPFS API key for TriviaNFT ${ENVIRONMENT}" \
        "{\"apiKey\":\"${IPFS_KEY}\"}"
fi

# Database Credentials
echo -e "${YELLOW}${WARN} Database Credentials${NC}"
echo "These will be used for Aurora PostgreSQL"
read -p "Enter database username (default: trivianft): " DB_USERNAME
DB_USERNAME=${DB_USERNAME:-trivianft}
read -sp "Enter database password (or press Enter to generate): " DB_PASSWORD
echo ""
if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(openssl rand -base64 24)
    echo -e "${GREEN}Generated password${NC}"
fi
create_or_update_secret \
    "trivia-nft/${ENVIRONMENT}/database" \
    "Database credentials for TriviaNFT ${ENVIRONMENT}" \
    "{\"username\":\"${DB_USERNAME}\",\"password\":\"${DB_PASSWORD}\",\"engine\":\"postgres\",\"host\":\"placeholder\",\"port\":5432,\"dbname\":\"trivianft\"}"

# Redis Credentials
echo -e "${YELLOW}${WARN} Redis Credentials${NC}"
read -sp "Enter Redis auth token (or press Enter to generate): " REDIS_TOKEN
echo ""
if [ -z "$REDIS_TOKEN" ]; then
    REDIS_TOKEN=$(openssl rand -base64 32)
    echo -e "${GREEN}Generated token${NC}"
fi
create_or_update_secret \
    "trivia-nft/${ENVIRONMENT}/redis" \
    "Redis credentials for TriviaNFT ${ENVIRONMENT}" \
    "{\"authToken\":\"${REDIS_TOKEN}\",\"host\":\"placeholder\",\"port\":6379}"

# Policy Signing Key
echo -e "${YELLOW}${WARN} Cardano Policy Signing Key${NC}"
echo "This is the signing key for minting NFTs"
echo "For staging, you can generate a test key"
echo "For production, use a secure hardware wallet or key management service"
read -p "Enter policy signing key (skey JSON or press Enter to skip): " POLICY_KEY
if [ -n "$POLICY_KEY" ]; then
    create_or_update_secret \
        "trivia-nft/${ENVIRONMENT}/policy-signing-key" \
        "Policy signing key for TriviaNFT ${ENVIRONMENT}" \
        "{\"signingKey\":\"${POLICY_KEY}\"}"
else
    echo -e "${YELLOW}Skipped policy signing key - configure this manually${NC}\n"
fi

echo -e "${GREEN}${CHECK} All secrets configured!${NC}\n"

echo -e "${BLUE}📋 Configured Secrets:${NC}"
echo "  - trivia-nft/${ENVIRONMENT}/jwt-secret"
echo "  - trivia-nft/${ENVIRONMENT}/blockfrost-api-key"
if [ -n "$IPFS_KEY" ]; then
    echo "  - trivia-nft/${ENVIRONMENT}/ipfs-api-key"
fi
echo "  - trivia-nft/${ENVIRONMENT}/database"
echo "  - trivia-nft/${ENVIRONMENT}/redis"
if [ -n "$POLICY_KEY" ]; then
    echo "  - trivia-nft/${ENVIRONMENT}/policy-signing-key"
fi
echo ""

echo -e "${BLUE}📝 Next Steps:${NC}"
echo "  1. Update database and Redis secrets with actual endpoints after deployment"
echo "  2. Configure policy signing key if not done"
echo "  3. Verify secrets in AWS Console"
echo ""

