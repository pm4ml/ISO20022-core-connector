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
import camt003Handler from '../Outbound/camt003Handler';
import pacs008Handler from './pacs008Handler';

const xmlnToHandlerMap: OutboundHandlerMap = {
    'urn:iso:std:iso:20022:tech:xsd:camt.003.001.07': camt003Handler,
    'urn:iso:std:iso:20022:tech:xsd:pacs.008.001.09': pacs008Handler,
};

const handleError = (err: Error, ctx: ApiContext) => {
    ctx.state.logger.error(err);
    ctx.response.status = 500;
};

export const OutboundHandler = async (ctx: ApiContext): Promise<void> => {
    const body = ctx.request.body as INamespacedXMLDoc;
    const namespace = body.Document.attr.xmlns;
    const handler = xmlnToHandlerMap[namespace];
    try {
        await handler(ctx);
    } catch (err) {
        handleError(err, ctx);
    }
};
