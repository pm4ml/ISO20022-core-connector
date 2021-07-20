/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/
import { IPostQuoteRequestBody, IPostQuoteResponseBody } from '~/interfaces';
import { ApiContext } from '../../types';


const handleError = (err: Error, ctx: ApiContext) => {
    ctx.state.logger.error(err);
    ctx.response.status = 500;
    ctx.response.body = '';
    ctx.response.type = 'text/html';
};

const postQuotes = async (ctx: ApiContext): Promise<void> => {
    const payload = ctx.request.body as unknown as IPostQuoteRequestBody;
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


export const InboundHandlers = {
    postQuotes,
};
