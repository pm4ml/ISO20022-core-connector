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

import { AxiosResponse } from 'axios';
import fs from 'fs';
import * as path from 'path';
import { mocked } from 'ts-jest/utils';
import pacs008Handler from '../../../../handlers/Outbound/pacs008Handler';
import { IExtensionItem, IPacs008, IPostQuotesBody, IPostQuotesResponseBody, ITransferError, ITransferSuccess, TransferStatus } from '../../../../interfaces';
import { XML, XSD } from '../../../../lib/xmlUtils';

import { requestQuotes, acceptQuotes } from '../../../../requests/Outbound'
import { pacs008ToPostQuotesBody } from '../../../../transformers';
jest.mock('../../../../requests/Outbound');
const mockedRequestQuotes = mocked(requestQuotes, true);
const mockedAcceptQuotes = mocked(acceptQuotes, true);


describe('pacs008Handler', () => {
    let ctx: any;
    let xmlStr: string;
    let postQuotesBody: IPostQuotesBody;
    let quoteRequestExtensions: Array<IExtensionItem>;

    beforeAll(async () => {
        xmlStr = fs.readFileSync(path.join(__dirname, '../../data/pacs.008.xml')).toString();
        ctx = {
            request: {
                body: null,
                rawBody: '',
            },
            state: {
                logger: {
                    error: jest.fn(),
                    debug: jest.fn(),
                    log: jest.fn()
                }
            },
            response: { type: null, status: null, body: '', data: {} as any }
        };
        ctx.request.body = XML.fromXml(xmlStr) as any;
        ctx.request.rawBody = xmlStr;
        postQuotesBody = pacs008ToPostQuotesBody(ctx.request.body as unknown as IPacs008)
        quoteRequestExtensions = [
            {
                key: 'MSGID',
                value: 'msg-id',
            },
            {
                key: 'INSTRID',
                value: 'instr-id'
            },
            {
                key: 'TXID',
                value: 'tx-id'
            },
            {
                key: 'ENDTOENDID',
                value: 'e2e-id'
            },

        ]
    })

    beforeEach(async () => {
        mockedRequestQuotes.mockResolvedValue({} as any);
        mockedAcceptQuotes.mockResolvedValue({} as any);
    })

    afterEach(async () => {
        jest.resetAllMocks();
    })

    it('should initiate quotes request', async () => {
        const response = ctx.response;
        response.data = { currentState: TransferStatus.WAITING_FOR_QUOTE_ACCEPTANCE, transferId: 'mock_transfer_id' } as unknown as IPostQuotesResponseBody
        mockedRequestQuotes.mockResolvedValue(response as any);
        await pacs008Handler(ctx as any);
        expect(mockedRequestQuotes).toBeCalledWith(postQuotesBody);
        expect(mockedAcceptQuotes).toBeCalledWith(response.data.transferId, { acceptQuote: true })
    });

    it('should handle exception when quotes request fails', async () => {
        const error = new Error('Mojaloop Connector unreachable');
        mockedRequestQuotes.mockRejectedValue(error);
        await pacs008Handler(ctx as any);
        expect(mockedRequestQuotes).toBeCalledWith(postQuotesBody);
        expect(ctx.state.logger.error).toBeCalledWith(error);
        expect(mockedAcceptQuotes).not.toBeCalled();
    });

    it('should handle error if quoting error is returned', async () => {
        const response = ctx.response;
        response.data = { transferState: { quoteRequestExtensions } } as unknown as ITransferError
        mockedRequestQuotes.mockResolvedValue(response as unknown as AxiosResponse<any>);
        await pacs008Handler(ctx as any);
        expect(mockedRequestQuotes).toBeCalledWith(postQuotesBody);
        expect(ctx.state.logger.error).toBeCalledWith(response.data);
        expect(ctx.response.type).toEqual('application/xml');
        expect(XML.fromXml(ctx.response.body)).toBeTruthy();
        expect(XSD.validate(ctx.response.body, XSD.paths.pacs_002)).toBe(true);
        expect(ctx.response.status).toEqual(400);
        expect(mockedAcceptQuotes).not.toBeCalled();
    });

    it('should handle error if quote acceptance/transfer request fails', async () => {
        const response = ctx.response;
        response.data = { currentState: TransferStatus.WAITING_FOR_QUOTE_ACCEPTANCE, transferId: 'mock_transfer_id' } as unknown as IPostQuotesResponseBody
        mockedRequestQuotes.mockResolvedValue(response as any);
        const error = new Error('Mojaloop Connector unreachable');
        mockedAcceptQuotes.mockRejectedValue(error);
        await pacs008Handler(ctx as any);
        expect(mockedRequestQuotes).toBeCalledWith(postQuotesBody);
        expect(ctx.state.logger.error).toBeCalledWith(error);
        expect(mockedAcceptQuotes).toBeCalled();
    })

    it('should handle error if quote acceptance/transfer was unsuccessful', async () => {
        const response = ctx.response;
        response.data = { currentState: TransferStatus.WAITING_FOR_QUOTE_ACCEPTANCE, transferId: 'mock_transfer_id' } as unknown as IPostQuotesResponseBody
        mockedRequestQuotes.mockResolvedValue(response as any);
        const transferError = { transferState: { currentState: TransferStatus.ERROR_OCCURRED, quoteRequestExtensions } };
        mockedAcceptQuotes.mockRejectedValue(transferError);
        await pacs008Handler(ctx as any);
        expect(mockedRequestQuotes).toBeCalledWith(postQuotesBody);
        expect(ctx.state.logger.error).toBeCalledWith(transferError);
        expect(XML.fromXml(ctx.response.body)).toBeTruthy();
        expect(XSD.validate(ctx.response.body, XSD.paths.pacs_002)).toBe(true);
        expect(ctx.response.status).toEqual(400);
        expect(mockedAcceptQuotes).toBeCalled();
    })

    it('should translate happy path response to pacs.002', async () => {
        const mockedRes = {
            data: {
                currentState: TransferStatus.COMPLETED,
                transferId: 'mock-transfer-id',
                quoteRequestExtensions
            } as unknown as ITransferSuccess
        } as AxiosResponse<any>;
        mockedAcceptQuotes.mockResolvedValue(mockedRes);
        ctx.response.data = { currentState: TransferStatus.WAITING_FOR_QUOTE_ACCEPTANCE, transferId: 'mock_transfer_id' } as unknown as IPostQuotesResponseBody
        mockedRequestQuotes.mockResolvedValue(ctx.response as any);
        await pacs008Handler(ctx as any);
        expect(mockedRequestQuotes).toBeCalledWith(postQuotesBody);
        expect(XML.fromXml(ctx.response.body)).toBeTruthy();
        expect(XSD.validate(ctx.response.body, XSD.paths.pacs_002)).toBe(true);
        expect(ctx.response.type).toEqual('application/xml');
        expect(ctx.response.status).toEqual(200);
    });

    it('should translate unhappy path response to pacs.002', async () => {
        const mockedRes = {
            data: {
                transferState: {
                    currentState: TransferStatus.ERROR_OCCURRED,
                    transferId: 'mock-transfer-id',
                    quoteRequestExtensions: [
                        {
                            key: 'MSGID',
                            value: 'msg-id',
                        },
                        {
                            key: 'INSTRID',
                            value: 'instr-id'
                        },
                        {
                            key: 'TXID',
                            value: 'tx-id'
                        },
                        {
                            key: 'ENDTOENDID',
                            value: 'e2e-id'
                        },

                    ]
                }
            } as ITransferError
        } as AxiosResponse<any>;
        mockedAcceptQuotes.mockResolvedValue(mockedRes);
        ctx.response.data = { currentState: TransferStatus.WAITING_FOR_QUOTE_ACCEPTANCE, transferId: 'mock_transfer_id' } as unknown as IPostQuotesResponseBody
        mockedRequestQuotes.mockResolvedValue(ctx.response as any);
        await pacs008Handler(ctx as any);
        expect(mockedRequestQuotes).toBeCalledWith(postQuotesBody);
        expect(XML.fromXml(ctx.response.body)).toBeTruthy();
        expect(XSD.validate(ctx.response.body, XSD.paths.pacs_002)).toBe(true);
        expect(ctx.response.type).toEqual('application/xml');
        expect(ctx.response.status).toEqual(400);
    });
});
