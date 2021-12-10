/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *      Steven Oderayi - steven.oderayi@modusbox.com                      *
 *                                                                        *
 *  CONTRIBUTORS:                                                         *
 *       miguel de Barros - miguel.de.barros@modusbox.com                 *
 **************************************************************************/

'use strict'

import fs from 'fs';
import * as path from 'path';
// import { Logger } from '@mojaloop/sdk-standard-components';
import { mocked } from 'ts-jest/utils';
import { OutboundHandler } from '../../../../handlers/Outbound';
import XmlFileMap from '../../../helpers/xmlFiles'
import { IPartiesByIdParams, IPartiesByIdResponse, PartiesCurrentState, PartyIdType } from '../../../../interfaces';
import { XML } from '../../../../lib/xmlUtils';

import camt003Handler from '../../../../handlers/Outbound/camt003Handler';
jest.mock('../../../../handlers/Outbound/camt003Handler');
const mockedHandler = mocked(camt003Handler, true);

interface ITestData {
    ctx: any,
    xmlStr: string,
    partiesByIdParams: IPartiesByIdParams,
    partiesByIdResponse: IPartiesByIdResponse,
};

const getTestData = (importXmlFile: string = '../../data/camt.003.xml'): ITestData => {
    const xmlStr = fs.readFileSync(path.join(__dirname, importXmlFile)).toString();

    const ctx = {
        request: {
            body: XML.fromXml(xmlStr) as any,
            rawBody: xmlStr,
        },
        state: {
            conf: {
                backendEndpoint: 'donotcall',
                outboundEndpoint: 'donocall',
                requestTimeout: 0,
            },
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
            },
        },
        response: {type: 'application/xml', status: 200, body: '<?xml version="1.0" encoding="utf-8"?><Document xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="urn:iso:std:iso:20022:tech:xsd:camt.004.001.08"><RtrAcct><MsgHdr><MsgId>RNDS/202112101314191b029c51</MsgId><CreDtTm>2021-12-10T11:14:19.242Z</CreDtTm></MsgHdr><RptOrErr><AcctRpt><AcctId><Othr><Id>id</Id></Othr></AcctId><AcctOrErr><Acct><Ownr><CtctDtls><Nm>testName</Nm></CtctDtls></Ownr><Svcr><FinInstnId><Othr><Id>testId</Id></Othr></FinInstnId></Svcr></Acct></AcctOrErr></AcctRpt></RptOrErr></RtrAcct></Document>'}
    };

    const partiesByIdResponse: IPartiesByIdResponse = {
        body: {
            party: {
                name: 'testName',
                partyIdInfo: {
                    fspId: 'testId',
                    partyIdentifier: 'id',
                    partyIdType: PartyIdType.MSISDN,
                },
            },
            currentState: PartiesCurrentState.COMPLETED,
        }
    }

    const partiesByIdParams: IPartiesByIdParams = { idType: PartyIdType.ACCOUNT_ID, idValue: '1234567' }

    return {
        ctx,
        xmlStr,
        partiesByIdParams,
        partiesByIdResponse
    }
}

describe('OutboundHandler', () => {
    // const logger = new Logger.Logger();
    // const ctx = {
    //     request: {
    //         body: {
    //             Document: {
    //                 attr: {
    //                     xmlns: 'urn:iso:std:iso:20022:tech:xsd:camt.003.001.07'
    //                 }
    //             }
    //         }
    //     },
    //     state: {
    //         logger
    //     },
    //     response: {}
    // }
    beforeAll(async () => {
        // nothing to do here
    })

    beforeEach(async () => {
        // nothing to do here
    })

    afterEach(async () => {
        jest.resetAllMocks();
    })

    it('should return correct handler given a valid ISO 20022 message', async () => {
        // ### setup
        const {
            ctx,
        } = getTestData(XmlFileMap.CAMT_004_001_08.valid);

        mockedHandler.mockResolvedValue({} as any);

        let caughtError: Error | undefined = undefined;

        // ### act
        try {
            await OutboundHandler(ctx as any);
        } catch (error) {
            caughtError = error;
        }

        // ### test
        console.log(caughtError);
        expect(mockedHandler).toBeCalledTimes(1);
        expect(mockedHandler).toBeCalledWith(ctx);
    });

    it('should handle exception thrown by message-type handlers', async () => {
        // ### setup
        const {
            ctx,
        } = getTestData(XmlFileMap.CAMT_004_001_08.valid);

        const error = new Error('Handler error');
        mockedHandler.mockRejectedValueOnce(error);

        let caughtError: Error | undefined = undefined;

        // ### act
        try {
            await OutboundHandler(ctx as any);
        } catch (error) {
            caughtError = error;
        }

        // ### test
        expect(caughtError).toBeUndefined();
        expect(mockedHandler).toBeCalledTimes(1);
        expect(mockedHandler).toBeCalledWith(ctx);
        expect(ctx.response.body).toEqual(error.toString());
        expect(ctx.response.type).toEqual('text/plain');
        expect(ctx.response.status).toEqual(500);
    });

    it('should handle exception when unable to route request to an existing handler', async () => {
        // ### setup
        const {
            ctx,
        } = getTestData(XmlFileMap.CAMT_004_001_08.valid);

        ctx.request.body = {
            Document: {
                attr: {
                    xmlns: 'urn:iso:std:iso:00000:tech:xsd:dne.000.000.00' // namespace does not match a known handler
                }
            }
        };

        const error = new Error('Handler error');
        mockedHandler.mockRejectedValueOnce(error);

        let caughtError: Error | undefined = undefined;

        // ### act
        try {
            await OutboundHandler(ctx as any);
        } catch (error) {
            caughtError = error;
        }

        // ### test
        expect(caughtError).toBeUndefined();
        expect(mockedHandler).toBeCalledTimes(0);
        expect(ctx.response.body).toContain(`Unable to route Outbound ISO message to handler as namespace='${ctx.request.body?.Document?.attr?.xmlns}' is not recognized.`);
        expect(ctx.response.type).toEqual('text/plain');
        expect(ctx.response.status).toEqual(400);
    });
});
