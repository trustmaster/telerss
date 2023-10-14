import * as Telegram from "node-telegram-bot-api";

export type BotCommand = Telegram.BotCommand;
export type Message = Telegram.Message;
export type Update = Telegram.Update;

export interface Response {
  ok: boolean;
  description?: string;
  result?: Message;
}

// Raw HTTP Telegram Bot API client
export default class TelegramApi {
  token: string;
  constructor(token: string) {
    this.token = token;
  }

  /**
    * Register commands for the bot.
  */
  async registerCommands(commands: BotCommand[], chatId: number): Promise<Response> {
    const url = `https://api.telegram.org/bot${this.token}/setMyCommands`;
    const body = {
      commands,
      scope: {
        type: 'chat_administrators',
        chat_id: chatId,
      }
    };
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    const options = {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    };
    return await fetch(url, options).then(resp => resp.json());
  }

  /**
    * Send a message to a chat and return the response.
    * See https://core.telegram.org/bots/api#sendmessage.
    */
  async sendMessage(
    chatId: number,
    text: string,
    parseMode?: string,
    disablePreview?: boolean,
    silentMode: boolean = false
  ): Promise<Response> {
    let url = `https://api.telegram.org/bot${this.token}/sendMessage?chat_id=${chatId}&text=${text}`;
    if (parseMode === 'MarkdownV2' || parseMode === 'HTML') {
      url = url.concat(`&parse_mode=${parseMode}`);
    }
    if (disablePreview !== undefined) {
      url = url.concat(`&disable_web_page_preview=${disablePreview}`);
    }
    if (silentMode === true) {
      url = url.concat(`&disable_notification=${silentMode}`);
    }
    return await fetch(url).then(resp => resp.json());
  }

  /**
    * Send a message to a chat and return the response.
    * See https://core.telegram.org/bots/api#sendmessage.
    */
  async sendRichMessage(
    chatId: number,
    text: string
  ): Promise<Response> {
    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
    const body = {
      chat_id: chatId,
      text,
      parse_mode: 'MarkdownV2',
    };
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }
    const options = {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }
    return await fetch(url, options).then(resp => resp.json());
  }
}
