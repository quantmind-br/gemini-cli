#!/bin/bash
set -e

echo "Cleaning node_modules..."
rm -rf node_modules

echo "Installing dependencies..."
npm install

echo "Building project..."
npm run build

echo "Installing globally..."
npm install -g .

echo "Build and install completed successfully!"