/* eslint-disable no-restricted-syntax */
/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2019 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Murthy Kakarlamudi - murthy@modusbox.com                         *
 **************************************************************************/

import * as util from 'util';
import Router from 'koa-router';

import { Logger } from '@mojaloop/sdk-standard-components';
import { ApiContext, HandlerMap } from './types';

import randomPhrase from './lib/randomphrase';
import { HTTPResponseError } from './requests';

/**
 * Log raw to console as a last resort
 * @return {Function}
 */
const createErrorHandler = () => async (
    ctx: ApiContext,
    next: () => Promise<any>,
): Promise<void> => {
    try {
        await next();
    } catch (e) {
        // TODO: return a 500 here if the response has not already been sent?
        ctx.state.logger.error(
            `Error caught in catchall: ${e.stack || util.inspect(e)}`,
        );
        ctx.body = e.message;
        ctx.status = 500;
        if(e instanceof HTTPResponseError) {
            ctx.body = e.getData().res.data;
            ctx.status = e.getData().res.statusCode;
        }
    }
};

/**
 * tag each incoming request with a unique identifier
 * @return {Function}
 */
const createRequestIdGenerator = () => async (
    ctx: ApiContext,
    next: () => Promise<any>,
): Promise<void> => {
    ctx.request.id = randomPhrase();
    await next();
};

/**
 * Add a log context for each request, log the receipt and handling thereof
 * @param logger
 * @return {Function}
 */
const createLogger = (logger: Logger.Logger) => async (
    ctx: ApiContext,
    next: () => Promise<any>,
): Promise<void> => {
    ctx.state.logger = logger.push({
        request: {
            id: ctx.request.id,
            path: ctx.path,
            method: ctx.method,
        },
    });
    ctx.state.logger.push({ body: ctx.request.body }).log('Request received');

    // allow exceptions to bubble up. they should be caught by our general error handler back up the chain
    await next();
};

/**
 * Creates koa routes based on handler map
 * @return {Function}
 */
const createRouter = (handlerMap: HandlerMap): Router.IMiddleware<any, any> => {
    const router = new Router();
    for(const [endpoint, methods] of Object.entries(handlerMap)) {
        const koaEndpoint = endpoint.replace(/{/g, ':').replace(/}/g, '');
        for(const [method, handler] of Object.entries(methods)) {
            // we have to do the following to work around typescript not allowing strings to index
            // methods on the Router type. It is probably the only typesafe way of doing this.
            let routerFunc: (...args: Array<any>) => void;

            switch (method) {
                case 'get':
                    routerFunc = router.get.bind(router);
                    break;
                case 'post':
                    routerFunc = router.post.bind(router);
                    break;
                case 'put':
                    routerFunc = router.put.bind(router);
                    break;
                case 'del':
                    routerFunc = router.del.bind(router);
                    break;
                case 'patch':
                    routerFunc = router.patch.bind(router);
                    break;
                default:
                    throw new Error(`Router method '${method}' not supported`);
            }

            routerFunc(
                koaEndpoint,
                async (ctx: ApiContext, next: () => Promise<any>) => {
                    try {
                        await Promise.resolve(handler(ctx, next));
                    } catch (e) {
                        ctx.state.logger.push({ error: e }).log('Error');
                        ctx.body = e.message;
                        ctx.status = 500;
                        if(e instanceof HTTPResponseError) {
                            ctx.body = e.getData().res.data;
                            ctx.status = e.getData().res.statusCode;
                        }
                    }
                },
            );
        }
    }
    return router.routes();
};

export default {
    createErrorHandler,
    createRequestIdGenerator,
    createLogger,
    createRouter,
};
