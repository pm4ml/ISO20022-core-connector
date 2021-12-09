/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/
import util from 'util';
import { Errors } from '@mojaloop/sdk-standard-components';
import {
    IErrorInformation,
    IPacs002,
    IPacs008,
    IPacsState,
    IPostQuoteRequestBody,
    IPostQuoteResponseBody,
    IPostTransferRequestBody,
    IPostTransferResponseBody,
    ITransferFulfilment,
    MojaloopTransferState,
    TxStsEnum,
} from '../../interfaces';
import { ApiContext, ApiState } from '../../types';
import {
    pacs002ToPutTransfersBody,
    postTransferBodyToPacs008,
} from '../../transformers';
import { InboundRequester, RequesterOptions } from '../../requests';
import {
    XML,
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

// eslint-disable-next-line no-async-promise-executor
const postTransfers = async (ctx: ApiContext): Promise<void> => new Promise(async (
    resolve,
    // reject,
) => {
    ctx.state.logger.push({
        postTransfersRequest: {
            header: ctx?.request?.header,
            request: ctx?.request?.body,
        },
    }).log();
    const payload = ctx.request.body as unknown as IPostTransferRequestBody;

    const inboundRequesterOps: RequesterOptions = {
        baseURL: ctx.state.conf.backendEndpoint,
        timeout: ctx.state.conf.requestTimeout,
        logger: ctx.state.logger,
    };
    const inboundRequester = new InboundRequester(inboundRequesterOps);

    // let res: any;
    let pacsRes: IPacs002;
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
                callbackHandlerRequest: {
                    id,
                    subId,
                    msg,
                    // state,
                },
            }).log('callbackHandlerRequest processing');

            const pacs002Msg = msg?.data as unknown as IPacs002;
            const transferResponse = pacs002ToPutTransfersBody(pacs002Msg as unknown as IPacs002) as ITransferFulfilment | IErrorInformation;
            if((transferResponse as ITransferFulfilment)?.transferState === MojaloopTransferState.COMMITTED) {
                ctx.response.body = {
                    homeTransactionId: pacs002Msg?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlEndToEndId,
                } as IPostTransferResponseBody;
            } else {
                ctx.response.body = {
                    statusCode: (transferResponse as IErrorInformation)?.errorCode || Errors.MojaloopApiErrorCodes.PAYEE_FSP_REJECTED_TXN.code, // what goes here?
                    message: `Transfer request was not accepted with OrgnlEndToEndId: ${pacs002Msg?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlEndToEndId}, status: ${pacs002Msg?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.TxSts}`, // what goes here?
                } as IPostTransferResponseBody;
                ctx.response.status = 500;
            }

            ctx.state.logger.push({
                postTransfersResponse: {
                    id: pacsState?.OrgnlEndToEndId,
                    subscribeMeta: pacsState?.subscribeMeta,
                    header: ctx?.request?.header,
                    response: ctx?.response?.body,
                },
            }).log('postTransfersResponse callbackHandler');

            resolve();
        };

        // set up a timeout for the request
        const timeoutHandler = () => {
            ctx.response.body = {
                statusCode: Errors.MojaloopApiErrorCodes.SERVER_TIMED_OUT.code, // what goes here?
                // message: res?.data?.Document?.CstmrPmtStsRpt?.OrgnlPmtInfAndSts?.TxInfAndSts?.TxSts, // what goes here?
                message: `Transfer request timed-out with OrgnlEndToEndId: ${pacsRes?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlEndToEndId}, status: ${pacsRes?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.TxSts}`, // what goes here?
            }; // TODO: confirm the error message
            ctx.response.status = 500; // TODO: Confirm this error code

            ctx.state.logger.push({
                postTransfersResponse: {
                    id: pacsState?.OrgnlEndToEndId,
                    subscribeMeta: pacsState?.subscribeMeta,
                    header: ctx?.request?.header,
                    response: ctx?.response?.body,
                },
            }).log('postTransfersResponse timeout');

            return resolve();
        };

        // setup handlers for callback
        pacsState.subscribeMeta = await registerCallbackHandler(
            ChannelTypeEnum.POST_TRANSFERS_INBOUND,
            pacsState.OrgnlEndToEndId,
            payload,
            ctx.state,
            callbackHandler.bind(this),
            timeoutHandler.bind(this),
        );

        ctx.state.logger.push({
            sendPACS008toReceiverBackendRequest: {
                id: pacsState?.OrgnlEndToEndId,
                subscribeMeta: pacsState?.subscribeMeta,
                request: postTransfersBodyPacs008,
            },
        }).log('sendPACS008toReceiverBackend request');

        // send a pacs008 POST /transfers request to RSwitch and get a synchronous pacs002 response
        const res = await inboundRequester.sendPACS008toReceiverBackend(postTransfersBodyPacs008);

        ctx.state.logger.push({
            sendPACS008toReceiverBackendResponse: {
                id: pacsState?.OrgnlEndToEndId,
                subscribeMeta: pacsState?.subscribeMeta,
                baseURL: res?.config?.baseURL,
                url: res?.config?.url,
                header: res.headers,
                response: res.data,
            },
        }).log('sendPACS008toReceiverBackend request');

        let tempPacsRes = XML.fromXml(res.data) as any;
        if((tempPacsRes as any)?.BusinessMessage?.Document) { // lets strip the BusinessMessage
            tempPacsRes = {
                Document: (tempPacsRes as any)?.BusinessMessage?.Document,
            };
            res.data = XML.fromJsObject(tempPacsRes as Record<string, unknown>);
        }

        const validationResult = XSD.validate(res.data, XSD.paths.pacs_002);
        if(validationResult !== true) {
            XSD.handleValidationError(validationResult, ctx);
            return;
        }

        pacsRes = tempPacsRes as IPacs002;
        // Convert the pacs002 to mojaloop PUT /transfers/{transferId} body object and send it back to mojaloop connector
        if(pacsRes?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.TxSts !== TxStsEnum.PDNG) { // handle error since the receiver did NOT accept the transfer request
            // we dont really care if the unsubscribe fails but we should log it regardless
            ctx.state.cache.unsubscribe(pacsState.OrgnlEndToEndId, pacsState.subscribeMeta?.subId).catch((e: Error) => {
                // state.logger.log(`Error unsubscribing (in timeout handler) ${transferKey} ${subId}: ${e.stack || util.inspect(e)}`);
                ctx.state.logger.push({
                    key: pacsState?.OrgnlEndToEndId,
                    subscribeMeta: pacsState?.subscribeMeta,
                    e,
                }).log(`Error unsubscribing (in timeout handler) ${pacsState?.OrgnlEndToEndId} ${pacsState?.subscribeMeta?.subId}: ${e.stack || util.inspect(e)}`);
            });

            ctx.response.body = {
                statusCode: Errors.MojaloopApiErrorCodes.PAYEE_FSP_REJECTED_TXN.code, // what goes here?
                message: `Transfer request was not accepted with OrgnlEndToEndId: ${pacsState?.OrgnlEndToEndId}, status: ${res?.data?.Document?.CstmrPmtStsRpt?.OrgnlPmtInfAndSts?.TxInfAndSts?.TxSts}`, // what goes here?
            }; // TODO: confirm the error message
            ctx.response.status = 500; // TODO: Confirm this error code

            ctx.state.logger.push({
                postTransfersResponse: {
                    id: pacsState?.OrgnlEndToEndId,
                    subscribeMeta: pacsState?.subscribeMeta,
                    header: ctx?.request?.header,
                    response: ctx?.response?.body,
                },
            }).log('postTransfersResponse reject');

            resolve();
        }

        ctx.response.type = 'application/json';
    } catch (err: unknown) {
        handleError(err as Error, ctx);
    }
});

export const InboundHandlers = {
    postQuotes,
    postTransfers,
};
