#!/bin/bash

# This script sets up environment variables for the hexdef extension
# Run this script when opening the codespace: source initial.sh

export SCHEMAS_DIR="/workspaces/hexdef/schemas"

echo "✅ SCHEMAS_DIR configured: $SCHEMAS_DIR"
echo "ℹ️  Other variables are loaded dynamically from schemas/hex.cfg/config.json by the extension."