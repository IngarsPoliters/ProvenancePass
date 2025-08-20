#!/bin/bash

# Validate CI workflow components locally
# This script simulates the GitHub Actions build process

set -e

echo "🔍 Validating CI/CD components..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 is available"
    else
        echo -e "${RED}✗${NC} $1 is missing"
        return 1
    fi
}

run_test() {
    local test_name="$1"
    local command="$2"
    
    echo -e "${YELLOW}🧪 Testing: $test_name${NC}"
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $test_name passed"
    else
        echo -e "${RED}✗${NC} $test_name failed"
        return 1
    fi
}

echo "1. Prerequisites Check"
echo "====================="
check_command "node"
check_command "pnpm"
check_command "git"
echo ""

echo "2. Node.js & pnpm Versions"
echo "=========================="
echo "Node.js: $(node --version)"
echo "pnpm: $(pnpm --version)"
echo "Expected Node.js: >=20.0.0"
echo "Expected pnpm: >=8.0.0"
echo ""

echo "3. Package Structure Validation"
echo "==============================="
for pkg in viewer site data; do
    if [ -d "packages/$pkg" ]; then
        echo -e "${GREEN}✓${NC} packages/$pkg exists"
    else
        echo -e "${RED}✗${NC} packages/$pkg missing"
    fi
done
echo ""

echo "4. Build Script Validation"
echo "=========================="
# Check if build scripts exist in package.json
if grep -q '"build:viewer"' package.json; then
    echo -e "${GREEN}✓${NC} Viewer build script exists"
else
    echo -e "${RED}✗${NC} Viewer build script missing"
fi

if grep -q '"build:site"' package.json; then
    echo -e "${GREEN}✓${NC} Site build script exists"
else
    echo -e "${RED}✗${NC} Site build script missing"
fi

if grep -q '"build:data"' package.json; then
    echo -e "${GREEN}✓${NC} Data build script exists"
else
    echo -e "${RED}✗${NC} Data build script missing"
fi
echo ""

echo "5. Dependencies Check"
echo "===================="
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Dependencies already installed"
else
    echo "Installing dependencies..."
    if pnpm install --frozen-lockfile > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Dependencies installed successfully"
    else
        echo -e "${RED}✗${NC} Failed to install dependencies"
        exit 1
    fi
fi
echo ""

echo "6. Build Process Testing"
echo "========================"

# Test viewer build (most complex)
echo "Testing viewer build..."
if pnpm -w build:viewer > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Viewer build successful"
    
    # Check bundle size validation
    if [ -f "packages/viewer/dist/assets/index-*.js" ]; then
        echo -e "${GREEN}✓${NC} Viewer assets generated"
    else
        echo -e "${RED}✗${NC} Viewer assets missing"
    fi
else
    echo -e "${RED}✗${NC} Viewer build failed"
fi

# Test site build
echo "Testing site build..."
if pnpm -w build:site > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Site build successful"
else
    echo -e "${RED}✗${NC} Site build failed"
fi

# Test data build
echo "Testing data build..."
if pnpm -w build:data > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Data build successful"
else
    echo -e "${RED}✗${NC} Data build failed"
fi
echo ""

echo "7. Artifact Structure Validation"
echo "================================"

# Test artifact preparation
if ./scripts/prepare-artifacts.sh all > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Artifact preparation successful"
    
    # Check artifact structure
    for app in viewer site data; do
        if [ -d "coolify-artifacts/$app" ]; then
            echo -e "${GREEN}✓${NC} $app artifacts created"
            
            if [ -f "coolify-artifacts/$app/build-info.json" ]; then
                echo -e "${GREEN}✓${NC} $app build info generated"
            else
                echo -e "${RED}✗${NC} $app build info missing"
            fi
        else
            echo -e "${RED}✗${NC} $app artifacts missing"
        fi
    done
else
    echo -e "${RED}✗${NC} Artifact preparation failed"
fi
echo ""

echo "8. GitHub Actions Workflow Validation"
echo "====================================="
if [ -f ".github/workflows/build.yml" ]; then
    echo -e "${GREEN}✓${NC} Build workflow exists"
    
    # Basic YAML validation (if available)
    if command -v yamllint &> /dev/null; then
        if yamllint .github/workflows/build.yml > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Build workflow YAML is valid"
        else
            echo -e "${RED}✗${NC} Build workflow YAML has issues"
        fi
    else
        echo -e "${YELLOW}⚠${NC} yamllint not available, skipping YAML validation"
    fi
else
    echo -e "${RED}✗${NC} Build workflow missing"
fi
echo ""

echo "9. Coolify Compatibility Check"
echo "=============================="

# Check Dockerfiles
for app in site data; do
    if [ -f "packages/$app/Dockerfile" ]; then
        echo -e "${GREEN}✓${NC} $app Dockerfile exists"
    else
        echo -e "${RED}✗${NC} $app Dockerfile missing"
    fi
done

# Check nginx configs
for app in site data; do
    if [ -f "packages/$app/nginx.conf" ]; then
        echo -e "${GREEN}✓${NC} $app nginx.conf exists"
        
        # Check for health endpoint
        if grep -q "healthz" "packages/$app/nginx.conf"; then
            echo -e "${GREEN}✓${NC} $app health endpoint configured"
        else
            echo -e "${RED}✗${NC} $app health endpoint missing"
        fi
    else
        echo -e "${RED}✗${NC} $app nginx.conf missing"
    fi
done
echo ""

echo "10. Bundle Size Validation"
echo "=========================="
if [ -f "packages/viewer/scripts/validate-bundle-size.js" ]; then
    echo -e "${GREEN}✓${NC} Bundle size validator exists"
    
    # Run the validator
    cd packages/viewer
    if node scripts/validate-bundle-size.js > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Bundle size validation passed"
    else
        echo -e "${RED}✗${NC} Bundle size validation failed"
    fi
    cd ../..
else
    echo -e "${RED}✗${NC} Bundle size validator missing"
fi
echo ""

echo "🎆 CI/CD Validation Complete!"
echo ""
echo "Summary:"
echo "- GitHub Actions workflow: .github/workflows/build.yml"
echo "- Build commands: pnpm -w build:{viewer,site,data}"
echo "- Artifact preparation: ./scripts/prepare-artifacts.sh"
echo "- Bundle size validation: < 120KB gzipped"
echo "- Coolify-ready artifacts with health checks"
echo ""
echo "Next steps:"
echo "1. Push changes to trigger CI build"
echo "2. Monitor GitHub Actions for build status"
echo "3. Download artifacts for Coolify deployment"
echo "4. Verify health endpoints after deployment"