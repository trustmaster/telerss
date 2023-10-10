import { defaultSettings } from './settings';
import { Subscription, Update } from './model';
import { parseRSS } from './rss';
import { getNewPosts, fetchUpdates, fetchSubscriptionUpdates } from './updater';
import { vi, describe, it, expect, afterEach } from 'vitest';

// Mock RSSParser to parse XML
vi.mock('./rss');

describe('getNewPosts', () => {
  it('should return posts sorted by pubDate in descending order', () => {
    const dates = [
      'Sat, 01 Apr 2023 21:26:03 +0200',
      'Mon, 03 Apr 2023 17:18:38 +0200',
      'Sat, 29 Apr 2023 21:41:37 +0200',
    ];
    dates.forEach((date) => {
      console.log((new Date(date)).toUTCString());
    });
    const feed = {
      channel: {
        items: [
          { title: 'Post 1', link: 'link1', description: 'desc1', pubDate: dates[0] },
          { title: 'Post 2', link: 'link2', description: 'desc2', pubDate: dates[1] },
          { title: 'Post 3', link: 'link3', description: 'desc3', pubDate: dates[2] },
        ]
      },
      etag: 'etag',
      lastFetched: 0,
    };
    const sub = {
      chatId: 123,
      url: 'feed',
      etag: 'etag',
      lastFetched: 0,
    };

    const posts = getNewPosts(feed, sub);

    expect(posts).toEqual([
      { title: 'Post 3', link: 'link3', description: 'desc3', pubDate: new Date(dates[2]).getTime() },
      { title: 'Post 2', link: 'link2', description: 'desc2', pubDate: new Date(dates[1]).getTime() },
      { title: 'Post 1', link: 'link1', description: 'desc1', pubDate: new Date(dates[0]).getTime() },
    ]);
  });

  it('should return 5 latest posts sorted by pubDate descending on the first fetch if the feed contains 10 items with different pubDates', () => {
    const dates = [
      'Sat, 01 Apr 2023 21:26:03 +0200',
      'Sun, 02 Apr 2023 21:26:03 +0200',
      'Mon, 03 Apr 2023 21:26:03 +0200',
      'Tue, 04 Apr 2023 21:26:03 +0200',
      'Wed, 05 Apr 2023 21:26:03 +0200',
      'Thu, 06 Apr 2023 21:26:03 +0200',
      'Fri, 07 Apr 2023 21:26:03 +0200',
      'Sat, 08 Apr 2023 21:26:03 +0200',
      'Sun, 09 Apr 2023 21:26:03 +0200',
      'Mon, 10 Apr 2023 21:26:03 +0200',
    ];
    const items = [];
    for (let i = 0; i < dates.length; i++) {
      items.push({ title: `Post ${i}`, link: `link${i}`, description: `desc${i}`, pubDate: dates[i] });
    }
    const feed = {
      channel: {
        items,
      },
      etag: 'etag',
      lastFetched: 0,
    };
    const sub = {
      chatId: 123,
      url: 'feed',
      etag: 'etag',
      lastFetched: 0,
    };

    const expectedPosts = [];
    for (let i = 0; i < defaultSettings.postsToLoadOnNewSub; i++) {
      const index = dates.length-i-1;
      expectedPosts.push({ title: `Post ${index}`, link: `link${index}`, description: `desc${index}`, pubDate: new Date(dates[index]).getTime() });
    }

    const posts = getNewPosts(feed, sub);

    expect(posts).toEqual(expectedPosts);
  });
});

describe('fetchSubscriptionUpdates', () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
  });

  it('should fetch updates for a subscription', async () => {
    // Define mock data
    const subscription: Subscription = { chatId: 123, url: 'feed1', etag: 'etag1', lastFetched: 0 };

    // Mock fetch function to return a response
    const fetchMock = async (url: string) => {
      return {
        status: 200,
        headers: { get: () => 'etag2' },
        text: () => 'XML text',
      };
    };
    vi.stubGlobal('fetch', fetchMock);

    // Mock RSS
    // @ts-ignore
    parseRSS.mockReturnValueOnce({
      items: [
        {
          title: 'Post 1',
          link: 'link1',
          description: 'desc1',
          pubDate: new Date().toUTCString(),
        },
      ],
    });

    // Call the function and assert the result
    const update = await fetchSubscriptionUpdates(subscription);

    // Ensure the update contains the expected data
    expect(parseRSS).toBeCalledTimes(1);
    expect(parseRSS).toBeCalledWith('XML text');
    expect(update.subscription).toEqual(subscription);
    expect(update.posts).toEqual([
      {
        title: 'Post 1',
        link: 'link1',
        description: 'desc1',
        pubDate: expect.any(Number),
      },
    ]);

    // Ensure the subscription's etag and lastFetched were updated
    expect(subscription.etag).toBe('etag2');
    expect(subscription.lastFetched).toBeGreaterThan(0);
  });

  it('should return an empty update when the feed is not modified', async () => {
    // Define mock data
    const subscription: Subscription = { chatId: 123, url: 'feed11', etag: 'etag11', lastFetched: 0 };

    // Mock fetch function to return a 304 response
    const fetchMock = async (url: string) => {
      return { status: 304 };
    };
    vi.stubGlobal('fetch', fetchMock);

    // Mock RSS
    // @ts-ignore
    parseRSS.mockReturnValueOnce({
      items: [],
    });

    // Call the function and assert the result
    const update = await fetchSubscriptionUpdates(subscription);

    // Ensure the update contains the expected data
    expect(parseRSS).toBeCalledTimes(0);
    expect(update.subscription).toEqual(subscription);
    expect(update.posts).toEqual([]);
  });

});
