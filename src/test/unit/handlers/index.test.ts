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

import Handlers from '../../../handlers';

describe('Handlers', () => {
    const ctx = {
        body: ''
    };
    describe('healthCheck', () => {
        it('should return status OK', async () => {
            const healthSpy = jest.spyOn(Handlers['/health'], 'get')
            await Handlers['/health'].get(ctx as any);
            expect(ctx.body).toBe(JSON.stringify({ status: 'ok' }));
            expect(healthSpy).toHaveBeenCalledTimes(1);
            expect(healthSpy).toHaveBeenCalledWith(ctx);
        })
    })
})