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
    IErrorResponse,
    TxStsEnum,
    IPacsState,
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
            idValue: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.DbtrAcct.Id.Othr.Id,
            fspId: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.InitgPty.Id.OrgId.Othr.Id,
        },
        to: {
            displayName: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.Cdtr.Nm,
            idType: PartyIdType.ACCOUNT_ID,
            idValue: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.CdtrAcct.Id.Othr.Id,
            fspId: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.CdtrAgt.FinInstnId.Othr.Id,
        },
        transactionType: TransactionType.TRANSFER,
        skipPartyLookup: true,
    };

    // lets safely map the from.extensionList
    const fromExtensionList = [];

    if(body.Document?.FIToFICstmrCdtTrf?.CdtTrfTxInf?.InitgPty?.Nm) {
        fromExtensionList.push({
            key: 'NAME',
            value: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.InitgPty.Nm,
        });
    }

    if(fromExtensionList.length > 0) postQuotesBody.from.extensionList = fromExtensionList;

    // lets safely map the to.extensionList
    const toExtensionList = [];

    if(body.Document?.FIToFICstmrCdtTrf?.CdtTrfTxInf?.CdtrAgt?.FinInstnId?.Nm) {
        toExtensionList.push({
            key: 'NAME',
            value: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.CdtrAgt.FinInstnId.Nm,
        });
    }

    if(toExtensionList.length > 0) postQuotesBody.to.extensionList = toExtensionList;

    // lets safely map the quoteRequestExtensions
    const quoteRequestExtensions = [];

    if(body.Document?.FIToFICstmrCdtTrf?.GrpHdr?.MsgId) {
        quoteRequestExtensions.push({
            key: 'MSGID',
            value: body.Document.FIToFICstmrCdtTrf.GrpHdr.MsgId,
        });
    }
    if(body.Document?.FIToFICstmrCdtTrf?.GrpHdr?.CreDtTm) {
        quoteRequestExtensions.push({
            key: 'CREDT',
            value: body.Document.FIToFICstmrCdtTrf.GrpHdr.CreDtTm,
        });
    }
    if(body.Document?.FIToFICstmrCdtTrf?.CdtTrfTxInf?.PmtId?.InstrId) {
        quoteRequestExtensions.push({
            key: 'INSTRID',
            value: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.InstrId,
        });
    }
    if(body.Document?.FIToFICstmrCdtTrf?.CdtTrfTxInf?.PmtId?.EndToEndId) {
        quoteRequestExtensions.push({
            key: 'ENDTOENDID',
            value: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.EndToEndId,
        });
    }
    if(body.Document?.FIToFICstmrCdtTrf?.CdtTrfTxInf?.PmtId?.TxId) {
        quoteRequestExtensions.push({
            key: 'TXID',
            value: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.TxId,
        });
    }
    if(body.Document?.FIToFICstmrCdtTrf?.CdtTrfTxInf?.IntrBkSttlmDt) {
        quoteRequestExtensions.push({
            key: 'SETTLEDATE',
            value: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.IntrBkSttlmDt,
        });
    }
    if(body.Document?.FIToFICstmrCdtTrf?.CdtTrfTxInf?.RmtInf?.Ustrd) {
        quoteRequestExtensions.push({
            key: 'USTRD',
            value: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.RmtInf.Ustrd,
        });
    }
    if(body.Document?.FIToFICstmrCdtTrf?.CdtTrfTxInf?.RmtInf?.Strd?.RfrdDocInf?.Nb) {
        quoteRequestExtensions.push({
            key: 'REFDOC',
            value: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.RmtInf.Strd.RfrdDocInf.Nb,
        });
    }
    if(body.Document?.FIToFICstmrCdtTrf?.CdtTrfTxInf?.RmtInf?.Strd?.RfrdDocInf?.RltdDt) {
        quoteRequestExtensions.push({
            key: 'DOCDATE',
            value: body.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.RmtInf.Strd.RfrdDocInf.RltdDt,
        });
    }

    // TODO: Add extension list @see `transferResponseToPacs002` in transformers/index.ts
    if(quoteRequestExtensions.length > 0) postQuotesBody.quoteRequestExtensions = quoteRequestExtensions;

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
                xmlns: 'urn:iso:std:iso:20022:tech:xsd:pacs.002.001.10',
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
                    // TxSts: currentState === TransferStatus.COMPLETED ? TxStsEnum.ACCC : TxStsEnum.RJCT,
                    TxSts: currentState === TransferStatus.COMPLETED ? TxStsEnum.ACSC : TxStsEnum.RJCT,
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
                xmlns: 'urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08',
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
        completedTimestamp: body?.Document?.FIToFIPmtStsRpt?.GrpHdr?.CreDtTm,
        transferState: body?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.TxSts === TxStsEnum.ACSC ? MojaloopTransferState.COMMITTED : MojaloopTransferState.ABORTED,
        //  fulfilment: string, //TODO: do we need to send fulfil?
    };
    putTransfersBody.extensionList = [];

    if(body?.Document?.FIToFIPmtStsRpt?.GrpHdr?.MsgId) {
        putTransfersBody?.extensionList?.push(
            {
                key: 'MSGID',
                value: body.Document.FIToFIPmtStsRpt.GrpHdr.MsgId,
            },
        );
    }
    if(body?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlInstrId) {
        putTransfersBody?.extensionList?.push(
            {
                key: 'INSTRID',
                value: body.Document.FIToFIPmtStsRpt.TxInfAndSts.OrgnlInstrId,
            },
        );
    }
    if(body?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlEndToEndId) {
        putTransfersBody?.extensionList?.push(
            {
                key: 'ENDTOENDID',
                value: body.Document.FIToFIPmtStsRpt.TxInfAndSts.OrgnlEndToEndId,
            },
        );
    }
    if(body?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlTxId) {
        putTransfersBody?.extensionList?.push(
            {
                key: 'TXID',
                value: body.Document.FIToFIPmtStsRpt.TxInfAndSts.OrgnlTxId,
            },
        );
    }

    return putTransfersBody;
};


/**
 * Constructs ISO 20022 error message in pacs.002 format.
 *
 * @param {IPacsState} pacsState
 * @returns {IPacs002}
 */
export const pacsStateToPacs002Error = (
    pacsState: IPacsState,
): string => {
    const pacs002Error: IPacs002 = {
        Document: {
            attr: {
                'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                xmlns: 'urn:iso:std:iso:20022:tech:xsd:pacs.002.001.10',
            },
            FIToFIPmtStsRpt: {
                GrpHdr: {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    MsgId: pacsState.MsgId!,
                    CreDtTm: (new Date()).toISOString(),
                },
                TxInfAndSts: {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    OrgnlInstrId: pacsState.OrgnlInstrId!,
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    OrgnlEndToEndId: pacsState.OrgnlEndToEndId!,
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    OrgnlTxId: pacsState.OrgnlTxId!,
                    TxSts: TxStsEnum.RJCT, // error code
                },
            },
        },
    };

    let xml = XML.fromJsObject(pacs002Error);
    xml = `<?xml version="1.0" encoding="utf-8"?>\n${xml}`;

    return xml;
};

/**
 * Constructs ErrorInformation from ISO 20022 PDNG Failed Status format.
 *
 * @param {any} PDNGWithFailedStatus
 * @returns {IErrorInformation}
 */
export const PDNGWithFailedStatusToTransferError = ( // TODO: define expected PDNGResponse interface and mapping. NOT USED, SHOULD BE REMOVED!
    // PDNGResponse: any,
): IErrorResponse => {
    const errorResponse: IErrorResponse = {
        statusCode: '222',
        message: '1111',
    };

    return errorResponse;
};
