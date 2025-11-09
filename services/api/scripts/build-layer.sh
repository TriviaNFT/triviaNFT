#!/bin/bash

# Build Lambda Layer for Node.js dependencies
# This script creates a Lambda layer with all production dependencies

set -e

echo "Building Lambda Layer..."

# Create layer directory structure
LAYER_DIR="layer"
NODE_MODULES_DIR="$LAYER_DIR/nodejs/node_modules"

# Clean previous build
rm -rf "$LAYER_DIR"
mkdir -p "$NODE_MODULES_DIR"

# Copy package.json and package-lock.json
cp package.json "$LAYER_DIR/nodejs/"
cp pnpm-lock.yaml "$LAYER_DIR/nodejs/" 2>/dev/null || true

# Install production dependencies
cd "$LAYER_DIR/nodejs"
pnpm install --prod --frozen-lockfile

# Remove unnecessary files to reduce layer size
find node_modules -name "*.md" -type f -delete
find node_modules -name "*.ts" -type f -delete
find node_modules -name "*.map" -type f -delete
find node_modules -name "test" -type d -exec rm -rf {} + 2>/dev/null || true
find node_modules -name "tests" -type d -exec rm -rf {} + 2>/dev/null || true
find node_modules -name "*.test.js" -type f -delete
find node_modules -name "*.spec.js" -type f -delete

cd ../..

echo "Lambda Layer built successfully at $LAYER_DIR"
echo "Layer size: $(du -sh $LAYER_DIR | cut -f1)"
