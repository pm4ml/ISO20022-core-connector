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
import { Logger } from '@mojaloop/sdk-standard-components';

dotenv.config();

export interface IServiceConfig {
    port?: number,
    outboundEndpoint: string,
    requestTimeout?: number,
    logger?: Logger.Logger,
    xmlOptions: IXMLOptions,
    templatesPath: string

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

export const Config: IServiceConfig = {
    port: env.get('LISTEN_PORT').default('3000').asPortNumber(),
    outboundEndpoint: env.get('OUTBOUND_ENDPOINT').required().asString(),
    requestTimeout: env.get('REQUEST_TIMEOUT').default(2000).asInt(),
    templatesPath: env.get('TEMPLATES_PATH').required().asString(),
    xmlOptions,
};
