/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *      Miguel de Barros - miguel.debarros@modusbox.com                   *
 **************************************************************************/

import {
    // XML,
    XSD,
} from '../../lib/xmlUtils';
import {
    // IPacs002,
    // ITransferError,
    // TransferStatus,
    // ITransfersByIdParams,
    IErrorInformation,
    // IExtensionItem,
    IPacs002,
    IPacsState,
    // IPain002Response,
} from '../../interfaces';
// import {
//     acceptBackendTransfers,
//     // sendTransfersError,
// } from '../../requests/Inbound';
import {
    // pacs008ToPostQuotesBody,
    // transferErrorResponseToPacs002,
    pacs002ToPutTransfersBody,
    // PNDGWithFailedStatusToTransferError,
} from '../../transformers';
import { ApiContext } from '../../types';
import { channelName, ChannelTypeEnum } from '../../lib/callbackHandler';

const handleError = (error: Error | IErrorInformation, ctx: ApiContext) => {
    ctx.state.logger.error(error);
    ctx.response.type = 'application/xml';
    ctx.response.body = '';
    ctx.response.status = 500;
};

export default async (ctx: ApiContext): Promise<void> => {
    try {
        const validationResult = XSD.validate(ctx.request.rawBody, XSD.paths.pacs_002);

        if(validationResult !== true) {
            XSD.handleValidationError(validationResult, ctx);
            return;
        }

        // Convert the pacs002 to mojaloop PUT /transfers/{transferId} body object and send it back to mojaloop connector
        const pacs002RequestBody: IPacs002 = ctx.request.body as unknown as IPacs002;

        // map to
        const pacsState: IPacsState | undefined = {};
        pacsState.MsgId = (pacs002RequestBody as IPacs002)?.Document?.FIToFIPmtStsRpt?.GrpHdr?.MsgId;
        pacsState.OrgnlInstrId = (pacs002RequestBody as IPacs002)?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlInstrId;
        pacsState.OrgnlEndToEndId = (pacs002RequestBody as IPacs002)?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlEndToEndId;
        pacsState.OrgnlTxId = (pacs002RequestBody as IPacs002)?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlTxId;

        const transferPutBody = pacs002ToPutTransfersBody(pacs002RequestBody as unknown as IPacs002);

        // publish message to pub-sub cache
        const key = channelName({
            type: ChannelTypeEnum.POST_TRANSFERS_INBOUND,
            id: pacsState.OrgnlEndToEndId!,
        });

        ctx.state.logger.push({
            publishRequest: {
                pacsState,
                channelName: key,
                request: transferPutBody,
            },
        }).log('publish pacs002 request');

        const res = await ctx.state.cache.publish(key, {
            type: ChannelTypeEnum.POST_TRANSFERS_INBOUND,
            data: transferPutBody,
            headers: ctx.request.headers,
        });

        ctx.state.logger.push({
            publishResponse: {
                pacsState,
                channelName: key,
                response: res,
            },
        }).log('publish pacs002 response');

        ctx.response.body = '';
        ctx.response.status = 200;
        ctx.response.type = 'application/xml';
    } catch (e: unknown) {
        handleError(e as Error, ctx);
    }
};
