import { CrawlerConfig } from '../types';

export function loadConfig(): CrawlerConfig {
    // Read proxy from standard environment variables (HTTP_PROXY, HTTPS_PROXY) or fallback to PROXY_URL
    // Priority: HTTPS_PROXY > HTTP_PROXY > PROXY_URL
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.PROXY_URL || undefined;

    // Parse proxy list if provided (comma-separated)
    const proxyListEnv = process.env.PROXY_LIST;
    const proxyList = proxyListEnv
        ? proxyListEnv.split(',').map((p) => p.trim()).filter((p) => p.length > 0)
        : undefined;

    const config: CrawlerConfig = {
        baseUrl: process.env.BASE_URL || 'https://www.carzone.ie',
        maxPages: parseInt(process.env.MAX_PAGES || '200', 10),
        outputDir: process.env.OUTPUT_DIR || '/app/output',
        proxyUrl,
        proxyList,
        crawlDelay: parseInt(process.env.CRAWL_DELAY || '1000', 10),
        timeout: parseInt(process.env.TIMEOUT || '30000', 10),
        maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
        retryDelay: parseInt(process.env.RETRY_DELAY || '2000', 10),
        userAgentRotation: process.env.USER_AGENT_ROTATION === 'true',
        debug: process.env.DEBUG === 'true',
    };

    // Validation
    if (config.maxPages <= 0) {
        throw new Error('MAX_PAGES must be greater than 0');
    }

    if (config.crawlDelay < 0) {
        throw new Error('CRAWL_DELAY must be greater than or equal to 0');
    }

    if (config.maxRetries < 0) {
        throw new Error('MAX_RETRIES must be greater than or equal to 0');
    }

    return config;
}

