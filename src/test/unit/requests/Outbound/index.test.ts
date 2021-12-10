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
import { PartyIdType, IPartiesByIdParams } from '../../../../interfaces';

import axios from 'axios';
jest.mock('axios');
const mockedAxios = mocked(axios, true);

import OutboundRequester from '../../../../requests/Outbound';
import { RequesterOptions } from '../../../../requests';
import { Logger } from '@mojaloop/sdk-standard-components';
import { buildJSONHeaders } from '../../../../requests/headers';

describe('Outbound requests', () => {
    let mockedAxiosInstance: any;

    beforeAll(async () => {
        // nothing to do here
    })

    beforeEach(async () => {
        mockedAxiosInstance = { 
            get: jest.fn(),
            interceptors: {
                request: {
                    use: jest.fn()
                },
                response: {
                    use: jest.fn()
                }
            }
        }
        mockedAxios.create.mockReturnValueOnce(mockedAxiosInstance as any)
    })

    afterEach(async () => {
        jest.resetAllMocks();
    })

    describe('getParties', () => {
        it('should execute operation given IPartiesByIdParams', async () => {
            // ### setup
            const params: IPartiesByIdParams = { idType: PartyIdType.ACCOUNT_ID, idValue: '123456' };

            const outboundRequesterOps: RequesterOptions = {
                baseURL: 'DONOTCALL',
                timeout: 0,
                logger: {
                    error: jest.fn(),
                    debug: jest.fn(),
                    log: jest.fn(),
                    push: () => {
                        return {
                            error: jest.fn(),
                            debug: jest.fn(),
                            log: jest.fn(),
                        }
                    },
                } as unknown as Logger.Logger,
            };
            const outboundRequester = new OutboundRequester(outboundRequesterOps);
            
            // ### act
            await outboundRequester.getParties(params);

            // ### test
            const url = `/parties/${params.idType}/${params.idValue}`;
            expect(mockedAxiosInstance.get).toHaveBeenCalledWith(url, { headers: buildJSONHeaders()});
        });
    });
});
