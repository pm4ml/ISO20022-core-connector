/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/
import * as fs from 'fs';
import { j2xParser as J2xParser, parse as parseXML } from 'fast-xml-parser';
import * as xsd from 'libxmljs2-xsd';
import { Config, IXMLOptions } from '../config';
import { ApiContext } from '../types';

/**
 * Parse JS object to XML
 * @param obj
 * @returns {string}
 */
const fromJsObject = (obj: Record<string, unknown>, xmlOptions?: IXMLOptions): string => {
    const parser = new J2xParser(xmlOptions || Config.xmlOptions);
    return parser.parse(obj);
};

/**
 * Parse XML string to JS object
 * @param xml
 * @returns {string}
 */
// eslint-disable-next-line max-len
const fromXml = (xml: string, xmlOptions?: IXMLOptions): Record<string, unknown> => parseXML(xml, xmlOptions || Config.xmlOptions) as Record<string, unknown>;


/**
 * Validate an XML string against supplied XSD
 * @param {string} xmlString
 * * @param {string} xsdPath
 * @returns {boolean | Array<Record<string, unknown>>}
 */
const validate = (xml: string, xsdPath: string): boolean | Array<Record<string, unknown>> => {
    if(!fs.existsSync(xsdPath)) {
        throw new Error(`XSD file not found: ${xsdPath}`);
    }
    if(!xml.length) {
        throw new Error('XML content cannot be blank.');
    }

    const schema = xsd.parseFile(xsdPath);
    const result = schema.validate(xml, false);

    return result != null ? result : true;
};


/**
 * Handle XML/XSD validation error
 * @param {object} validationResult
 * @param {ApiContext} ctx
 * @returns {boolean | Array<Record<string, unknown>>}
 */
const handleValidationError = (validationResult: unknown, ctx: ApiContext): void => {
    ctx.state.logger.push({ validationResult }).error(new Error('Schema valdiation error'));
    ctx.response.type = 'text/html';
    ctx.response.body = null;
    ctx.response.status = 400;
};

/**
 * Paths to XSDs
 */
const paths = {
    camt_003: `${Config.templatesPath}/xsd/camt.003.001.07.xsd`,
    camt_004: `${Config.templatesPath}/xsd/camt.004.001.08.xsd`,
    pacs_008: `${Config.templatesPath}/xsd/pacs.008.001.09.xsd`,
    pacs_002: `${Config.templatesPath}/xsd/pacs.002.001.10.xsd`,
    pain_001: `${Config.templatesPath}/xsd/pain.001.001.10_1.xsd`,
    pain_002: `${Config.templatesPath}/xsd/pain.002.001.11.xsd`,
    pain_013: `${Config.templatesPath}/xsd/pain.013.001.08.xsd`,
};

export const XML = { fromJsObject, fromXml };
export const XSD = { validate, handleValidationError, paths };
