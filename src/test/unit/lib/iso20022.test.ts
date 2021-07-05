/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *      Steven Oderayi - steven.oderayi@modusbox.com                      *
 **************************************************************************/

import { generateMsgId } from '../../../lib/iso20022';

describe('iso20022', () => {
    describe('generateMsgId', () => {
        it('should generate valid ISO20022 message Id', () => {
            const mockDate = new Date('10/10/2010 10:10:10')
            jest
                .spyOn(global, 'Date')
                .mockImplementation(() => mockDate as unknown as string)
            const id = generateMsgId();
            expect(id.slice(0,19)).toBe('RNDS/20101010101010');
            expect(id.length).toEqual(27);
        })
    })
})