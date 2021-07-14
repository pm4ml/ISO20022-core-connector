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
import {
    ICamt003, ICamt004, IErrorInformation, IPartiesByIdResponse, PartyIdType, PartiesCurrentState
} from '../../../interfaces'
import { XML, XSD } from '../../../lib/xmlUtils';
import { camt003ToGetPartiesParams, fspiopErrorToCamt004Error, partiesByIdResponseToCamt004 } from '../../../transformers';

describe('transformers', () => {
    const xsdPath = XSD.paths.camt_004;
    describe('camt003ToGetPartiesParams', () => {
        it('should return parameters for `PartiesById` request given a valid camt.003 message', async () => {
            const xmlStr = fs.readFileSync(path.join(__dirname, '../data/camt.003.xml')).toString();
            const camt003 = XML.fromXml(xmlStr)
            const params = camt003ToGetPartiesParams(camt003 as ICamt003);
            expect(params).toMatchObject({ idType: PartyIdType.ACCOUNT_ID, idValue: '1234567' });
        });
    });

    describe('partiesByIdResponseToCamt004', () => {
        it('should translate PartiesById response to ISO 20022 camt.004', async () => {
            const mockPartiesByIdResponse: IPartiesByIdResponse = {
                body: {
                    party: {
                        partyIdInfo: {
                            partyIdType: PartyIdType.ACCOUNT_ID,
                            partyIdentifier: '1234567',
                            fspId: 'mockDfspId'
                        },
                        name: 'John Doe'
                    },
                    currentState: PartiesCurrentState.COMPLETED,
                }
            };
            const xml = partiesByIdResponseToCamt004(mockPartiesByIdResponse);
            expect(XSD.validate(xml, xsdPath)).toBe(true);
        });
        it('should handle extensionList if present in payload', async () => {
            const mockPartiesByIdResponse: IPartiesByIdResponse = {
                body: {
                    party: {
                        partyIdInfo: {
                            partyIdType: PartyIdType.ACCOUNT_ID,
                            partyIdentifier: '1234567',
                            fspId: 'mockDfspId',
                            extensionList: [
                                { key: 'MSISDN', value: '+080-123456' },
                                { key: 'EMAIL', value: 'joe@pm4ml.org' }
                            ]
                        },
                        name: 'John Doe'
                    },
                    currentState: PartiesCurrentState.COMPLETED,
                }
            };
            const xml = partiesByIdResponseToCamt004(mockPartiesByIdResponse);
            expect(XSD.validate(xml, xsdPath)).toBe(true);
            const parsedXml = XML.fromXml(xml) as ICamt004;
            expect(parsedXml.Document.RtrAcct.RptOrErr.AcctRpt.AcctOrErr.Acct.Ownr.CtctDtls.EmailAdr).toContain('joe@pm4ml.org');
            expect(parsedXml.Document.RtrAcct.RptOrErr.AcctRpt.AcctOrErr.Acct.Ownr.CtctDtls.MobNb).toContain('+080-123456');
        });
    })

    describe('fspiopErrorToCamt004Error', () => {
        it('should translate FSPIOP ErrorInformation to ISO 20022 camt.004 error', async () => {
            const mockErrInfo: IErrorInformation = {
                errorCode: '3100',
                errorDescription: 'Party not found'
            }
            const isoResponse = fspiopErrorToCamt004Error(mockErrInfo, '1234567');
            expect(XSD.validate(isoResponse.body, xsdPath))
            expect(isoResponse.status).toBe(404);
        });
    });
});
