/**
 * Web Scraping Module
 *
 * Provides browser automation and data extraction using Puppeteer and Playwright
 */

export type ScrapingEngine = 'puppeteer' | 'playwright' | 'cheerio';

export interface ScrapingModuleConfig {
  engine: ScrapingEngine;
  features?: Array<'screenshots' | 'pdf-generation' | 'form-automation' | 'data-extraction' | 'monitoring'>;
}

export interface ScrapingModuleOutput {
  files: Array<{ path: string; content: string }>;
  envVars: string[];
  dependencies: string[];
  instructions: string[];
}

const puppeteerTemplate = `import puppeteer, { Browser, Page } from 'puppeteer';

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browser;
}

export async function scrapeWebsite(url: string): Promise<any> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });

    const data = await page.evaluate(() => {
      const title = document.title;
      const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(
        h => ({ tag: h.tagName, text: h.textContent?.trim() })
      );
      const links = Array.from(document.querySelectorAll('a')).map(
        a => ({ href: a.href, text: a.textContent?.trim() })
      );

      return { title, headings, links };
    });

    return data;
  } finally {
    await page.close();
  }
}

export async function takeScreenshot(url: string, path: string): Promise<void> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.screenshot({ path, fullPage: true });
  } finally {
    await page.close();
  }
}

export async function generatePDF(url: string, path: string): Promise<void> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.pdf({ path, format: 'A4' });
  } finally {
    await page.close();
  }
}

export async function fillForm(
  url: string,
  formData: Record<string, string>
): Promise<void> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });

    for (const [selector, value] of Object.entries(formData)) {
      await page.type(selector, value);
    }

    await page.click('button[type="submit"]');
    await page.waitForNavigation();
  } finally {
    await page.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
`;

const cheerioTemplate = `import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

export async function scrapeHTML(url: string) {
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  const data = {
    title: $('title').text(),
    headings: $('h1, h2, h3')
      .map((i, el) => ({
        tag: el.tagName,
        text: $(el).text().trim(),
      }))
      .get(),
    links: $('a')
      .map((i, el) => ({
        href: $(el).attr('href'),
        text: $(el).text().trim(),
      }))
      .get(),
    images: $('img')
      .map((i, el) => ({
        src: $(el).attr('src'),
        alt: $(el).attr('alt'),
      }))
      .get(),
  };

  return data;
}

export function extractData($: cheerio.CheerioAPI, selectors: Record<string, string>) {
  const result: Record<string, any> = {};

  for (const [key, selector] of Object.entries(selectors)) {
    const elements = $(selector);

    if (elements.length === 1) {
      result[key] = elements.text().trim();
    } else if (elements.length > 1) {
      result[key] = elements.map((i, el) => $(el).text().trim()).get();
    }
  }

  return result;
}
`;

const apiRoute = `import { NextRequest, NextResponse } from 'next/server';
import { scrapeWebsite, takeScreenshot } from '@/lib/scraping/puppeteer';

export async function POST(req: NextRequest) {
  try {
    const { url, action } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (action === 'scrape') {
      const data = await scrapeWebsite(url);
      return NextResponse.json({ data });
    }

    if (action === 'screenshot') {
      const filename = \`screenshot-\${Date.now()}.png\`;
      const path = \`./public/screenshots/\${filename}\`;
      await takeScreenshot(url, path);
      return NextResponse.json({ path: \`/screenshots/\${filename}\` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json({ error: 'Scraping failed' }, { status: 500 });
  }
}
`;

export function generateScrapingModule(config: ScrapingModuleConfig): ScrapingModuleOutput {
  const files: Array<{ path: string; content: string }> = [];
  const dependencies: string[] = [];
  const instructions: string[] = [];

  if (config.engine === 'puppeteer') {
    files.push({ path: 'lib/scraping/puppeteer.ts', content: puppeteerTemplate });
    dependencies.push('puppeteer');
    instructions.push('Puppeteer will download Chromium automatically on first install');
  }

  if (config.engine === 'cheerio') {
    files.push({ path: 'lib/scraping/cheerio.ts', content: cheerioTemplate });
    dependencies.push('cheerio');
  }

  files.push({ path: 'app/api/scraping/route.ts', content: apiRoute });

  return {
    files,
    envVars: [],
    dependencies,
    instructions,
  };
}

export function getScrapingModulePrompt(config: ScrapingModuleConfig): string {
  return \`## Web Scraping Module\n\nEngine: \${config.engine}\nFeatures: \${config.features?.join(', ') || 'basic scraping'}\n\nIncludes browser automation, data extraction, and screenshot capture.\`;
}
