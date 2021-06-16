/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2019 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Murthy Kakarlamudi - murthy@modusbox.com                         *
 **************************************************************************/

import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import xmlBodyParser from 'koa-xml-body';
import { oas } from 'koa-oas3';
import cors from '@koa/cors';

import * as http from 'http';
import * as path from 'path';

import { Logger } from '@mojaloop/sdk-standard-components';

import handlers from './handlers';
import middlewares from './middlewares';

import { ApiContext } from './types';
import { ServiceConfig } from './config';

export default class Server {
    _conf: ServiceConfig;

    _api: any;

    _server: any;

    _logger: Logger.Logger | undefined;

    constructor(conf: ServiceConfig) {
        this._conf = conf;
        this._api = null;
        this._server = null;
    }

    async setupApi(): Promise<http.Server> {
        this._api = new Koa<ApiContext>();

        this._logger = new Logger.Logger({
            ctx: {
                app: 'iso20022-core-connector',
            },
        });

        let validator;
        try {
            const apiSpecPath = path.join(__dirname, 'api.yaml');
            validator = await oas({
                file: apiSpecPath,
                endpoint: '/openapi.json',
                uiEndpoint: '/',
            });
        } catch (e) {
            throw new Error(
                'Error loading API spec. Please validate it with https://editor.swagger.io/',
            );
        }

        this._api.use(async (ctx: ApiContext, next: () => Promise<any>) => {
            ctx.state = {
                conf: this._conf,
                logger: this._logger,
            };
            await next();
        });

        // we need to allow cookies to be forwarded from other origins as this api may not
        // be served on the same port as the UI
        this._api.use(cors({ credentials: true }));

        this._api.use(middlewares.createErrorHandler());
        this._api.use(middlewares.createRequestIdGenerator());
        this._api.use(middlewares.createLogger(this._logger));
        this._api.use(xmlBodyParser());
        this._api.use(bodyParser());
        this._api.use(validator);
        this._api.use(middlewares.createRouter(handlers));

        this._server = this._createServer();
        return this._server;
    }

    async start(): Promise<void> {
        await new Promise(resolve => this._server.listen(this._conf.port, resolve));
        if(this._logger) {
            this._logger.log(
                `Serving API on port ${this._conf.port}`,
            );
        }
    }

    async stop(): Promise<void> {
        if(!this._server) {
            return;
        }
        await new Promise(resolve => this._server.close(resolve));
        console.log('API shut down complete');
    }

    _createServer(): http.Server {
        return http.createServer(this._api.callback());
    }
}
