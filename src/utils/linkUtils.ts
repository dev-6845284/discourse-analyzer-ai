export interface LinkData {
  url: string;
  title?: string;
  type: 'quote' | 'context';
  selected?: boolean;
}

import { isYouTubeUrl } from '../utils/urlHelpers';

export const initializeLinksWithSelection = (inputLinks: LinkData[]): LinkData[] => {
  return (inputLinks || []).map(link => ({
    ...link,
    selected: link.selected !== undefined ? link.selected : !isYouTubeUrl(link.url)
  }));
};