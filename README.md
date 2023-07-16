# appshare-cli

To install run

```sh
deno install \
    --allow-net=api.appshare.io \
    --allow-read \
    https://raw.githubusercontent.com/appshare-io/appshare-cli/main/src/appshare.ts

# Usage example
appshare --help
appshare login user@example.com
appshare init
appshare deploy index.ts
```
