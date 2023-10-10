import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import TelegramApi from './telegram';

const fetchMock = async (url: string) => {
  return {
      json: () => {
        return { result: 'message sent' };
      }
  };
};

describe('TelegramApi', () => {
  let telegramApi: TelegramApi;
  const token = 'your_token_here';
  const chatId = 123;
  const text = 'Test message';

  beforeEach(() => {
    telegramApi = new TelegramApi(token);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should send a message with default parameters', async () => {
    const expectedUrl =
      `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${text}`;

    const mock = vi.fn(fetchMock);
    vi.stubGlobal('fetch', mock);

    const result = await telegramApi.sendMessage(chatId, text);

    expect(mock).toHaveBeenCalledWith(expectedUrl);
    expect(result).toEqual({ result: 'message sent' });
  });

  it('should send a message with optional parameters', async () => {
    const parseMode = 'MarkdownV2';
    const disablePreview = true;
    const silentMode = true;

    const expectedUrl =
      `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${text}&parse_mode=${parseMode}&disable_web_page_preview=true&disable_notification=true`;

    const mock = vi.fn(fetchMock);
    vi.stubGlobal('fetch', mock);

    const result = await telegramApi.sendMessage(
      chatId,
      text,
      parseMode,
      disablePreview,
      silentMode
    );

    expect(result).toEqual({ result: 'message sent' });
    expect(mock).toHaveBeenCalledWith(expectedUrl);
  });
});
