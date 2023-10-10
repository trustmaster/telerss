import { describe, it, expect } from 'vitest';
import { parseRSS } from './rss';


describe('RSSParser', () => {
  it('should parse a valid RSS feed', () => {
    const xmlContent = `
      <rss version="2.0">
        <channel>
          <title>Test RSS Feed</title>
          <item>
            <title>Item 1</title>
          </item>
          <item>
            <title>Item 2</title>
          </item>
        </channel>
      </rss>
    `;

    const result = parseRSS(xmlContent);

    expect(result).to.be.an('object');
    expect(result.title).to.equal('Test RSS Feed');
    expect(result.items).to.be.an('array').with.lengthOf(2);
    expect(result.items[0].title).to.equal('Item 1');
    expect(result.items[1].title).to.equal('Item 2');
  });

  it('should throw an error for invalid RSS feed', () => {
    const xmlContent = '<invalid-xml>';

    expect(() => parseRSS(xmlContent)).to.throw('Invalid RSS feed');
  });

  it('should throw an error for missing <rss> element', () => {
    const xmlContent = `
      <channel>
        <title>Test RSS Feed</title>
        <item>
          <title>Item 1</title>
        </item>
      </channel>
    `;

    expect(() => parseRSS(xmlContent)).to.throw('Invalid RSS feed: missing <rss> element');
  });

  it('should throw an error for missing <channel> element', () => {
    const xmlContent = `
      <rss version="2.0">
        <title>Test RSS Feed</title>
        <item>
          <title>Item 1</title>
        </item>
      </rss>
    `;

    expect(() => parseRSS(xmlContent)).to.throw('Invalid RSS feed: missing <channel> element');
  });

  it('should handle missing <item> elements gracefully', () => {
    const xmlContent = `
      <rss version="2.0">
        <channel>
          <title>Test RSS Feed</title>
        </channel>
      </rss>
    `;

    const result = parseRSS(xmlContent);

    expect(result).to.be.an('object');
    expect(result.title).to.equal('Test RSS Feed');
    expect(result.items).to.be.an('array').with.lengthOf(0);
  });

  it('should handle missing properties in <item> elements gracefully', () => {
    const xmlContent = `
      <rss version="2.0">
        <channel>
          <title>Test RSS Feed</title>
          <item>
            <title>Item 1</title>
            <description>Item 1 Description</description>
          </item>
          <item>
            <!-- Missing <title> and <description> -->
          </item>
        </channel>
      </rss>
    `;

    const result = parseRSS(xmlContent);

    expect(result).to.be.an('object');
    expect(result.title).to.equal('Test RSS Feed');
    expect(result.items).to.be.an('array').with.lengthOf(2);
    expect(result.items[0].title).to.equal('Item 1');
    expect(result.items[0].description).to.equal('Item 1 Description');
    expect(result.items[1]).to.deep.equal({});
  });
});
