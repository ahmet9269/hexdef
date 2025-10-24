#!/bin/bash

# This script sets up environment variables for the hexdef extension
# Run this script when opening the codespace: source initial.sh

# Set the datagram directory path
export DATAGRAM_DIR_PATH="/workspaces/hexdef/test/datagram_dir"
export DB="TEST_DB"
echo "✅ Environment variables configured:"
echo "   DATAGRAM_DIR_PATH=$DATAGRAM_DIR_PATH"
echo "   DB=$DB"
