/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/

export enum PayerType {
    CONSUMER = 'CONSUMER',
    AGENT = 'AGENT',
    BUSINESS = 'BUSINESS',
    DEVICE = 'DEVICE',
}

export enum IDType {
    MSISDN = 'MSISDN',
    ACCOUNT_ID = 'ACCOUNT_ID',
    EMAIL = 'EMAIL',
    PERSONAL_ID = 'PERSONAL_ID',
    BUSINESS = 'BUSINESS',
    DEVICE = 'DEVICE',
    IBAN = 'IBAN',
    ALIAS = 'ALIAS',
}

export enum AmountType {
    SEND = 'SEND',
    RECEIVE = 'RECEIVE',
}

export enum TransactionType {
    TRANSFER = 'TRANSFER',
}

export enum TransferState {
    WAITING_FOR_PARTY_ACEPTANCE = 'WAITING_FOR_PARTY_ACCEPTANCE',
    QUOTE_REQUEST_RECEIVED = 'QUOTE_REQUEST_RECEIVED',
    WAITING_FOR_QUOTE_ACCEPTANCE = 'WAITING_FOR_QUOTE_ACCEPTANCE',
    PREPARE_RECEIVED = 'PREPARE_RECEIVED',
    ERROR_OCCURRED = 'ERROR_OCCURRED',
    COMPLETED = 'COMPLETED',
}

export type ITransferParty = {
    idType: IDType,
    idValue: string,
    type?: PayerType,
    idSubValue?: string,
    displayName?: string,
    firstName?: string,
    middleName?: string,
    lastName?: string,
    dateOfBirth?: Date,
    merchantClassificationCode?: string,
    fspId: string,
};

export interface IExtensionItem {
    key: string,
    value: string,
}

export interface IPostQuotesRequestBody {
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

export interface IPostTransfersRequestBody {
    homeTransactionId: string,
    from: ITransferParty,
    to: ITransferParty,
    amountType: AmountType,
    currency: string,
    amount: string,
    transactionType: TransactionType,
    note?: string,
    quoteRequestExtensions?: Array<IExtensionItem>,
    transferRequestExtensions?: Array<IExtensionItem>,
    transferId?: string,
}

export interface IPostTransfersPartyResolvedResponseBody {
    currentState: TransferState
}

export interface IPostTransfersQuoteResolvedResponseBody{
    currentState: TransferState
}

export interface ITransferContinuationAcceptPartyBody {
    acceptParty: boolean
}

export interface ITransferContinuationAcceptQuoteBody {
    acceptQuote: boolean
}

export type IPutTransfersRequestBody = ITransferContinuationAcceptPartyBody | ITransferContinuationAcceptQuoteBody;

export interface IPutTransferResponseBody {
    currentState: boolean
}
