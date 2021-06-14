/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/

import { ApiContext } from '~/types';
import { postTransfers } from '~/requests/Outbound';
import { pain001ToPostTransfersBody } from '~/transformers';


/**
 * Handles ISO 20022 pain.001 message (POST quotes).
 * Parties resolution is handled separately by the GET parties handler
 * From here we map pain.001 to POST /transfers message and inititate the transfer process. We expect parties to be auto accepted but not quote.
 * Then when ISO POST transfer message comes in (another handler), we send a PUT /transfers/{transferID} request to accept quote and effect the transfer.
 */
export const pain001Handler = async (ctx: ApiContext): Promise<void> => {
    try {
        const postTransfersBody = pain001ToPostTransfersBody(ctx.request.body);
        await postTransfers(postTransfersBody);
        ctx.body = JSON.stringify({ status: 'ok' });
    } catch (e) {
        ctx.state.logger.error(e);
    }
};
