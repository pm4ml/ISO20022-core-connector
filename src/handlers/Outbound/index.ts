import { ApiContext, OutboundHandlerMap } from '~/types';
import { pain001Handler } from '../Outbound/pain001';

const xmlnsToHandlersMap: OutboundHandlerMap = {
    'urn:iso:std:iso:20022:tech:xsd:pain.001.001.10': pain001Handler,
};

export const OutboundHandler = async (ctx: ApiContext): Promise<void> => {
    const namespace = ctx.request.body.Document.$.xmlns;
    const handler = (namespace && xmlnsToHandlersMap[namespace]) || undefined;

    if(handler) handler(ctx);
    else ctx.state.logger.error('Couldn\'t find handler for request.');
};
