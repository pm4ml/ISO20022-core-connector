/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *      Steven Oderayi - steven.oderayi@modusbox.com                      *
 **************************************************************************/

'use strict'

import { Logger } from '@mojaloop/sdk-standard-components';
import { mocked } from 'ts-jest/utils';

import randomPhrase from '../../lib/randomphrase';
jest.mock('../../lib/randomphrase');
const mockedRandomPhrase = mocked(randomPhrase, true);

import middleware from '../../middlewares';
import { ApiContext } from '../../types';

describe('middleware', () => {
    let ctx: ApiContext;

    beforeEach(() => {
        ctx = {
            state: {
                logger: new Logger.Logger(),
            },
            request: {}
        } as ApiContext;
    })
    describe('createErrorHandler', () => {
        it('should return error handler middleware that catches and logs unhadled errors', async () => {
            const errorHandler = middleware.createErrorHandler();
            const spy = jest.spyOn(ctx.state.logger, 'error');
            await errorHandler(ctx, () => { throw new Error() });
            expect(spy).toHaveBeenCalledTimes(1);
        });
    });

    describe('createRequestIdGenerator', () => {
        it('should return a middleware that generates randomphrase as request Id for all requests', async () => {
            const requestIdGen = middleware.createRequestIdGenerator();
            await requestIdGen(ctx, jest.fn());
            expect(mockedRandomPhrase).toHaveBeenCalledTimes(1);
        });
    })

    describe('createLogger', () => {
        it('should return a middleware that returns a configured logger instance', async () => {
            const logger = new Logger.Logger();
            logger.log = jest.fn();
            const spy = jest.spyOn(logger, 'log');
            const mockedLogger = mocked(logger, true);
            mockedLogger.push = jest.fn();
            mockedLogger.push.mockReturnValue(logger)
            const loggerMiddleware = middleware.createLogger(mockedLogger);
            await loggerMiddleware(ctx, jest.fn());
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy).toHaveBeenCalledWith('Request received');
        });
    });

    describe('createRouter', () => {
        it('should return a configured router', async () => {
            const handlerMap = {
                '/parties': {
                    get: jest.fn(),
                    post: jest.fn(),
                    put: jest.fn(),
                    del: jest.fn(),
                    patch: jest.fn(),
                }
            };
            const routes = middleware.createRouter(handlerMap);
            expect(routes).toBeTruthy();
        });
    })
});