/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/

export interface IPostQuotesBody {
    quoteId: string,
    transactionId: string,
    payee: {
        partyIdInfo: {
            partyIdType: string,
            partyIdentifier: string,
            fspId: string
        }
    },
    payer: {
        partyIdInfo: {
            partyIdType: string,
            partyIdentifier: string,
            fspId: string
        }
    },
    amountType: string,
    amount: {
        currency: string,
        amount: number,
    },
    transactionType: {
        scenario: string,
        initiator: string,
        initiatorType: string
    },
    expiration: string
}
