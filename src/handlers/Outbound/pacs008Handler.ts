/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/

import { XSD } from '../../lib/xmlUtils';
import {
    // AmountType,
    IPacs008,
    ITransferError,
    // ITransferState,
    // PartyIdType,
    // PayerType,
    // TransactionType,
    TransferStatus,
} from '../../interfaces';
import { acceptQuotes, requestQuotes } from '../../requests/Outbound';
import { pacs008ToPostQuotesBody, transferResponseToPacs002, transferErrorResponseToPacs002 } from '../../transformers';
import { ApiContext } from '../../types';
import { sendPACS002toSenderBackend } from '../../requests/Inbound';


const handleError = (error: any | Error | ITransferError, ctx: ApiContext) => {
    ctx.state.logger.error(error);
    if((error as ITransferError).transferState) {
        ctx.response.type = 'application/xml';
        ctx.response.body = transferResponseToPacs002(error as ITransferError);
        ctx.response.status = 400;
    } else {
        // for timeout errors we need to construct the error pacs002 xml response
        ctx.response.type = 'application/xml';
        ctx.response.body = transferErrorResponseToPacs002(ctx.request.body as IPacs008);
        ctx.response.status = 500;
    }
};

export const processTransferRequest = async (ctx: ApiContext): Promise<void> => {
    let res: any;
    try {
        const postQuotesBody = pacs008ToPostQuotesBody(ctx.request.body as IPacs008);

        ctx.state.logger.push({
            request: postQuotesBody,
        }).log('requestQuotes request');

        res = await requestQuotes(postQuotesBody);

        ctx.state.logger.push({
            response: res,
        }).log('requestQuotes response');

        if(res.data.transferState
            && (res.data.transferState.currentState === TransferStatus.ERROR_OCCURRED
                || res.data.transferState.currentState !== TransferStatus.WAITING_FOR_QUOTE_ACCEPTANCE)) {
            throw new Error(`requestQuotes response transferState.currentState=${res.data?.transferState?.currentState} is invalid`);
        }

        // convert POST /transfers response to PUT /tranfers/{transferId} (quote acceptance) request
        // if no error is received, we send PUT /transfers/{transferId} to accept quote and execute transfer
        const acceptQuoteRequest = { acceptQuote: true };

        ctx.state.logger.push({
            transferId: res.data.transferId,
            request: acceptQuoteRequest,
        }).log('acceptQuotes request');

        res = await acceptQuotes(res.data.transferId as string, { acceptQuote: true });

        ctx.state.logger.push({
            transferId: res.data.transferId,
            response: res,
        }).log('acceptQuotes response');

        if(res.data.transferState
            && (res.data.transferState.currentState === TransferStatus.ERROR_OCCURRED
                || res.data.transferState.currentState !== TransferStatus.COMPLETED)) {
            throw new Error(`acceptQuotes response transferState.currentState=${res.data?.transferState?.currentState} is invalid`);
        }

        // Transform ML Connector response into ISO 2022
        const request = transferResponseToPacs002(res.data);
        ctx.state.logger.push({ request }).log('sendPACS002toSenderBackend request');
        // Send ISO 2022 callback response message to Sender
        const response = await sendPACS002toSenderBackend(JSON.stringify(request));
        ctx.state.logger.push({ response }).log('sendPACS002toSenderBackend response');
    } catch (error) {
        ctx.state.logger.error(error);
        // TODO: what do I send here?
        let requestError: any;

        if((res as ITransferError)?.transferState) {
            requestError = transferResponseToPacs002(error as ITransferError);
        } else {
            // for timeout errors we need to construct the error pacs002 xml response
            requestError = transferErrorResponseToPacs002(ctx.request.body as IPacs008);
        }

        ctx.state.logger.push({ requestError }).log('sendPACS002toSenderBackend request');

        const errorResponse = await sendPACS002toSenderBackend(JSON.stringify(requestError));

        ctx.state.logger.push({ response: errorResponse }).log('sendPACS002toSenderBackend response');

        throw error;
    }
};

export default async (ctx: ApiContext): Promise<void> => {
    try {
        const validationResult = XSD.validate(ctx.request.rawBody, XSD.paths.pacs_008);
        if(validationResult !== true) {
            XSD.handleValidationError(validationResult, ctx);
            return;
        }

        processTransferRequest(ctx); // lets process the request asynchronously

        ctx.response.type = 'application/xml';
        ctx.response.body = {}; // TODO: What should be returned here?
        ctx.response.status = 200;
    } catch (e: unknown) {
        handleError(e as Error, ctx);
    }
};
