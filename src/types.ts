/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       James Bush - james.bush@modusbox.com                             *
 **************************************************************************/

import Koa from 'koa';
import { ServiceConfig } from './config';

export interface ApiState {
    conf: ServiceConfig;
    logger: any;
}

export interface ApiContext extends Koa.Context {
    state: ApiState;
    request: Koa.Request & { id?: string };
}

export interface HandlerMap {
    [key: string]: { [key: string]: (ctx: ApiContext, next?: Koa.Next) => void };
}

export interface OutboundHandlerMap {
    [key: string]: (ctx: ApiContext, next?: Koa.Next) => void
}
