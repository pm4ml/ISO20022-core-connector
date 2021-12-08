/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Shashikant Hirugade - shashikant.hirugade@modusbox.com           *
 *       Miguel de Barros - miguel.de.barros@modusbox.com                 *
 **************************************************************************/

import { AxiosResponse } from 'axios';
import { IErrorInformation, ITransferFulfilment } from '../../interfaces';
import { buildJSONHeaders, buildXMLHeaders } from '../headers';
import { BaseRequester } from '../baseRequester';

export default class Requester extends BaseRequester {
    sendPACS008toReceiverBackend = (postTransfersBody: string): Promise<AxiosResponse<any>> => this.axiosInstance.post('', postTransfersBody, { headers: buildXMLHeaders() });

    sendPACS002toSenderBackend = (xmlBody: string): Promise<AxiosResponse<any>> => this.axiosInstance.post('', xmlBody, { headers: buildXMLHeaders() });

    acceptBackendTransfers = (transferId: string, putTransfersBody: ITransferFulfilment): Promise<AxiosResponse<any>> => this.axiosInstance.post(`/transfers/${transferId}`, putTransfersBody, { headers: buildJSONHeaders() });

    sendTransfersError = (transferId: string, putTransfersErrorBody: IErrorInformation): Promise<AxiosResponse<any>> => this.axiosInstance.post(`/transfers/${transferId}/error`, putTransfersErrorBody, { headers: buildJSONHeaders() });
}
