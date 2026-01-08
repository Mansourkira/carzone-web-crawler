import * as cheerio from 'cheerio';
import { Fetcher } from '../fetcher';
import { FileManager } from '../file-manager';
import { CrawlerConfig, CrawledPage, CrawlerStats } from '../types';
import { Logger } from '../utils/logger';

export class Crawler {
  private config: CrawlerConfig;
  private fetcher: Fetcher;
  private fileManager: FileManager;
  private logger: Logger;
  private crawledUrls: Set<string> = new Set();
  private queue: string[] = [];
  private stats: CrawlerStats;

  constructor(config: CrawlerConfig, fetcher: Fetcher, fileManager: FileManager) {
    this.config = config;
    this.fetcher = fetcher;
    this.fileManager = fileManager;
    this.logger = new Logger();
    this.stats = {
      pagesCrawled: 0,
      pagesFailed: 0,
      startTime: new Date(),
    };
  }

  private isValidUrl(url: string): boolean {
    if (this.crawledUrls.has(url)) {
      return false;
    }

    try {
      const urlObj = new URL(url);
      const baseUrlObj = new URL(this.config.baseUrl);

      // Must be from the same domain
      if (urlObj.hostname !== baseUrlObj.hostname) {
        return false;
      }

      // Exclude certain patterns
      const excludedPatterns = [
        '/api/',
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.pdf',
        '.css',
        '.js',
        'mailto:',
        'tel:',
        'javascript:',
        '#',
        '/login',
        '/register',
        '/signin',
        '/signup',
        '/contact',
        '/about',
        '/terms',
        '/privacy',
      ];

      const urlLower = url.toLowerCase();
      for (const pattern of excludedPatterns) {
        if (urlLower.includes(pattern)) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  private normalizeUrl(url: string): string {
    try {
      if (!url.startsWith('http')) {
        url = new URL(url, this.config.baseUrl).href;
      }
      const urlObj = new URL(url);
      urlObj.hash = ''; // Remove hash
      return urlObj.href.replace(/\/$/, ''); // Remove trailing slash
    } catch {
      return url;
    }
  }

  private extractLinks(html: string, currentUrl: string): string[] {
    const $ = cheerio.load(html);
    const links: string[] = [];

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;

      try {
        const absoluteUrl = new URL(href, currentUrl).href;
        const normalizedUrl = this.normalizeUrl(absoluteUrl);

        if (this.isValidUrl(normalizedUrl)) {
          links.push(normalizedUrl);
        }
      } catch {
        // Ignore invalid URLs
      }
    });

    return [...new Set(links)]; // Remove duplicates
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async crawlPage(url: string): Promise<string[]> {
    if (this.crawledUrls.has(url) || this.stats.pagesCrawled >= this.config.maxPages) {
      return [];
    }

    const normalizedUrl = this.normalizeUrl(url);

    try {
      this.logger.info(`Crawling: ${normalizedUrl}`);

      // Get referer from last crawled page if available
      const referer =
        this.crawledUrls.size > 0
          ? Array.from(this.crawledUrls)[this.crawledUrls.size - 1]
          : undefined;

      const html = await this.fetcher.fetch(normalizedUrl, referer);

      // Generate filename and save
      const filename = this.fileManager.generateFilename(
        normalizedUrl,
        this.stats.pagesCrawled + 1
      );
      const page: CrawledPage = {
        url: normalizedUrl,
        html,
        filename,
        timestamp: new Date(),
      };

      await this.fileManager.savePage(page);
      this.crawledUrls.add(normalizedUrl);
      this.stats.pagesCrawled++;

      this.logger.info(
        `Page saved: ${filename} (${this.stats.pagesCrawled}/${this.config.maxPages})`
      );

      if (this.stats.pagesCrawled >= this.config.maxPages) {
        return [];
      }

      // Extract links
      const links = this.extractLinks(html, normalizedUrl);

      // Delay before next request
      if (this.config.crawlDelay > 0) {
        await this.delay(this.config.crawlDelay);
      }

      return links;
    } catch (error) {
      this.stats.pagesFailed++;
      this.logger.error(`Error crawling ${normalizedUrl}: ${error}`);
      return [];
    }
  }

  async start(startUrls?: string[]): Promise<CrawlerStats> {
    // Initialize output directory
    await this.fileManager.initialize();

    // Set default start URLs if not provided
    const initialUrls =
      startUrls || [
        `${this.config.baseUrl}/`,
        `${this.config.baseUrl}/used-cars`,
      ];

    // Add initial URLs to queue
    for (const url of initialUrls) {
      const normalizedUrl = this.normalizeUrl(url);
      if (this.isValidUrl(normalizedUrl)) {
        this.queue.push(normalizedUrl);
      }
    }

    this.logger.info(`Starting crawl with ${this.queue.length} initial URLs`);

    // Log proxy configuration (hide credentials for security)
    const proxyUrl = this.config.proxyUrl;
    if (proxyUrl) {
      try {
        const url = new URL(proxyUrl);
        // Hide credentials in log output
        const safeProxyUrl = url.username
          ? `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`
          : proxyUrl;
        this.logger.info(`Using proxy: ${safeProxyUrl}`);
      } catch {
        this.logger.info(`Using proxy: ${proxyUrl}`);
      }
    } else {
      this.logger.warn('No proxy configured. Using direct connection.');
    }

    // Main crawling loop
    while (this.queue.length > 0 && this.stats.pagesCrawled < this.config.maxPages) {
      const currentUrl = this.queue.shift()!;

      if (this.crawledUrls.has(currentUrl)) {
        continue;
      }

      const newLinks = await this.crawlPage(currentUrl);

      // Add new links to queue
      for (const link of newLinks) {
        if (!this.crawledUrls.has(link) && !this.queue.includes(link)) {
          this.queue.push(link);
        }
      }

      this.logger.info(
        `Progress: ${this.stats.pagesCrawled}/${this.config.maxPages} pages crawled, ${this.queue.length} in queue`
      );
    }

    this.stats.endTime = new Date();
    const duration = this.stats.endTime.getTime() - this.stats.startTime.getTime();

    this.logger.info(
      `Crawl completed! ${this.stats.pagesCrawled} pages saved in ${(duration / 1000).toFixed(2)}s`
    );

    return this.stats;
  }
}

