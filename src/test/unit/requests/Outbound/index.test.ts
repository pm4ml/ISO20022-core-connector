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
import { IDType, IGetPartiesParams } from '../../../../interfaces';

import axios from 'axios';
jest.mock('axios');
const mockedAxios = mocked(axios, true);
const mockedAxiosInstance = { get: jest.fn() }
mockedAxios.create.mockReturnValueOnce(mockedAxiosInstance as any)

import  { getParties, buildHeaders } from '../../../../requests/Outbound';

describe('Outbound requests', () => {
    describe('getParties', () => {
        const params: IGetPartiesParams = { idType: IDType.ACCOUNT_ID, idValue: '123456' };
        it('should execute correct handler given a valid ISO 20022 message', async () => {
            await getParties(params);
            const url = `/parties/${params.idType}/${params.idValue}`;
            expect(mockedAxiosInstance.get).toHaveBeenCalledWith(url, { headers: buildHeaders()});
        });
    });
});
