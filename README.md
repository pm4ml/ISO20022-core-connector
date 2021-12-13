# ISO20022-core-connector

ISO20022 Core Connector for Mojaloop

## Configuration

Refer to the [.env.example](./.env.example) for a description of configurable environment variables.

## Starting Application

1. Make a copy of [.env.example](./.env.example) as `.env`

2. Modify `.env` to suite your environment

3. Start Connector

    ```bash
    npm start
    ```

## Testing

### Unit

```bash
npm test
```

### Integration

1. Make a copy of [.env.example](./.env.example) as `.env` (leave as default).

2. Startup redis

    ```bash
    docker-compose up -d redis
    ```

3. Startup Mock-server

    ```bash
    sh ./src/test/scripts/restartMockServer.sh

    ```

    This will start [mock-server](https://www.mock-server.com) using docker, and create expectations (i.e. responses).

4. Start Connector

    ```bash
    npm start
    ```

5. Postman Collection

    Import [iso-connector.postman_collection.json](./examples/iso-connector.postman_collection.json) into Postman.

## TODO

- Update api.yml to include new Outbound end-point for PACS.002
- Add unit tests for Callback response handler for async PACS.002 callback from an Inbound Post /transfers
- Add unit tests for Outbound end-point for PACS.002
- Update the CALLBACK_TIMEOUT to ms instead of seconds for consistency
- Re-factor [cache.js](./src/lib/cache.js) into Typescript
- Add unit tests for [cache.js](./src/lib/cache.js) once Re-factored into Typescript
- Error-response for ISO Outbound API-calls need to be addressed going forward, currently `text/plain` is returned with a text error message.
- Incorporate the [rswitch-proxy](https://github.com/mdebarros/rswitch-proxy) simulator into this code-base either under the `./src/test` folder or a new root level folder.
