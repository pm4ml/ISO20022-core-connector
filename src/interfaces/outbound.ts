/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/

import { IExtensionItem } from './common';

export enum PartiesCurrentState {
    WAITING_FOR_REQUEST_PARTY_INFORMATION = 'WAITING_FOR_REQUEST_PARTY_INFORMATION',
    COMPLETED = 'COMPLETED',
    ERROR_OCCURRED = 'ERROR_OCCURED',
}

export enum TransferStatus {
    WAITING_FOR_PARTY_ACCEPTANCE = 'WAITING_FOR_PARTY_ACCEPTANCE',
    WAITING_FOR_QUOTE_ACCEPTANCE = 'WAITING_FOR_QUOTE_ACCEPTANCE',
    COMPLETED = 'COMPLETED',
    ERROR_OCCURRED = 'ERROR_OCCURED',
}

export enum AmountType {
    SEND = 'SEND',
    RECEIVE = 'RECEIVE',
}

export enum TransactionType {
    TRANSFER = 'TRANSFER',
}

export enum MojaloopTransferState {
    RECEIVED = 'RECEIVED',
    RESERVED = 'RESERVED',
    COMMITTED = 'COMMITTED',
    ABORTED = 'ABORTED',
}

export interface INamespacedXMLDoc extends Record<string, unknown> {
    Document: {
        attr: {
            xmlns: string,
        }
    }
}

export interface IMoney {
    currency: string,
    amount: string
}

export enum PartyIdType {
    MSISDN = 'MSISDN',
    ACCOUNT_ID = 'ACCOUNT_ID',
    EMAIL = 'EMAIL',
    PERSONAL_ID = 'PERSONAL_ID',
    BUSINESS = ' BUSINESS',
    DEVICE = 'DEVICE',
    IBAN = 'IBAN',
    ALIAS = 'ALIAS',
}

export interface IPartiesByIdParams {
    idType: PartyIdType.ACCOUNT_ID,
    idValue: string
}

export interface IPartiesByIdResponse {
    body: {
        party: IParty,
        currentState: PartiesCurrentState
    }
}

export interface IParty {
    accounts?: Array<IAccount>,
    partyIdInfo: IPartyIdInfo,
    merchantClassificationCode?: string,
    name: string,
    personalInfo?: IPartyPersonalInfo
}

export interface IAccount {
    address: string,
    currency: string,
    description: string
}

export interface IPartyIdInfo {
    partyIdType: PartyIdType,
    partyIdentifier: string,
    partySubIdOrType?: string,
    fspId: string,
    extensionList?: Array<IExtensionItem>
}

export interface IPartyPersonalInfo {
    complexName: IPartyComplexName,
    dateOfBirth: string
}

export interface IPartyComplexName {
    firstName: string,
    middleName: string,
    lastName: string,
}

export enum PayerType {
    CONSUMER = 'CONSUMER',
    AGENT = 'AGENT',
    BUSINESS = 'BUSINESS',
    DEVICE = 'DEVICE',
}

export interface ITransferParty {
    type?: PayerType,
    idType: PartyIdType,
    idValue: string,
    idSubValue?: string,
    displayName?: string,
    firstName?: string,
    middleName?: string,
    lastName?: string,
    dateOfBirth?: string,
    merchantClassificationCode?: string,
    fspId?: string,
    extensionList?: Array<IExtensionItem>
}

export interface IPostQuotesBody {
    homeTransactionId: string,
    from: ITransferParty,
    to: ITransferParty,
    amountType: AmountType,
    currency: string,
    amount: string,
    transactionType: TransactionType,
    note?: string,
    quoteRequestExtensions?: Array<IExtensionItem>,
    transferRequestExtension?: Array<IExtensionItem>,
    skipPartyLookup: boolean
}

export interface IPostQuotesResponseBody {
    transferAmount: IMoney,
    payeeReceiveAmount?: IMoney,
    payeeFspFee?: IMoney,
    payeeFspCommission?: IMoney,
    expiration: Date,
    geoCode?: {
        longitude: string,
        latitude: string
    },
    ilpPacket: string,
    condition: string,
    extensionList?: Array<IExtensionItem>,
}

export interface ITransferFulfilment {
    transferState: MojaloopTransferState,
    fulfilment?: string,
    completedTimestamp?: string,
    extensionList?: Array<IExtensionItem>
}

export interface ITransferState {
    transferId?: string,
    homeTransactionId?: string,
    from: ITransferParty,
    to: ITransferParty | Array<ITransferParty>,
    amountType: AmountType,
    currency: string,
    amount: string,
    transactionType: TransactionType,
    note?: string,
    currentState?: TransferStatus,
    quoteId?: string,
    getPartiesResponse?: {
        body: Record<string, unknown>
        headers?: Record<string, unknown>
    },
    quoteResponse?: {
        body: IPostQuotesResponseBody,
        headers?: Record<string, unknown>
    },
    quoteResponseSource?: string,
    fulfil?: {
        body: ITransferFulfilment,
        headers?: Record<string, unknown>
    },
    lastError?: Record<string, unknown>,
    skipPartyLookup?: boolean,
    quoteRequestExtensions: Array<IExtensionItem>
}

export type ITransferSuccess = ITransferState;

export interface ITransferContinuationQuote {
    acceptQuote: boolean,
    additionalProperties?: string
}

export interface ITransferBadRequest {
    statusCode?: string,
    message?: string,
    transferState: ITransferState
}

export type ITransferServerError = ITransferBadRequest;

export type ITransferTimeoutError = ITransferBadRequest;

export type ITransferError = ITransferBadRequest | ITransferServerError | ITransferTimeoutError;

export type ITransferResponse = ITransferSuccess | ITransferError;
export interface ICamt003 extends Record<string, unknown> {
    Document: {
        attr: {
            xmlns: 'urn:iso:std:iso:20022:tech:xsd:camt.003.001.07',
            'xmlns:xsi'?: 'http://www.w3.org/2001/XMLSchema-instance'
        },
        GetAcct: {
            MsgHdr: {
                MsgId: string
            },
            AcctQryDef: {
                AcctCrit: {
                    NewCrit: {
                        SchCrit: {
                            AcctId: {
                                EQ: {
                                    Othr: {
                                        Id: string
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

export interface ICamt004Acct {
    Ownr: {
        CtctDtls: {
            Nm: string,
            MobNb?: string,
            EmailAdr?: string
        },
    },
    Svcr: {
        FinInstnId: {
            Othr: {
                Id: string,
            },
        },
    }
}

export interface ICamt004 extends Record<string, unknown> {
    Document: {
        attr: {
            'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
            xmlns: 'urn:iso:std:iso:20022:tech:xsd:camt.004.001.08',
        },
        RtrAcct: {
            MsgHdr: {
                MsgId: string,
                CreDtTm: string,
            },
            RptOrErr: {
                AcctRpt: {
                    AcctId: {
                        Othr: {
                            Id: string,
                        },
                    },
                    AcctOrErr: {
                        Acct: ICamt004Acct,
                    }
                },
            },
        },
    }
}

export interface ICamt004Error extends Record<string, unknown> {
    Document: {
        attr: {
            'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
            xmlns: 'urn:iso:std:iso:20022:tech:xsd:camt.004.001.08',
        },
        RtrAcct: {
            MsgHdr: {
                MsgId: string,
                CreDtTm: string,
                OrgnlBizQry: {
                    MsgId: string
                }
            },
            RptOrErr: {
                OprlErr: {
                    Err: {
                        Cd: string,
                    },
                    Desc: string
                }
            }
        },
    }
}

export interface IPacsState {
    MsgId?: string,
    OrgnlInstrId?: string,
    OrgnlEndToEndId?: string,
    OrgnlTxId?: string,
}

export interface IPacs008 extends Record<string, unknown> {
    Document: {
        attr: {
            xmlns: 'urn:iso:std:iso:20022:tech:xsd:pacs.008.001.09',
            'xmlns:xsi'?: 'http://www.w3.org/2001/XMLSchema-instance'
        },
        FIToFICstmrCdtTrf: {
            GrpHdr: {
                MsgId: string,
                NbOfTxs: string,
                CreDtTm: string,
                SttlmInf: {
                    SttlmMtd: string
                },
                PmtTpInf: {
                    CtgyPurp: {
                        Cd: string
                    }
                },
                InstgAgt: {
                    FinInstnId: {
                        Othr: {
                            Id: string
                        }
                    }
                }
            },
            CdtTrfTxInf: {
                PmtId: {
                    EndToEndId: string,
                    InstrId: string,
                    TxId: string
                },
                IntrBkSttlmAmt: {
                    attr: {
                        Ccy: string
                    },
                    '#text': string
                },
                IntrBkSttlmDt: string,
                PmtTpInf: {
                    CtgyPurp: {
                        Cd: string
                    }
                },
                Dbtr: {
                    CtctDtls: {
                        MobNb: string
                    },
                    Nm: string,
                },
                DbtrAgt: {
                    FinInstnId: {
                        BICFI: string,
                        Othr: {
                            Id: string,
                        },
                    }
                },
                Cdtr: {
                    CtctDtls: {
                        MobNb: string
                    },
                    Nm: string,
                },
                CdtrAgt: {
                    FinInstnId: {
                        BICFI: string,
                        Nm: string,
                        Othr: {
                            Id: string,
                        },
                    }
                },
                RmtInf: {
                    Ustrd: string,
                    Strd: {
                        RfrdDocInf: {
                            Nb: string,
                            RltdDt: string
                        }
                    }
                },
                InitgPty: {
                    Nm: string,
                    Id: {
                        OrgId: {
                            Othr: {
                                Id: string,
                            },
                        },
                    },
                },
                CdtrAcct: {
                    Id: {
                        Othr: {
                            Id: string,
                        },
                    },
                },
                DbtrAcct: {
                    Id: {
                        Othr: {
                            Id: string,
                        },
                    },
                },
            }
        }
    }
}

export enum TxStsEnum {
    ACCC = 'ACCC',
    RJCT = 'RJCT',
    ACSC = 'ACSC',
    PNDG = 'PNDG',
}

export interface IPacs002 extends Record<string, unknown> {
    Document: {
        attr: {
            xmlns: 'urn:iso:std:iso:20022:tech:xsd:pacs.002.001.10',
            'xmlns:xsi'?: 'http://www.w3.org/2001/XMLSchema-instance'
        },
        CstmrPmtStsRpt?: {
            OrgnlPmtInfAndSts: {
                TxInfAndSts: {
                    TxSts: string
                }
            }
        },
        FIToFIPmtStsRpt?: {
            GrpHdr: {
                MsgId: string,
                CreDtTm: string,
                Flflmnt?: {
                    Fulfilment: string
                },
                InstgAgt?: {
                    FinInstnId: {
                        BICFI: string,
                        Nm: string
                    }
                },
                InstdAgt?: {
                    FinInstnId: {
                        BICFI: string,
                        Nm: string
                    }
                }
            },
            OrgnlGrpInfAndSts?: {
                OrgnlMsgId: string,
                OrgnlMsgNmId: string,
                GrpSts: string
            },
            TxInfAndSts?: {
                OrgnlInstrId: string,
                OrgnlEndToEndId: string,
                OrgnlTxId: string,
                TxSts: TxStsEnum
            }
        },
    }
}
