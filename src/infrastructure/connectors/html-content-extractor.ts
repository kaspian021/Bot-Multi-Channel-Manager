// ==============================================================
// HTML Content Extractor — Section 14 & 15 Specification
// Extracts title, author, pubDate, headings, quotes, canonical URL
// Uses Cheerio for robust DOM parsing and cleans boilerplate
// ==============================================================

import * as cheerio from 'cheerio';
import { IContentExtractor, ExtractedArticleContent } from '../../application/interfaces/production-interfaces';

export class HtmlContentExtractor implements IContentExtractor {
  private readonly maxChars: number;

  constructor(maxChars = 20000) {
    this.maxChars = maxChars;
  }

  extractContent(html: string, url: string) {
    const $ = cheerio.load(html);
    const title = $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim() || $('title').text().trim();
    $('script, style, noscript, svg, nav, footer, header, aside, .cookie-banner, .ad-banner, .advertisement, #comments').remove();

    let contentEl = $('article');
    if (contentEl.length === 0) contentEl = $('main');
    if (contentEl.length === 0) contentEl = $('body');

    const textContent = contentEl.text().replace(/\s+/g, ' ').trim();
    const wordCount = textContent.split(/\s+/).length;
    const estimatedReadingTimeMinutes = Math.max(1, Math.round(wordCount / 200));

    return {
      title,
      textContent,
      estimatedReadingTimeMinutes,
      canonicalUrl: url,
    };
  }

  async extract(html: string, url: string): Promise<ExtractedArticleContent> {
    if (!html || !html.trim()) {
      return {
        mainContent: '',
        headings: [],
        quotes: [],
        canonicalUrl: url,
      };
    }

    try {
      const $ = cheerio.load(html);

      // 1. Canonical URL
      const canonicalUrl =
        $('link[rel="canonical"]').attr('href') ||
        $('meta[property="og:url"]').attr('content') ||
        url;

      // 2. Title
      const title =
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('h1').first().text().trim() ||
        $('title').text().trim();

      // 3. Subtitle / Description
      const subtitle =
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        $('meta[name="twitter:description"]').attr('content') ||
        undefined;

      // 4. Author
      const author =
        $('meta[name="author"]').attr('content') ||
        $('meta[property="article:author"]').attr('content') ||
        $('[rel="author"]').first().text().trim() ||
        $('.author').first().text().trim() ||
        undefined;

      // 5. Publication Date
      const publicationDate =
        $('meta[property="article:published_time"]').attr('content') ||
        $('meta[name="publication_date"]').attr('content') ||
        $('time[datetime]').first().attr('datetime') ||
        $('time').first().text().trim() ||
        undefined;

      // 6. Extract Headings
      const headings: string[] = [];
      $('h1, h2, h3').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 5 && !headings.includes(text)) {
          headings.push(text);
        }
      });

      // 7. Extract Blockquotes
      const quotes: string[] = [];
      $('blockquote, q').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 15 && !quotes.includes(text)) {
          quotes.push(text);
        }
      });

      // 8. Clean up boilerplate scripts, styles, navigation, headers, footers
      $('script, style, noscript, svg, nav, footer, header, aside, .cookie-banner, .advertisement, #comments').remove();

      // Look for article container
      let contentEl = $('article');
      if (contentEl.length === 0) contentEl = $('main');
      if (contentEl.length === 0) contentEl = $('.post-content, .article-content, .entry-content');
      if (contentEl.length === 0) contentEl = $('body');

      // Extract text paragraphs
      const paragraphs: string[] = [];
      contentEl.find('p, li').each((_, el) => {
        const pText = $(el).text().replace(/\s+/g, ' ').trim();
        if (pText.length > 30) {
          paragraphs.push(pText);
        }
      });

      let mainContent = paragraphs.join('\n\n');
      if (!mainContent) {
        mainContent = contentEl.text().replace(/\s+/g, ' ').trim();
      }

      if (mainContent.length > this.maxChars) {
        mainContent = mainContent.substring(0, this.maxChars) + '... [truncated for AI token safety]';
      }

      return {
        title,
        subtitle,
        author,
        publicationDate,
        mainContent,
        headings,
        quotes,
        canonicalUrl,
      };
    } catch (err) {
      console.warn('HTML extraction fallback for', url, err);
      return {
        title: undefined,
        mainContent: html.substring(0, 1000),
        headings: [],
        quotes: [],
        canonicalUrl: url,
      };
    }
  }
}
