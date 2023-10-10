// Users and their subscriptions storage in a KV repository
import { User, Subscription, newUser, newSubscription } from './model';

export interface IdList {
  ids: number[];
  nextCursor: string | null;
}

// KV Users repository.
export class UserStore {
  kv: KVNamespace;
  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  async addUser(userId: number): Promise<void> {
    return await this.set(newUser(userId));
  }

  async addSubscription(userId: number, chatId: number, url: string): Promise<void> {
    let user = await this.get(userId) || newUser(userId);

    // Check if the user already has this subscription
    const existingSubscription = user.subscriptions.find(sub => sub.url === url);
    if (existingSubscription) {
      throw new Error('You are already subscribed to this feed in one of the chats.');
    }
    const subscription = newSubscription(chatId, url);
    user.subscriptions.push(subscription);
    return await this.set(user);
  }

  async deleteSubscription(userId: number, url: string): Promise<void> {
    let user = await this.get(userId) || newUser(userId);

    // Check if subscription exists
    const existingSubscription = user.subscriptions.find(sub => sub.url === url);
    if (!existingSubscription) {
      throw new Error('You are not subscribed to this feed.');
    }
    // Save all the subscriptions except for this one
    user.subscriptions = user.subscriptions.filter(sub => sub.url !== url);
    return await this.set(user);
  }

  async deleteAllSubscriptionsInChat(userId: number, chatId: number): Promise<void> {
    let user = await this.get(userId) || newUser(userId);

    // Save all the subscriptions except for this one
    user.subscriptions = user.subscriptions.filter(sub => sub.chatId !== chatId);
    return await this.set(user);
  }

  async getChatSubscriptions(userId: number, chatId: number): Promise<Subscription[]> {
    const user = await this.get(userId);
    if (!user) {
      throw new Error('User not found.');
    }
    return user.subscriptions.filter(sub => sub.chatId === chatId);
  }

  // Merges updated subscriptions into the user's subscriptions and saves the user
  async updateSubscriptions(user: User, updatedSubscriptions: Subscription[]): Promise<void> {
    user.subscriptions = user.subscriptions.map(sub => {
      const updatedSubscription = updatedSubscriptions.find(updatedSub => updatedSub.url === sub.url);
      if (updatedSubscription) {
        return updatedSubscription;
      } else {
        return sub;
      }
    });
    return await this.set(user);
  }

  // Low level KV setter
  async set(user: User): Promise<void> {
    await this.kv.put(`user:${user.id}`, JSON.stringify(user));
  }

  // Low level KV getter
  async get(userId: number): Promise<User | null> {
    return await this.kv.get(`user:${userId}`, { type: 'json' });
  }

  // Low level KV list
  async listIds(cursor?: string): Promise<IdList> {
    const list = await this.kv.list({ prefix: 'user:', cursor });
    return {
      ids: list.keys.map(key => parseInt(key.name.split(':')[1])),
      nextCursor: list.list_complete ? null : list.cursor,
    };
  }
}
