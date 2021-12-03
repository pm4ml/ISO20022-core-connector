/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *      Miguel de Barros - miguel.debarros@modusbox.com                   *
 **************************************************************************/

// @ts-nocheck11

'use strict'

import fs from 'fs';
import * as path from 'path';
import * as pacs02Handler from '../../../../handlers/Outbound/pacs002Handler';
import {
    XML,
    // XSD,
} from '../../../../lib/xmlUtils';
import Cache from '../../../../lib/cache';
import { IExtensionItem, ITransferFulfilment, MojaloopTransferState } from '../../../../interfaces';
import { ChannelTypeEnum } from '../../../../lib/callbackHandler';
jest.mock('../../../../lib/cache');

const XmlFileMap = {
    PACS_002_001_10: {
        valid: {
            accepted: '../../data/pacs.002.outgoing.valid.accepted.xml',
            rejected: '../../data/pacs.002.outgoing.valid.rejected.xml',
        },
        invalid: '../../data/pacs.002.outgoing.invalid.xml',
    },
};

interface ITestData {
    ctx: any,
    xmlStr: string,
};

const getTestData = (importXmlFile: string = '../../data/pacs.002.outgoing.valid.accepted.xml'): ITestData => {
    let ctx: any;
    let xmlStr: string;

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
            },
            cache: new Cache(),
        },
        response: { type: null, status: null, body: '', data: {} as any }
    };
    ctx.request.body = XML.fromXml(xmlStr) as any;
    ctx.request.rawBody = xmlStr;

    return {
        ctx,
        xmlStr,
    }
}


describe('pacs008Handler', () => {

    beforeAll(async () => {
    })

    beforeEach(async () => {
    })

    afterEach(async () => {
        jest.resetAllMocks();
    })

    it('should initiate publish of transferResponse request with COMMITTED', async () => {
        // ### setup
        (Cache as jest.Mock).mockImplementation(() => {
            return {
                publish: jest.fn().mockResolvedValue(true),
            };
        });

        const { ctx } = getTestData(XmlFileMap.PACS_002_001_10.valid.accepted);

        // ### act
        await pacs02Handler.default(ctx as any);

        // ### test
        const publishArgs = {
            key: ctx.state.cache.publish.mock.calls[0][0],
            msg: ctx.state.cache.publish.mock.calls[0][1],
        };

        const msgId = ctx.request.body?.Document?.FIToFIPmtStsRpt?.GrpHdr?.MsgId
        const orgnlInstrId = ctx.request.body?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlInstrId
        const endToEndId = ctx.request.body?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlEndToEndId
        const putTransfersBody = publishArgs.msg.data as ITransferFulfilment;

        expect(publishArgs.msg.type).toEqual(ChannelTypeEnum.PACS02RESPONSETOPACS008);
        expect(putTransfersBody.transferState).toEqual(MojaloopTransferState.COMMITTED);
        expect(getExtensionKeyValue('MSGID',putTransfersBody?.extensionList)?.value).toEqual(msgId);
        expect(getExtensionKeyValue('INSTRID',putTransfersBody?.extensionList)?.value).toEqual(orgnlInstrId);
        expect(getExtensionKeyValue('ENDTOENDID',putTransfersBody?.extensionList)?.value).toEqual(endToEndId);
        expect(ctx.state.cache.publish).toBeCalled();
        expect(ctx.response.type).toEqual('application/xml');
        expect(ctx.response.body).toEqual('');
        expect(ctx.response.status).toEqual(200);
    });

    it('should initiate publish of transferResponse request with ABORTED', async () => {
        // ### setup
        (Cache as jest.Mock).mockImplementation(() => {
            return {
                publish: jest.fn().mockResolvedValue(true),
            };
        });

        const { ctx } = getTestData(XmlFileMap.PACS_002_001_10.valid.rejected);

        // ### act
        await pacs02Handler.default(ctx as any);

        // ### test
        const publishArgs = {
            key: ctx.state.cache.publish.mock.calls[0][0],
            msg: ctx.state.cache.publish.mock.calls[0][1],
        };

        const msgId = ctx.request.body?.Document?.FIToFIPmtStsRpt?.GrpHdr?.MsgId
        const orgnlInstrId = ctx.request.body?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlInstrId
        const endToEndId = ctx.request.body?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlEndToEndId
        const putTransfersBody = publishArgs.msg.data as ITransferFulfilment;

        expect(publishArgs.msg.type).toEqual(ChannelTypeEnum.PACS02RESPONSETOPACS008);
        expect(putTransfersBody.transferState).toEqual(MojaloopTransferState.ABORTED);
        expect(getExtensionKeyValue('MSGID',putTransfersBody?.extensionList)?.value).toEqual(msgId);
        expect(getExtensionKeyValue('INSTRID',putTransfersBody?.extensionList)?.value).toEqual(orgnlInstrId);
        expect(getExtensionKeyValue('ENDTOENDID',putTransfersBody?.extensionList)?.value).toEqual(endToEndId);
        expect(ctx.state.cache.publish).toBeCalled();
        expect(ctx.response.type).toEqual('application/xml');
        expect(ctx.response.body).toEqual('');
        expect(ctx.response.status).toEqual(200);
    });

    it('should initiate publish of transferResponse request with cache publish error', async () => {
        // ### setup
        (Cache as jest.Mock).mockImplementation(() => {
            return {
                publish: jest.fn().mockRejectedValue(new Error('Connection Error!')),
            };
        });

        const { ctx } = getTestData(XmlFileMap.PACS_002_001_10.valid.rejected);

        // ### act
        await pacs02Handler.default(ctx as any);

        // ### test
        const publishArgs = {
            key: ctx.state.cache.publish.mock.calls[0][0],
            msg: ctx.state.cache.publish.mock.calls[0][1],
        };

        const msgId = ctx.request.body?.Document?.FIToFIPmtStsRpt?.GrpHdr?.MsgId
        const orgnlInstrId = ctx.request.body?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlInstrId
        const endToEndId = ctx.request.body?.Document?.FIToFIPmtStsRpt?.TxInfAndSts?.OrgnlEndToEndId
        const putTransfersBody = publishArgs.msg.data as ITransferFulfilment;

        expect(publishArgs.msg.type).toEqual(ChannelTypeEnum.PACS02RESPONSETOPACS008);
        expect(putTransfersBody.transferState).toEqual(MojaloopTransferState.ABORTED);
        expect(getExtensionKeyValue('MSGID',putTransfersBody?.extensionList)?.value).toEqual(msgId);
        expect(getExtensionKeyValue('INSTRID',putTransfersBody?.extensionList)?.value).toEqual(orgnlInstrId);
        expect(getExtensionKeyValue('ENDTOENDID',putTransfersBody?.extensionList)?.value).toEqual(endToEndId);
        expect(ctx.state.cache.publish).toBeCalled();
        expect(ctx.response.type).toEqual('application/xml');
        expect(ctx.response.body).toEqual('');
        expect(ctx.response.status).toEqual(500);
    });
});
