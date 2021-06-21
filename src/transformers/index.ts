/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/

import { ICAMT003Body, IDType, IGetPartiesParams } from '../interfaces';


/**
 * Translates ISO 20022 camt.003 to an object with parties lookup parameters.
 *
 * @param camt003Body
 * @returns {object}
 */
export const camt003ToGetPartiesParams = (camt003Body: string | Record<string, unknown> | ICAMT003Body)
: IGetPartiesParams => {
    const body = camt003Body as ICAMT003Body;
    const idValue = body.Document.GetAcct[0]
        .AcctQryDef[0].AcctCrit[0].NewCrit[0].SchCrit[0].AcctId[0].EQ[0].Othr[0].Id[0];

    const getPartiesParams: IGetPartiesParams = {
        idType: IDType.ACCOUNT_ID,
        idValue,
    };

    return getPartiesParams;
};
