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

import { Logger } from '@mojaloop/sdk-standard-components';
import { InboundHandlers } from '../../../../handlers/Inbound';
import { IPostQuoteRequestBody, IPostQuoteResponseBody } from '../../../../interfaces';

describe('InboundHandlers', () => {
    const logger = new Logger.Logger();
    describe('postQuotes', () => {
        let pqCtx: any;
        let pqExpectedResponse: IPostQuoteResponseBody;
        beforeEach(() => {
            pqCtx = {
                request: {
                    body: {
                        quoteId: 'mock-quote-id',
                        transactionId: 'mock-trx-id',
                        amount: 100,
                        currency: 'USD',
                    } as unknown as IPostQuoteRequestBody
                },
                state: {
                    logger
                },
                response: {
                    body: {} as IPostQuoteResponseBody,
                    status: '',
                    type: ''
                }
            }
            pqExpectedResponse = {
                quoteId: pqCtx.request.body.quoteId,
                transactionId: pqCtx.request.body.transactionId,
                transferAmount: pqCtx.request.body.amount,
                transferAmountCurrency: pqCtx.request.body.currency,
                payeeReceiveAmount: pqCtx.request.body.amount,
                payeeReceiveAmountCurrency: pqCtx.request.body.currency,
            }
        })
        it('should return appropriate response given valid request', async () => {
            await InboundHandlers.postQuotes(pqCtx as any);
            expect(pqCtx.response.body).toEqual(pqExpectedResponse);
            expect(pqCtx.response.status).toBe(200)
            expect(pqCtx.response.type).toBe('application/json')
        })
        it('should return appropriate response given valid request', async () => {
            pqCtx.request.body.expiration = new Date().toISOString()
            pqExpectedResponse.expiration = pqCtx.request.body.expiration
            await InboundHandlers.postQuotes(pqCtx as any)
            expect(pqCtx.response.body).toEqual(pqExpectedResponse);
            expect(pqCtx.response.status).toBe(200)
            expect(pqCtx.response.type).toBe('application/json')
        })
        it('should handle error and return appropriate response given invalid request', async () => {
            pqCtx.request.body = {} as any
            pqExpectedResponse = '' as any;
            await InboundHandlers.postQuotes(pqCtx as any)
            expect(pqCtx.response.body).toEqual(pqExpectedResponse);
            expect(pqCtx.response.status).toBe(500)
            expect(pqCtx.response.type).toBe('text/html')
        })
    })
})
