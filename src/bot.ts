// Telegram RSS reader bot
import TelegramApi, { Message } from './telegram';
import { Update, User } from './model';
import { UserStore } from './store';
import { parseRSS } from './rss';
import { fetchSubscriptionUpdates } from './updater';
import { renderPost } from './render';

export enum CommandType {
  SUBSCRIBE = 'sub',
  UNSUBSCRIBE = 'unsub',
  UNSUBSCRIBE_ALL = 'unsub_all',
  LIST = 'list',
  HELP = 'help',
  FETCH = 'fetch',
  UNKNOWN = 'unknown'
}

/**
 * A command that the bot can execute.
 */
export class Command {
  type: CommandType;
  url?: string;

  constructor(messageText: string) {
    const commandRegex = /^\/(\w+)(?:\s+(.+))?$/;
    const match = commandRegex.exec(messageText);
    if (match) {
      const [, commandType, url] = match;
      this.type = this.parseCommandType(commandType);
      this.url = url;
    } else {
      this.type = CommandType.UNKNOWN;
    }
  }

  private parseCommandType(commandType: string): CommandType {
    switch (commandType) {
      case CommandType.SUBSCRIBE:
        return CommandType.SUBSCRIBE;
      case CommandType.UNSUBSCRIBE:
        return CommandType.UNSUBSCRIBE;
      case CommandType.UNSUBSCRIBE_ALL:
        return CommandType.UNSUBSCRIBE_ALL;
      case CommandType.LIST:
        return CommandType.LIST;
      case CommandType.HELP:
        return CommandType.HELP;
      case CommandType.FETCH:
        return CommandType.FETCH;
      default:
        return CommandType.UNKNOWN;
    }
  }
}

const commandList = [
  {
    command: CommandType.SUBSCRIBE,
    description: 'Subscribe to a feed',
    params: '<url>',
  },
  {
    command: CommandType.UNSUBSCRIBE,
    description: 'Unsubscribe from a feed',
    params: '<url>',
  },
  {
    command: CommandType.UNSUBSCRIBE_ALL,
    description: 'Unsubscribe from all feeds in the chat',
  },
  {
    command: CommandType.LIST,
    description: 'List all subscribed feeds',
  },
  {
    command: CommandType.HELP,
    description: 'Show help',
  },
];


export default class Bot {
  api: TelegramApi;
  store: UserStore;
  constructor(api: TelegramApi, store: UserStore) {
    this.api = api;
    this.store = store;
  }

  async exec(msg: Message): Promise<void> {
    const userInput = msg.text || '';
    const command = new Command(userInput);
    try {
      switch (command.type) {
        case CommandType.SUBSCRIBE:
          if (!command.url) {
            await this.api.sendMessage(msg.chat.id, 'Please provide a valid RSS feed URL.');
            return;
          }
          await this.subscribe(msg, command.url);
          break;
        case CommandType.UNSUBSCRIBE:
          if (!command.url) {
            await this.api.sendMessage(msg.chat.id, 'Please provide a valid RSS feed URL.');
            return;
          }
          await this.unsubscribe(msg, command.url);
          break;
        case CommandType.UNSUBSCRIBE_ALL:
          await this.unsubscribeAll(msg);
          break;
        case CommandType.LIST:
          await this.list(msg);
          break;
        case CommandType.HELP:
          await this.help(msg);
          break;
        case CommandType.FETCH:
          await this.fetch(msg);
          break;
        default:
          await this.help(msg);
      }
    } catch (e) {
      console.error(e);
      await this.api.sendMessage(msg.chat.id, `Error: ${e}`);
    }
  }

  async start(msg: Message): Promise<void> {
    if (!msg?.chat || !msg?.from) {
      throw new Error('Invalid message.');
    }
    const chatId = msg.chat.id;
    await this.store.addUser(msg.from.id);

    await this.api.registerCommands(commandList, chatId);
    await this.api.sendMessage(chatId, 'Welcome to the RSS Subscription Bot! Use /help for a list of commands.')
  }

  async help(msg: Message): Promise<void> {
    const chatId = msg.chat.id;
    let helpMessage = 'Available commands:\n';
    commandList.forEach(command => {
      const params = command.params ? ` ${command.params}` : '';
      helpMessage += `/${command.command}${params} - ${command.description}\n`;
    });
    await this.api.registerCommands(commandList, chatId);
    await this.api.sendMessage(chatId, helpMessage);
  }

  async subscribe(msg: Message, url: string): Promise<void> {
    if (!msg?.chat || !msg?.from) {
      throw new Error('Invalid message.');
    }
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!url) {
      throw new Error('Please provide a valid RSS feed URL.');
    }

    const xmlString = await fetch(url).then(resp => resp.text());
    const feed = parseRSS(xmlString);
    if (feed) {
      await this.store.addSubscription(userId, chatId, url);
      await this.api.sendMessage(chatId, `Subscribed to: ${feed.title}`);
    } else {
      await this.api.sendMessage(chatId, 'Invalid RSS feed.');
    }
  }

  async unsubscribe(msg: Message, url: string): Promise<void> {
    if (!msg?.chat || !msg?.from) {
      throw new Error('Invalid message.');
    }
    const userId = msg.from.id;
    const chatId = msg.chat.id;

    if (!url) {
      throw new Error('Please provide a valid RSS feed URL.');
    }

    await this.store.deleteSubscription(userId, url);
    await this.api.sendMessage(chatId, `Unsubscribed from: ${url}`);
  }

  async unsubscribeAll(msg: Message): Promise<void> {
    if (!msg?.chat || !msg?.from) {
      throw new Error('Invalid message.');
    }
    const userId = msg.from.id;
    const chatId = msg.chat.id;

    await this.store.deleteAllSubscriptionsInChat(userId, chatId);
    await this.api.sendMessage(chatId, `Unsubscribed from all feeds.`);
  }

  async list(msg: Message): Promise<void> {
    if (!msg?.chat || !msg?.from) {
      throw new Error('Invalid message.');
    }
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const subscriptions = await this.store.getChatSubscriptions(userId, chatId);

    if (subscriptions && subscriptions.length > 0) {
      const urls = subscriptions.map(sub => sub.url);
      const listMessage = `Subscribed feeds:\n- ${urls.join('\n- ')}`;
      await this.api.sendMessage(chatId, listMessage);
    } else {
      await this.api.sendMessage(chatId, 'You are not subscribed to any feeds in this chat yet.');
    }
  }

  async fetch(msg: Message): Promise<void> {
    if (!msg?.chat || !msg?.from) {
      throw new Error('Invalid message.');
    }
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const user = await this.store.get(userId);
    if (!user) {
      throw new Error('User not found.');
    }
    await this.updateUserSubscriptions(user, chatId);
  }

  // Fetch subscriptions and send updates to all chats concurrently
  async fetchAll(): Promise<void> {
    let cursor = undefined;
    do {
      const idList = await this.store.listIds(cursor);
      cursor = idList.nextCursor;

      if (idList.ids.length > 0) {
        await Promise.allSettled(idList.ids.map(async (id) => {
          const user = await this.store.get(id);
          if (!user) {
            // Log the error without breaking the flow
            console.error(`User ${id} not found.`);
            return;
          }
          try {
            await this.updateUserSubscriptions(user);
          } catch (e) {
            console.error(e);
          }
        }));
      }
    } while (cursor);
  }

  async updateUserSubscriptions(user: User, chatId?: number): Promise<void> {
    let subscriptions = user.subscriptions;
    if (chatId) {
      subscriptions = subscriptions.filter(sub => sub.chatId === chatId);
    }
    const results = await Promise.allSettled(subscriptions.map(async (subscription) => {
      const update = await fetchSubscriptionUpdates(subscription);
      if (update.posts.length > 0) {
        // Send each new post in a separate telegram message
        await Promise.allSettled(update.posts.map(async (post) => {
          const message = renderPost(post, update.feedTitle);
          const res = await this.api.sendRichMessage(subscription.chatId, message);
          if (!res.ok) {
            throw new Error(`Error sending message: ${res.description}`);
          }
        }));
      }
      return update;
    }));

    // Filter out failed promises
    const updates = results.reduce((acc: Update[], result: PromiseSettledResult<Update>) => {
      if (result.status === 'fulfilled') {
        acc.push(result.value);
      }
      return acc;
    }, []);

    // Merge updated subscriptions back to the user object
    const updatedSubscriptions = updates
      .filter(update => update.posts.length > 0)
      .map(update => update.subscription);
    await this.store.updateSubscriptions(user, updatedSubscriptions);
  }
}
