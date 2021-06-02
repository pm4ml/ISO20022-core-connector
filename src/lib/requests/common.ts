/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2019 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       James Bush - james.bush@modusbox.com                             *
 **************************************************************************/

import * as util from 'util';
import { RequestResponse } from '@mojaloop/sdk-standard-components';

/**
 * An HTTPResponseError class
 */
class HTTPResponseError extends Error {
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

// Strip all beginning and end forward-slashes from each of the arguments, then join all the
// stripped strings with a forward-slash between them. If the last string ended with a
// forward-slash, append that to the result.
const buildUrl = (...args: Array<any>): string => (
    args
        .filter(e => e !== undefined)
        .map(s => s.replace(/(^\/*|\/*$)/g, '')) /* This comment works around a problem with editor syntax highglighting */
        .join('/') + (args[args.length - 1].slice(-1) === '/' ? '/' : '')
);

const throwOrJson = (res: RequestResponse): any => {
    // TODO: will a 503 or 500 with content-length zero generate an error?
    // or a 404 for that matter?!

    if(
        res.headers
        && (res.headers['content-length'] === '0' || res.statusCode === 204)
    ) {
        // success but no content, return null
        return null;
    }
    if(res.statusCode < 200 || res.statusCode >= 300) {
        // not a successful request
        throw new HTTPResponseError({
            msg: `Request returned non-success status code ${res.statusCode}`,
            res,
        });
    }

    return res.data;
};

export { HTTPResponseError, buildUrl, throwOrJson };
