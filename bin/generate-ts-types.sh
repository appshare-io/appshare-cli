#!/bin/sh

ADMIN_SECRET="nhost-admin-secret"

# Generate types for Hasura GraphQL Engine
npx openapi-typescript \
    http://127.0.0.1:1337/api/swagger/json \
    --header "x-hasura-admin-secret: $ADMIN_SECRET" \
    --path-params-as-types \
    --output src/types/appshare-openapi.ts
