// Data model

// RSS feed subscription
export interface Subscription {
  chatId: number;
  url: string;
  lastFetched: number; // UTC timestamp
  etag?: string | null;
  refreshRate?: number; // in minutes
}

export function newSubscription(chatId: number, url: string): Subscription {
  return {
    chatId,
    url,
    lastFetched: 0,
  }
}

// Bot user
export interface User {
  id: number;
  subscriptions: Subscription[];
  defaultRefreshRate?: number; // in minutes
  postsToLoadOnNewSub?: number; // number of posts to load on new subscription
}

export function newUser(id: number): User {
  return {
    id,
    subscriptions: [],
  }
}

// Post is a single post in a feed
export interface Post {
  title: string;
  link: string;
  description: string;
  pubDate: number; // UTC timestamp
  hashtags?: string[];
}

// Updates holds the new posts for a subscription
export interface Update {
  subscription: Subscription;
  feedTitle: string;
  posts: Post[];
}
