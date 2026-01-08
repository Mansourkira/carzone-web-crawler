import * as fs from 'fs/promises';
import * as path from 'path';
import { CrawledPage } from '../types';

export class FileManager {
    private outputDir: string;

    constructor(outputDir: string) {
        this.outputDir = outputDir;
    }

    async initialize(): Promise<void> {
        try {
            await fs.mkdir(this.outputDir, { recursive: true });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to create output directory: ${errorMessage}`);
        }
    }

    generateFilename(url: string, index: number): string {
        try {
            const urlObj = new URL(url);
            let filename = urlObj.pathname
                .replace(/^\//, '')
                .replace(/\//g, '_')
                .replace(/[^a-zA-Z0-9_-]/g, '_');

            if (!filename || filename.length === 0) {
                filename = 'index';
            }

            // Add query params if present
            if (urlObj.search) {
                const queryPart = urlObj.search
                    .substring(1)
                    .replace(/[=&]/g, '_')
                    .substring(0, 50);
                filename = `${filename}_${queryPart}`;
            }

            // Ensure unique filename
            filename = `${index.toString().padStart(4, '0')}_${filename}`;
            filename = filename.substring(0, 200); // Limit length

            if (!filename.endsWith('.html')) {
                filename += '.html';
            }

            return filename;
        } catch (error) {
            // Fallback filename if URL parsing fails
            return `${index.toString().padStart(4, '0')}_page.html`;
        }
    }

    async savePage(page: CrawledPage): Promise<void> {
        const filePath = path.join(this.outputDir, page.filename);

        try {
            await fs.writeFile(filePath, page.html, 'utf-8');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to save page to ${filePath}: ${errorMessage}`);
        }
    }

    async fileExists(filename: string): Promise<boolean> {
        const filePath = path.join(this.outputDir, filename);
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}

