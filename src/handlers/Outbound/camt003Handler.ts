/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 *                                                                        *
 *  CONTRIBUTORS:                                                         *
 *       miguel de Barros - miguel.de.barros@modusbox.com                 *
 **************************************************************************/

import { RequesterOptions, OutboundRequester } from '../../requests';
import { SystemError, BaseError } from '../../errors';
import { ICamt003, IErrorInformation } from '../../interfaces';
import { camt003ToGetPartiesParams, fspiopErrorToCamt004Error, partiesByIdResponseToCamt004 } from '../../transformers';
import { ApiContext } from '../../types';


const handleError = (error: Error | IErrorInformation, ctx: ApiContext) => {
    ctx.state.logger.error(error);
    if((error as IErrorInformation).errorCode) {
        const originalMsgId = (ctx.request.body as ICamt003).Document.GetAcct.MsgHdr.MsgId;
        const { body, status } = fspiopErrorToCamt004Error(error as IErrorInformation, originalMsgId);
        ctx.response.type = 'application/xml';
        ctx.response.body = body;
        ctx.response.status = status;
    } else {
        if(error instanceof BaseError) {
            throw error;
        }
        throw new SystemError({ msg: 'error handling camt003 outbound message', error: error as unknown as Error });
    }
};

export default async (ctx: ApiContext): Promise<void> => {
    try {
        const outboundRequesterOps: RequesterOptions = {
            baseURL: ctx.state.conf.backendEndpoint,
            timeout: ctx.state.conf.requestTimeout,
            logger: ctx.state.logger,
        };
        const outboundRequester = new OutboundRequester(outboundRequesterOps);

        const params = camt003ToGetPartiesParams(ctx.request.body as ICamt003);
        const res = await outboundRequester.getParties(params);
        ctx.state.logger.debug(JSON.stringify(res.data));

        if(res.data.body.errorInformation) {
            handleError(res.data.body.errorInformation, ctx);
            return;
        }

        ctx.state.logger.log(res.data);
        ctx.response.type = 'application/xml';
        ctx.response.body = partiesByIdResponseToCamt004(res.data, ctx.state?.conf?.dfspIdMap);
        ctx.response.status = 200;
    } catch (e: unknown) {
        handleError(e as Error, ctx);
    }
};
