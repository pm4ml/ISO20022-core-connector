/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/
import * as xmlParser from 'fast-xml-parser';
import { Config } from '../config';

export const fromJsObject = (obj: Record<string, unknown>): string => {
    const J2xParser = xmlParser.j2xParser;
    const parser = new J2xParser(Config.xmlOptions);
    return parser.parse(obj);
};
