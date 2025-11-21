#!/bin/bash

# This script sets up environment variables for the hexdef extension
# Run this script when opening the codespace: source initial.sh

# Set the datagram directory path
export DATAGRAM_DIR_PATH="/workspaces/hexdef/test/datagram_dir"
export SCHEMAS_DIR="/workspaces/hexdef/schemas"
export DB="kafka"
export NEW_DATAGRAM_FILE_PATH="$SCHEMAS_DIR/datagram.xml"
export NEW_DATAGRAM_TARGET_NAME="new_datagram"
export MW_NAME="Kafka"  # MW TEST yerine Kafka
export DATAGRAM_SAVE_DIR="adapters/common"
export DATAGRAM="$SCHEMAS_DIR/datagram.xml"  # ✅ YENİ EKLENEN

echo "✅ Environment variables configured:"
echo "   DATAGRAM_DIR_PATH=$DATAGRAM_DIR_PATH"
echo "   DB=$DB"
echo "   SCHEMAS_DIR=$SCHEMAS_DIR"
echo "   MW_NAME=$MW_NAME"
echo "   DATAGRAM_SAVE_DIR=$DATAGRAM_SAVE_DIR"
echo "   DATAGRAM=$DATAGRAM"  # ✅ YENİ EKLENEN