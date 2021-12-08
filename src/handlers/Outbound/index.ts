/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/
import { XML, XSD } from '../../lib/xmlUtils';
import { INamespacedXMLDoc } from '../../interfaces';
import { ApiContext, OutboundHandlerMap } from '../../types';
import camt003Handler from './camt003Handler';
import pacs002Handler from './pacs002Handler';
import pacs008Handler from './pacs008Handler';
import {
    // toXml as ErrorToXml,
    IGeneralError,
    ValidationError,
} from '../../errors';

const xmlnToHandlerMap: OutboundHandlerMap = {
    'urn:iso:std:iso:20022:tech:xsd:camt.003.001.07': {
        callback: camt003Handler,
        xsd: XSD.paths.camt_003,
    },
    'urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08': {
        callback: pacs008Handler,
        xsd: XSD.paths.pacs_008,
    },
    'urn:iso:std:iso:20022:tech:xsd:pacs.002.001.10': {
        callback: pacs002Handler,
        xsd: XSD.paths.pacs_002,
    },
};

const handleError = (err: Error, ctx: ApiContext, responseCode = 500) => {
    ctx.state.logger.error(err);
    ctx.response.type = 'text/plain'; // 'application/html';
    ctx.response.body = err.toString();
    ctx.response.status = (err as unknown as IGeneralError)?.httpResponseCode || responseCode;
};

export const OutboundHandler = async (ctx: ApiContext): Promise<void> => {
    ctx.state.logger.log({
        outboundHandlerRequest: {
            header: ctx.request.header,
            request: ctx.request.body,
        },
    });

    if((ctx?.request?.body as any)?.BusinessMessage?.Document) { // lets strip the BusinessMessage
        ctx.request.body = {
            Document: (ctx.request.body as any)?.BusinessMessage?.Document,
        };
        ctx.request.rawBody = XML.fromJsObject(ctx.request.body as Record<string, unknown>);
    }

    const body = ctx.request.body as INamespacedXMLDoc;
    const namespace = body?.Document?.attr?.xmlns;
    const handler = xmlnToHandlerMap[namespace];

    if(handler == null) {
        const error = new ValidationError({ msg: `Unable to route Outbound ISO message to handler as namespace='${namespace}' is not recognized.` });
        handleError(error, ctx);

        ctx.state.logger.log({
            outboundHandlerResponse: {
                namespace,
                header: ctx.response.header,
                response: error,
                status: ctx.response.status,
            },
        });
        return;
    }

    try {
        const validationResult = XSD.validate(ctx.request.rawBody, handler.xsd);

        if(validationResult !== true) {
            throw new ValidationError({ msg: `Validation failed ${JSON.stringify(validationResult)}` });
        }

        await handler.callback(ctx);
    } catch (error) {
        handleError(error as Error, ctx, 500);
        ctx.state.logger.log({
            outboundHandlerResponse: {
                namespace,
                header: ctx.response.header,
                response: error,
                status: ctx.response.status,
            },
        });
        return;
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
