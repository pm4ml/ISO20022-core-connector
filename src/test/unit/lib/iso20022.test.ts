/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *      Steven Oderayi - steven.oderayi@modusbox.com                      *
 **************************************************************************/

import * as uuid from 'uuid';
jest.mock('uuid')

import { generateMsgId } from '../../../lib/iso20022';

describe('iso20022', () => {
    describe('generateMsgId', () => {
        it('should generate valid ISO20022 message Id', () => {
            const uuidSpy = jest.spyOn(uuid, 'v4').mockReturnValue('a0b4bc34-6cb5-485b-8dff-d9e55cb11e7b')
            const mockDate = new Date('10/10/2010 10:10:10')
            jest
                .spyOn(global, 'Date')
                .mockImplementation(() => mockDate as unknown as string)
            const id = generateMsgId();
            expect(id).toBe(`RNDS/20101010101010a0b4bc34`)
            expect(uuidSpy).toHaveBeenCalledTimes(1);
        })
    })
})