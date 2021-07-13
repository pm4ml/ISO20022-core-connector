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
import { IPartiesByIdParams, IPostQuotesBody, ITransferContinuationQuote } from '../../interfaces';

const request = axios.create({
    baseURL: Config.outboundEndpoint,
    timeout: Config.requestTimeout,
});

/**
 * Utility method to build a set of headers required by the SDK outbound API
 *
 * @returns {object} - Object containing key/value pairs of HTTP headers
 */
export const buildHeaders = (): Record<string, any> => {
    const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Date: new Date().toUTCString(),
    };

    return headers;
};

export const getParties = (params: IPartiesByIdParams): Promise<AxiosResponse<any>> => request.get(`/parties/${params.idType}/${params.idValue}`, { headers: buildHeaders() });
export const requestQuotes = (postQuotesBody: IPostQuotesBody): Promise<AxiosResponse<any>> => request.post('/transfers', postQuotesBody, { headers: buildHeaders() });
export const acceptQuotes = (transferId: string, acceptQuotesBody: ITransferContinuationQuote): Promise<AxiosResponse<any>> => request.put(`/transfers/${transferId}`, acceptQuotesBody, { headers: buildHeaders() });
