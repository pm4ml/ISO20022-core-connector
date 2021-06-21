/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *      Steven Oderayi - steven.oderayi@modusbox.com                      *
 **************************************************************************/

 'use strict'

 import * as util from 'util';
 import { HTTPResponseError } from '../../../requests';

 describe('Requests', () => {
     describe('HTTPResponseError', () => {
        const params = {
            msg: 'message',
            x: 'X',
            y: 'Y'
        };
        const httpResponseError = new HTTPResponseError(params);
        describe('getData', () => {
            it('should return params', () => {
                expect(httpResponseError.getData()).toBe(params);
            })
        })

        describe('toString', () => {
            it('should return string representation of params', () => {
                expect(httpResponseError.toString()).toBe(util.inspect(params));
            })
        })

        describe('toJSON', () => {
            it('should return stringified params', () => {
                expect(httpResponseError.toJSON()).toBe(JSON.stringify(params));
            })
        })
     })
 });