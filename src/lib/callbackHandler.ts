import util from 'util';
import { ApiState } from '~/types';

export enum ChannelTypeEnum {
    PACS02RESPONSETOPACS008 = 'PACS02ResponseToPACS008',
}

export interface ChannelOptions {
    type: ChannelTypeEnum,
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
export const registerCallbackHandler = async (type: ChannelTypeEnum, id: any, data: any, state: ApiState, handler: (id: any, subId: any, msg: any, state: ApiState) => Promise<any>): Promise<any | Error> => new Promise(async (resolve, reject) => {
    // listen for resolution events on the payee idType and idValue
    const key = channelName({
        type,
        id,
    });

    state.logger.push({
        key,
        data,
        state,
    }).log('resolveTransfer');

    // hook up a subscriber to handle response messages
    // eslint-disable-next-line @typescript-eslint/no-shadow, consistent-return
    const subId = await state.cache.subscribe(key, async (cn: any, msg: any, subId: any) => {
        state.logger.push({
            key,
            cn,
            msg,
            subId,
        }).log('subscribe::start');

        try {
            const parsedMsg = JSON.parse(msg);
            const result = await handler(key, subId, parsedMsg, state);
            state.logger.push({
                key,
                cn,
                subId,
                result,
            }).log('subscribe::success');
        } catch (err: unknown) {
            state.cache.unsubscribe(key, subId).catch((e: Error) => {
                state.logger.push({
                    key,
                    cn,
                    subId,
                    e,
                }).log(`Error unsubscribing (in subscribe error handler) ${key} ${subId}: ${e.stack || util.inspect(e)}`);
                // state.logger.log(`Error unsubscribing (in subscribe error handler) ${transferKey} ${subId}: ${e.stack || util.inspect(e)}`);
            });
            // reject(err);
        }
    }).bind(this);

    // set up a timeout for the request
    setTimeout(() => {
        const err = new Error(`Timeout requesting transfer ${key}`);

        // we dont really care if the unsubscribe fails but we should log it regardless
        state.cache.unsubscribe(key, subId).catch((e: Error) => {
            // state.logger.log(`Error unsubscribing (in timeout handler) ${transferKey} ${subId}: ${e.stack || util.inspect(e)}`);
            state.logger.push({
                key,
                subId,
                e,
            }).log(`Error unsubscribing (in timeout handler) ${key} ${subId}: ${e.stack || util.inspect(e)}`);
        });
        return reject(err);
    }, state.conf.callbacksTimeout * 1000); // TODO: make this configurable. Default is 30s.
    resolve(true);
});
