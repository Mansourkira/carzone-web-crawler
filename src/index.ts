import { loadConfig } from './config';
import { Fetcher } from './fetcher';
import { FileManager } from './file-manager';
import { Crawler } from './crawler';
import { Logger } from './utils/logger';

async function main(): Promise<void> {
  const logger = new Logger();

  try {
    // Load configuration from environment variables
    const config = loadConfig();
    logger.info('Configuration loaded successfully');

    // Initialize components
    const fetcher = new Fetcher(config);
    const fileManager = new FileManager(config.outputDir);
    const crawler = new Crawler(config, fetcher, fileManager);

    // Start crawling
    const stats = await crawler.start();

    // Log final statistics
    logger.info('=== Crawl Statistics ===');
    logger.info(`Pages crawled: ${stats.pagesCrawled}`);
    logger.info(`Pages failed: ${stats.pagesFailed}`);
    if (stats.endTime) {
      const duration =
        (stats.endTime.getTime() - stats.startTime.getTime()) / 1000;
      logger.info(`Duration: ${duration.toFixed(2)}s`);
    }

    process.exit(0);
  } catch (error) {
    logger.error(`Fatal error: ${error}`);
    if (error instanceof Error && error.stack) {
      logger.error(error.stack);
    }
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the application
main();

