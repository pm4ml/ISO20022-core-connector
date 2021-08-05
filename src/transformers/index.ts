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
    IPostQuotesBody, AmountType, TransactionType, ITransferSuccess,
    IPacs002, ITransferError, TransferStatus, ITransferResponse, IExtensionItem,
    ITransferFulfilment, MojaloopTransferState, IPostTransferRequestBody,
    IPacs008Incoming,
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
            displayName: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.Dbtr.Nm,
            idType: PartyIdType.ACCOUNT_ID,
            idValue: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.Dbtr.CtctDtls.MobNb,
            fspId: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.DbtrAgt.FinInstnId.BICFI,
            extensionList: [
                {
                    key: 'NAME',
                    value: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.InitgPty.Nm,
                },
            ],
        },
        to: {
            displayName: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.Cdtr.Nm,
            idType: PartyIdType.ACCOUNT_ID,
            idValue: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.Cdtr.CtctDtls.MobNb,
            fspId: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.CdtrAgt.FinInstnId.BICFI,
            extensionList: [
                {
                    key: 'NAME',
                    value: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.CdtrAgt.FinInstnId.Nm,
                },
            ],
        },
        // payer: {
        //     name: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.Dbtr.Nm,
        //     partyIdInfo: {
        //         partyIdType: PartyIdType.ACCOUNT_ID,
        //         partyIdentifier: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.DbtrAcct.Id.Othr.Id,
        //         fspId: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.InitgPty.Id.OrgId.Othr.Id,
        //         extensionList: [
        //             {
        //                 key: 'NAME',
        //                 value: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.InitgPty.Nm,
        //             },
        //         ],
        //     },
        // },
        // payee: {
        //     name: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.Cdtr.Nm,
        //     partyIdInfo: {
        //         partyIdType: PartyIdType.ACCOUNT_ID,
        //         partyIdentifier: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.CdtrAcct.Id.Othr.Id,
        //         fspId: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.DbtrAgt.FinInstnId.Othr.Id,
        //         extensionList: [
        //             {
        //                 key: 'NAME',
        //                 value: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.CdtrAgt.FinInstnId.Nm,
        //             },
        //         ],
        //     },
        // },
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

/**
 * Translates ML's transfer POST request body to ISO 20022 pacs.008 message.
 *
 * @param transferPost
 * @returns {IPacs008}
 */
export const postTransferBodyToPacs008 = (
    transferRequest: IPostTransferRequestBody,
): string => {
    const extensionList: Array<IExtensionItem> = transferRequest.quoteRequestExtensions;
    let [msgId, instrId, endToEndId, txId, createdDateTime, sttlmDt, ustrd, refDoc, docDate, payerExtName] = ['', '', '', '', '', '', '', '', '', ''];

    Object.values(extensionList).forEach(extItem => {
        if(extItem.key === 'MSGID') {
            msgId = extItem.value;
        } else if(extItem.key === 'INSTRID') {
            instrId = extItem.value;
        } else if(extItem.key === 'TXID') {
            txId = extItem.value;
        } else if(extItem.key === 'ENDTOENDID') {
            endToEndId = extItem.value;
        } else if(extItem.key === 'CREDT') {
            createdDateTime = extItem.value;
        } else if(extItem.key === 'SETTLEDATE') {
            sttlmDt = extItem.value;
        } else if(extItem.key === 'USTRD') {
            ustrd = extItem.value;
        } else if(extItem.key === 'REFDOC') {
            refDoc = extItem.value;
        } else if(extItem.key === 'DOCDATE') {
            docDate = extItem.value;
        }
    });

    const payerExtensionList: Array<IExtensionItem> = transferRequest
        .ilpPacket.data.payer.partyIdInfo.extensionList.extension;

    Object.values(payerExtensionList).forEach(extItem => {
        if(extItem.key === 'NAME') {
            payerExtName = extItem.value;
        }
    });

    const pacs008: IPacs008Incoming = {
        Document: {
            attr: {
                'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                xmlns: 'urn:iso:std:iso:20022:tech:xsd:pacs.008.001.09',
            },
            FIToFICstmrCdtTrf: {
                GrpHdr: {
                    MsgId: msgId, // extensionList["MSGID"].value
                    CreDtTm: createdDateTime, // extensionList["CREDT"].value
                    NbOfTxs: '1', // fixed value 1
                    SttlmInf: {
                        SttlmMtd: 'INDA', // fixed value
                    },
                    InstgAgt: {
                        FinInstnId: {
                            Othr: {
                                Id: transferRequest.ilpPacket.data.payer.partyIdInfo.fspId, // payerFsp.fspId
                            },
                        },
                    },
                    InstdAgt: {
                        FinInstnId: {
                            Othr: {
                                Id: transferRequest.ilpPacket.data.payee.partyIdInfo.fspId, // payeeFsp.fspId
                            },
                        },
                    },

                },
                CdtTrfTxInf: {
                    PmtId: {
                        InstrId: instrId, // extensionList["INSTRID"].value
                        EndToEndId: endToEndId, // extensionList["ENDTOENDID"].value
                        TxId: txId, // extensionList["TXID"].value
                    },
                    PmtTpInf: {
                        CtgyPurp: {
                            Cd: '0', // fixed value 0
                        },
                    },
                    IntrBkSttlmAmt: {
                        attr: {
                            Ccy: transferRequest.currency, // amount.currency
                        },
                        '#text': transferRequest.amount, // amount.amount
                    },
                    IntrBkSttlmDt: sttlmDt,
                    ChrgBr: 'SHAR', // fixed value SHAR
                    InitgPty: {
                        Nm: payerExtName, // ilpPacket.data.payer.extensionList["NAME"].value
                        Id: {
                            OrgId: {
                                Othr: {
                                    Id: transferRequest.ilpPacket.data.payer.partyIdInfo.fspId || '', // payerFsp.fspId
                                    SchmeNm: {
                                        Cd: 'CHAN', // fixed value CHAN
                                    },
                                },
                            },
                        },
                    },
                    Dbtr: {
                        Nm: transferRequest.ilpPacket.data.payer.name, // Optional: ilpPacket.data.payer.name
                    },
                    DbtrAcct: {
                        Id: {
                            Othr: {
                                Id: transferRequest.ilpPacket.data.payer.partyIdInfo.partyIdentifier, // ilpPacket.data.payer.partyIdInfo.partyIdentifier
                            },
                        },
                    },
                    DbtrAgt: {
                        FinInstnId: {
                            Othr: {
                                Id: transferRequest.ilpPacket.data.payer.partyIdInfo.fspId, // payerFsp.fspId
                            },
                        },
                    },
                    CdtrAgt: {
                        FinInstnId: {
                            Othr: {
                                Id: transferRequest.ilpPacket.data.payee.partyIdInfo.fspId, // payeeFsp.fspId
                            },
                        },
                    },
                    Cdtr: {
                        Nm: transferRequest.ilpPacket.data.payee.name, // ilpPacket.data.payee.name
                    },
                    CdtrAcct: {
                        Id: {
                            Othr: {
                                Id: transferRequest.ilpPacket.data.payee.partyIdInfo.partyIdentifier, // ilpPacket.data.payee.partyIdInfo.partyIdentifier
                            },
                        },
                    },
                    Purp: {
                        Cd: 'GDDS', // fixed value GDDS
                    },
                    RmtInf: {
                        Ustrd: ustrd, // extensionList["USTRD"].value
                        Strd: {
                            RfrdDocInf: {
                                Tp: {
                                    CdOrPrtry: {
                                        Cd: 'CINV', // fixed value CINV
                                    },
                                },
                                Nb: refDoc, // extensionList["REFDOC"].value
                                RltdDt: docDate, // extensionList["DOCDATE"].value
                            },
                        },
                    },
                },
            },
        },
    };

    let xml = XML.fromJsObject(pacs008);
    xml = `<?xml version="1.0" encoding="utf-8"?>\n${xml}`;

    return xml;
};


/**
 * Translates ISO 20022 pacs.002 to PUT /transfers/{transferId} request body
 *
 * @param {Record<string, unknown> | IPacs002} pacs002
 * @returns {ITransferFulfilment}
 */
export const pacs002ToPutTransfersBody = (pacs002: Record<string, unknown> | IPacs002)
: ITransferFulfilment => {
    const body = pacs002 as IPacs002;
    const putTransfersBody: ITransferFulfilment = {
        completedTimestamp: body.Document.FIToFIPmtStsRpt.GrpHdr.CreDtTm,
        transferState: body.Document.FIToFIPmtStsRpt.TxInfAndSts?.TxSts === 'ACCC' ? MojaloopTransferState.COMMITTED : MojaloopTransferState.ABORTED,
        //  fulfilment: string,
    };
    putTransfersBody.extensionList = [
        {
            key: 'MSGID',
            value: body.Document.FIToFIPmtStsRpt.GrpHdr.MsgId,
        },
    ];
    if(body.Document.FIToFIPmtStsRpt.TxInfAndSts?.OrgnlInstrId) {
        putTransfersBody.extensionList.push(
            {
                key: 'INSTRID',
                value: body.Document.FIToFIPmtStsRpt.TxInfAndSts.OrgnlInstrId,
            },
        );
    }
    if(body.Document.FIToFIPmtStsRpt.TxInfAndSts?.OrgnlEndToEndId) {
        putTransfersBody.extensionList.push(
            {
                key: 'ENDTOENDID',
                value: body.Document.FIToFIPmtStsRpt.TxInfAndSts.OrgnlEndToEndId,
            },
        );
    }
    if(body.Document.FIToFIPmtStsRpt.TxInfAndSts?.OrgnlTxId) {
        putTransfersBody.extensionList.push(
            {
                key: 'TXID',
                value: body.Document.FIToFIPmtStsRpt.TxInfAndSts.OrgnlTxId,
            },
        );
    }

    return putTransfersBody;
};
