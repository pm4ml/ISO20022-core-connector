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

import { mocked } from 'ts-jest/utils';
import { Logger } from '@mojaloop/sdk-standard-components';
import { Config, IServiceConfig } from '../../config';
import Server from '../../server';
import middlewares from '../../middlewares';

jest.mock('../../lib/cache');
// jest.mock('redis')

import { oas } from 'koa-oas3';
jest.mock('koa-oas3');
const mockedOas = mocked(oas, true);


describe('Server', () => {
    let server: Server, config: IServiceConfig, logger: Logger.Logger;

    beforeEach(async () => {
        logger = new Logger.Logger({
            ctx: {
                app: 'iso20022-core-connector',
            },
        });
        config = {
            outboundEndpoint: 'http://localhost:5001',
            logger,
            xmlOptions: Config.xmlOptions,
            templatesPath: Config.templatesPath,
            backendEndpoint: 'http://localhost:7001',
            cache: {
                host: 'localhost',
                port: 6379,
                enabledTestFeatures: false,
            },
            callbackTimeout: 30,
        }
        server = new Server(config);
        mockedOas.mockResolvedValue(() => { });
    });

    afterEach(async () => {
        await server.stop();
    });

    describe('setupApi', () => {
        it('should throw if api specification could not not be loaded', async () => {
            const error = new Error('Error loading API spec. Please validate it with https://editor.swagger.io/');
            mockedOas.mockRejectedValueOnce(error);
            expect(server.setupApi()).rejects.toThrowError(error);
        });

        // TODO: We meed to mock Redis's implementation to test this Cache error, also this should be moved to a specific test file for the Cache itself once it has been re-factored into type-script.
        // it('should not create logger if one is not passed', async () => {
        //     const spy = jest.spyOn(middlewares, 'createLogger');
        //     const conf = { ...config, logger: undefined };

        //     let caughtError: Error | undefined
        //     try {
        //         const srv = new Server(conf);
        //         await srv.setupApi();
        //         await srv.stop();
        //     } catch (error) {
        //         caughtError = error;
        //     }

        //     expect(caughtError?.message).toEqual('Cache config requires host, port and logger properties')
        //     expect(spy).toHaveBeenCalledTimes(0);
        // });

        it('should create logger if one is passed', async () => {
            const spy = jest.spyOn(middlewares, 'createLogger');
            await server.setupApi();
            await server.stop();
            expect(spy).toHaveBeenCalledTimes(1);
        });

        it('should return http.Server instance on successful setup', async () => {
            expect(await server.setupApi()).toBe(server._server);
        });
    });

    describe('start', () => {
        it('should start up http.Server instance', async () => {
            await server.setupApi();
            const spy = jest.spyOn(server._server, 'listen');
            await server.start();
            expect(spy).toHaveBeenCalledTimes(1);
        });

        it('should start up api on supplied port', async () => {
            await server.setupApi();
            const spy = jest.spyOn(server._server, 'listen');
            await server.start();
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy.mock.calls[0][0]).toBe(config.port);
        });

        it('should log startup message if logger is present', async () => {
            await server.setupApi();
            const spy = jest.spyOn(server._logger as any, 'log');
            await server.start();
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy).toHaveBeenCalledWith(`Serving API on port ${config.port}`);
        });

        // this is no longer valid as it will be handle by an error being thrown by the cache component
        // it('should not log startup message if no logger is present', async () => {
        //     const conf = { ...config, logger: undefined };
        //     const srv = new Server(conf);
        //     await srv.setupApi();
        //     const spy = jest.spyOn(server._logger || { log: () => { } }, 'log');
        //     await srv.stop();
        //     expect(spy).toHaveBeenCalledTimes(0);
        // });
    });

    describe('stop', () => {
        it('should not attempt to close server if no server instance is instantiated', async () => {
            const spy = jest.spyOn(server._server || { close: () => { } }, 'close');
            await server.stop();
            expect(spy).toHaveBeenCalledTimes(0);
        });

        it('should shut down server if server was started/instantiated', async () => {
            await server.setupApi();
            const spy = jest.spyOn(server._server, 'close');
            await server.stop();
            expect(spy).toHaveBeenCalledTimes(1);
        });
    });
})
