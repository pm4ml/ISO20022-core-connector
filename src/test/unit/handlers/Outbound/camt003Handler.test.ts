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

import fs from 'fs';
import * as path from 'path';
import { mocked } from 'ts-jest/utils';
import * as xml2js from 'xml2js';
import camt003Handler from '../../../../handlers/Outbound/camt003Handler';
import { IPartyIdType, IPartiesByIdParams  } from '../../../../interfaces';

import { getParties } from '../../../../requests/Outbound'
jest.mock('../../../../requests/Outbound');
const mockedGetParties = mocked(getParties, true);


describe('camt003Handler', () => {
    const ctx = {
        request: {
            body: null
        },
        state: {
            logger: {
                error: console.log
            }
        }
    };
    let xmlStr: string;

    beforeAll(async () => {
        xmlStr = fs.readFileSync(path.join(__dirname, '../../data/camt003.xml')).toString();
        ctx.request.body = await new Promise((resolve, reject) => {
            xml2js.parseString(xmlStr, (err, result) => {
                err ? reject(err) : resolve(result)
            });
        });
        mockedGetParties.mockResolvedValue({} as any);
    })

    it('should initiate get parties call given correct params', async () => {
        const params: IPartiesByIdParams = { idType: IPartyIdType.ACCOUNT_ID, idValue: '1234567' }
        await camt003Handler(ctx as any);
        expect(mockedGetParties).toBeCalledWith(params);
    });

    it('should handle exception when get parties call fails', async () => {
        const params: IPartiesByIdParams = { idType: IPartyIdType.ACCOUNT_ID, idValue: '1234567' }
        const error = new Error('Mojaloop Connector unreachable');
        mockedGetParties.mockRejectedValue(error);
        ctx.state.logger.error = jest.fn();
        await camt003Handler(ctx as any);
        expect(mockedGetParties).toBeCalledWith(params);
        expect(ctx.state.logger.error).toBeCalledWith(error);
    });
});
