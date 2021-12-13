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
    IErrorInformation,
    IPacs002,
    IPacsState,
} from '../../interfaces';
import { ApiContext } from '../../types';
import { channelName, ChannelTypeEnum } from '../../lib/callbackHandler';
import { SystemError } from '../../errors';

const handleError = (error: Error | IErrorInformation, ctx: ApiContext) => {
    ctx.state.logger.error(error);
    // TODO: uncomment this once we have a IPacs002Error definition
    // if((error as IErrorInformation).errorCode) {
    //     const originalMsgId = (ctx.request.body as ICamt003).Document.GetAcct.MsgHdr.MsgId;
    //     const { body, status } = fspiopErrorToCamt004Error(error as IErrorInformation, originalMsgId);
    //     ctx.response.type = 'application/xml';
    //     ctx.response.body = body;
    //     ctx.response.status = status;
    // } else {
    throw new SystemError({ msg: 'error handling pacs002 outbound message', error: error as unknown as Error });
    // }
};

export default async (ctx: ApiContext): Promise<void> => {
    try {
        // Convert the pacs002 to mojaloop PUT /transfers/{transferId} body object and send it back to mojaloop connector
        const pacs002RequestBody: IPacs002 = ctx.request.body as unknown as IPacs002;

        // map to
        const pacsState: IPacsState | undefined = {};
        pacsState.MsgId = (pacs002RequestBody as IPacs002)?.Document?.FIToFIPmtStsRpt?.GrpHdr?.MsgId;
        pacsState.OrgnlInstrId = (pacs002RequestBody as IPacs002)?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlInstrId;
        pacsState.OrgnlEndToEndId = (pacs002RequestBody as IPacs002)?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlEndToEndId;
        pacsState.OrgnlTxId = (pacs002RequestBody as IPacs002)?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlTxId;

        // const transferPutBody = pacs002ToPutTransfersBody(pacs002RequestBody as unknown as IPacs002);

        // publish message to pub-sub cache
        const key = channelName({
            type: ChannelTypeEnum.POST_TRANSFERS_INBOUND,
            id: pacsState.OrgnlEndToEndId!,
        });

        ctx.state.logger.push({
            publishRequest: {
                pacsState,
                channelName: key,
                request: pacs002RequestBody,
            },
        }).log('publish pacs002 request');

        const res = await ctx.state.cache.publish(key, {
            type: ChannelTypeEnum.POST_TRANSFERS_INBOUND,
            data: pacs002RequestBody,
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
    } catch (err: unknown) {
        handleError(err as Error, ctx);
    }
};
