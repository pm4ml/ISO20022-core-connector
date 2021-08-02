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
    IPostQuotesResponseBody, ITransferParty, TransactionType, AmountType, IExtensionItem,
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

export interface IPostTransferRequestBody {
    transferId: string,
    amount: string,
    currency: string,
    quote: IPostQuotesResponseBody,
    from: ITransferParty,
    to: ITransferParty,
    amountType: AmountType,
    transactionType: TransactionType,
    note?: string
    quoteRequestExtensions: Array<IExtensionItem>,

}

export interface IPacs008Incoming extends Record<string, unknown> {
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
                    SttlmMtd: string,
                },
                InstgAgt: {
                    FinInstnId: {
                        Othr: {
                            Id: string,
                        },
                    },
                },
                InstdAgt: {
                    FinInstnId: {
                        Othr: {
                            Id: string,
                        },
                    },
                },
            },
            CdtTrfTxInf: {
                PmtId: {
                    InstrId: string,
                    EndToEndId: string,
                    TxId: string,
                },
                PmtTpInf: {
                    CtgyPurp: {
                        Cd: string,
                    },
                },
                IntrBkSttlmAmt: {
                    attr: {
                        Ccy: string,
                    },
                    '#text': string,
                },
                IntrBkSttlmDt: string,
                ChrgBr: string,
                InitgPty: {
                    Nm: string,
                    OrgId: {
                        Othr: {
                            Id: string,
                            SchmeNm: {
                                Cd: string,
                            },
                        },
                    },
                },
                Dbtr: {
                    Nm: string, // Optional
                },
                DbtrAcct: {
                    Id: {
                        Othr: {
                            Id: string,
                        },
                    },
                },
                DbtrAgt: {
                    FinInstnId: {
                        Othr: {
                            Id: string,
                        },
                    },
                },
                CdtrAgt: {
                    FinInstnId: {
                        Othr: {
                            Id: string,
                        },
                    },
                },
                Cdtr: {
                    Nm: string,
                },
                CdtrAcct: {
                    Id: {
                        Othr: {
                            Id: string,
                        },
                    },
                },
                Purp: {
                    Cd: string,
                },
                RmtInf: {
                    Ustrd: string,
                    Strd: {
                        RfrdDocInf: {
                            Tp: {
                                CdOrPrtry: {
                                    Cd: string,
                                }
                            },
                            Nb: string,
                            RltdDt: string,
                        },
                    },
                },
            },
        },
    },
}
