/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/

import { Next } from 'koa';
import getRawBody from 'raw-body';
import { parse as parseXml } from 'fast-xml-parser';
import { ApiContext } from '../types';


export interface IOptions {
    key?: string,
    encoding?: string,
    xmlOptions?: any,
    length?: number,
    onerror(err: Error, ctx: ApiContext): void,

}

const xml2Json = (xml: string, xmlOptions: any) => parseXml(xml, xmlOptions);

const parse = (request: any, options: IOptions) => {
    const opt = {
        limit: '1mb', encoding: 'utf8', xmlOptions: {}, ...options,
    };
    const len = request.headers['content-length'];
    if(len) opt.length = len;
    return getRawBody(request, opt).then((str: string) => {
        const jsonData = xml2Json(str, opt.xmlOptions);
        const rawBody = str;
        return {
            jsonData,
            rawBody,
        };
    }).catch((e: any) => {
        const err = typeof e === 'string' ? new Error(e) : e;
        err.status = 400;
        err.body = e.message;
        throw err;
    });
};

export const bodyParser = (options: IOptions): any => (ctx: ApiContext, next: Next) => {
    /**
     * only parse and set ctx.request[bodyKey] when
     * 1. type is xml (text/xml and application/xml)
     * 2. method is post/put/patch
     * 3. ctx.request[bodyKey] is undefined
     */
    const opt = { key: 'body', ...options };

    if((ctx.request as any)[opt.key] === undefined
        && ctx.is('text/xml', 'xml')
        && /^(POST|PUT|PATCH)$/i.test(ctx.method)
    ) {
        if(!opt.encoding && ctx.request.charset) {
            opt.encoding = ctx.request.charset;
        }
        return parse(ctx.req, opt).then(result => {
            (ctx.request as any)[opt.key] = result.jsonData;
            ctx.request.rawBody = result.rawBody;
            return next();
        }).catch(err => {
            if(opt.onerror) {
                opt.onerror(err, ctx);
            } else {
                throw err;
            }
        });
    }
    return next();
};
