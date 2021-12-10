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

import {
    AxiosResponse
} from 'axios';
import fs from 'fs';
import * as path from 'path';
import { mocked } from 'ts-jest/utils';
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
import {
    pacs008ToPostQuotesBody, transferResponseToPacs002,
} from '../../../../transformers';

import * as pacs008Handler from '../../../../handlers/Outbound/pacs008Handler';
import {
    InboundRequester,
    OutboundRequester,
} from '../../../../requests';
import {
    mockInboundRequesterHelper,
    mockOutboundRequesterHelper
} from '../../../helpers/mockRequesters';

// Mock Requesters
jest.mock('../../../../requests');
const MockedInboundRequester = mocked(InboundRequester, true);
const MockedOutboundRequester = mocked(OutboundRequester, true);

// Mock axios
jest.mock('axios');

const XmlFileMap = {
    PACS_008_001_09: {
        valid: '../../data/pacs.008.outgoing.valid.xml',
        invalid: '../../data/pacs.008.outgoing.invalid.xml',
    },
};

interface ITestData {
    ctx: any,
    xmlStr: string,
    postQuotesBody: IPostQuotesBody,
    quoteRequestExtensions: Array<IExtensionItem>,
};

const getTestData = (importXmlFile: string = '../../data/pacs.008.outgoing.valid.xml'): ITestData => {
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
            conf: {
                backendEndpoint: 'donotcall',
                outboundEndpoint: 'donocall',
                requestTimeout: 0,
            },
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

    const transferId = 'mock-transfer-id';

    beforeAll(async () => {
        // nothing to do here
    })

    beforeEach(async () => {
        // nothing to do here
    })

    afterEach(async () => {
        jest.resetAllMocks();
    })

    it('should initiate quotes request', async () => {
        // ### setup
        const { ctx, quoteRequestExtensions } = getTestData(XmlFileMap.PACS_008_001_09.valid);

        const transferState = { currentState: TransferStatus.WAITING_FOR_QUOTE_ACCEPTANCE, transferId };

        const requestQuotesResponse: AxiosResponse = {
            data: { ...transferState } as unknown as IPostQuotesResponseBody,
            status: 200,
            statusText: 'OK',
            config: {},
            headers: {},
        };

        const acceptQuotesResponse: AxiosResponse = {
            data: {
                currentState: TransferStatus.COMPLETED,
                transferId,
                quoteRequestExtensions
            } as unknown as ITransferSuccess,
            status: 200,
            statusText: 'OK',
            config: {},
            headers: {},
        };

        mockInboundRequesterHelper(MockedInboundRequester);

        mockOutboundRequesterHelper(MockedOutboundRequester, {
            requestQuotesResponse: requestQuotesResponse,
            acceptQuotesResponse: acceptQuotesResponse,
        })

        // ### act
        await pacs008Handler.default(ctx as any);

        // ### test
        expect(ctx.response.type).toEqual('application/xml');
        expect(ctx.response.body).toEqual('');
        expect(ctx.response.status).toEqual(200);
    });

    it('should initiate quotes request with failed validation', async () => {
        // ### setup
        const { ctx, quoteRequestExtensions } = getTestData(XmlFileMap.PACS_008_001_09.invalid);

        const transferState = { currentState: TransferStatus.WAITING_FOR_QUOTE_ACCEPTANCE, transferId };

        const requestQuotesResponse: AxiosResponse = {
            data: { ...transferState } as unknown as IPostQuotesResponseBody,
            status: 200,
            statusText: 'OK',
            config: {},
            headers: {},
        };

        const acceptQuotesResponse: AxiosResponse = {
            data: {
                currentState: TransferStatus.COMPLETED,
                transferId: transferState.transferId,
                quoteRequestExtensions
            } as unknown as ITransferSuccess,
            status: 200,
            statusText: 'OK',
            config: {},
            headers: {},
        };

        mockInboundRequesterHelper(MockedInboundRequester);

        mockOutboundRequesterHelper(MockedOutboundRequester, {
            requestQuotesResponse: requestQuotesResponse,
            acceptQuotesResponse: acceptQuotesResponse,
        })

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

        const transferState = { currentState: TransferStatus.WAITING_FOR_QUOTE_ACCEPTANCE, transferId };

        const requestQuotesResponse: AxiosResponse = {
            data: { ...transferState } as unknown as IPostQuotesResponseBody,
            status: 200,
            statusText: 'OK',
            config: {},
            headers: {},
        };

        const acceptQuotesResponse: AxiosResponse = {
            data: {
                currentState: TransferStatus.COMPLETED,
                transferId: transferState.transferId,
                quoteRequestExtensions
            } as unknown as ITransferSuccess,
            status: 200,
            statusText: 'OK',
            config: {},
            headers: {},
        };

        mockInboundRequesterHelper(MockedInboundRequester);

        mockOutboundRequesterHelper(MockedOutboundRequester, {
            requestQuotesResponse: requestQuotesResponse,
            acceptQuotesResponse: acceptQuotesResponse,
        })

        const sendPACS002toSenderBackendRequest = transferResponseToPacs002(acceptQuotesResponse.data);
        const sendPACS002toSenderBackendRequestXml = XML.fromXml(sendPACS002toSenderBackendRequest);
        delete (sendPACS002toSenderBackendRequestXml as unknown as any).Document.FIToFIPmtStsRpt.GrpHdr.CreDtTm;

        // ### act
        await pacs008Handler.processTransferRequest(ctx as any);

        // ### test
        expect(MockedOutboundRequester.mock.results[0].value.requestQuotes).toBeCalledWith(postQuotesBody);

        expect(MockedOutboundRequester.mock.results[0].value.acceptQuotes).toBeCalledWith(transferState.transferId as string, { acceptQuote: true });

        expect(MockedInboundRequester.mock.results[0].value.sendPACS002toSenderBackend).toBeCalled();
        const mockedSendPACS002toSenderBackendCalledArg = MockedInboundRequester.mock.results[0].value.sendPACS002toSenderBackend.mock.calls[0][0]
        let validateResult: boolean | Array<Record<string, unknown>> = false;
        try {
            validateResult = XSD.validate(mockedSendPACS002toSenderBackendCalledArg, XSD.paths.pacs_002)
        } catch (error) {
            fail(error);
        }
        expect(validateResult).toBe(true);
        const mockedSendPACS002toSenderBackendCalledArgXml = XML.fromXml(mockedSendPACS002toSenderBackendCalledArg);
        delete (mockedSendPACS002toSenderBackendCalledArgXml as unknown as any)?.Document?.FIToFIPmtStsRpt?.GrpHdr?.CreDtTm;
        expect(mockedSendPACS002toSenderBackendCalledArgXml).toEqual(sendPACS002toSenderBackendRequestXml);
    });

    it('should handle exception when quotes request fails', async () => {
        // ### setup
        const {
            ctx,
            postQuotesBody
        } = getTestData(XmlFileMap.PACS_008_001_09.valid);

        const requestQuotesResponseError = new Error('Mojaloop Connector unreachable');;

        mockInboundRequesterHelper(MockedInboundRequester);

        mockOutboundRequesterHelper(MockedOutboundRequester, {
            requestQuotesResponse: requestQuotesResponseError,
        })

        let caughtError: Error | undefined = undefined;
        
        // ### act
        try {
            await pacs008Handler.processTransferRequest(ctx as any);
        } catch (error) {
            caughtError = error;
        }

        // ### test
        expect(caughtError).toEqual(requestQuotesResponseError);
        expect(ctx.state.logger.error).toBeCalledWith(requestQuotesResponseError);

        expect(MockedOutboundRequester.mock.results[0].value.requestQuotes).toBeCalledWith(postQuotesBody);

        expect(MockedOutboundRequester.mock.results[0].value.acceptQuotes).not.toBeCalled();

        expect(MockedInboundRequester.mock.results[0].value.sendPACS002toSenderBackend).toBeCalled();

        const mockedSendPACS002toSenderBackendCalledArg = MockedInboundRequester.mock.results[0].value.sendPACS002toSenderBackend.mock.calls[0][0]
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
        const {
            ctx,
            postQuotesBody,
            quoteRequestExtensions
        } = getTestData(XmlFileMap.PACS_008_001_09.valid);

        const requestQuotesResponse: AxiosResponse = {
            data: { transferState: { quoteRequestExtensions } } as unknown as ITransferError,
            status: 200,
            statusText: 'OK',
            config: {},
            headers: {},
        };

        mockInboundRequesterHelper(MockedInboundRequester);

        mockOutboundRequesterHelper(MockedOutboundRequester, {
            requestQuotesResponse: requestQuotesResponse,
        })

        let caughtError: Error | undefined = undefined;

        // ### act
        try {
            await pacs008Handler.processTransferRequest(ctx as any);
        } catch (error) {
            caughtError = error;
        }

        // ### test
        expect(caughtError?.message).toEqual('requestQuotes response transferState.currentState=undefined is invalid');
        expect(ctx.state.logger.error).toBeCalledWith(caughtError);

        expect(MockedOutboundRequester.mock.results[0].value.requestQuotes).toBeCalledWith(postQuotesBody);

        expect(MockedOutboundRequester.mock.results[0].value.acceptQuotes).not.toBeCalled();
        
        expect(MockedInboundRequester.mock.results[0].value.sendPACS002toSenderBackend).toBeCalled();

        const mockedSendPACS002toSenderBackendCalledArg = MockedInboundRequester.mock.results[0].value.sendPACS002toSenderBackend.mock.calls[0][0]
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
        const {
            ctx,
            postQuotesBody,
        } = getTestData(XmlFileMap.PACS_008_001_09.valid);
        const acceptQuotesResponseError = new Error('Mojaloop Connector unreachable');

        const requestQuotesResponse: AxiosResponse = {
            data: { currentState: TransferStatus.WAITING_FOR_QUOTE_ACCEPTANCE, transferId } as unknown as IPostQuotesResponseBody,
            status: 200,
            statusText: 'OK',
            config: {},
            headers: {},
        };

        mockInboundRequesterHelper(MockedInboundRequester);

        mockOutboundRequesterHelper(MockedOutboundRequester, {
            requestQuotesResponse: requestQuotesResponse,
            acceptQuotesResponse: acceptQuotesResponseError,
        })

        let caughtError: Error | undefined = undefined;

        // ### act
        try {
            await pacs008Handler.processTransferRequest(ctx as any);
        } catch (error) {
            caughtError = error;
        }

        // ### Test
        expect(caughtError).toEqual(acceptQuotesResponseError);
        expect(ctx.state.logger.error).toBeCalledWith(acceptQuotesResponseError);

        expect(MockedOutboundRequester.mock.results[0].value.requestQuotes).toBeCalledWith(postQuotesBody);

        expect(MockedOutboundRequester.mock.results[0].value.acceptQuotes).toBeCalled();

        expect(MockedInboundRequester.mock.results[0].value.sendPACS002toSenderBackend).toBeCalled();
        const mockedSendPACS002toSenderBackendCalledArg = MockedInboundRequester.mock.results[0].value.sendPACS002toSenderBackend.mock.calls[0][0]
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

        const requestQuotesResponse: AxiosResponse = {
            data: { currentState: TransferStatus.WAITING_FOR_QUOTE_ACCEPTANCE, transferId } as unknown as IPostQuotesResponseBody,
            status: 200,
            statusText: 'OK',
            config: {},
            headers: {},
        };

        const acceptQuotesResponse: AxiosResponse = {
            data: {
                statusCode: '500',
                message: "this is an error",
                transferState: { currentState: TransferStatus.ERROR_OCCURRED, quoteRequestExtensions },
            } as unknown as ITransferError,
            status: 200,
            statusText: 'OK',
            config: {},
            headers: {},
        };

        mockInboundRequesterHelper(MockedInboundRequester);

        mockOutboundRequesterHelper(MockedOutboundRequester, {
            requestQuotesResponse: requestQuotesResponse,
            acceptQuotesResponse: acceptQuotesResponse,
        })

        let caughtError: Error | undefined = undefined;
        
        // ### act
        try {
            await pacs008Handler.processTransferRequest(ctx as any);
        } catch (error) {
            caughtError = error;
        }

        // ### Test
        expect(caughtError).toBeTruthy();

        expect(ctx.state.logger.error).toBeCalledWith(caughtError);

        expect(MockedOutboundRequester.mock.results[0].value.requestQuotes).toBeCalledWith(postQuotesBody);

        expect(MockedOutboundRequester.mock.results[0].value.acceptQuotes).toBeCalled();

        expect(MockedInboundRequester.mock.results[0].value.sendPACS002toSenderBackend).toBeCalled();
        const mockedSendPACS002toSenderBackendCalledArg = MockedInboundRequester.mock.results[0].value.sendPACS002toSenderBackend.mock.calls[0][0]
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

        const requestQuotesResponse: AxiosResponse = {
            data: { currentState: TransferStatus.WAITING_FOR_QUOTE_ACCEPTANCE, transferId } as unknown as IPostQuotesResponseBody,
            status: 200,
            statusText: 'OK',
            config: {},
            headers: {},
        };

        const acceptQuotesResponse: AxiosResponse = {
            data: {
                currentState: TransferStatus.COMPLETED,
                transferId,
                quoteRequestExtensions
            } as unknown as ITransferSuccess,
            status: 200,
            statusText: 'OK',
            config: {},
            headers: {},
        };

        mockInboundRequesterHelper(MockedInboundRequester);

        mockOutboundRequesterHelper(MockedOutboundRequester, {
            requestQuotesResponse: requestQuotesResponse,
            acceptQuotesResponse: acceptQuotesResponse,
        })

        let caughtError: Error | undefined = undefined;
        
        // ### act
        try {
            await pacs008Handler.processTransferRequest(ctx as any);
        } catch (error) {
            caughtError = error;
        }

        // ### Test
        expect(caughtError).toBeUndefined();
        expect(MockedOutboundRequester.mock.results[0].value.requestQuotes).toBeCalledWith(postQuotesBody);

        expect(MockedOutboundRequester.mock.results[0].value.acceptQuotes).toBeCalledWith(acceptQuotesResponse.data.transferId as string, { acceptQuote: true });

        expect(MockedInboundRequester.mock.results[0].value.sendPACS002toSenderBackend).toBeCalled();
        const mockedSendPACS002toSenderBackendCalledArg = MockedInboundRequester.mock.results[0].value.sendPACS002toSenderBackend.mock.calls[0][0]
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

        const requestQuotesResponse: AxiosResponse = {
            data: { currentState: TransferStatus.WAITING_FOR_QUOTE_ACCEPTANCE, transferId } as unknown as IPostQuotesResponseBody,
            status: 200,
            statusText: 'OK',
            config: {},
            headers: {},
        };

        const acceptQuotesResponse: AxiosResponse = {
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
            } as ITransferError,
            status: 200,
            statusText: 'OK',
            config: {},
            headers: {},
        };

        mockInboundRequesterHelper(MockedInboundRequester);

        mockOutboundRequesterHelper(MockedOutboundRequester, {
            requestQuotesResponse: requestQuotesResponse,
            acceptQuotesResponse: acceptQuotesResponse,
        })

        let caughtError: Error | undefined = undefined;
        
        // ### act
        try {
            await pacs008Handler.processTransferRequest(ctx as any);
        } catch (error) {
            caughtError = error;
        }

        // ### Test
        expect(caughtError).toBeTruthy();

        expect(MockedOutboundRequester.mock.results[0].value.requestQuotes).toBeCalledWith(postQuotesBody);
        
        expect(MockedOutboundRequester.mock.results[0].value.acceptQuotes).toBeCalledWith(requestQuotesResponse.data.transferId as string, { acceptQuote: true });
        
        expect(MockedInboundRequester.mock.results[0].value.sendPACS002toSenderBackend).toBeCalled();
        const mockedSendPACS002toSenderBackendCalledArg = MockedInboundRequester.mock.results[0].value.sendPACS002toSenderBackend.mock.calls[0][0]
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
