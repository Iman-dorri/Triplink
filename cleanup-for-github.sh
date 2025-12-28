#!/bin/bash
# Script to clean up project directory before pushing to GitHub

echo "=== Cleaning up project directory ==="
echo ""

# Remove temporary cleanup scripts (they've served their purpose)
TEMP_SCRIPTS=(
    "cleanup-root.sh"
    "cleanup-temp-files.sh"
    "cleanup-for-github.sh"  # This script itself
)

# Remove local development helper scripts (not needed in repo)
LOCAL_DEV_SCRIPTS=(
    "fix-local-docker.sh"
    "get-db-connection-info.sh"
    "start-local-dev.sh"
    "stop-for-local-dev.sh"
)

# Files to remove
FILES_TO_REMOVE=(
    "${TEMP_SCRIPTS[@]}"
    "${LOCAL_DEV_SCRIPTS[@]}"
)

removed_count=0
for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        echo "✓ Removed: $file"
        ((removed_count++))
    fi
done

# Check for .env file (should not be committed)
if [ -f ".env" ]; then
    echo ""
    echo "⚠️  WARNING: .env file found in root directory"
    echo "   Make sure it's in .gitignore and contains no secrets"
    echo "   Consider using .env.example instead"
fi

# Check for node_modules in root
if [ -d "node_modules" ]; then
    echo ""
    echo "⚠️  WARNING: node_modules found in root directory"
    echo "   This should be in .gitignore (already is)"
fi

echo ""
echo "=== Cleanup Summary ==="
echo "Removed $removed_count file(s)"
echo ""
echo "Essential files kept:"
echo "  ✓ docker-compose.yml"
echo "  ✓ docker-compose.env.example"
echo "  ✓ deploy.sh (deployment script)"
echo "  ✓ dev-setup.sh (development setup)"
echo "  ✓ cleanup-containers.sh (container maintenance)"
echo "  ✓ docker-start.sh (startup script)"
echo "  ✓ Makefile"
echo "  ✓ README.md"
echo "  ✓ DEPLOYMENT.md"
echo ""
echo "Ready to commit and push to GitHub!"








