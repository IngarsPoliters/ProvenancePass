#!/bin/bash

# Prepare Coolify-ready artifacts locally for testing
# Usage: ./scripts/prepare-artifacts.sh [app_name]

set -e

APP=${1:-all}
VERSION=$(node -p "require('./package.json').version")
COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "dev")
BRANCH=$(git branch --show-current 2>/dev/null || echo "local")
BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "🏗️  Preparing artifacts for: $APP"
echo "📦 Version: $VERSION"
echo "🔖 Commit: $COMMIT"
echo "🌿 Branch: $BRANCH"
echo ""

# Clean previous artifacts
rm -rf coolify-artifacts build-info
mkdir -p coolify-artifacts build-info

generate_build_info() {
    local app_name=$1
    cat > build-info/${app_name}-build.json << EOF
{
  "app": "${app_name}",
  "version": "${VERSION}",
  "commit": "${COMMIT}",
  "branch": "${BRANCH}",
  "build_time": "${BUILD_TIME}",
  "workflow_run": "local-${COMMIT}"
}
EOF
}

prepare_viewer() {
    echo "🎯 Preparing viewer artifacts..."
    
    # Build viewer
    pnpm -w build:viewer
    
    # Create artifact structure
    mkdir -p coolify-artifacts/viewer
    cp -r packages/viewer/dist/* coolify-artifacts/viewer/
    
    # Add build info
    generate_build_info "viewer"
    cp build-info/viewer-build.json coolify-artifacts/viewer/build-info.json
    
    echo "✅ Viewer artifacts ready"
}

prepare_site() {
    echo "🌐 Preparing site artifacts..."
    
    # Build site
    pnpm -w build:site
    
    # Create artifact structure
    mkdir -p coolify-artifacts/site
    cp -r packages/site/public/* coolify-artifacts/site/
    
    # Copy nginx config and Dockerfile
    cp packages/site/nginx.conf coolify-artifacts/site/
    cp packages/site/Dockerfile coolify-artifacts/site/
    
    # Add build info and health check
    generate_build_info "site"
    cp build-info/site-build.json coolify-artifacts/site/build-info.json
    echo '{"status":"ok","app":"site","version":"'$VERSION'"}' > coolify-artifacts/site/health.json
    
    echo "✅ Site artifacts ready"
}

prepare_data() {
    echo "📊 Preparing data artifacts..."
    
    # Build data (no-op)
    pnpm -w build:data
    
    # Create artifact structure
    mkdir -p coolify-artifacts/data
    cp -r packages/data/public/* coolify-artifacts/data/
    
    # Copy nginx config and Dockerfile
    cp packages/data/nginx.conf coolify-artifacts/data/
    cp packages/data/Dockerfile coolify-artifacts/data/
    
    # Add build info and health check
    generate_build_info "data"
    cp build-info/data-build.json coolify-artifacts/data/build-info.json
    echo '{"status":"ok","app":"data","version":"'$VERSION'"}' > coolify-artifacts/data/health.json
    
    echo "✅ Data artifacts ready"
}

# Main execution
case $APP in
    "viewer")
        prepare_viewer
        ;;
    "site")
        prepare_site
        ;;
    "data")
        prepare_data
        ;;
    "all")
        prepare_viewer
        prepare_site
        prepare_data
        ;;
    *)
        echo "❌ Unknown app: $APP"
        echo "Usage: $0 [viewer|site|data|all]"
        exit 1
        ;;
esac

echo ""
echo "🎉 Artifact preparation complete!"
echo "📁 Artifacts available in: coolify-artifacts/"
echo "📋 Build info available in: build-info/"
echo ""
echo "Artifact structure:"
tree coolify-artifacts/ 2>/dev/null || find coolify-artifacts/ -type f | sort