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
    IPostQuoteRequestBody, IPostQuoteRequestResponseBody, IPostTransferWithQuoteRequestBody, IPacs002, // IPostTransferWithQuoteRequestBody,
} from '~/interfaces';
import { ApiContext } from '../../types';
import {postTransferBodyToPacs008, pacs002ToPutTransfersBody} from '../../transformers'
import { requestBackendTransfers } from '../../requests/Inbound';
import {XML, XSD} from '../../lib/xmlUtils'
 

const handleError = (err: Error, ctx: ApiContext) => {
    ctx.state.logger.error(err);
    ctx.response.status = 500;
    ctx.response.body = '';
};

const postQuotes = async (ctx: ApiContext): Promise<void> => {
    const payload = ctx.request.body as unknown as IPostQuoteRequestBody;
    console.log('GOT a POST /quotes');
    console.log(ctx.request.body);

    try {
        const response = {
            quoteId: payload.quoteId,
            transactionId: payload.transactionId,
            transferAmount: payload.amount,
            transferAmountCurrency: payload.currency,
            payeeReceiveAmount: payload.amount,
            payeeReceiveAmountCurrency: payload.currency,
        } as IPostQuoteRequestResponseBody;
        if(payload.expiration) response.expiration = payload.expiration;
        ctx.response.body = response;
        ctx.response.status = 200;
        ctx.response.type = 'application/json';
    } catch (err) {
        handleError(err, ctx);
    }
};

const postTransfers = async (ctx: ApiContext): Promise<void> => {
    const payload = ctx.request.body as unknown as IPostTransferWithQuoteRequestBody;
    console.log('GOT a POST /transfer');
    console.log('-------------------------------------------');
    console.log(payload);
    console.log('-------------------------------------------');
    const postTransfersBodyPacs008 = postTransferBodyToPacs008(payload);
    console.log('-------------Making a call to requestTransfers------------------------');
    console.log(postTransfersBodyPacs008)
    console.log('-------------------------------------');

    // send a pacs008 POST /transfers request to RSwitch and get a synchronous pacs002 response
    const res = await requestBackendTransfers(postTransfersBodyPacs008);
    const validationResult = XSD.validate(res.data, XSD.paths.pacs_002);
    if(validationResult !== true) {
        XSD.handleValidationError(validationResult, ctx);
        return;
    }
    console.log('-------------GOT RESPONSE FROM requestTransfers------------------------');
    console.log(res.data)
    let result = XML.fromXml(res.data);
    console.log('-------------------------------------');

    // Convert the pacs002 to mojaloop PUT /transfers/{transferId} body object and send it back to mojaloop connector
    const transferPutBody = pacs002ToPutTransfersBody(result as unknown as IPacs002);
    ctx.response.body = transferPutBody;
    ctx.response.status = 200;
    ctx.response.type = 'application/json';

    // try {
    //     if('quote' in payload ){
    //         console.log('WE HAVE GOT THE quote')
            
    //     } else {
    //         console.log('NORMAL REQUEST without quote')

    //     }
    // } catch (err) {
    //     handleError(err, ctx);
    // }
};

export const InboundHandlers = {
    postQuotes,
    postTransfers,
};
