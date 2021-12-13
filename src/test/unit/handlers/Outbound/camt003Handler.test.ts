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
import { AxiosResponse } from 'axios';
import { mocked } from 'ts-jest/utils';
import camt003Handler from '../../../../handlers/Outbound/camt003Handler';
import {
    PartyIdType,
    IPartiesByIdParams,
    IPartiesByIdResponse,
    PartiesCurrentState,
    IErrorInformation,
    ICamt004Error,
    ICamt004,
} from '../../../../interfaces';
import {
    XML,
    XSD,
} from '../../../../lib/xmlUtils';
import XmlFileMap from '../../../helpers/xmlFiles'
import {
    OutboundRequester,
} from '../../../../requests';
import {
    mockOutboundRequesterHelper
} from '../../../helpers/mockRequesters';
import {
    BaseError,
} from '../../../../errors';

// Mock Requesters
jest.mock('../../../../requests');
const MockedOutboundRequester = mocked(OutboundRequester, true);

// Mock axios
jest.mock('axios');

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
        response: {type: null, status: null, body: ''}
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

describe('camt003Handler', () => {

    beforeAll(async () => {
        // nothing to do here
    })

    beforeEach(async () => {
        // nothing to do here
    })

    afterEach(async () => {
        jest.resetAllMocks();
    })

    it('should translate happy path response to camt.004', async() => {
        // ### setup
        const {
            ctx,
            partiesByIdParams,
            partiesByIdResponse,
        } = getTestData(XmlFileMap.CAMT_004_001_08.valid);

        const getPartiesResponse: AxiosResponse = {
            data: partiesByIdResponse,
            status: 200,
            statusText: 'OK',
            config: {},
            headers: {},
        };

        mockOutboundRequesterHelper(MockedOutboundRequester, {
            getPartiesResponse,
        })

        let caughtError: Error | undefined = undefined;

        // ### act
        try {
            await camt003Handler(ctx as any);
        } catch (error) {
            caughtError = error;
        }
        

        // ### test
        expect(caughtError).toBeUndefined();

        expect(MockedOutboundRequester.mock.results[0].value.getParties).toBeCalledWith(partiesByIdParams);

        let validateResult: boolean | Array<Record<string, unknown>> = false;
        try {
            validateResult = XSD.validate(ctx.response.body, XSD.paths.camt_004)
        } catch (error) {
            fail(error);
        }
        expect(validateResult).toBe(true);

        expect(ctx.response.type).toEqual('application/xml');
        expect(ctx.response.status).toEqual(200);

        const successResponse = XML.fromXml(ctx.response.body) as unknown as ICamt004;
        expect(successResponse.Document.RtrAcct.RptOrErr.AcctRpt.AcctOrErr.Acct.Ownr.CtctDtls.Nm).toEqual((getPartiesResponse.data as IPartiesByIdResponse).body.party.name);
        expect(successResponse.Document.RtrAcct.RptOrErr.AcctRpt.AcctOrErr.Acct.Svcr.FinInstnId.Othr.Id).toEqual((getPartiesResponse.data as IPartiesByIdResponse).body.party.partyIdInfo.fspId);
        expect(successResponse.Document.RtrAcct.RptOrErr.AcctRpt.AcctId.Othr.Id).toEqual((getPartiesResponse.data as IPartiesByIdResponse).body.party.partyIdInfo.partyIdentifier);
    });

    it('should handle exception when get parties call fails', async () => {
        // ### setup
        const {
            ctx,
        } = getTestData(XmlFileMap.CAMT_004_001_08.valid);

        const getPartiesResponseError = new Error('Mojaloop Connector unreachable');

        mockOutboundRequesterHelper(MockedOutboundRequester, {
            getPartiesResponse: getPartiesResponseError,
        })

        let caughtError: Error | undefined = undefined;

        // ### act
        try {
            await camt003Handler(ctx as any);
        } catch (error) {
            caughtError = error;
        }

        // ### test
        expect((caughtError as BaseError).params?.error).toEqual(getPartiesResponseError);
        expect(caughtError?.name).toEqual('SystemError');
        expect(ctx.state.logger.error).toBeCalledWith(getPartiesResponseError);
    });

    it('should translate FSPIOP error to camt.004', async () => {
        // ### setup
        const {
            ctx,
        } = getTestData(XmlFileMap.CAMT_004_001_08.valid);

        const getPartiesResponse: AxiosResponse = {
            data: { 
                body: {
                    errorInformation:
                    {
                        errorCode: '3100',
                        errorDescription: 'Party not found'
                    } as IErrorInformation,
                },
            },
            status: 200,
            statusText: 'OK',
            config: {},
            headers: {},
        };

        mockOutboundRequesterHelper(MockedOutboundRequester, {
            getPartiesResponse,
        })

        let caughtError: Error | undefined = undefined;

        // ### act
        try {
            await camt003Handler(ctx as any);
        } catch (error) {
            caughtError = error;
        }

        // ### test
        expect(caughtError).toBeUndefined();

        expect(ctx.state.logger.error).toBeCalledWith(getPartiesResponse.data.body.errorInformation);

        let validateResult: boolean | Array<Record<string, unknown>> = false;
        try {
            validateResult = XSD.validate(ctx.response.body, XSD.paths.camt_004)
        } catch (error) {
            fail(error);
        }
        expect(validateResult).toBe(true);

        expect(ctx.response.status).toEqual(404);
        const errorResponse = XML.fromXml(ctx.response.body) as ICamt004Error;
        expect(errorResponse.Document.RtrAcct.RptOrErr.OprlErr.Err.Cd).toEqual('X050')
        expect(errorResponse.Document.RtrAcct.RptOrErr.OprlErr.Desc).toEqual('Identifier not found')
    });
});
