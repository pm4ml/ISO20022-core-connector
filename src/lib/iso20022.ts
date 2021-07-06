/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Steven Oderayi - steven.oderayi@modusbox.com                     *
 **************************************************************************/

import { v4 as uuidv4 } from 'uuid';

const pad = (n: number): string => (n < 10 ? '0' : '') + n;
const dateString = (dt: Date): string => `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}${pad(dt.getHours())}${pad(dt.getMinutes())}${pad(dt.getSeconds())}`;

/**
 * Generates ISO20022-compatible unique ID (beta)
 * Scheme: "RNDPS/yyyymmddhhmmss<first 8 characters of a random UUID>
 * @returns {string}
 */
export const generateMsgId = (): string => `RNDS/${dateString(new Date())}${uuidv4().slice(0, 8)}`;
