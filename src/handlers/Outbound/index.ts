/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/
import { INamespacedXMLDoc } from '~/interfaces';
import { ApiContext, OutboundHandlerMap } from '../../types';
import camt003Handler from '../Outbound/camt003Handler';

const xmlnsToHandlersMap: OutboundHandlerMap = {
    'urn:iso:std:iso:20022:tech:xsd:camt.003.001.07': camt003Handler,
};

const handleError = (err: Error, ctx: ApiContext) => {
    ctx.state.logger.error(err);
};

export const OutboundHandler = async (ctx: ApiContext): Promise<void> => {
    let response;
    const body = ctx.request.body as INamespacedXMLDoc;
    const namespace = body.Document.$.xmlns;
    const handler = xmlnsToHandlersMap[namespace];

    try {
        response = await handler(ctx);
        ctx.response.status = 200;
        ctx.response.body = response;
    } catch (err) {
        handleError(err, ctx);
    }

    return undefined;
};
