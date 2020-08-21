#!/usr/bin/env sh

set -ex

npx tsc --project ./examples/typescript/single-db/tsconfig.json
npx tsc --project ./examples/typescript/multiple-db/tsconfig.json
npx tsc --project ./examples/typescript/transactions/tsconfig.json
