
/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Miguel de Barros - miguel.de.barros@modusbox.com                 *
 **************************************************************************/

import * as util from 'util';
import axios, {
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
} from 'axios';
import { Logger } from '@mojaloop/sdk-standard-components';

export type RequesterOptions = {
    baseURL: string;
    timeout: number | undefined;
    logger: Logger.Logger;
};

export abstract class BaseRequester {
    protected options: RequesterOptions;

    protected axiosInstance: AxiosInstance;

    constructor(ops: RequesterOptions) {
        this.options = { ...ops };

        // create axios instance
        this.axiosInstance = axios.create({
            baseURL: ops.baseURL,
            timeout: ops.timeout,
        });

        // add interceptor to log request
        this.axiosInstance.interceptors.request.use((req: AxiosRequestConfig) => {
            this.options.logger.push({
                axiosRequest: {
                    baseURL: req?.baseURL,
                    url: req?.url,
                    method: req?.method,
                    headers: req?.headers,
                    data: util.inspect(req?.data),
                },
            }).log('AxiosRequest');
            return req;
        });

        // add interceptor to log response
        this.axiosInstance.interceptors.response.use((res: AxiosResponse) => {
            this.options.logger.push({
                axiosResponse: {
                    status: res?.status,
                    headers: res?.headers,
                    data: util.inspect(res?.data),
                },
            }).log('AxiosResponse');
            return res;
        });
    }
}
