/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 *                                                                        *
 *  CONTRIBUTORS:                                                         *
 *       miguel de Barros - miguel.de.barros@modusbox.com                 *
 **************************************************************************/

import { AxiosResponse } from 'axios';
import {
    IPartiesByIdParams,
    IPostQuotesBody,
    ITransferContinuationQuote,
} from '../../interfaces';
import { buildJSONHeaders } from '../headers';
import { BaseRequester } from '../baseRequester';

export default class Requester extends BaseRequester {
    getParties = (params: IPartiesByIdParams): Promise<AxiosResponse<any>> => this.axiosInstance.get(`/parties/${params.idType}/${params.idValue}`, { headers: buildJSONHeaders() });

    requestQuotes = (postQuotesBody: IPostQuotesBody): Promise<AxiosResponse<any>> => this.axiosInstance.post('/transfers', postQuotesBody, { headers: buildJSONHeaders() });

    acceptQuotes = (transferId: string, acceptQuotesBody: ITransferContinuationQuote): Promise<AxiosResponse<any>> => this.axiosInstance.put(`/transfers/${transferId}`, acceptQuotesBody, { headers: buildJSONHeaders() });
}
