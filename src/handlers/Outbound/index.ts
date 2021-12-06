/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/
import { INamespacedXMLDoc } from '../../interfaces';
import { ApiContext, OutboundHandlerMap } from '../../types';
import camt003Handler from './camt003Handler';
import pacs002Handler from './pacs002Handler';
import pacs008Handler from './pacs008Handler';

const xmlnToHandlerMap: OutboundHandlerMap = {
    'urn:iso:std:iso:20022:tech:xsd:camt.003.001.07': camt003Handler,
    'urn:iso:std:iso:20022:tech:xsd:pacs.008.001.09': pacs008Handler,
    'urn:iso:std:iso:20022:tech:xsd:pacs.002.001.10': pacs002Handler,
};

const handleError = (err: Error, ctx: ApiContext) => {
    ctx.state.logger.error(err);
    ctx.response.status = 500;
};

export const OutboundHandler = async (ctx: ApiContext): Promise<void> => {
    const body = ctx.request.body as INamespacedXMLDoc;
    const namespace = body.Document.attr.xmlns;
    const handler = xmlnToHandlerMap[namespace];

    ctx.state.logger.log({
        outboundHandlerRequest: {
            namespace,
            header: ctx.request.header,
            request: body,
        },
    });

    try {
        await handler(ctx);
    } catch (error) {
        handleError(error as Error, ctx);
    }

    ctx.state.logger.log({
        outboundHandlerResponse: {
            namespace,
            header: ctx.response.header,
            response: ctx.response.body,
            status: ctx.response.status,
        },
    });
};
