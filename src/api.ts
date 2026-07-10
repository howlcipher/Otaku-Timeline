export const API_URL = 'https://graphql.anilist.co';

const query = `
query ($name: String, $page: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo {
      hasNextPage
      currentPage
    }
    mediaList(userName: $name, type: ANIME, status_in: [COMPLETED, CURRENT, DROPPED, PAUSED]) {
      status
      score
      completedAt { year month day }
      media {
        id
        title {
          romaji
          english
          userPreferred
        }
        coverImage {
          extraLarge
          large
          color
        }
        season
        seasonYear
        startDate {
          year
          month
        }
      }
    }
  }
}
`;

function getSeasonFromMonth(month: number) {
  if (month === 12 || month <= 2) return 'WINTER';
  if (month >= 3 && month <= 5) return 'SPRING';
  if (month >= 6 && month <= 8) return 'SUMMER';
  if (month >= 9 && month <= 11) return 'FALL';
  return 'UNKNOWN';
}

export interface AnimeEntry {
  id: number;
  title: string;
  cover: string;
  color: string;
  score: number;
  season: string;
  year: number;
  listStatus: string;
}

export interface SeasonGroup {
  WINTER: AnimeEntry[];
  SPRING: AnimeEntry[];
  SUMMER: AnimeEntry[];
  FALL: AnimeEntry[];
  UNKNOWN: AnimeEntry[];
}

export interface YearGroup {
  year: number;
  seasons: SeasonGroup;
}

export interface ProcessedData {
  watching: AnimeEntry[];
  paused: AnimeEntry[];
  dropped: AnimeEntry[];
  timeline: YearGroup[];
  latestColor: string | null;
  stats: {
    completed: number;
    watching: number;
    meanScore: string;
  };
}

export async function fetchUserAnime(username: string): Promise<ProcessedData> {
  let hasNextPage = true;
  let page = 1;
  const allEntries = [];

  while (hasNextPage) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { name: username, page }
      })
    });

    const data = await response.json();

    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    const pageInfo = data.data.Page.pageInfo;
    const mediaList = data.data.Page.mediaList;
    allEntries.push(...mediaList);

    hasNextPage = pageInfo.hasNextPage;
    page++;
    
    // Rate limit delay
    if(hasNextPage) {
        await new Promise(res => setTimeout(res, 600));
    }
  }

  return processEntries(allEntries);
}

function processEntries(entries: any[]): ProcessedData {
  const grouped: Record<number, SeasonGroup> = {};
  const watching: AnimeEntry[] = [];
  const paused: AnimeEntry[] = [];
  const dropped: AnimeEntry[] = [];
  
  let latestDateValue = 0;
  let latestColor: string | null = null;
  
  let completedCount = 0;
  let scoreSum = 0;
  let scoredCount = 0;

  for (const entry of entries) {
    const media = entry.media;
    const listStatus = entry.status;
    let season = media.season;
    let year = media.seasonYear;

    if (!season || !year) {
      year = media.startDate.year || 1970;
      season = media.startDate.month ? getSeasonFromMonth(media.startDate.month) : 'UNKNOWN';
    }

    const animeEntry: AnimeEntry = {
      id: media.id,
      title: media.title.userPreferred || media.title.english || media.title.romaji,
      cover: media.coverImage.extraLarge || media.coverImage.large,
      color: media.coverImage.color || '#333333',
      score: entry.score,
      season: season,
      year: year,
      listStatus: listStatus
    };

    if (listStatus === 'CURRENT') {
      watching.push(animeEntry);
    } else if (listStatus === 'PAUSED') {
      paused.push(animeEntry);
    } else if (listStatus === 'DROPPED') {
      dropped.push(animeEntry);
    } else {
      completedCount++;
      if (entry.score > 0) {
        scoreSum += entry.score;
        scoredCount++;
      }

      // Find latest color for COMPLETED
      if (entry.completedAt && entry.completedAt.year) {
        const { year, month, day } = entry.completedAt;
        const m = month || 1;
        const d = day || 1;
        const dateVal = (year * 10000) + (m * 100) + d;
        if (dateVal > latestDateValue) {
          latestDateValue = dateVal;
          latestColor = media.coverImage.color;
        }
      }

      if (!grouped[animeEntry.year]) {
        grouped[animeEntry.year] = { WINTER: [], SPRING: [], SUMMER: [], FALL: [], UNKNOWN: [] };
      }
      grouped[animeEntry.year][animeEntry.season as keyof SeasonGroup].push(animeEntry);
    }
  }

  const sortedYears = Object.keys(grouped).map(Number).sort((a, b) => b - a);
  const result: YearGroup[] = [];

  for (const year of sortedYears) {
    result.push({
      year,
      seasons: grouped[year]
    });
  }

  const meanScore = scoredCount > 0 ? (scoreSum / scoredCount).toFixed(1) : '0';

  return {
    watching,
    paused,
    dropped,
    timeline: result,
    latestColor,
    stats: {
      completed: completedCount,
      watching: watching.length,
      meanScore
    }
  };
}
