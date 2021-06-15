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
import { IPostTransfersRequestBody } from '~/interfaces';
import { Config } from '~/config';

const request = axios.create({
    baseURL: Config.outboundEndpoint,
});

/**
 * Utility method to build a set of headers required by the SDK outbound API
 *
 * @returns {object} - Object containing key/value pairs of HTTP headers
 */
const buildHeaders = () => {
    const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Date: new Date().toUTCString(),
    };

    return headers;
};

// export const postQuotes = (quotesBody: IPostQuotesRequestBody): Promise<AxiosResponse<any>> => request.post('/quotes', quotesBody, { headers: buildHeaders() });
export const postTransfers = (transfersBody: IPostTransfersRequestBody): Promise<AxiosResponse<any>> => request.post('/transfers', transfersBody, { headers: buildHeaders() });
