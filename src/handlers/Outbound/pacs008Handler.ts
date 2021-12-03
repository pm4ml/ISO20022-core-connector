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
    // XML,
    XSD,
} from '../../lib/xmlUtils';
import {
    // AmountType,
    IPacs008,
    IPacsState,
    // IPostQuotesBody,
    // ITransferError,
    // ITransferState,
    // PartyIdType,
    // PayerType,
    // TransactionType,
    TransferStatus,
} from '../../interfaces';
import {
    acceptQuotes,
    requestQuotes,
} from '../../requests/Outbound';
import {
    pacs008ToPostQuotesBody,
    pacsStateToPacs002Error,
    transferResponseToPacs002,
    // transferErrorResponseToPacs002,
} from '../../transformers';
import { ApiContext } from '../../types';
import { sendPACS002toSenderBackend } from '../../requests/Inbound';


// const handleError = (error: any | Error | ITransferError, ctx: ApiContext) => {
//     ctx.state.logger.error(error);
//     if((error as ITransferError).transferState) {
//         ctx.response.type = 'application/xml';
//         ctx.response.body = transferResponseToPacs002(error as ITransferError);
//         ctx.response.status = 400;
//     } else {
//         // for timeout errors we need to construct the error pacs002 xml response
//         ctx.response.type = 'application/xml';
//         ctx.response.body = transferErrorResponseToPacs002(ctx.request.body as IPacs008);
//         ctx.response.status = 500;
//     }
// };

export const processTransferRequest = async (ctx: ApiContext): Promise<void> => {
    let res: any;

    let pacsState: IPacsState | undefined;

    try {
        const postQuotesBody = pacs008ToPostQuotesBody(ctx.request.body as IPacs008);

        // map to
        pacsState = {};
        pacsState.MsgId = (ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.GrpHdr.MsgId;
        pacsState.OrgnlInstrId = (ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.InstrId;
        pacsState.OrgnlEndToEndId = (ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.EndToEndId;
        pacsState.OrgnlTxId = (ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.TxId;

        ctx.state.logger.push({
            requestQuotesReq: {
                pacsState,
                request: postQuotesBody,
            },
        }).log('requestQuotes request');

        res = await requestQuotes(postQuotesBody);

        ctx.state.logger.push({
            requestQuotesRes: {
                pacsState,
                response: res.data,
            },
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
            acceptQuotesReq: {
                pacsState,
                transferId: res?.data?.transferId,
                request: acceptQuoteRequest,
            },
        }).log('acceptQuotes request');

        res = await acceptQuotes(res.data.transferId as string, acceptQuoteRequest);
        console.log(res);

        ctx.state.logger.push({
            acceptQuotesRes: {
                pacsState,
                transferId: res?.data?.transferId,
                response: res.data,
            },
        }).log('acceptQuotes response');

        if(res.data.transferState
            && (res.data.transferState.currentState === TransferStatus.ERROR_OCCURRED
                || res.data.transferState.currentState !== TransferStatus.COMPLETED)) {
            throw new Error(`acceptQuotes response transferState.currentState=${res.data?.transferState?.currentState} is invalid`);
        }

        // Transform ML Connector response into ISO 2022
        const request = transferResponseToPacs002(res.data);

        ctx.state.logger.push({
            sendPACS002toSenderBackendReq: {
                pacsState,
                request,
            },
        }).log('sendPACS002toSenderBackend request');
        // Send ISO 2022 callback response message to Sender
        res = await sendPACS002toSenderBackend(request);

        ctx.state.logger.push({
            sendPACS002toSenderBackendRes: {
                pacsState,
                response: res.data,
            },
        }).log('sendPACS002toSenderBackend response');
    } catch (error) {
        ctx.state.logger.error(error);

        if(pacsState === undefined) {
            throw error;
        }
        const requestError = pacsStateToPacs002Error(pacsState);

        ctx.state.logger.push({
            sendPACS002toSenderBackendErrorReq: {
                pacsState,
                requestError,
            },
        }).log('sendPACS002toSenderBackend request');

        res = await sendPACS002toSenderBackend(requestError);

        ctx.state.logger.push({
            sendPACS002toSenderBackendErrorRes: {
                pacsState,
                response: res.data,
            },
        }).log('sendPACS002toSenderBackend errorResponse');

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
        ctx.response.body = ''; // TODO: What should be returned here?
        ctx.response.status = 200;
    } catch (e: unknown) {
        ctx.response.type = 'application/xml';
        ctx.response.body = ''; // TODO: What should be returned here?
        ctx.response.status = 500;
    }
};
