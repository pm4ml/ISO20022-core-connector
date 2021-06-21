/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/
export interface IExtensionItem {
    key: string,
    value: string,
}

export enum IDType {
    ACCOUNT_ID = 'ACCOUNT_ID',
}

export interface IGetPartiesParams {
    idType: IDType.ACCOUNT_ID,
    idValue: string,
}

export interface INamespacedXMLDoc extends Record<string, unknown> {
    Document: {
        $: {
            xmlns: string
        }
    }
}

export interface ICAMT003Body extends Record<string, unknown> {
    Document: {
        GetAcct: [{
            AcctQryDef: [{
                AcctCrit: [{
                    NewCrit: [{
                        SchCrit: [{
                            AcctId: [{
                                EQ: [{
                                    Othr: [{
                                        Id: [string]
                                    }]
                                }]
                            }]
                        }]
                    }]
                }]
            }]
        }]
    }
}
