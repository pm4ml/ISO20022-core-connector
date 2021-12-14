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

import * as env from 'env-var';
import * as dotenv from 'dotenv';
import { Logger } from '@mojaloop/sdk-standard-components';

dotenv.config();

export interface IServiceConfig {
    port?: number,
    outboundEndpoint: string,
    backendEndpoint: string,
    requestTimeout?: number,
    logger?: Logger.Logger,
    xmlOptions: IXMLOptions,
    templatesPath: string
    cache: ICacheConfig,
    callbackTimeout: number,
    dfspIdMap?: DfspIdMapType,
    enableDummyALSResponse?: boolean, // TODO: Remove this hack
}

export interface IXMLOptions {
    attributeNamePrefix: string,
    attrNodeName: string,
    textNodeName: string,
    ignoreAttributes: boolean,
    ignoreNameSpace: boolean,
    allowBooleanAttributes: boolean,
    parseNodeValue: boolean,
    parseAttributeValue: boolean,
    trimValues: boolean,
    cdataTagName: string,
    cdataPositionChar: string,
    parseTrueNumberOnly: boolean,
    arrayMode: boolean,
}

const xmlOptions: IXMLOptions = {
    attributeNamePrefix: '',
    attrNodeName: 'attr',
    textNodeName: '#text',
    ignoreAttributes: false,
    ignoreNameSpace: false,
    allowBooleanAttributes: false,
    parseNodeValue: false,
    parseAttributeValue: false,
    trimValues: true,
    cdataTagName: '__cdata',
    cdataPositionChar: '\\c',
    parseTrueNumberOnly: false,
    arrayMode: false,
};

export interface ICacheConfig {
    host: string,
    port: number,
    enabledTestFeatures?: boolean,
}

export type DfspIdMapType = {
    outbound: {
        [key: string]: string,
    },
    inbound: {
        [key: string]: string,
    },
};

export const Config: IServiceConfig = {
    port: env.get('LISTEN_PORT').default('3003').asPortNumber(),
    outboundEndpoint: env.get('OUTBOUND_ENDPOINT').required().asString(),
    backendEndpoint: env.get('BACKEND_ENDPOINT').required().asString(),
    requestTimeout: env.get('REQUEST_TIMEOUT').default(2000).asInt(),
    templatesPath: env.get('TEMPLATES_PATH').default('templates').asString(),
    xmlOptions,
    cache: {
        host: env.get('CACHE_HOST').default('localhost').asString(),
        port: env.get('CACHE_PORT').default(6379).asPortNumber(),
        enabledTestFeatures: env.get('CACHE_ENABLED_TEST_FEATURES').asBool() || false,
    },
    callbackTimeout: env.get('CALLBACK_TIMEOUT').default(30).asInt(),
    dfspIdMap: env.get('DFSP_ID_MAP').default({}).asJsonObject() as DfspIdMapType,
    enableDummyALSResponse: env.get('ALS_ENABLED_DUMMY_RESPONSE').asBool() || false, // TODO: Remove this hack
};
