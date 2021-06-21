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
import { ServiceConfig } from '../../config';
import Server from '../../server';
import middlewares from '../../middlewares';

import { oas } from 'koa-oas3';
jest.mock('koa-oas3');
const mockedOas = mocked(oas, true);


describe('Server', () => {
    let server: Server, config: ServiceConfig, logger: Logger.Logger;

    beforeEach(async () => {
        logger = new Logger.Logger({
            ctx: {
                app: 'iso20022-core-connector',
            },
        });
        config = {
            outboundEndpoint: 'http://localhost:5001',
            autoAcceptParty: false,
            autoAcceptQuotes: false,
            logger,
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

        it('should not create logger if one is not passed', async () => {
            const spy = jest.spyOn(middlewares, 'createLogger');
            const conf = { ...config, logger: undefined };
            const srv = new Server(conf);
            await srv.setupApi();
            await srv.stop();
            expect(spy).toHaveBeenCalledTimes(0);
        });

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

        it('should not log startup message if no logger is present', async () => {
            const conf = { ...config, logger: undefined };
            const srv = new Server(conf);
            await srv.setupApi();
            const spy = jest.spyOn(server._logger || { log: () => { } }, 'log');
            await srv.stop();
            expect(spy).toHaveBeenCalledTimes(0);
        });
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
