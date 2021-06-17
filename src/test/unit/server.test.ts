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
import { ServiceConfig } from '~/config';
import Server from '../../server';

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
    });

    afterEach(async () => {
        await server.stop();
    });

    describe('setupApi', () => {
        it('should throw if api specification could not not be loaded', async () => {

        });

        it('should not throw if api specification was loaded  correctly', async () => {

        });

        it('should create logger if one is passed in the config', async () => {

        });

        it('should not create logger if one is not passed', async () => {

        });

        it('should return http.Server instance on successful setup', async () => {

        });
    });

    describe('start', () => {
        it('should start up api on supplied port', async () => {

        });

        it('should log startup message if logger is present', async () => {

        });

        it('should not log startup message if no logger is present', async () => {

        });
    });

    describe('stop', () => {
        it('should not attempt to close server if no server instance is instantiated', async () => {

        });

        it('should shut down server if server is instantiated', async () => {

        });
    });
})
