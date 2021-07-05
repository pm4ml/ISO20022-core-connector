/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/
import { XML } from '../lib/xmlUtils';
import {
    ICamt003, IPartyIdType, IPartiesByIdParams, IPartiesByIdResponse,
    ICamt004, ICamt004Acct, IErrorInformation, ICamt004Error,
} from '../interfaces';
import { generateMsgId } from '../lib/iso20022';


/**
 * Translates ISO 20022 camt.003 to an object with parties lookup parameters.
 *
 * @param ICAMT003
 * @returns {IPartiesByIdParams}
 */
export const camt003ToGetPartiesParams = (camt003: Record<string, unknown> | ICamt003)
: IPartiesByIdParams => {
    const body = camt003 as ICamt003;
    // eslint-disable-next-line max-len
    const idValue = body.Document.GetAcct[0].AcctQryDef[0].AcctCrit[0].NewCrit[0].SchCrit[0].AcctId[0].EQ[0].Othr[0].Id[0];
    const getPartiesParams: IPartiesByIdParams = {
        idType: IPartyIdType.ACCOUNT_ID,
        idValue,
    };

    return getPartiesParams;
};

/**
 * Translates ML's GET /parties/{Type}/{ID} response to ISO 20022 camt.004 response.
 *
 * @param partiesByIdResponse
 * @returns {ICamt004}
 */
export const partiesByIdResponseToCamt004 = (
    partiesByIdResponse: Record<string, unknown> | IPartiesByIdResponse,
): string => {
    const { body } = partiesByIdResponse as IPartiesByIdResponse;
    const acctOrErr = {
        Acct: {
            Ownr: {
                CtctDtls: {
                    Nm: body.party.name,
                },
            },
            Svcr: {
                FinInstnId: {
                    Othr: {
                        Id: body.party.partyIdInfo.fspId,
                    },
                },
            },
        } as ICamt004Acct,
    };

    if(body.party.partyIdInfo.extensionList && body.party.partyIdInfo.extensionList.length) {
        Object.values(body.party.partyIdInfo.extensionList).forEach(extItem => {
            if(extItem.key === 'MSISDN') {
                acctOrErr.Acct.Ownr.CtctDtls.MobNb = extItem.value;
            }
            if(extItem.key === 'EMAIL') {
                acctOrErr.Acct.Ownr.CtctDtls.EmailAdr = extItem.value;
            }
        });
    }

    const camt004: ICamt004 = {
        Document: {
            attr: {
                'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                xmlns: 'urn:iso:std:iso:20022:tech:xsd:camt.004.001.08',
            },
            RtrAcct: {
                MsgHdr: {
                    MsgId: generateMsgId(),
                    CreDtTm: (new Date()).toISOString(),
                },
                RptOrErr: {
                    AcctRpt: {
                        AcctId: {
                            Othr: {
                                Id: body.party.partyIdInfo.partyIdentifier,
                            },
                        },
                        AcctOrErr: acctOrErr,
                    },
                },
            },
        },
    };

    let xml = XML.fromJsObject(camt004);
    xml = `<?xml version="1.0" encoding="utf-8"?>\n${xml}`;

    return xml;
};

/**
 * Translates FSPIOP ErrorInformation to ISO 20022 camt.004 error response
 *
 * @param partiesByIdResponse
 * @returns {ICamt004}
 */
export const fspiopErrorToCamt004Error = (_errorInformation: IErrorInformation, originalMsgId: string)
: { body: string, status: number } => {
    // TODO: Map FSPIOP Error code/description to ISO 20022 Code/Desc
    const MsgId = generateMsgId();
    const Cd = 'X050';
    const Desc = 'Identifier not found';

    const camt004Error: ICamt004Error = {
        Document: {
            attr: {
                'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                xmlns: 'urn:iso:std:iso:20022:tech:xsd:camt.004.001.08',
            },
            RtrAcct: {
                MsgHdr: {
                    MsgId,
                    CreDtTm: (new Date()).toISOString(),
                    OrgnlBizQry: { MsgId: originalMsgId },
                },
                RptOrErr: {
                    OprlErr: {
                        Err: { Cd },
                        Desc,
                    },
                },
            },
        },
    };

    let xml = XML.fromJsObject(camt004Error);
    xml = `<?xml version="1.0" encoding="utf-8"?>\n${xml}`;

    return { body: xml, status: 404 };
};
