export const API_URL = 'https://graphql.anilist.co';

const query = `
query ($name: String, $type: MediaType, $page: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo {
      hasNextPage
      currentPage
    }
    mediaList(userName: $name, type: $type, status_in: [COMPLETED, CURRENT, DROPPED, PAUSED, PLANNING]) {
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
        genres
        studios(isMain: true) {
          nodes { name }
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
  genres: string[];
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
  planning: AnimeEntry[];
  timeline: YearGroup[];
  latestColor: string | null;
  stats: {
    completed: number;
    watching: number;
    meanScore: string;
    topGenre: string;
    topStudio: string;
  };
  uniqueGenres: string[];
  uniqueYears: number[];
}

export async function fetchUserAnime(username: string, type: 'ANIME' | 'MANGA' = 'ANIME'): Promise<ProcessedData> {
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
        variables: { name: username, type, page }
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
  const planning: AnimeEntry[] = [];
  
  let latestDateValue = 0;
  let latestColor: string | null = null;
  
  let completedCount = 0;
  let scoreSum = 0;
  let scoredCount = 0;

  const genreCounts: Record<string, number> = {};
  const studioCounts: Record<string, number> = {};
  const allGenres = new Set<string>();
  const allYears = new Set<number>();

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
      listStatus: listStatus,
      genres: media.genres || []
    };

    allYears.add(year);

    if (media.genres) {
      media.genres.forEach((g: string) => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
        allGenres.add(g);
      });
    }
    if (media.studios && media.studios.nodes) {
      media.studios.nodes.forEach((s: any) => studioCounts[s.name] = (studioCounts[s.name] || 0) + 1);
    }

    if (listStatus === 'CURRENT') {
      watching.push(animeEntry);
    } else if (listStatus === 'PAUSED') {
      paused.push(animeEntry);
    } else if (listStatus === 'DROPPED') {
      dropped.push(animeEntry);
    } else if (listStatus === 'PLANNING') {
      planning.push(animeEntry);
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
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  const topStudio = Object.entries(studioCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  return {
    watching,
    paused,
    dropped,
    planning,
    timeline: result,
    latestColor,
    stats: {
      completed: completedCount,
      watching: watching.length,
      meanScore,
      topGenre,
      topStudio
    },
    uniqueGenres: Array.from(allGenres).sort(),
    uniqueYears: Array.from(allYears).sort((a, b) => b - a)
  };
}
