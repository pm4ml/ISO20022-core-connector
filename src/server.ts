/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2019 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Murthy Kakarlamudi - murthy@modusbox.com                         *
 *                                                                        *
 *  CONTRIBUTORS:                                                         *
 *       miguel de Barros - miguel.de.barros@modusbox.com                 *
 **************************************************************************/

import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { oas } from 'koa-oas3';
import cors from '@koa/cors';

import * as http from 'http';
import * as path from 'path';

import { Logger } from '@mojaloop/sdk-standard-components';

import handlers from './handlers';
import middlewares from './middlewares';

import { ApiContext } from './types';
import { Config, IServiceConfig } from './config';
import { bodyParser as xmlBodyParser } from './lib/koaXmlBody';
import Cache from './lib/cache';

export default class Server {
    _conf: IServiceConfig;

    _api: any;

    _server: any;

    _logger: Logger.Logger | undefined;

    _cache: any; // TODO: fix this

    constructor(conf: IServiceConfig) {
        this._conf = conf;
        this._api = null;
        this._server = null;
        this._logger = conf.logger;
        this._cache = null;
    }

    async setupApi(): Promise<http.Server> {
        this._api = new Koa<ApiContext>();

        let validator;
        try {
            const apiSpecPath = path.join(__dirname, 'api.yaml');
            validator = await oas({
                file: apiSpecPath,
                endpoint: '/openapi.json',
                uiEndpoint: '/',
                validatePaths: [ // TODO: this should be removed once all ISO paths are handled by the api.yml. This is here because the ISO paths are not properly handled by the api.yml validation
                    '/quoterequests',
                    '/transfers',
                ],
            });
        } catch (e) {
            throw new Error(
                'Error loading API spec. Please validate it with https://editor.swagger.io/',
            );
        }

        // Setup cache
        this._cache = new Cache({
            ...this._conf.cache,
            logger: this._logger?.push({ component: 'cache' }),
            enabledTestFeatures: this._conf?.cache?.enabledTestFeatures,
        });
        await this._cache.connect();

        this._api.use(async (ctx: ApiContext, next: () => Promise<any>) => {
            ctx.state = {
                conf: this._conf,
                logger: this._logger,
                cache: this._cache,
            };
            await next();
        });

        // we need to allow cookies to be forwarded from other origins as this api may not
        // be served on the same port as the UI
        this._api.use(cors({ credentials: true }));

        this._api.use(middlewares.createErrorHandler());
        this._api.use(middlewares.createRequestIdGenerator());
        if(this._logger) {
            this._api.use(middlewares.createLogger(this._logger));
        }

        this._api.use(xmlBodyParser({
            xmlOptions: Config.xmlOptions,
            onerror: (err: any, ctx: ApiContext) => {
                ctx.response.type = 'text/html';
                ctx.response.status = 400;
                ctx.response.body = '';
                ctx.state.logger.log(err);
            },
        }));
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
