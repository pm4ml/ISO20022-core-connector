/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/

import axios, { AxiosResponse } from 'axios';
import { Config } from '../../config';
import {
    IPartiesByIdParams,
    IPostQuotesBody,
    ITransferContinuationQuote,
    // ITransferFulfilment,
} from '../../interfaces';
import { buildJSONHeaders } from '../headers';

const request = axios.create({
    baseURL: Config.outboundEndpoint,
    timeout: Config.requestTimeout,
});

export const buildHeaders = buildJSONHeaders;
export const getParties = (params: IPartiesByIdParams): Promise<AxiosResponse<any>> => request.get(`/parties/${params.idType}/${params.idValue}`, { headers: buildJSONHeaders() });
export const requestQuotes = (postQuotesBody: IPostQuotesBody): Promise<AxiosResponse<any>> => request.post('/transfers', postQuotesBody, { headers: buildJSONHeaders() });
export const acceptQuotes = (transferId: string, acceptQuotesBody: ITransferContinuationQuote): Promise<AxiosResponse<any>> => request.put(`/transfers/${transferId}`, acceptQuotesBody, { headers: buildJSONHeaders() });
