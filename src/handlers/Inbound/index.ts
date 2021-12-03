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
    IPacs008,
    IPacsState,
    IPostQuoteRequestBody,
    IPostQuoteResponseBody,
    IPostTransferRequestBody,
    // IPacs002,
} from '~/interfaces';
import { ApiContext, ApiState } from '../../types';
import {
    postTransferBodyToPacs008,
    // pacs002ToPutTransfersBody,
    // PNDGWithFailedStatusToTransferError,
} from '../../transformers';
import { sendPACS008toReceiverBackend } from '../../requests/Inbound';
import {
    XML,
    // XML,
    XSD,
} from '../../lib/xmlUtils';
import { ChannelTypeEnum, registerCallbackHandler } from '../../lib/callbackHandler';

const handleError = (err: Error, ctx: ApiContext) => {
    ctx.state.logger.error(err);
    ctx.response.status = 500;
    ctx.response.body = '';
    ctx.response.type = 'text/html';
};

const postQuotes = async (ctx: ApiContext): Promise<void> => {
    ctx.state.logger.info(JSON.stringify({
        postQuotes: {
            request: ctx.request,
        },
    }, null, 4));
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
    } catch (err: unknown) {
        handleError(err as Error, ctx);
    }
    ctx.state.logger.info(JSON.stringify({
        postQuotes: {
            response: ctx.response,
        },
    }, null, 4));
};

/**
 * Handled the incoming POST /transfers from mojaloop-connector
 * Converts the transfer payload from mojaloop to pacs008 and sends it to external ISO switch
 * Receives the synchronous response in pacs002 from the ISO compliant switch, converts it into mojaloop format
 * Sends synchronous response to mojaloop-connector
 *
 */

const postTransfers = async (ctx: ApiContext): Promise<void> => {
    // TODO: wrap this with a promise
    // TODO: re-do loggers here!
    ctx.state.logger.info(JSON.stringify({
        postTransfers: {
            request: ctx.request,
        },
    }, null, 4));
    const payload = ctx.request.body as unknown as IPostTransferRequestBody;
    // ctx.state.logger.log(JSON.stringify(ctx.request.body));

    let pacsState: IPacsState | undefined;

    try {
        const postTransfersBodyPacs008 = postTransferBodyToPacs008(payload);
        const pacs008 = XML.fromXml(postTransfersBodyPacs008) as IPacs008;

        // map to
        pacsState = {};
        pacsState.MsgId = (pacs008 as IPacs008).Document.FIToFICstmrCdtTrf.GrpHdr.MsgId;
        pacsState.OrgnlInstrId = (pacs008 as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.InstrId;
        pacsState.OrgnlEndToEndId = (pacs008 as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.EndToEndId;
        pacsState.OrgnlTxId = (pacs008 as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.TxId;

        // define callbackHandler
        const callbackHandler = async (id: any, subId: any, msg: any, state: ApiState): Promise<any> => {
            state.logger.push({
                id,
                subId,
                msg,
                // state,
            }).log('test');
            return Promise.resolve('test');
            // TODO: handle ctx.response and resolve promise!
            // TODO: introduce the timeout portion from the registerCallbackHandler so we can reject it here!
        };

        // setup handlers for callback
        await registerCallbackHandler(
            ChannelTypeEnum.PACS02RESPONSETOPACS008,
            pacsState.OrgnlEndToEndId,
            payload,
            ctx.state,
            callbackHandler,
        );

        // send a pacs008 POST /transfers request to RSwitch and get a synchronous pacs002 response
        const res = await sendPACS008toReceiverBackend(postTransfersBodyPacs008);
        const validationResult = XSD.validate(res.data, XSD.paths.pacs_002);
        if(validationResult !== true) {
            XSD.handleValidationError(validationResult, ctx);
            return;
        }

        // const xmlData = XML.fromXml(res.data);
        // Convert the pacs002 to mojaloop PUT /transfers/{transferId} body object and send it back to mojaloop connector


        if(res?.data?.Document?.CstmrPmtStsRpt?.OrgnlPmtInfAndSts?.TxInfAndSts?.TxSts === 'PDNG') {
            // const transferPutBody = pacs002ToPutTransfersBody(xmlData as unknown as IPacs002);
            // ctx.response.body = transferPutBody; // TODO: how do we respond here?
            ctx.response.body = {
                homeTransactionId: res?.data?.Document?.CstmrPmtStsRpt?.OrgnlPmtInfAndSts?.OrgnlPmtInfId, // TODO: what should this be?
            };
            ctx.response.status = 200;
        } else {
            // const transferErrorPutBody = PNDGWithFailedStatusToTransferError(xmlData as unknown as IPacs002);
            ctx.response.body = {
                statusCode: '200', // what goes here?
                message: res?.data?.Document?.CstmrPmtStsRpt?.OrgnlPmtInfAndSts?.TxInfAndSts?.TxSts, // what goes here?
            }; // TODO: confirm the error message
            ctx.response.status = 500; // TODO: Confirm this error code
        }

        ctx.response.type = 'application/json';
    } catch (err: unknown) {
        handleError(err as Error, ctx);
    }

    ctx.state.logger.info(JSON.stringify({
        postTransfers: {
            response: ctx.response,
        },
    }, null, 4));
};

export const InboundHandlers = {
    postQuotes,
    postTransfers,
};
