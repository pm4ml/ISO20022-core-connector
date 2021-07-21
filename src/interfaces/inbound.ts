/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/

import {
    IPostQuotesResponseBody, ITransferParty, TransactionType, AmountType,
} from './outbound';


export interface IPostQuoteRequestBody {
    quoteId: string,
    transactionId: string,
    amount: string,
    currency: string,
    expiration?: string,
}

export interface IPostQuoteRequestResponseBody {
    quoteId: string,
    transactionId: string,
    transferAmount: string,
    transferAmountCurrency: string,
    payeeReceiveAmount: string,
    payeeReceiveAmountCurrency: string,
    expiration?: string,
}

export interface IPostTransferWithoutQuoteRequestBody {
    transferId: string,
    amount: string,
    currency: string,
}
export interface IPostTransferWithQuoteRequestBody {
    transferId: string,
    amount: string,
    currency: string,
    quote: IPostQuotesResponseBody,
    from: ITransferParty,
    to: ITransferParty,
    amountType: AmountType,
    transactionType: TransactionType,
    note?: string

}

export type IPostTransferRequestBody = IPostTransferWithQuoteRequestBody | IPostTransferWithoutQuoteRequestBody;

export interface IPostTransferRequestResponseBody {
    transferId: string,
    // transactionId: string,
    // transferAmount: string,
    // transferAmountCurrency: string,
    // payeeReceiveAmount: string,
    // payeeReceiveAmountCurrency: string,
    // expiration?: string,
}


// transferId: b51ec534-ee48-4575-b6a9-ead2955b8069
// payeeFsp: '1234'
// payerFsp: '5678'
// amount:
//   currency: USD
//   amount: '123.45'
// ilpPacket: >-
//   AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA
// condition: f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA
// expiration: '2016-05-24T08:38:08.699-04:00'
// extensionList:
//   extension:
//     - key: errorDescription
//       value: This is a more detailed error description
//     - key: errorDescription
//       value: This is a more detailed error description

// /// transfer post body
//       transferId: external.transferId,
//       quote: quote.response,
//       from: quote.internalRequest.from,
//       to: quote.internalRequest.to,
//       amountType: quote.request.amountType,
//       currency: quote.request.amount.currency,
//       amount: quote.request.amount.amount,
//       transactionType: quote.request.transactionType.scenario,
//       note: quote.request.note


//       transferId: external.transferId,
//       currency: external.amount.currency,
//       amount: external.amount.amount,
