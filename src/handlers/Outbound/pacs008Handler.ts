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
    IPacs008, ITransferError, TransferStatus,
} from '../../interfaces';
import { acceptQuotes, requestQuotes } from '../../requests/Outbound';
import { pacs008ToPostQuotesBody, transferResponseToPacs002 } from '../../transformers';
import { ApiContext } from '../../types';


const handleError = (error: Error | ITransferError, ctx: ApiContext) => {
    ctx.state.logger.error(error);
    if((error as ITransferError).transferState) {
        ctx.response.type = 'application/xml';
        ctx.response.body = transferResponseToPacs002(error as ITransferError);
        ctx.response.status = 400;
    } else {
        ctx.response.type = 'text/html';
        ctx.response.body = null;
        ctx.response.status = 500;
    }
};

export default async (ctx: ApiContext): Promise<void> => {
    try {
        if(XSD.validateRequest(ctx, XSD.paths.pacs_008) !== true) return;

        // convert pacs.008 to POST /transfers (quoting)
        const postQuotesBody = pacs008ToPostQuotesBody(ctx.request.body as IPacs008);
        let res = await requestQuotes(postQuotesBody);
        ctx.state.logger.log(JSON.stringify(res.data));
        if(res.data.transferState
            && (res.data.transferState.currentState === TransferStatus.ERROR_OCCURRED
                || res.data.transferState.currentState !== TransferStatus.WAITING_FOR_QUOTE_ACCEPTANCE)) {
            handleError(res.data, ctx);
            return;
        }

        // convert POST /transfers response to PUT /tranfers/{transferId} (quote acceptance) request
        // if no error is received, we send PUT /transfers/{transferId} to accept quote and execute transfer
        res = await acceptQuotes(res.data.transferId, { acceptQuote: true });
        if(res.data.transferState
            && (res.data.transferState.currentState === TransferStatus.ERROR_OCCURRED
                || res.data.transferState.currentState !== TransferStatus.COMPLETED)) {
            handleError(res.data, ctx);
            return;
        }

        // Transfer completed successfully.
        // convert response to pacs.002 and respond
        ctx.response.type = 'application/xml';
        ctx.response.body = transferResponseToPacs002(res.data);
        ctx.response.status = 200;
    } catch (e) {
        handleError(e, ctx);
    }
};
