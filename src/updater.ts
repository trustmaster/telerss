// Fetches updates from the feeds, calculates the changed content,
// and provides the updates to be sent back to the user.
// TODO: Fetch subscriptions on a global level, not per user, so that
//        users subscribed to the same feed will get updates faster.
//        Currently we use per-user etag and lastFetched to fetch updates.
import { Subscription, Update, Post } from './model';
import { parseRSS, Channel } from './rss';
import { defaultSettings } from "./settings";


interface CachedFeed {
  channel: Channel;
  etag: string | null;
  lastFetched: number;
}

// We cache parsed feeds in memory to avoid fetching and parsing the same feed multiple times
const feedCache = new Map<string, CachedFeed>();

// Fetches updates for all user subscriptions
export async function fetchUpdates(subscriptions: Subscription[]): Promise<Update[]> {
  const updates = await Promise.all(subscriptions.map(fetchSubscriptionUpdates));
  return updates.filter(update => update.posts.length > 0);
}

// Fetches new content for the subscription and returns the new posts
export async function fetchSubscriptionUpdates(sub: Subscription): Promise<Update> {
  // TODO: filter subscriptions based on refresh rate
  let feed: CachedFeed;
  if (feedCache.has(sub.url)) {
    // We already fetched this feed during this run
    feed = feedCache.get(sub.url) as CachedFeed;
  } else {
    // Form cache headers
    const headers = new Headers();
    if (sub.etag) {
      headers.append('If-None-Match', sub.etag);
    } else if (sub.lastFetched) {
      headers.append('If-Modified-Since', new Date(sub.lastFetched).toUTCString());
    }

    // Fetch the feed
    console.log('REQ', 'updater.fetchSubscriptionUpdates');
    const resp = await fetch(sub.url, { headers });
    if (resp.status === 304) {
      console.log('CACHE', 'updater.fetchSubscriptionUpdates');
      // Not modified
      return {
        subscription: sub,
        feedTitle: '',
        posts: [],
      };
    }

    // Parse the feed
    const xml = await resp.text();
    const channel = parseRSS(xml);
    feed = {
      channel,
      etag: resp.headers.get('etag'),
      lastFetched: Date.now(),
    }
    feedCache.set(sub.url, feed);
  }

  const posts = getNewPosts(feed, sub);

  // Update the subscription
  sub.lastFetched = feed.lastFetched;
  sub.etag = feed.etag;
  // @ts-ignore
  const feedTitle: string = feed.channel.title;

  return {
    subscription: sub,
    feedTitle,
    posts,
  }
}

// Loop over the channel items, converting the pubDate to a timestamp,
// and filtering out posts that were posted before lastFetched
export function getNewPosts(feed: CachedFeed, sub: Subscription): Post[] {
  let posts = [];
  for (const item of feed.channel.items) {
    const pubDate = new Date(item.pubDate).getTime();
    if (pubDate > sub.lastFetched) {
      posts.push({
        title: item.title,
        link: item.link,
        description: item.description,
        pubDate,
      });
    }
  }

  // Sort the posts by pubDate descending
  posts.sort((a, b) => b.pubDate - a.pubDate);

  // If this is the first fetch, only get the first defaultSettings.postsToLoadOnNewSub
  // posts in the sorted list
  if (sub.lastFetched === 0) {
    posts = posts.slice(0, defaultSettings.postsToLoadOnNewSub);
  }

  return posts;
}
