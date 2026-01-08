import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';
import { CrawlerConfig } from '../types';

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export class Fetcher {
    private config: CrawlerConfig;
    private axiosInstance: AxiosInstance;
    private currentProxyIndex: number = 0;

    constructor(config: CrawlerConfig) {
        this.config = config;
        const proxyUrl = this.getCurrentProxy();
        this.axiosInstance = this.createAxiosInstance(proxyUrl);
    }

    private getCurrentProxy(): string | undefined {
        if (this.config.proxyList && this.config.proxyList.length > 0) {
            const proxy = this.config.proxyList[this.currentProxyIndex];
            this.currentProxyIndex = (this.currentProxyIndex + 1) % this.config.proxyList.length;
            return proxy;
        }
        return this.config.proxyUrl;
    }

    private createAxiosInstance(proxyUrl?: string): AxiosInstance {
        const axiosConfig: AxiosRequestConfig = {
            timeout: this.config.timeout,
            headers: this.getHeaders(),
            maxRedirects: 10,
            validateStatus: (status: number) => status < 500,
            decompress: true,
        };

        if (proxyUrl) {
            try {
                const url = new URL(proxyUrl);
                if (url.protocol === 'https:' || url.protocol === 'http:') {
                    axiosConfig.httpsAgent = new HttpsProxyAgent(proxyUrl);
                    axiosConfig.httpAgent = new HttpProxyAgent(proxyUrl);
                }
            } catch (error) {
                console.warn(`Invalid proxy URL: ${proxyUrl}, using direct connection`);
            }
        }

        return axios.create(axiosConfig);
    }

    private getHeaders(): Record<string, string> {
        return {
            'User-Agent': DEFAULT_USER_AGENT,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            Connection: 'keep-alive',
        };
    }

    async fetch(url: string, referer?: string, retryCount: number = 0): Promise<string> {
        if (this.config.debug || process.env.DEBUG === 'true') {
            const proxyUrl = this.getCurrentProxy();
            console.log(`[DEBUG] Fetching ${url} via proxy: ${proxyUrl ? 'YES' : 'NO'}, retry: ${retryCount}`);
        }

        try {
            const headers: Record<string, string> = { ...this.getHeaders() };
            if (referer) {
                headers.Referer = referer;
            }

            const response = await this.axiosInstance.get(url, {
                headers,
                maxRedirects: 10,
                decompress: true,
            });

            if (this.config.debug || process.env.DEBUG === 'true') {
                console.log(`[DEBUG] Response status: ${response.status}, headers:`, Object.keys(response.headers));
            }

            // 403 is terminal - do not retry
            if (response.status === 403) {
                throw new Error(`HTTP 403: Forbidden`);
            }

            // Handle other 4xx errors (except 429 which is handled in catch block)
            if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Retry on 5xx server errors
            if (response.status >= 500) {
                if (retryCount < this.config.maxRetries) {
                    await this.delay(this.config.retryDelay * (retryCount + 1));
                    return this.fetch(url, referer, retryCount + 1);
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return response.data;
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    const status = error.response.status;

                    // 403 is terminal - do not retry
                    if (status === 403) {
                        throw new Error(`HTTP 403: Forbidden`);
                    }

                    // Retry on 429 (rate limit) or 5xx errors
                    if (retryCount < this.config.maxRetries &&
                        (status === 429 || status >= 500)) {
                        await this.delay(this.config.retryDelay * (retryCount + 1));
                        return this.fetch(url, referer, retryCount + 1);
                    }

                    throw new Error(`HTTP ${status}: ${error.response.statusText}`);
                }

                // Retry on network errors
                if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                    if (retryCount < this.config.maxRetries) {
                        await this.delay(this.config.retryDelay * (retryCount + 1));
                        return this.fetch(url, referer, retryCount + 1);
                    }
                    throw new Error(
                        `${error.code}: ${error.message}. Check proxy settings or network connection.`
                    );
                }
            }

            if (error instanceof Error) {
                throw error;
            }
            throw new Error(`Unknown error: ${String(error)}`);
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
