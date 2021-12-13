/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 *                                                                        *
 *  CONTRIBUTORS:                                                         *
 *       miguel de Barros - miguel.de.barros@modusbox.com                 *
 **************************************************************************/

import * as util from 'util';

export class HTTPResponseError extends Error {
    params: any;

    constructor(params: { msg: string; [key: string]: any }) {
        super(params.msg);
        this.params = params;
    }

    getData(): any {
        return this.params;
    }

    toString(): string {
        return util.inspect(this.params);
    }

    toJSON(): string {
        return JSON.stringify(this.params);
    }
}

export * from './baseRequester';
export { default as OutboundRequester } from './Outbound';
export { default as InboundRequester } from './Inbound';
