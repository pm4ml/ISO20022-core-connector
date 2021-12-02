/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/

import { XML, XSD } from '../../lib/xmlUtils';
import {
    // IPacs002,
    // ITransferError,
    // TransferStatus,
    // ITransfersByIdParams,
    IErrorInformation,
    IPacs002,
    IPain002Response,
} from '../../interfaces';
import {
    acceptBackendTransfers,
    // sendTransfersError,
} from '../../requests/Inbound';
import {
    // pacs008ToPostQuotesBody,
    // transferErrorResponseToPacs002,
    pacs002ToPutTransfersBody,
    // PNDGWithFailedStatusToTransferError,
} from '../../transformers';
import { ApiContext } from '../../types';


const handleError = (error: Error | IErrorInformation, ctx: ApiContext) => {
    ctx.state.logger.error(error);
    // for timeout errors we need to construct the error pacs002 xml response
    ctx.response.type = 'application/xml';
    // ctx.response.body = transferErrorResponseToPacs002(ctx.request.body as IPacs008); // TODO: What happens here?
    ctx.response.status = 500;
};

export default async (ctx: ApiContext): Promise<void> => {
    try {
        const validationResult = XSD.validate(ctx.request.rawBody, XSD.paths.pacs_002);

        if(validationResult !== true) {
            XSD.handleValidationError(validationResult, ctx);
            return;
        }

        const xmlData = XML.fromXml(ctx.request.rawBody);
        // Convert the pacs002 to mojaloop PUT /transfers/{transferId} body object and send it back to mojaloop connector
        const pacs002RequestBody: IPacs002 = xmlData as unknown as IPacs002;
        let response: any;
        if(pacs002RequestBody?.Document?.CstmrPmtStsRpt?.OrgnlPmtInfAndSts?.TxInfAndSts?.TxSts === 'PDNG') { // TODO: CHECK PNDG STATUS FOR SUCCESSS
            const transferPutBody = pacs002ToPutTransfersBody(xmlData as unknown as IPain002Response);
            response = await acceptBackendTransfers('123', transferPutBody); // where do I map the transfer from?
        } else {
            // const transferPutErrorBody = PNDGWithFailedStatusToTransferError(xmlData as unknown as IPacs002);
            // response = await sendTransfersError('123', transferPutErrorBody); // what do we send here?

            // ctx.response.body = response; // TODO: this should be a “PNDG status”???
            response = {}; // TODO: this should be a “PNDG status”???
        }
        ctx.response.body = response;
        ctx.response.status = 200;
        ctx.response.type = 'application/xml';
    } catch (e: unknown) {
        handleError(e as Error, ctx);
    }
};
