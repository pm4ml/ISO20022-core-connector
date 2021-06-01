/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2021 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Matt Kingston - matt.kingston@modusbox.com                       *
 **************************************************************************/

import words from './words';

const randomEl = (arr: Array<string>) => arr[Math.floor(Math.random() * arr.length)];

export default function randomPhrase(separator = '-'): string {
    return [
        randomEl(words.adjectives),
        randomEl(words.nouns),
        randomEl(words.adjectives),
        randomEl(words.nouns),
    ].join(separator);
}
