export interface CrawlerConfig {
  baseUrl: string;
  maxPages: number;
  outputDir: string;
  proxyUrl?: string;
  proxyList?: string[]; // For proxy rotation
  crawlDelay: number;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  userAgentRotation: boolean;
  debug?: boolean;
}

export interface CrawledPage {
  url: string;
  html: string;
  filename: string;
  timestamp: Date;
}

export interface CrawlerStats {
  pagesCrawled: number;
  pagesFailed: number;
  startTime: Date;
  endTime?: Date;
}

