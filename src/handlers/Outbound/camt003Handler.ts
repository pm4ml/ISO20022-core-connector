/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/

import { getParties } from '../../requests/Outbound';
import { camt003ToGetPartiesParams } from '../../transformers';
import { ApiContext } from '../../types';

export default async (ctx: ApiContext): Promise<void> => {
    try {
        const params = camt003ToGetPartiesParams(ctx.request.body);
        await getParties(params);
        // TODO: translate response to ISO and respond properly back to ISO system
    } catch (e) {
        // TODO: translate error to ISO and respond properly to ISO system
        ctx.state.logger.error(e);
    }
};
