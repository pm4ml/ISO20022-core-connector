import { ApiContext } from '~/types';

export const pain001Handler = async (ctx: ApiContext): Promise<void> => {
    console.log(ctx.request.body);
    ctx.body = JSON.stringify({ status: 'ok' });
};
