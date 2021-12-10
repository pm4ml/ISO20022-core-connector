# ISO20022-core-connector

ISO20022 Core Connector for Mojaloop

## Configuration

Refer to the [.env.example](./.env.example) for a description of configurable environment variables.

## TODO

- Update api.yml to include new Outbound end-point for PACS.002
- Add unit tests for Callback response handler for async PACS.002 callback from an Inbound Post /transfers
- Add unit tests for Outbound end-point for PACS.002
- Update the CALLBACK_TIMEOUT to ms instead of seconds for consistency
- Re-factor [cache.js](./src/lib/cache.js) into Typescript
- Error-response for ISO Outbound API-calls need to be addressed going forward, currently `text/plain` is returned with a text error message.
- Incorporate the [rswitch-proxy](https://github.com/mdebarros/rswitch-proxy) simulator into this code-base either under the `./src/test` folder or a new root level folder.
