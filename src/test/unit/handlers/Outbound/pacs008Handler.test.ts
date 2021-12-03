/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *      Steven Oderayi - steven.oderayi@modusbox.com                      *
 **************************************************************************/

// @ts-nocheck11

'use strict'

import { AxiosResponse } from 'axios';
import fs from 'fs';
import * as path from 'path';
import { mocked } from 'ts-jest/utils';
import * as pacs008Handler from '../../../../handlers/Outbound/pacs008Handler';
import { 
    IExtensionItem,
    IPacs002,
    IPacs008,
    IPostQuotesBody,
    IPostQuotesResponseBody,
    ITransferError,
    ITransferSuccess,
    TransferStatus,
    TxStsEnum,
} from '../../../../interfaces';
import {
    XML,
    XSD,
} from '../../../../lib/xmlUtils';
import { sendPACS002toSenderBackend } from '../../../../requests/Inbound';
import { requestQuotes, acceptQuotes } from '../../../../requests/Outbound'
import { pacs008ToPostQuotesBody, transferResponseToPacs002 } from '../../../../transformers';
jest.mock('../../../../requests/Outbound');
jest.mock('../../../../requests/Inbound');
const mockedRequestQuotes = mocked(requestQuotes, true);
const mockedAcceptQuotes = mocked(acceptQuotes, true);
const mockedSendPACS002toSenderBackend = mocked(sendPACS002toSenderBackend, true);

const XmlFileMap = {
    PACS_008_001_09: {
        valid: '../../data/pacs.008.valid.xml',
        invalid: '../../data/pacs.008.invalid.xml',
    },
};

interface ITestData {
    ctx: any,
    xmlStr: string,
    postQuotesBody: IPostQuotesBody,
    quoteRequestExtensions: Array<IExtensionItem>,
};

const getTestData = (importXmlFile: string = '../../data/pacs.008.valid.xml'): ITestData => {
    let ctx: any;
    let xmlStr: string;
    let postQuotesBody: IPostQuotesBody;
    let quoteRequestExtensions: Array<IExtensionItem>;
    xmlStr = fs.readFileSync(path.join(__dirname, importXmlFile)).toString();
    ctx = {
        request: {
            body: null,
            rawBody: '',
        },
        state: {
            logger: {
                error: jest.fn(),
                debug: jest.fn(),
                log: jest.fn(),
                push: () => {
                    return {
                        error: jest.fn(),
                        debug: jest.fn(),
                        log: jest.fn(),
                    }
                },
            }
        },
        response: { type: null, status: null, body: '', data: {} as any }
    };
    ctx.request.body = XML.fromXml(xmlStr) as any;
    ctx.request.rawBody = xmlStr;
    postQuotesBody = pacs008ToPostQuotesBody(ctx.request.body as unknown as IPacs008);
    quoteRequestExtensions = [
        {
            key: 'MSGID',
            value: (ctx.request.body as unknown as IPacs008).Document.FIToFICstmrCdtTrf.GrpHdr.MsgId,
        },
        {
            key: 'INSTRID',
            value: (ctx.request.body as unknown as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.InstrId,
        },
        {
            key: 'TXID',
            value: (ctx.request.body as unknown as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.TxId,
        },
        {
            key: 'ENDTOENDID',
            value: (ctx.request.body as unknown as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.EndToEndId,
        },

    ];
    return {
        ctx,
        xmlStr,
        postQuotesBody,
        quoteRequestExtensions,
    }
}


describe('pacs008Handler', () => {

    beforeAll(async () => {
        // const { ctx, xmlStr, postQuotesBody, quoteRequestExtensions} = getTestData();
    })

    beforeEach(async () => {
        mockedRequestQuotes.mockResolvedValue({} as any);
        mockedAcceptQuotes.mockResolvedValue({} as any);
        mockedSendPACS002toSenderBackend.mockResolvedValue({} as any);
    })

    afterEach(async () => {
        jest.resetAllMocks();
    })

    it('should initiate quotes request', async () => {
        // ### setup
        const { ctx, quoteRequestExtensions } = getTestData(XmlFileMap.PACS_008_001_09.valid);
        const requestQuotesResponse = ctx.response;
        const transferState = { currentState: TransferStatus.WAITING_FOR_QUOTE_ACCEPTANCE, transferId: 'mock_transfer_id' };
        requestQuotesResponse.data = { ...transferState } as unknown as IPostQuotesResponseBody
        mockedRequestQuotes.mockResolvedValue(requestQuotesResponse as any);
        
        const requestAcceptQuotes = {
            data: {
                currentState: TransferStatus.COMPLETED,
                transferId: transferState.transferId,
                quoteRequestExtensions
            } as unknown as ITransferSuccess
        } as AxiosResponse<any>;
        mockedAcceptQuotes.mockResolvedValue(requestAcceptQuotes);

        // ### act
        await pacs008Handler.default(ctx as any);

        // ### test
        expect(ctx.response.type).toEqual('application/xml');
        expect(ctx.response.body).toEqual({});
        expect(ctx.response.status).toEqual(200);
    });

    it('should initiate quotes request with failed validation', async () => {
        // ### setup
        const { ctx, quoteRequestExtensions } = getTestData(XmlFileMap.PACS_008_001_09.invalid);
        const requestQuotesResponse = ctx.response;
        const transferState = { currentState: TransferStatus.WAITING_FOR_QUOTE_ACCEPTANCE, transferId: 'mock_transfer_id' };
        requestQuotesResponse.data = { ...transferState } as unknown as IPostQuotesResponseBody
        mockedRequestQuotes.mockResolvedValue(requestQuotesResponse as any);
        
        const requestAcceptQuotes = {
            data: {
                currentState: TransferStatus.COMPLETED,
                transferId: transferState.transferId,
                quoteRequestExtensions
            } as unknown as ITransferSuccess
        } as AxiosResponse<any>;
        mockedAcceptQuotes.mockResolvedValue(requestAcceptQuotes);

        // ### act
        await pacs008Handler.default(ctx as any);

        // ### test
        expect(ctx.response.type).toEqual('text/html');
        expect(ctx.response.body).toEqual(null);
        expect(ctx.response.status).toEqual(400);
    });

    it('should initiate quotes request async via processTransferRequest', async () => {
        // ### setup
        const { ctx, postQuotesBody, quoteRequestExtensions } = getTestData(XmlFileMap.PACS_008_001_09.valid);
        const requestQuotesResponse = ctx.response;
        const transferState = { currentState: TransferStatus.WAITING_FOR_QUOTE_ACCEPTANCE, transferId: 'mock_transfer_id' };
        requestQuotesResponse.data = { ...transferState } as unknown as IPostQuotesResponseBody
        mockedRequestQuotes.mockResolvedValue(requestQuotesResponse as any);
        
        const requestAcceptQuotesResponse = {
            data: {
                currentState: TransferStatus.COMPLETED,
                transferId: transferState.transferId,
                quoteRequestExtensions
            } as unknown as ITransferSuccess
        } as AxiosResponse<any>;
        mockedAcceptQuotes.mockResolvedValue(requestAcceptQuotesResponse);

        const sendPACS002toSenderBackendRequest = transferResponseToPacs002(requestAcceptQuotesResponse.data);
        const sendPACS002toSenderBackendRequestXml = XML.fromXml(sendPACS002toSenderBackendRequest);
        // TODO: fix
        // @ts-expect-error: Let's ignore this compile error.
        delete sendPACS002toSenderBackendRequestXml.Document.FIToFIPmtStsRpt.GrpHdr.CreDtTm;

        // ### act
        await pacs008Handler.processTransferRequest(ctx as any);

        // ### test
        expect(mockedRequestQuotes).toBeCalledWith(postQuotesBody);
        expect(mockedAcceptQuotes).toBeCalledWith(transferState.transferId as string, { acceptQuote: true });
        expect(mockedSendPACS002toSenderBackend).toBeCalled();
        const mockedSendPACS002toSenderBackendCalledArg = mockedSendPACS002toSenderBackend.mock.calls[0][0]
        let validateResult: boolean | Array<Record<string, unknown>> = false;
        try {
            validateResult = XSD.validate(mockedSendPACS002toSenderBackendCalledArg, XSD.paths.pacs_002)
        } catch (error) {
            fail(error);
        }
        expect(validateResult).toBe(true);
        const mockedSendPACS002toSenderBackendCalledArgXml = XML.fromXml(mockedSendPACS002toSenderBackendCalledArg);
        // TODO: fix
        // @ts-expect-error: Let's ignore this compile error. TODO: fix
        delete mockedSendPACS002toSenderBackendCalledArgXml.Document.FIToFIPmtStsRpt.GrpHdr.CreDtTm;
        expect(mockedSendPACS002toSenderBackendCalledArgXml).toEqual(sendPACS002toSenderBackendRequestXml);
    });


    it('should handle exception when quotes request fails', async () => {
        // ### setup
        const { ctx, postQuotesBody } = getTestData(XmlFileMap.PACS_008_001_09.valid);
        const error = new Error('Mojaloop Connector unreachable');
        mockedRequestQuotes.mockRejectedValue(error);
        let caughtError: Error | undefined = undefined;
        
        // ### act
        try {
            await pacs008Handler.processTransferRequest(ctx as any);
        } catch (error) {
            caughtError = error;
        }

        // ### test
        expect(caughtError).toEqual(error);
        expect(mockedRequestQuotes).toBeCalledWith(postQuotesBody);
        expect(ctx.state.logger.error).toBeCalledWith(error);
        expect(mockedAcceptQuotes).not.toBeCalled();
        expect(mockedSendPACS002toSenderBackend).toBeCalled();
        const mockedSendPACS002toSenderBackendCalledArg = mockedSendPACS002toSenderBackend.mock.calls[0][0]
        let validateResult: boolean | Array<Record<string, unknown>> = false;
        try {
            validateResult = XSD.validate(mockedSendPACS002toSenderBackendCalledArg, XSD.paths.pacs_002)
        } catch (error) {
            fail(error);
        }
        expect(validateResult).toBe(true);
        const mockedSendPACS002toSenderBackendCalledArgXml: IPacs002 | undefined = XML.fromXml(mockedSendPACS002toSenderBackendCalledArg) as unknown as IPacs002;
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.GrpHdr?.MsgId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.GrpHdr.MsgId);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.TxSts).toEqual(TxStsEnum.RJCT);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlInstrId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.InstrId);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlEndToEndId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.EndToEndId);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlTxId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.TxId);
    });

    it('should handle error if quoting error is returned', async () => {
        // ### setup
        const { ctx, postQuotesBody, quoteRequestExtensions } = getTestData(XmlFileMap.PACS_008_001_09.valid);
        const response = ctx.response;
        response.data = { transferState: { quoteRequestExtensions } } as unknown as ITransferError
        mockedRequestQuotes.mockResolvedValue(response as unknown as AxiosResponse<any>);
        let caughtError: Error | undefined = undefined;

        // ### act
        try {
            await pacs008Handler.processTransferRequest(ctx as any);
        } catch (error) {
            caughtError = error;
        }

        // ### test
        expect(caughtError?.message).toEqual('requestQuotes response transferState.currentState=undefined is invalid');
        expect(mockedRequestQuotes).toBeCalledWith(postQuotesBody);
        expect(mockedAcceptQuotes).not.toBeCalled();
        expect(mockedSendPACS002toSenderBackend).toBeCalled();
        const mockedSendPACS002toSenderBackendCalledArg = mockedSendPACS002toSenderBackend.mock.calls[0][0]
        let validateResult: boolean | Array<Record<string, unknown>> = false;
        try {
            validateResult = XSD.validate(mockedSendPACS002toSenderBackendCalledArg, XSD.paths.pacs_002)
        } catch (error) {
            fail(error);
        }
        expect(validateResult).toBe(true);
        const mockedSendPACS002toSenderBackendCalledArgXml: IPacs002 | undefined = XML.fromXml(mockedSendPACS002toSenderBackendCalledArg) as unknown as IPacs002;
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.GrpHdr?.MsgId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.GrpHdr.MsgId);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.TxSts).toEqual(TxStsEnum.RJCT);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlInstrId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.InstrId);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlEndToEndId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.EndToEndId);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlTxId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.TxId);
    });

    it('should handle error if quote acceptance/transfer request fails', async () => {
        // ### setup
        const { ctx, postQuotesBody } = getTestData(XmlFileMap.PACS_008_001_09.valid);
        const response = ctx.response;
        response.data = { currentState: TransferStatus.WAITING_FOR_QUOTE_ACCEPTANCE, transferId: 'mock_transfer_id' } as unknown as IPostQuotesResponseBody
        mockedRequestQuotes.mockResolvedValue(response as any);
        const error = new Error('Mojaloop Connector unreachable');
        mockedAcceptQuotes.mockRejectedValue(error);
        let caughtError: Error | undefined = undefined;

        // ### act
        try {
            await pacs008Handler.processTransferRequest(ctx as any);
        } catch (error) {
            caughtError = error;
        }

        // ### Test
        expect(caughtError).toEqual(error);
        expect(mockedRequestQuotes).toBeCalledWith(postQuotesBody);
        expect(ctx.state.logger.error).toBeCalledWith(error);
        expect(mockedAcceptQuotes).toBeCalled();
        expect(mockedSendPACS002toSenderBackend).toBeCalled();
        const mockedSendPACS002toSenderBackendCalledArg = mockedSendPACS002toSenderBackend.mock.calls[0][0]
        let validateResult: boolean | Array<Record<string, unknown>> = false;
        try {
            validateResult = XSD.validate(mockedSendPACS002toSenderBackendCalledArg, XSD.paths.pacs_002)
        } catch (error) {
            fail(error);
        }
        expect(validateResult).toBe(true);
        const mockedSendPACS002toSenderBackendCalledArgXml: IPacs002 | undefined = XML.fromXml(mockedSendPACS002toSenderBackendCalledArg) as unknown as IPacs002;
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.GrpHdr?.MsgId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.GrpHdr.MsgId);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.TxSts).toEqual(TxStsEnum.RJCT);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlInstrId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.InstrId);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlEndToEndId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.EndToEndId);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlTxId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.TxId);
    })

    it('should handle error if quote acceptance/transfer was unsuccessful', async () => {
        // ### setup
        const { ctx, postQuotesBody, quoteRequestExtensions } = getTestData(XmlFileMap.PACS_008_001_09.valid);
        const response = ctx.response;
        response.data = { currentState: TransferStatus.WAITING_FOR_QUOTE_ACCEPTANCE, transferId: 'mock_transfer_id' } as unknown as IPostQuotesResponseBody
        mockedRequestQuotes.mockResolvedValue(response as any);
        const requestAcceptQuotesErrorResponse = {
            data: {
                statusCode: '500',
                message: "this is an error",
                transferState: { currentState: TransferStatus.ERROR_OCCURRED, quoteRequestExtensions },
            } as unknown as ITransferError
        } as AxiosResponse<any>;
        mockedAcceptQuotes.mockResolvedValue(requestAcceptQuotesErrorResponse);
        let caughtError: Error | undefined = undefined;
        
        // ### act
        try {
            await pacs008Handler.processTransferRequest(ctx as any);
        } catch (error) {
            caughtError = error;
        }

        // ### Test
        expect(caughtError).toBeTruthy();
        expect(mockedRequestQuotes).toBeCalledWith(postQuotesBody);
        expect(mockedAcceptQuotes).toBeCalled();
        expect(mockedSendPACS002toSenderBackend).toBeCalled();
        const mockedSendPACS002toSenderBackendCalledArg = mockedSendPACS002toSenderBackend.mock.calls[0][0]
        let validateResult: boolean | Array<Record<string, unknown>> = false;
        try {
            validateResult = XSD.validate(mockedSendPACS002toSenderBackendCalledArg, XSD.paths.pacs_002)
        } catch (error) {
            fail(error);
        }
        expect(validateResult).toBe(true);
        const mockedSendPACS002toSenderBackendCalledArgXml: IPacs002 | undefined = XML.fromXml(mockedSendPACS002toSenderBackendCalledArg) as unknown as IPacs002;
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.GrpHdr?.MsgId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.GrpHdr.MsgId);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.TxSts).toEqual(TxStsEnum.RJCT);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlInstrId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.InstrId);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlEndToEndId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.EndToEndId);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlTxId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.TxId);
    })

    it('should translate happy path response to pacs.002', async () => {
        // ### setup
        const { ctx, postQuotesBody, quoteRequestExtensions } = getTestData(XmlFileMap.PACS_008_001_09.valid);
        ctx.response.data = { currentState: TransferStatus.WAITING_FOR_QUOTE_ACCEPTANCE, transferId: 'mock_transfer_id' } as unknown as IPostQuotesResponseBody
        mockedRequestQuotes.mockResolvedValue(ctx.response as any);

        const mockedAcceptQuotesResponse = {
            data: {
                currentState: TransferStatus.COMPLETED,
                transferId: 'mock-transfer-id',
                quoteRequestExtensions
            } as unknown as ITransferSuccess
        } as AxiosResponse<any>;
        mockedAcceptQuotes.mockResolvedValue(mockedAcceptQuotesResponse);

        let caughtError: Error | undefined = undefined;
        
        // ### act
        try {
            await pacs008Handler.processTransferRequest(ctx as any);
        } catch (error) {
            caughtError = error;
        }

        // ### Test
        expect(caughtError).toBeUndefined();
        expect(mockedRequestQuotes).toBeCalledWith(postQuotesBody);
        expect(mockedSendPACS002toSenderBackend).toBeCalled();
        const mockedSendPACS002toSenderBackendCalledArg = mockedSendPACS002toSenderBackend.mock.calls[0][0]
        let validateResult: boolean | Array<Record<string, unknown>> = false;
        try {
            validateResult = XSD.validate(mockedSendPACS002toSenderBackendCalledArg, XSD.paths.pacs_002)
        } catch (error) {
            fail(error);
        }
        expect(validateResult).toBe(true);
        const mockedSendPACS002toSenderBackendCalledArgXml: IPacs002 | undefined = XML.fromXml(mockedSendPACS002toSenderBackendCalledArg) as unknown as IPacs002;
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.GrpHdr?.MsgId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.GrpHdr.MsgId);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.TxSts).toEqual(TxStsEnum.ACSC);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlInstrId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.InstrId);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlEndToEndId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.EndToEndId);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlTxId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.TxId);
    });

    it('should translate unhappy path response to pacs.002', async () => {
        // ### setup
        const { ctx, postQuotesBody } = getTestData(XmlFileMap.PACS_008_001_09.valid);
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
        let caughtError: Error | undefined = undefined;
        
        // ### act
        try {
            await pacs008Handler.processTransferRequest(ctx as any);
        } catch (error) {
            caughtError = error;
        }

        // ### Test
        expect(caughtError).toBeTruthy();
        expect(mockedRequestQuotes).toBeCalledWith(postQuotesBody);
        expect(mockedAcceptQuotes).toBeCalled();
        expect(mockedSendPACS002toSenderBackend).toBeCalled();
        const mockedSendPACS002toSenderBackendCalledArg = mockedSendPACS002toSenderBackend.mock.calls[0][0]
        let validateResult: boolean | Array<Record<string, unknown>> = false;
        try {
            validateResult = XSD.validate(mockedSendPACS002toSenderBackendCalledArg, XSD.paths.pacs_002)
        } catch (error) {
            fail(error);
        }
        expect(validateResult).toBe(true);
        const mockedSendPACS002toSenderBackendCalledArgXml: IPacs002 | undefined = XML.fromXml(mockedSendPACS002toSenderBackendCalledArg) as unknown as IPacs002;
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.GrpHdr?.MsgId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.GrpHdr.MsgId);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.TxSts).toEqual(TxStsEnum.RJCT);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlInstrId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.InstrId);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlEndToEndId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.EndToEndId);
        expect(mockedSendPACS002toSenderBackendCalledArgXml?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlTxId).toEqual((ctx.request.body as IPacs008).Document.FIToFICstmrCdtTrf.CdtTrfTxInf.PmtId.TxId);
        
    });
});
