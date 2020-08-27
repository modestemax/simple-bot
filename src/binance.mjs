import axios from 'axios';
import qs from 'qs'
import {config} from "./db/firestore.mjs";
import crypto from 'crypto'

export class Binance {
    #baseUrl = 'https://api.binance.com';

    auth = {
        "api_key": "NdL85o6LGLr3hnj0PIzftfypuibmMCTUE1vsYRiLD4UbfEOgp6sbphJxEpthSuOF",
        "secret": "dZWL1Snb2z2ZAFFYqrFi0DBLziptWoNbdzNvxr6pWVjC3c2kMqncdVE6S71yC9HO"
    };

    init(auth) {
        this.auth = auth
    }

    getHmacSignature(queryString) {

        // const auth=config.auth

        const secret = this.auth.secret;
        const hash = crypto.createHmac('sha256', secret)
            .update(queryString)
            .digest('hex');
        return hash;
    }

    async getBalances() {
        const url = `${this.#baseUrl}/api/v3/account`
        const params = {timestamp: Date.now()}
        const signature = this.getHmacSignature(qs.stringify(params))

        return await axios.get(url, {
            params: {...params, signature},
            headers: {'X-MBX-APIKEY': this.auth.api_key},

        })
    }

    async ping() {
        const url = `${this.#baseUrl}/api/v3/exchangeInfo`
        return await axios.get(url);
    }
}

export const api = new Binance()