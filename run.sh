#!/bin/bash

FILE_TO_RUN=src/appshare-cli.ts
APPSHARE_CLI_REPO="https://github.com/appshare-io/appshare-cli"

# Export complete .env
export $(grep -v '^#' .env | xargs)

args=("$@")
permissions=(--allow-read --allow-env --allow-net --allow-write=.)
options=(--location=$APPSHARE_CLI_REPO)

deno run ${permissions[@]} ${options[@]} $FILE_TO_RUN ${args[@]}
