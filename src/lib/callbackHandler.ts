import util from 'util';
import { ApiState } from '~/types';

export interface ChannelOptions {
    type: string,
    id: string,
}

/**
 * @name channelName
 * @description generates the pub/sub channel name
 * @param {object} - args
 *   @param {string} args.type     - the party type
 *   @param {string} args.id       - the party id
 *   @param {string} [args.subId]  - the optional party subId
 * @returns {string} - the pub/sub channel name
 */
export const channelName = (ops: ChannelOptions): string => {
    const { type, id } = ops;
    const tokens = [type, id];
    return tokens.map(x => `${x}`).join('-');
};

// eslint-disable-next-line max-len, no-async-promise-executor
export const registerCallbackHandler = async (type: any, id: any, data: any, state: ApiState, handler: (id: any, subId: any, msg: any, state: ApiState) => Promise<any>): Promise<any | Error> => new Promise(async (resolve, reject) => {
    // listen for resolution events on the payee idType and idValue
    const transferKey = channelName({
        type,
        id,
    });

    state.logger.push({
        transferKey,
        data,
        state,
    }).log('resolveTransfer');

    // hook up a subscriber to handle response messages
    // eslint-disable-next-line @typescript-eslint/no-shadow, consistent-return
    const subId = await state.cache.subscribe(transferKey, async (cn: any, msg: any, subId: any) => {
        state.logger.push({
            transferKey,
            cn,
            msg,
            subId,
        }).log('subscribe::start');

        try {
            const parsedMsg = JSON.parse(msg);
            const result = await handler(transferKey, subId, parsedMsg, state);
            state.logger.push({
                transferKey,
                cn,
                subId,
                result,
            }).log('subscribe::success');
        } catch (err: unknown) {
            state.cache.unsubscribe(transferKey, subId).catch((e: Error) => {
                state.logger.push({
                    transferKey,
                    cn,
                    subId,
                    e,
                }).log(`Error unsubscribing (in subscribe error handler) ${transferKey} ${subId}: ${e.stack || util.inspect(e)}`);
                // state.logger.log(`Error unsubscribing (in subscribe error handler) ${transferKey} ${subId}: ${e.stack || util.inspect(e)}`);
            });
            // reject(err);
        }
    }).bind(this);

    // set up a timeout for the request
    setTimeout(() => {
        const err = new Error(`Timeout requesting transfer ${transferKey}`);

        // we dont really care if the unsubscribe fails but we should log it regardless
        state.cache.unsubscribe(transferKey, subId).catch((e: Error) => {
            // state.logger.log(`Error unsubscribing (in timeout handler) ${transferKey} ${subId}: ${e.stack || util.inspect(e)}`);
            state.logger.push({
                transferKey,
                subId,
                e,
            }).log(`Error unsubscribing (in timeout handler) ${transferKey} ${subId}: ${e.stack || util.inspect(e)}`);
        });
        return reject(err);
    }, state.conf.callbacksTimeout * 1000); // TODO: make this configurable. Default is 30s.
    resolve(true);
});
