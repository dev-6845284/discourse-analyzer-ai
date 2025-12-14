import { getTranscript, extractVideoId, YoutubeTranscriptError } from './youtubeService';

// Mock fetch globally
global.fetch = jest.fn();

describe('youtubeService', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
  });

  describe('extractVideoId', () => {
    it('should extract ID from standard URL', () => {
      expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from youtu.be URL', () => {
      expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract ID from embed URL', () => {
      expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should return input if it is already an ID', () => {
      expect(extractVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should throw error for invalid input', () => {
      expect(() => extractVideoId('invalid')).toThrow(YoutubeTranscriptError);
      expect(() => extractVideoId('')).toThrow(YoutubeTranscriptError);
    });
  });

  describe('getTranscript', () => {
    const mockVideoId = 'dQw4w9WgXcQ';
    const mockApiKey = 'AIzaSyD...';
    const mockWatchPageHtml = `<html><body><script>var ytcfg = { "INNERTUBE_API_KEY": "${mockApiKey}" };</script></body></html>`;
    
    const mockCaptionTracks = [
      {
        baseUrl: 'https://youtube.com/api/timedtext?v=1',
        name: { simpleText: 'English' },
        vssId: '.en',
        languageCode: 'en',
        kind: '',
        isTranslatable: true
      }
    ];

    const mockPlayerResponse = {
      playabilityStatus: { status: 'OK' },
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: mockCaptionTracks
        }
      }
    };

    const mockTranscriptXml = `
      <transcript>
        <text start="0" dur="2.5">Hello world</text>
        <text start="2.5" dur="1.5">This is a test</text>
      </transcript>
    `;

    it('should fetch transcript successfully', async () => {
      // 1. Watch Page
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => mockWatchPageHtml
      });

      // 2. Player API
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlayerResponse
      });

      // 3. Transcript XML
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => mockTranscriptXml
      });

      const result = await getTranscript(mockVideoId);

      expect(result.videoId).toBe(mockVideoId);
      expect(result.languageCode).toBe('en');
      expect(result.segments).toHaveLength(2);
      expect(result.segments[0]).toEqual({ start: 0, duration: 2.5, text: 'Hello world' });
      expect(result.segments[1]).toEqual({ start: 2.5, duration: 1.5, text: 'This is a test' });

      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should throw CAPTIONS_NOT_FOUND if no tracks available', async () => {
      // 1. Watch Page
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => mockWatchPageHtml
      });

      // 2. Player API (no captions)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          playabilityStatus: { status: 'OK' },
          captions: null
        })
      });

      await expect(getTranscript(mockVideoId)).rejects.toMatchObject({
        message: 'No captions found for this video',
        code: 'CAPTIONS_NOT_FOUND'
      });
    });

    it('should throw VIDEO_RESTRICTED if video is age restricted', async () => {
       // 1. Watch Page (restricted)
       (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => `<html><meta property="og:restricted:age" content="18+"/></html>`
      });

      await expect(getTranscript(mockVideoId)).rejects.toThrow('Video is age restricted');
    });
  });
});
