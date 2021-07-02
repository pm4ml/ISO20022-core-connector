/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/

import { IErrorInformation } from '~/interfaces';
import { getParties } from '../../requests/Outbound';
import { camt003ToGetPartiesParams, fspiopErrorToCamt004Error, partiesByIdResponseToCamt004 } from '../../transformers';
import { ApiContext } from '../../types';


const handleError = (error: Error | IErrorInformation, ctx: ApiContext) => {
    ctx.state.logger.error(error);
    if((error as IErrorInformation).errorCode) {
        // handle FSPIOP error
        const { body, status } = fspiopErrorToCamt004Error(error as IErrorInformation);
        ctx.response.type = 'application/xml';
        ctx.response.body = body;
        ctx.response.status = status;
    } else {
        // handle generic JS error
    }
};

export default async (ctx: ApiContext): Promise<void> => {
    try {
        const params = camt003ToGetPartiesParams(ctx.request.body);
        const res = await getParties(params);
        ctx.state.logger.debug(JSON.stringify(res.data));
        if(res.data.body.errorInformation) {
            handleError(res.data.body.errorInformation, ctx);
            return;
        }
        ctx.state.logger.log(res.data);
        ctx.response.type = 'application/xml';
        ctx.response.body = partiesByIdResponseToCamt004(res.data);
        ctx.response.status = 200;
    } catch (e) {
        handleError(e, ctx);
    }
};
