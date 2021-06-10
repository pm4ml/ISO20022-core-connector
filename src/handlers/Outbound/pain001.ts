/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/

import { IPostQuotesBody } from '~/interfaces/quotes';
import { ApiContext } from '~/types';

const pain001ToPostQuotesBody = (pain001Body: Record<string, any>): IPostQuotesBody => {
    const PmtInf = pain001Body.Document.CstmrCdtTrfInitn[0].PmtInf[0];

    const quotesBody: IPostQuotesBody = {
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
            amount: Number(PmtInf.CdtTrfTxInf[0].Amt[0].InstdAmt[0]._),
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

export const pain001Handler = async (ctx: ApiContext): Promise<void> => {
    const quotesBody = pain001ToPostQuotesBody(ctx.request.body);
    console.log(quotesBody);
    ctx.body = JSON.stringify({ status: 'ok' });
};
