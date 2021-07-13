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
    ICamt003, PartyIdType, IPartiesByIdParams, IPartiesByIdResponse,
    ICamt004, ICamt004Acct, IErrorInformation, ICamt004Error, IPacs008,
    IPostQuotesBody, AmountType, TransactionType, ITransferSuccess, IPacs002, ITransferError, TransferStatus, ITransferResponse, IExtensionItem,
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
    const idValue = body.Document.GetAcct.AcctQryDef.AcctCrit.NewCrit.SchCrit.AcctId.EQ.Othr.Id as string;
    const getPartiesParams: IPartiesByIdParams = {
        idType: PartyIdType.ACCOUNT_ID,
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

/**
 * Translates ISO 20022 pacs.008 to POST /quotes request body
 *
 * @param {Record<string, unknown> | IPacs008} pacs008
 * @returns {IPostQuotesBody}
 */
export const pacs008ToPostQuotesBody = (pacs008: Record<string, unknown> | IPacs008)
: IPostQuotesBody => {
    const body = pacs008 as IPacs008;
    const postQuotesBody: IPostQuotesBody = {
        homeTransactionId: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.EndToEndId,
        amountType: AmountType.SEND,
        amount: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.IntrBkSttlmAmt['#text'],
        currency: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.IntrBkSttlmAmt.attr.Ccy,
        from: {
            idType: PartyIdType.ACCOUNT_ID,
            idValue: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.Dbtr.CtctDtls.MobNb,
            fspId: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.DbtrAgt.FinInstnId.BICFI,
        },
        to: {
            idType: PartyIdType.ACCOUNT_ID,
            idValue: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.Cdtr.CtctDtls.MobNb,
            fspId: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.CdtrAgt.FinInstnId.BICFI,
        },
        transactionType: TransactionType.TRANSFER,
        skipPartyLookup: true,
    };

    // TODO: Add extension list @see `transferResponseToPacs002` in transformers/index.ts
    postQuotesBody.quoteRequestExtensions = [
        {
            key: 'MSGID',
            value: body.Document.FIToFICstmrCdtTrf.GrpHdr.MsgId,
        },
        {
            key: 'CREDT',
            value: body.Document.FIToFICstmrCdtTrf.GrpHdr.CreDtTm,
        },
        {
            key: 'INSTRID',
            value: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.InstrId,
        },
        {
            key: 'ENDTOENDID',
            value: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.EndToEndId,
        },
        {
            key: 'TXID',
            value: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.TxId,
        },
        {
            key: 'SETTLEDATE',
            value: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.IntrBkSttlmDt,
        },
        {
            key: 'USTRD',
            value: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.RmtInf.Ustrd,
        },
        {
            key: 'REFDOC',
            value: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.RmtInf.Strd.RfrdDocInf.Nb,
        },
        {
            key: 'DOCDATE',
            value: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.RmtInf.Strd.RfrdDocInf.RltdDt,
        },

    ];

    return postQuotesBody;
};


/**
 * Translates ML's transfer success response to ISO 20022 pacs.002 response.
 *
 * @param transferResponse
 * @returns {IPacs002}
 */
export const transferResponseToPacs002 = (
    transferResponse: ITransferSuccess | ITransferError,
): string => {
    let body: ITransferResponse;
    let extensionList: Array<IExtensionItem>;
    let [msgId, instrId, endToEndId, txId, completedTimestamp, currentState] = ['', '', '', '', '', ''];

    if((transferResponse as ITransferSuccess).currentState === TransferStatus.COMPLETED) {
        body = transferResponse as ITransferSuccess;
        currentState = body.currentState || TransferStatus.COMPLETED;
        completedTimestamp = body.fulfil?.body.completedTimestamp || (new Date()).toISOString();
        extensionList = body.quoteRequestExtensions;
    } else {
        body = transferResponse as ITransferError;
        currentState = body.transferState.currentState || TransferStatus.ERROR_OCCURRED;
        completedTimestamp = body.transferState.fulfil?.body.completedTimestamp || (new Date()).toISOString();
        extensionList = body.transferState.quoteRequestExtensions;
    }

    Object.values(extensionList).forEach(extItem => {
        if(extItem.key === 'MSGID') {
            msgId = extItem.value;
        } else if(extItem.key === 'INSTRID') {
            instrId = extItem.value;
        } else if(extItem.key === 'TXID') {
            txId = extItem.value;
        } else if(extItem.key === 'ENDTOENDID') {
            endToEndId = extItem.value;
        }
    });

    const pacs002: IPacs002 = {
        Document: {
            attr: {
                'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                xmlns: 'urn:iso:std:iso:20022:tech:xsd:pacs.002.001.12',
            },
            FIToFIPmtStsRpt: {
                GrpHdr: {
                    MsgId: msgId,
                    CreDtTm: completedTimestamp || (new Date()).toISOString(),
                },
                TxInfAndSts: {
                    OrgnlInstrId: instrId,
                    OrgnlEndToEndId: endToEndId,
                    OrgnlTxId: txId,
                    TxSts: currentState === TransferStatus.COMPLETED ? 'ACCC' : 'RJCT',
                },
            },
        },
    };

    let xml = XML.fromJsObject(pacs002);
    xml = `<?xml version="1.0" encoding="utf-8"?>\n${xml}`;

    return xml;
};
