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

import { AxiosResponse } from 'axios';
import fs from 'fs';
import * as path from 'path';
import { mocked } from 'ts-jest/utils';
import * as xml2js from 'xml2js';
import camt003Handler from '../../../../handlers/Outbound/camt003Handler';
import { IPartyIdType, IPartiesByIdParams, IErrorInformation, IPartiesByIdResponse  } from '../../../../interfaces';
import { XML, XSD } from '../../../../lib/xmlUtils';

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
                error: jest.fn(),
                debug: jest.fn(),
                log: jest.fn()
            }
        },
        response: {type: null, status: null, body: ''}
    };
    const partiesByIdParams: IPartiesByIdParams = { idType: IPartyIdType.ACCOUNT_ID, idValue: '1234567' }
    const xsdPath = 'src/templates/xsd/camt.004.xsd';
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
        await camt003Handler(ctx as any);
        expect(mockedGetParties).toBeCalledWith(partiesByIdParams);
    });

    it('should handle exception when get parties call fails', async () => {
        const error = new Error('Mojaloop Connector unreachable');
        mockedGetParties.mockRejectedValue(error);
        await camt003Handler(ctx as any);
        expect(mockedGetParties).toBeCalledWith(partiesByIdParams);
        expect(ctx.state.logger.error).toBeCalledWith(error);
    });

    it('should translate FSPIOP error to camt.004', async () => {
        const error: IErrorInformation = { errorCode: '3100', errorDescription: 'Party not found' };
        mockedGetParties.mockResolvedValue({ data: { body:  { errorInformation:  error } } } as AxiosResponse<any>);
        await camt003Handler(ctx as any);
        expect(mockedGetParties).toBeCalledWith(partiesByIdParams);
        expect(ctx.state.logger.error).toBeCalledWith(error);
        expect(XML.fromXml(ctx.response.body)).toBeTruthy();
        expect(XSD.validate(ctx.response.body, xsdPath)).toBe(true);
        expect(ctx.response.type).toEqual('application/xml');
        expect(ctx.response.status).toEqual(404);
    });

    it('should translate happy path response to camt.004', async() => {
        const mockedRes = { data: { body: {
            party: {
                name: 'Joe Someone',
                partyIdInfo: {
                    partyIdentifier: '12345',
                    fspId: 'dfsp'
                }
            }
        } } as IPartiesByIdResponse } as AxiosResponse<any>;
        mockedGetParties.mockResolvedValue(mockedRes);
        await camt003Handler(ctx as any);
        expect(mockedGetParties).toBeCalledWith(partiesByIdParams);
        expect(ctx.state.logger.log).toBeCalledWith(mockedRes.data);
        expect(XML.fromXml(ctx.response.body)).toBeTruthy();
        expect(XSD.validate(ctx.response.body, xsdPath)).toBe(true);
        expect(ctx.response.type).toEqual('application/xml');
        expect(ctx.response.status).toEqual(200);
    });
});
