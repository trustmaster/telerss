import { DOMParser } from "@xmldom/xmldom";

export function parseRSS(xmlContent: string): Channel {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

  const rssElements = xmlDoc.getElementsByTagName('rss');
  if (rssElements.length !== 1) {
    throw new Error('Invalid RSS feed: missing <rss> element');
  }
  const rssElement = rssElements[0];

  const channelElements = rssElement.getElementsByTagName('channel');
  if (channelElements.length !== 1) {
    throw new Error('Invalid RSS feed: missing <channel> element');
  }
  const channelElement = channelElements[0];

  const channel: Channel = {
    items: [],
  };

  const itemElements = channelElement.getElementsByTagName('item');
  Array.from(itemElements).forEach((itemElement) => {
    const item: Item = {};

    const elements = Array.from(itemElement.childNodes);
    elements.forEach((element) => {
      if (!element.hasOwnProperty('tagName')) {
        return;
      }
      // @ts-ignore
      item[element.tagName] = element.textContent || '';
    });

    channel.items.push(item);
  });

  const channelChildren = Array.from(channelElement.childNodes);
  channelChildren.forEach((child) => {
    if (!child.hasOwnProperty('tagName')) {
      return;
    }
    // @ts-ignore
    if (child.tagName !== 'item') {
      // @ts-ignore
      channel[child.tagName] = child.textContent || '';
    }
  });

  return channel;
}

export interface Item {
  [key: string]: string;
}

export interface Channel {
  [key: string]: string | Item[];
  items: Item[];
}
