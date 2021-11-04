/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/

import { AxiosResponse } from 'axios';
import { XSD } from '../../lib/xmlUtils';
import { ICamt003, IErrorInformation } from '../../interfaces';
// import { getParties } from '../../requests/Outbound';
import { camt003ToGetPartiesParams, fspiopErrorToCamt004Error, partiesByIdResponseToCamt004 } from '../../transformers';
import { ApiContext } from '../../types';


const handleError = (error: Error | IErrorInformation, ctx: ApiContext) => {
    ctx.state.logger.error(error);
    if((error as IErrorInformation).errorCode) {
        const originalMsgId = (ctx.request.body as ICamt003).Document.GetAcct.MsgHdr.MsgId;
        const { body, status } = fspiopErrorToCamt004Error(error as IErrorInformation, originalMsgId);
        ctx.response.type = 'application/xml';
        ctx.response.body = body;
        ctx.response.status = status;
    } else {
        ctx.response.body = '';
        ctx.response.type = 'text/html';
        ctx.response.status = 500;
    }
};

export default async (ctx: ApiContext): Promise<void> => {
    try {
        const validationResult = XSD.validate(ctx.request.rawBody, XSD.paths.camt_003);
        if(validationResult !== true) {
            XSD.handleValidationError(validationResult, ctx);
            return;
        }
        const params = camt003ToGetPartiesParams(ctx.request.body as ICamt003);
        // TODO: Remove this hack
        // hack to make parties lookup work for phase-A, this needs to be handled by the ALS
        // For now we will respond with a dummy response for parties lookup
        // const res = await getParties(params);
        console.log(params);
        const res:AxiosResponse = {
            data: {
                body: {
                    party: {
                        partyIdInfo: {
                            partyIdType: params.idType,
                            partyIdentifier: params.idValue,
                            fspId: 'cogebanquesbx',
                            extensionList: [{
                                key: 'MSISDN',
                                value: '0789493999',
                            }],
                        },
                        name: 'PayerFirst PayerLast',
                    },
                    currentState: 'COMPLETED',
                },
            },
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        };

        ctx.state.logger.debug(JSON.stringify(res.data));

        if(res.data.body.errorInformation) {
            handleError(res.data.body.errorInformation, ctx);
            return;
        }

        ctx.state.logger.log(res.data);
        ctx.response.type = 'application/xml';
        ctx.response.body = partiesByIdResponseToCamt004(res.data);
        ctx.response.status = 200;
    } catch (e) {
        handleError(e, ctx);
    }
};
