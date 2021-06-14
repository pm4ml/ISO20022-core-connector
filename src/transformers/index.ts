/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/

import { AmountType, IDType, IPostQuotesRequestBody, IPostTransfersRequestBody, TransactionType } from '~/interfaces';

/**
 * Translates ISO 20022 pain.001 to POST transfers request body
 * for SDK Scheme Adapter
 *
 * @param pain001Body
 * @returns {IPostTransfersRequestBody}
 */
export const pain001ToPostTransfersBody = (pain001Body: Record<string, any>): IPostTransfersRequestBody => {
    const PmtInf = pain001Body.Document.CstmrCdtTrfInitn[0].PmtInf[0];

    const transfersBody: IPostTransfersRequestBody = {
        transferId: PmtInf.PmtInfId[0],
        homeTransactionId: PmtInf.CdtTrfTxInf[0].PmtId[0].EndToEndId[0],
        from: {
            idType: IDType.MSISDN,
            idValue: PmtInf.CdtTrfTxInf[0].Cdtr[0].CtctDtls[0].MobNb[0],
            fspId: PmtInf.CdtTrfTxInf[0].CdtrAgt[0].FinInstnId[0].BICFI[0],
        },
        to: {

            idType: IDType.MSISDN,
            idValue: PmtInf.CdtTrfTxInf[0].Cdtr[0].CtctDtls[0].MobNb[0],
            fspId: PmtInf.CdtTrfTxInf[0].CdtrAgt[0].FinInstnId[0].BICFI[0],

        },
        amountType: AmountType.SEND,
        amount: PmtInf.CdtTrfTxInf[0].Amt[0].InstdAmt[0]._,
        currency: PmtInf.CdtTrfTxInf[0].Amt[0].InstdAmt[0].$.Ccy,
        transactionType: TransactionType.TRANSFER,
    };

    return transfersBody;
};

/**
 * Translates ISO 20022 pain.001 to POST quotes request body
 * for SDK Scheme Adapter
 *
 * @param pain001Body
 * @returns {IPostTransfersRequestBody}
 */
export const pain001ToPostQuotesBody = (pain001Body: Record<string, any>): IPostQuotesRequestBody => {
    const PmtInf = pain001Body.Document.CstmrCdtTrfInitn[0].PmtInf[0];

    const quotesBody: IPostQuotesRequestBody = {
        quoteId: PmtInf.PmtInfId[0],
        transactionId: PmtInf.CdtTrfTxInf[0].PmtId[0].EndToEndId[0],
        payee: {
            partyIdInfo: {
                partyIdType: 'MSISDN',
                partyIdentifier: PmtInf.CdtTrfTxInf[0].Cdtr[0].CtctDtls[0].MobNb[0],
                fspId: PmtInf.CdtTrfTxInf[0].CdtrAgt[0].FinInstnId[0].BICFI[0],
            },
        },
        payer: {
            partyIdInfo: {
                partyIdType: 'MSISDN',
                partyIdentifier: PmtInf.Dbtr[0].CtctDtls[0].MobNb[0],
                fspId: PmtInf.DbtrAgt[0].FinInstnId[0].BICFI[0],
            },
        },
        amountType: 'SEND',
        amount: {
            currency: PmtInf.CdtTrfTxInf[0].Amt[0].InstdAmt[0].$.Ccy,
            amount: PmtInf.CdtTrfTxInf[0].Amt[0].InstdAmt[0]._,
        },
        transactionType: {
            scenario: 'TRANSFER',
            initiator: 'PAYER',
            initiatorType: 'CONSUMER',
        },
        expiration: '',
    };

    return quotesBody;
};
