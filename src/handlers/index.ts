/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/

import { ApiContext, HandlerMap } from '../types';
import { InboundHandlers } from './Inbound';
import { OutboundHandler } from './Outbound';

const healthCheck = async (ctx: ApiContext): Promise<void> => {
    ctx.body = JSON.stringify({ status: 'ok' });
};

const Handlers: HandlerMap = {
    '/health': {
        get: healthCheck,
    },
    '/outbound/iso20022': {
        post: OutboundHandler,
    },
    '/inbound/quoterequests': {
        post: InboundHandlers.postQuotes,
    },
    '/inbound/transfers': {
        post: InboundHandlers.postTransfers,
    },
};

export default Handlers;
