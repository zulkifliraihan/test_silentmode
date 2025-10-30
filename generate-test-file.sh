#!/bin/bash

# START: Configuration
FILE_PATH="$HOME/file_to_download.txt"
FILE_SIZE_MB=100
# END: Configuration

echo "Generating test file: $FILE_PATH"
echo "Size: ${FILE_SIZE_MB}MB"

# START: Generate random file using dd
dd if=/dev/urandom of="$FILE_PATH" bs=1M count=$FILE_SIZE_MB 2>/dev/null
# END: Generate random file using dd

# START: Check generation result
if [ $? -eq 0 ]; then
    echo "✓ Test file generated successfully!"
    echo "Location: $FILE_PATH"
    ls -lh "$FILE_PATH"
else
    echo "✗ Error generating test file"
    exit 1
fi
# END: Check generation result
