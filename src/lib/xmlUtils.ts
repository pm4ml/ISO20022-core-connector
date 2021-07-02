/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/
import * as path from 'path';
import { j2xParser as J2xParser, parse as ParseXML } from 'fast-xml-parser';
import * as xsd from 'libxmljs2-xsd';
import { Config } from '../config';

/**
 * Parse JS object to XML
 * @param obj
 * @returns {string}
 */
const fromJsObject = (obj: Record<string, unknown>): string => {
    const parser = new J2xParser(Config.xmlOptions);
    return parser.parse(obj);
};

/**
 * Parse XML string to JS object
 * @param xml
 * @returns {string}
 */
const fromXml = (xml: string): Record<string, unknown> => ParseXML(xml, Config.xmlOptions);

/**
 * Validate an XML string against supplied XSD
 * @param {string} xmlString
 * @returns {boolean | Array<Record<string, unknown>>}
 */
const validate = (xml: string, xsdPath: string): boolean | Array<Record<string, unknown>> => {
    const schema = xsd.parseFile(path.resolve(process.cwd(), xsdPath));
    const result = schema.validate(xml);
    return result != null ? result : true;
};

export const XML = { fromJsObject, fromXml };
export const XSD = { validate };
