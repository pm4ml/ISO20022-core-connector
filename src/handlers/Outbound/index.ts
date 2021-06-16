/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/
import { ApiContext, OutboundHandlerMap } from '~/types';
import { pain001Handler } from '../Outbound/pain001';

const xmlnsToHandlersMap: OutboundHandlerMap = {
    'urn:iso:std:iso:20022:tech:xsd:pain.001.001.10': pain001Handler,
};

const handleError = (err: Error, ctx: ApiContext) => {
    ctx.state.logger.error(err);
};

export const OutboundHandler = async (ctx: ApiContext): Promise<void> => {
    let response;
    try {
        const namespace = ctx.request.body.Document && ctx.request.body.Document.$ && ctx.request.body.Document.$.xmlns;
        const handler = (namespace && xmlnsToHandlersMap[namespace]) || undefined;
        if(handler) {
            response = await handler(ctx);
            ctx.response.status = 200;
            ctx.response.body = response;
        } else throw new Error(`Couldn't find handler for namesapace ${namespace}.`);
    } catch (err) {
        handleError(err, ctx);
    }
    return undefined;
};
