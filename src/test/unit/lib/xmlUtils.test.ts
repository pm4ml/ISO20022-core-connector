/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *      Steven Oderayi - steven.oderayi@modusbox.com                      *
 **************************************************************************/
import fs from 'fs'
import * as path from 'path';
import { XML, XSD } from '../../../lib/xmlUtils';

describe('xmlUtils', () => {
    describe('XML', () => {
        describe('fromJsObject', () => {
            it('should parse JS object to XML string', () => {
                const jsObj = {
                    a: { b: { c: 'JS OBJECT' } }
                }
                const xmlStr = XML.fromJsObject(jsObj);
                expect(typeof xmlStr).toBe('string');
                expect(xmlStr).toContain('JS OBJECT');
                expect(XML.fromXml(xmlStr)).toEqual(jsObj);
            })
        })

        describe('fromXml', () => {
            it('should parse XML string to JS object', () => {
                const xmlStr = '<a><b><c>XML STRING</c></b></a>';
                const jsObj = XML.fromXml(xmlStr);
                expect(typeof jsObj).toBe('object');
                expect(XML.fromJsObject(jsObj)).toEqual(xmlStr);
            })
        })
    })

    describe('XSD', () => {
        describe('validate', () => {
            it('should validate XML string with supplied XSD', () => {
                const validXml = fs.readFileSync(path.resolve(process.cwd(), 'src/test/unit/data/camt.003.xml')).toString();
                const invalidXml = '<a><b><c>Invalid XML</c></b></a>';
                const xsdPath = XSD.paths.camt_003;
                expect(XSD.validate(validXml, xsdPath)).toBe(true);
                expect(XSD.validate(invalidXml, xsdPath)).not.toBe(true);
            })
        })
    })
})

