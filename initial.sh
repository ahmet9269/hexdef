#!/bin/bash

# This script sets up environment variables for the hexdef extension
# Run this script when opening the codespace: source initial.sh

# Set the datagram directory path
export DATAGRAM_DIR_PATH="/workspaces/hexdef/test/datagram_dir"
export SCHEMAS_DIR="/workspaces/hexdef/schemas"
export DB="TEST_DB"
export NEW_DATAGRAM_FILE_PATH="$SCHEMAS_DIR/datagram.xml"
export NEW_DATAGRAM_TARGET_NAME="new_datagram"
export MW_NAME="MW TEST"



echo "✅ Environment variables configured:"
echo "   DATAGRAM_DIR_PATH=$DATAGRAM_DIR_PATH"
echo "   DB=$DB"
echo "   SCHEMAS_DIR=$SCHEMAS_DIR"