#!/bin/sh

# This script runs the aws cli command to deploy the app to s3
# It also uploads source maps to bugsnag

REACT_APP_PARSLEY_URL=$REACT_APP_PARSLEY_URL sh scripts/get-current-deployed-commit.sh

# Create a file in dist/ that contains the current commit hash
CURRENT_COMMIT_HASH=$(git rev-parse HEAD)
echo "$CURRENT_COMMIT_HASH" > dist/commit.txt

# # Try this step and throw an error if it fails
echo "Deploying to S3"
aws s3 sync dist/ s3://"${BUCKET}"/ --acl public-read --follow-symlinks --delete --exclude .env-cmdrc.json 
echo "Deployed to S3"

# If the above step succeeds, run this step
echo "Uploading source maps to Bugsnag"
. ./scripts/app-version.sh && node ./scripts/upload-bugsnag-sourcemaps.js
echo "Source maps uploaded to Bugsnag"