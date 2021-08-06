/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/
import {
    IPostQuoteRequestBody, IPostQuoteResponseBody, IPostTransferRequestBody, IPacs002,
} from '~/interfaces';
import { ApiContext } from '../../types';
import { postTransferBodyToPacs008, pacs002ToPutTransfersBody } from '../../transformers';
import { requestBackendTransfers } from '../../requests/Inbound';
import { XML, XSD } from '../../lib/xmlUtils';


const handleError = (err: Error, ctx: ApiContext) => {
    ctx.state.logger.error(err);
    ctx.response.status = 500;
    ctx.response.body = '';
    ctx.response.type = 'text/html';
};

const postQuotes = async (ctx: ApiContext): Promise<void> => {
    const payload = ctx.request.body as unknown as IPostQuoteRequestBody;
    ctx.state.logger.log(JSON.stringify(ctx.request.body));

    try {
        if(!payload.quoteId) throw new Error('Invalid quotes request was received.');
        const response = {
            quoteId: payload.quoteId,
            transactionId: payload.transactionId,
            transferAmount: payload.amount,
            transferAmountCurrency: payload.currency,
            payeeReceiveAmount: payload.amount,
            payeeReceiveAmountCurrency: payload.currency,
        } as IPostQuoteResponseBody;
        if(payload.expiration) response.expiration = payload.expiration;
        ctx.response.body = response;
        ctx.response.status = 200;
        ctx.response.type = 'application/json';
    } catch (err) {
        handleError(err, ctx);
    }
};

/**
 * Handled the incoming POST /transfers from mojaloop-connector
 * Converts the transfer payload from mojaloop to pacs008 and sends it to external ISO switch
 * Receives the synchronous response in pacs002 from the ISO compliant switch, converts it into mojaloop format
 * Sends synchronous response to mojaloop-connector
 *
 */

const postTransfers = async (ctx: ApiContext): Promise<void> => {
    const payload = ctx.request.body as unknown as IPostTransferRequestBody;
    ctx.state.logger.log(JSON.stringify(ctx.request.body));

    const postTransfersBodyPacs008 = postTransferBodyToPacs008(payload);

    // send a pacs008 POST /transfers request to RSwitch and get a synchronous pacs002 response
    const res = await requestBackendTransfers(postTransfersBodyPacs008);
    const validationResult = XSD.validate(res.data, XSD.paths.pacs_002);
    if(validationResult !== true) {
        XSD.handleValidationError(validationResult, ctx);
        return;
    }

    const xmlData = XML.fromXml(res.data);
    // Convert the pacs002 to mojaloop PUT /transfers/{transferId} body object and send it back to mojaloop connector
    const transferPutBody = pacs002ToPutTransfersBody(xmlData as unknown as IPacs002);
    ctx.response.body = transferPutBody;
    ctx.response.status = 200;
    ctx.response.type = 'application/json';
};

export const InboundHandlers = {
    postQuotes,
    postTransfers,
};
