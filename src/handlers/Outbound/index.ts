import { ApiContext } from '~/types';
import { pain001Handler } from '../Outbound/pain001';

export const OutboundHandler = async (ctx: ApiContext): Promise<void> => {
    // TODO: Choose handler based on document content
    pain001Handler(ctx);
};
