import TelegramApi, {Update} from './telegram';
import Bot from './bot';
import { UserStore } from './store';

export interface Env {
  TELEGRAM_TOKEN: string;
  SECRET_TOKEN: string;
  // Binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  KV_TELERSS: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  //
  // Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
  // MY_SERVICE: Fetcher;
  //
  // Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
  // MY_QUEUE: Queue;
  //
  // Example binding to a D1 Database. Learn more at https://developers.cloudflare.com/workers/platform/bindings/#d1-database-bindings
  // DB: D1Database
}

export default {
  // The scheduled handler is invoked at the interval set in our wrangler.toml's
  // [[triggers]] configuration.
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    try {
      const telegram = new TelegramApi(env.TELEGRAM_TOKEN);
      const store = new UserStore(env.KV_TELERSS);
      const bot = new Bot(telegram, store);
      await bot.fetchAll();
    } catch (e) {
      console.error(e);
    }
  },

  // The event handler is invoked by Cloudflare Workers for every HTTP request.
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'POST') {
      const payload: Update | null = await request.json();
      if (payload === null || !payload.message) {
        return new Response('Bad request', { status: 400 });
      }
      // Authenticate the request with SECRET_TOKEN
      if (!request.headers.has('X-Telegram-Bot-Api-Secret-Token')
        || request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.SECRET_TOKEN) {
        return new Response('Unauthorized', { status: 401 });
      }
      const telegram = new TelegramApi(env.TELEGRAM_TOKEN);
      const store = new UserStore(env.KV_TELERSS);
      const bot = new Bot(telegram, store);
      try {
        await bot.exec(payload.message);
        return new Response('OK', { status: 200 });
      } catch (e) {
        console.error(e);
        return new Response('Internal server error', { status: 500 });
      }
    }
    return new Response('Hello world!', { status: 200 });
  }
};
