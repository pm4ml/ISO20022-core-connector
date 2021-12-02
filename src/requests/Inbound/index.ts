/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Shashikant Hirugade - shashikant.hirugade@modusbox.com                     *
 **************************************************************************/

import axios, { AxiosResponse } from 'axios';
import { IErrorInformation, ITransferFulfilment } from '../../interfaces';
import { Config } from '../../config';
import { buildJSONHeaders, buildXMLHeaders } from '../headers';

const request = axios.create({
    baseURL: Config.backendEndpoint,
    timeout: Config.requestTimeout,
});

// Send request to external ISO switch (e.g. RSWITCH)
export const sendPACS008toReceiverBackend = (postTransfersBody: string): Promise<AxiosResponse<any>> => request.post('/transfers', postTransfersBody, { headers: buildXMLHeaders() });
export const sendPACS002toSenderBackend = (xmlBody: string): Promise<AxiosResponse<any>> => request.post('/transfers', xmlBody, { headers: buildXMLHeaders() });
export const acceptBackendTransfers = (transferId: string, putTransfersBody: ITransferFulfilment): Promise<AxiosResponse<any>> => request.post(`/transfers/${transferId}`, putTransfersBody, { headers: buildJSONHeaders() });
export const sendTransfersError = (transferId: string, putTransfersErrorBody: IErrorInformation): Promise<AxiosResponse<any>> => request.post(`/transfers/${transferId}/error`, putTransfersErrorBody, { headers: buildJSONHeaders() });
