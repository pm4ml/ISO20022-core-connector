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
import * as xml2js from 'xml2js';
import {
    ICamt003, ICamt004, IErrorInformation, IPartiesByIdResponse, IPartyIdType, PartiesCurrentState
} from '../../../interfaces'
import { XML, XSD } from '../../../lib/xmlUtils';
import { camt003ToGetPartiesParams, fspiopErrorToCamt004Error, partiesByIdResponseToCamt004 } from '../../../transformers';

describe('transformers', () => {
    const xsdPath = 'src/templates/xsd/camt.004.xsd';
    describe('camt003ToGetPartiesParams', () => {
        it('should return parameters for `PartiesById` request given a valid camt.003 message', async () => {
            const xmlStr = fs.readFileSync(path.join(__dirname, '../data/camt003.xml')).toString();
            const camt003 = await new Promise((resolve, reject) => {
                xml2js.parseString(xmlStr, (err, result) => {
                    err ? reject(err) : resolve(result)
                });
            });
            const params = camt003ToGetPartiesParams(camt003 as ICamt003);
            expect(params).toMatchObject({ idType: IPartyIdType.ACCOUNT_ID, idValue: '1234567' });
        });
    });

    describe('partiesByIdResponseToCamt004', () => {
        it('should translate PartiesById response to ISO 20022 camt.004', async () => {
            const mockPartiesByIdResponse: IPartiesByIdResponse = {
                body: {
                    party: {
                        partyIdInfo: {
                            partyIdType: IPartyIdType.ACCOUNT_ID,
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
                            partyIdType: IPartyIdType.ACCOUNT_ID,
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
            const isoResponse = fspiopErrorToCamt004Error(mockErrInfo);
            expect(XSD.validate(isoResponse.body, xsdPath))
            expect(isoResponse.status).toBe(400);
        });
    });
});
