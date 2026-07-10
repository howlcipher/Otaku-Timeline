import { describe, it, expect } from 'vitest';
import { getSeasonFromMonth, processEntries } from './api';

describe('API Utils', () => {
  describe('getSeasonFromMonth', () => {
    it('returns WINTER for December, January, February', () => {
      expect(getSeasonFromMonth(12)).toBe('WINTER');
      expect(getSeasonFromMonth(1)).toBe('WINTER');
      expect(getSeasonFromMonth(2)).toBe('WINTER');
    });

    it('returns SPRING for March, April, May', () => {
      expect(getSeasonFromMonth(3)).toBe('SPRING');
      expect(getSeasonFromMonth(4)).toBe('SPRING');
      expect(getSeasonFromMonth(5)).toBe('SPRING');
    });

    it('returns SUMMER for June, July, August', () => {
      expect(getSeasonFromMonth(6)).toBe('SUMMER');
      expect(getSeasonFromMonth(7)).toBe('SUMMER');
      expect(getSeasonFromMonth(8)).toBe('SUMMER');
    });

    it('returns FALL for September, October, November', () => {
      expect(getSeasonFromMonth(9)).toBe('FALL');
      expect(getSeasonFromMonth(10)).toBe('FALL');
      expect(getSeasonFromMonth(11)).toBe('FALL');
    });
  });

  describe('processEntries', () => {
    const mockEntries = [
      {
        status: 'COMPLETED',
        score: 10,
        completedAt: { year: 2023, month: 4, day: 15 },
        media: {
          id: 1,
          title: { userPreferred: 'Cowboy Bebop' },
          coverImage: { large: 'url1', color: '#ff0000' },
          season: 'SPRING',
          seasonYear: 1998,
          genres: ['Action', 'Sci-Fi'],
          studios: { nodes: [{ name: 'Sunrise' }] }
        }
      },
      {
        status: 'CURRENT',
        score: 0, // Unscored
        media: {
          id: 2,
          title: { english: 'Naruto' },
          coverImage: { large: 'url2', color: '#ffa500' },
          season: 'FALL',
          seasonYear: 2002,
          genres: ['Action', 'Adventure'],
          studios: { nodes: [{ name: 'Pierrot' }] }
        }
      },
      {
        status: 'DROPPED',
        score: 5,
        media: {
          id: 3,
          title: { romaji: 'Bleach' },
          coverImage: { large: 'url3', color: '#0000ff' },
          startDate: { year: 2004, month: 10 },
          genres: ['Action'],
          studios: { nodes: [{ name: 'Pierrot' }] }
        }
      }
    ];

    it('correctly sorts entries into watching, dropped, and timeline arrays', () => {
      const data = processEntries(mockEntries, 'avatar.png', 'TestUser');
      
      expect(data.watching.length).toBe(1);
      expect(data.watching[0].title).toBe('Naruto');

      expect(data.dropped.length).toBe(1);
      expect(data.dropped[0].title).toBe('Bleach');

      // Timeline should contain only completed entries
      expect(data.timeline.length).toBe(1);
      expect(data.timeline[0].year).toBe(1998);
      expect(data.timeline[0].seasons.SPRING.length).toBe(1);
      expect(data.timeline[0].seasons.SPRING[0].title).toBe('Cowboy Bebop');
    });

    it('calculates stats correctly, ignoring unscored entries', () => {
      const data = processEntries(mockEntries, 'avatar.png', 'TestUser');
      
      expect(data.stats.completed).toBe(1);
      expect(data.stats.watching).toBe(1);
      
      // Mean score of (10 + 5) / 2 = 7.5
      expect(data.stats.meanScore).toBe('7.5');
      
      // Action appears 3 times
      expect(data.stats.topGenre).toBe('Action');
      
      // Pierrot appears 2 times
      expect(data.stats.topStudio).toBe('Pierrot');
    });

    it('extracts unique genres and years correctly', () => {
      const data = processEntries(mockEntries, 'avatar.png', 'TestUser');
      
      expect(data.uniqueGenres).toEqual(['Action', 'Adventure', 'Sci-Fi']);
      
      // Years: 2004, 2002, 1998 sorted descending
      expect(data.uniqueYears).toEqual([2004, 2002, 1998]);
    });
  });
});
