/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/

// import { XSD } from '../../lib/xmlUtils';
// import { Config } from '../../config';
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
        ctx.response.body = null;
        ctx.response.status = 400;
    } else {
        ctx.response.body = '';
        ctx.response.type = 'text/html';
        ctx.response.status = 500;
    }
};

export default async (ctx: ApiContext): Promise<void> => {
    try {
        // TODO: Run pacs.008 XSD validation or apply at OpenAPI validation level
        // const validationResult = XSD.validate(ctx.request.rawBody, `${Config.templatesPath}/xsd/pacs.008.001.10.xsd`);
        // if(validationResult !== true) {
        //     handleError(new Error('Schema valdiation error'), ctx);
        //     ctx.state.logger.error(validationResult);
        //     return;
        // }

        // convert pacs.008 to POST /transfers quotes stage and send
        const postQuotesBody = pacs008ToPostQuotesBody(ctx.request.body as IPacs008);
        let res = await requestQuotes(postQuotesBody);
        ctx.state.logger.log(JSON.stringify(res.data));
        if(res.data.currentState === TransferStatus.ERROR_OCCURRED) {
            handleError(res.data, ctx);
            return;
        }

        // convert POST /transfers response to PUT /tranfers/transferId (quote acceptance) request and send
        // if no error is received, we send PUT /transfers/transferId to accept quote and execute transfer
        res = await acceptQuotes(res.data.transferId, { acceptQuote: true });
        if(res.data.currentState === TransferStatus.ERROR_OCCURRED
            || res.data.currentState !== TransferStatus.COMPLETED) {
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
