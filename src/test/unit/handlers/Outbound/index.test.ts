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
import { OutboundHandler } from '../../../../handlers/Outbound';

import camt003Handler from '../../../../handlers/Outbound/camt003Handler';
jest.mock('../../../../handlers/Outbound/camt003Handler');
const mockedHandler = mocked(camt003Handler, true);

describe('OutboundHandler', () => {
    const logger = new Logger.Logger();
    const ctx = {
        request: {
            body: {
                Document: {
                    attr: {
                        xmlns: 'urn:iso:std:iso:20022:tech:xsd:camt.003.001.07'
                    }
                }
            }
        },
        state: {
            logger
        },
        response: {}
    }

    it('should return correct handler given a valid ISO 20022 message', async () => {
        await OutboundHandler(ctx as any);
        expect(mockedHandler).toBeCalledTimes(1);
        expect(mockedHandler).toBeCalledWith(ctx);
    });

    it('should handle exception thrown by message-type handlers', async () => {
        const loggerSpy = jest.spyOn(logger, 'error');
        const error = new Error('Handler error');
        mockedHandler.mockRejectedValueOnce(error);
        await OutboundHandler(ctx as any);
        expect(mockedHandler).toBeCalledWith(ctx);
        expect(loggerSpy).toBeCalledWith(error);
    });
});
