// Formatting RSS posts into Telegram messages
import { Post } from './model';

// Renders a post in a minimalistic format, since it contains the URL to the full post
// ```
// {feedTitle} - {post.title}
// {post.link}
// #{hashtags} (optional)
// {post.pubDate} (in YYYY-MM-DD HH:mm format)
// ```
export function renderPost(post: Post, feedTitle: string): string {
  const formattedMessage = `*${escapeTg(feedTitle)}: ${escapeTg(post.title)}*\n${escapeTg(post.link)}\n`;
  const hashtags = post.hashtags ? `#${post.hashtags.map(escapeTg).join(' #')}\n` : '';
  const pubDate = new Date(post.pubDate).toISOString().slice(0, 16).replace('T', ' ');
  return `${formattedMessage}${hashtags}${escapeTg(pubDate)}`;
}

// Escape special characters in a Telegram message.
// Characters '_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!' must be escaped with the preceding character '\'.
function escapeTg(text: string): string {
  return text.replace(/[_*\[\]()~`>#+\-=|{}.!]/g, '\\$&');
}


// FIXME: this format is not rendered properly. Keeping the code here for reference.
// Given a Post, return a formatted string for Telegram in the following way:
// ```
// <a href="{url}"><b><u>{title}</u></b></a>
// #{hashtags} (optional)

// {description} (HTML up to 256 characters)
// ```
export function formatPost(post: Post, maxDescLength: number = 256): string {
  // Decode HTML entities
  let htmlDescription = decodeHtml(post.description)

  // Allow specified HTML tags only
  htmlDescription = filterTags(htmlDescription);

  // Truncate description to maxDescLength characters
  htmlDescription =
    htmlDescription.length > maxDescLength
      ? htmlDescription.slice(0, maxDescLength - 3) + '...' // Allow for ellipsis
      : htmlDescription;

  // Build the Telegram message
  const formattedMessage = `<a href="${post.link}"><b><u>${post.title}</u></b></a>\n`;
  const hashtags = post.hashtags ? `#${post.hashtags.join(' #')}` : '';
  return `${formattedMessage}${hashtags}\n\n${htmlDescription}`;
}

// Given an HTML string, return a string with HTML entities decoded
function decodeHtml(html: string): string {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

// Return a HTML string with tags allowed in Telegram messages
function filterTags(html: string): string {
  const allowedTags = ['a', 'b', 'i', 'u', 'ins', 'code', 'pre', 'strong', 'em', 's', 'strike', 'del'];
  const tagRegex = new RegExp(`<\/?(?!\/?(${allowedTags.join('|')})\s*\/?>)[^>]*>`, 'g');
  return html.replace(tagRegex, '');
}
