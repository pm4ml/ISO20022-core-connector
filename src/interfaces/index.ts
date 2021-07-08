/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/

export enum PartiesCurrentState {
    WAITING_FOR_REQUEST_PARTY_INFORMATION = 'WAITING_FOR_REQUEST_PARTY_INFORMATION',
    COMPLETED = 'COMPLETED',
    ERROR_OCCURRED = 'ERROR_OCCURED',
}

export interface INamespacedXMLDoc extends Record<string, unknown> {
    Document: {
        attr: {
            xmlns: string,
        }
    }
}
export interface IExtensionItem {
    key: string,
    value: string,
}
export interface IErrorInformation {
    errorCode: string,
    errorDescription: string,
    extensionList?: Array<IExtensionItem>
}

export enum IPartyIdType {
    ACCOUNT_ID = 'ACCOUNT_ID',
}

export interface IPartiesByIdParams {
    idType: IPartyIdType.ACCOUNT_ID,
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
    partyIdType: IPartyIdType,
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

export interface IPostQuotesBody {
    currentState: 'payeeResolved',
    amountType: '',
    amount: {
        currency: '',
        amount: ''
    },
    from: {
        type: ''
    },
    to: {
        fspId: '',
    },
    transactionType: '',
    note?: '',
    quoteRequestExtensions?: [],
}

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
            },
            CdtTrfTxInf: {
                PmtId: {
                    EndToEndId: string
                },
                IntrBkSttmAmt: {
                    attr: {
                        Ccy: string
                    },
                    '#text': string
                },
                Dbtr: {
                    CtctDtls: {
                        MobNb: string
                    }
                },
                Cdtr: {
                    CtctDtls: {
                        MobNb: string
                    }
                }
            }
        }
    }
}
