/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/

import * as env from 'env-var';
import * as dotenv from 'dotenv';

dotenv.config();

export interface ServiceConfig {
    port: number,
    outboundEndpoint: string,
    autoAcceptParties: boolean,
    autoAcceptQuotes: boolean,
}

export const Config: ServiceConfig = {
    port: env.get('LISTEN_PORT').default('3000').asPortNumber(),
    outboundEndpoint: env.get('OUTBOUND_ENDPOINT').required().asString(),
    autoAcceptParties: env.get('AUTO_ACCEPT_PARTY').required().asBool(),
    autoAcceptQuotes: env.get('AUTO_ACCEPT_QUOTES').required().asBool(),
};
