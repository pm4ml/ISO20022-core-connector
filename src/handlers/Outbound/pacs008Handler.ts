/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 *                                                                        *
 *  CONTRIBUTORS:                                                         *
 *       miguel de Barros - miguel.de.barros@modusbox.com                 *
 **************************************************************************/

import {
    XSD,
} from '../../lib/xmlUtils';
import {
    IPacs008,
    IPacsState,
    ITransferError,
    TransferStatus,
} from '../../interfaces';
import {
    RequesterOptions,
    OutboundRequester,
    InboundRequester,
} from '../../requests';
import {
    pacs008ToPostQuotesBody,
    pacsStateToPacs002Error,
    transferResponseToPacs002,
} from '../../transformers';
import { ApiContext } from '../../types';
import { BaseError, SystemError } from '../../errors';

// TODO: uncomment this once we have a IPacs002Error definition
const handleError = (error: any | Error | ITransferError, ctx: ApiContext) => {
    ctx.state.logger.error(error);
    if((error as ITransferError).transferState) {
        ctx.response.type = 'application/xml';
        ctx.response.body = transferResponseToPacs002(error as ITransferError);
        ctx.response.status = 400;
    } else {
        if(error instanceof BaseError) {
            throw error;
        }
        throw new SystemError({ msg: 'error handling pacs008 outbound message', error: error as unknown as Error });
    }
};

export const processTransferRequest = async (ctx: ApiContext): Promise<void> => {
    let res: any;

    let pacsState: IPacsState | undefined;

    const inboundRequesterOps: RequesterOptions = {
        baseURL: ctx.state.conf.backendEndpoint,
        timeout: ctx.state.conf.requestTimeout,
        logger: ctx.state.logger,
    };
    const inboundRequester = new InboundRequester(inboundRequesterOps);

    const outboundRequesterOps: RequesterOptions = {
        baseURL: ctx.state.conf.outboundEndpoint,
        timeout: ctx.state.conf.requestTimeout,
        logger: ctx.state.logger,
    };

    const outboundRequester = new OutboundRequester(outboundRequesterOps);

    try {
        const postQuotesBody = pacs008ToPostQuotesBody(ctx.request.body as IPacs008, ctx.state?.conf?.dfspIdMap);

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

        res = await outboundRequester.requestQuotes(postQuotesBody);

        ctx.state.logger.push({
            requestQuotesRes: {
                baseURL: res?.config?.baseURL,
                url: res?.config?.url,
                pacsState,
                response: res.data,
            },
        }).log('requestQuotes response');

        if(res.data.transferState
            && (res.data.transferState.currentState === TransferStatus.ERROR_OCCURRED
                || res.data.transferState.currentState !== TransferStatus.WAITING_FOR_QUOTE_ACCEPTANCE)) {
            throw new SystemError({ msg: `requestQuotes response transferState.currentState=${res.data?.transferState?.currentState} is invalid` });
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

        res = await outboundRequester.acceptQuotes(res.data.transferId as string, acceptQuoteRequest);

        ctx.state.logger.push({
            acceptQuotesRes: {
                baseURL: res?.config?.baseURL,
                url: res?.config?.url,
                pacsState,
                transferId: res?.data?.transferId,
                response: res.data,
            },
        }).log('acceptQuotes response');

        if(res.data.transferState
            && (res.data.transferState.currentState === TransferStatus.ERROR_OCCURRED
                || res.data.transferState.currentState !== TransferStatus.COMPLETED)) {
            throw new SystemError({ msg: `acceptQuotes response transferState.currentState=${res.data?.transferState?.currentState} is invalid` });
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
        res = await inboundRequester.sendPACS002toSenderBackend(request);

        ctx.state.logger.push({
            sendPACS002toSenderBackendRes: {
                baseURL: res?.config?.baseURL,
                url: res?.config?.url,
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

        res = await inboundRequester.sendPACS002toSenderBackend(requestError);

        ctx.state.logger.push({
            sendPACS002toSenderBackendErrorRes: {
                baseURL: res?.config?.baseURL,
                url: res?.config?.url,
                pacsState,
                response: res.data,
            },
        }).log('sendPACS002toSenderBackend errorResponse');

        handleError(error, ctx);
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
