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
import { Config } from '../../config';

const request = axios.create({
    baseURL: Config.backendEndpoint,
    timeout: Config.requestTimeout,
});

/**
  * Utility method to build a set of headers required by the ISO inbound API
  *
  * @returns {object} - Object containing key/value pairs of HTTP headers
  */
export const buildHeaders = (): Record<string, any> => {
    const headers = {
        'Content-Type': 'application/xml',
        Accept: 'application/xml',
        Date: new Date().toUTCString(),
    };

    return headers;
};

// Send request to external ISO switch (e.g. RSWITCH)
export const requestBackendTransfers = (postTransfersBody: string): Promise<AxiosResponse<any>> => request.post('/transfers', postTransfersBody, { headers: buildHeaders() });
