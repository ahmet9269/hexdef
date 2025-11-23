#!/bin/bash
echo "Packaging extension using local vsce..."
./node_modules/.bin/vsce package
echo "Done. You can now install the .vsix file in VS Code."
