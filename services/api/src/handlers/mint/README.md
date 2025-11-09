# Mint Handlers

This directory contains Lambda handlers for NFT minting operations.

## Endpoints

- `GET /eligibilities` - List active mint eligibilities for the authenticated player
- `POST /mint/{eligibilityId}` - Initiate NFT minting workflow
- `GET /mint/{mintId}/status` - Check status of a mint operation

## Flow

1. Player achieves perfect score (10/10) in a session
2. System creates an eligibility record (1 hour for connected, 25 min for guest)
3. Player calls GET /eligibilities to see available mints
4. Player calls POST /mint/{eligibilityId} to start minting
5. Step Function workflow handles blockchain operations
6. Player polls GET /mint/{mintId}/status to check progress
7. NFT is minted to player's wallet and recorded in database

## Requirements

- Requirements 10, 11, 12, 13, 14
