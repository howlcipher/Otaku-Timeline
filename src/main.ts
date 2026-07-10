import './style.css';
import { fetchUserAnime, type AnimeEntry } from './api';

const themeToggle = document.getElementById('themeToggle') as HTMLButtonElement;
const colorBlindToggle = document.getElementById('colorBlindToggle') as HTMLButtonElement;
const username1Input = document.getElementById('username1') as HTMLInputElement;
const username2Input = document.getElementById('username2') as HTMLInputElement;
const loadBtn = document.getElementById('loadBtn') as HTMLButtonElement;
const loadingDiv = document.getElementById('loading') as HTMLDivElement;
const errorDiv = document.getElementById('error') as HTMLDivElement;
const archiveContent = document.getElementById('archive-content') as HTMLDivElement;
const compareStats = document.getElementById('compare-stats') as HTMLElement;
const statsContainer = document.getElementById('stats-container') as HTMLElement;
const quickNav = document.getElementById('quick-nav') as HTMLElement;

const typeToggleBtn = document.getElementById('typeToggle') as HTMLButtonElement;
const masterpieceToggleBtn = document.getElementById('masterpieceToggle') as HTMLButtonElement;

const advancedFilters = document.getElementById('advanced-filters') as HTMLDivElement;
const searchInput = document.getElementById('searchInput') as HTMLInputElement;
const genreFilterSelect = document.getElementById('genreFilter') as HTMLSelectElement;
const yearFilterSelect = document.getElementById('yearFilter') as HTMLSelectElement;

// State
let isLight = false;
let isColorBlind = false;
let currentType: 'ANIME' | 'MANGA' = 'ANIME';
let filterMasterpiece = false;
let searchQuery = '';
let filterGenre = '';
let filterYear = '';
let lastU1Data: any = null;
let lastU2Data: any = null;

typeToggleBtn.addEventListener('click', () => {
  currentType = currentType === 'ANIME' ? 'MANGA' : 'ANIME';
  typeToggleBtn.textContent = `Mode: ${currentType}`;
  updateNavText();
  handleLoad();
});

masterpieceToggleBtn.addEventListener('click', () => {
  filterMasterpiece = !filterMasterpiece;
  if (filterMasterpiece) {
    masterpieceToggleBtn.classList.add('active');
  } else {
    masterpieceToggleBtn.classList.remove('active');
  }
  reRender();
});

searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value;
  reRender();
});
genreFilterSelect.addEventListener('change', () => {
  filterGenre = genreFilterSelect.value;
  reRender();
});
yearFilterSelect.addEventListener('change', () => {
  filterYear = yearFilterSelect.value;
  reRender();
});

function reRender() {
  if (!lastU1Data) return;
  const u2 = username2Input.value.trim();
  if (u2 && lastU2Data) {
    renderCompareStats(lastU1Data.stats, lastU2Data.stats);
    renderComparison(username1Input.value.trim(), u2, lastU1Data, lastU2Data);
  } else {
    renderStats(lastU1Data.stats);
    renderTimeline(lastU1Data, archiveContent);
  }
}

function updateNavText() {
  const tWatch = document.getElementById('nav-watching-text');
  const tPlan = document.getElementById('nav-planning-text');
  const tComp = document.getElementById('nav-completed-text');
  if (tWatch) tWatch.textContent = currentType === 'ANIME' ? 'Watching' : 'Reading';
  if (tPlan) tPlan.textContent = currentType === 'ANIME' ? 'Plan to Watch' : 'Plan to Read';
  if (tComp) tComp.textContent = currentType === 'ANIME' ? 'Completed' : 'Read';
}

function renderCard(entry: AnimeEntry, showScore: boolean = true, index: number = 0) {
  let extraHtml = '';

  if (entry.listStatus === 'PLANNING') {
    extraHtml = `<div class="card-score">PLANNING</div>`;
  } else if (entry.listStatus === 'CURRENT') {
    let txt = `${entry.season !== 'UNKNOWN' ? entry.season : ''} ${entry.year}`.trim();
    extraHtml = `<div class="card-score">${txt || (currentType === 'ANIME' ? 'WATCHING' : 'READING')}</div>`;
  } else if (entry.listStatus === 'PAUSED') {
    extraHtml = `<div class="card-score">ON HOLD</div>`;
  } else if (entry.listStatus === 'DROPPED') {
    extraHtml = `<div class="card-score">DROPPED</div>`;
  } else if (showScore && entry.score > 0) {
    extraHtml = `<div class="card-score">★ ${entry.score}</div>`;
  }

  return `
    <article class="anime-card" style="--card-color: ${entry.color}; animation-delay: ${index * 0.05}s">
      <div class="cover-wrapper">
        <img src="${entry.cover}" alt="${entry.title} cover art" loading="lazy" />
      </div>
      <div class="card-content">
        <h3 class="card-title">${entry.title}</h3>
        ${extraHtml}
      </div>
    </article>
  `;
}

function filterEntries(entries: AnimeEntry[]) {
  if (!entries) return [];
  return entries.filter(e => {
    if (filterMasterpiece && e.score !== 10 && e.score !== 100) return false;
    if (searchQuery && !e.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterGenre && (!e.genres || !e.genres.includes(filterGenre))) return false;
    if (filterYear && e.year.toString() !== filterYear) return false;
    return true;
  });
}

function renderTimeline(data: any, container: HTMLElement) {
  let html = '';
  
  const watching = filterEntries(data.watching);
  if (watching.length > 0) {
    html += `
      <section id="section-watching" class="year-section">
        <h2 class="year-title">Currently ${currentType === 'ANIME' ? 'Watching' : 'Reading'}</h2>
        <div class="card-grid" style="margin-bottom: 2rem;">
          ${watching.map((e: AnimeEntry, i: number) => renderCard(e, true, i)).join('')}
        </div>
      </section>
    `;
  }

  const planning = filterEntries(data.planning);
  if (planning.length > 0) {
    html += `
      <section id="section-planning" class="year-section">
        <h2 class="year-title">Plan to ${currentType === 'ANIME' ? 'Watch' : 'Read'}</h2>
        <div class="card-grid" style="margin-bottom: 2rem;">
          ${planning.map((e: AnimeEntry, i: number) => renderCard(e, true, i)).join('')}
        </div>
      </section>
    `;
  }

  const paused = filterEntries(data.paused);
  if (paused.length > 0) {
    html += `
      <section id="section-paused" class="year-section">
        <h2 class="year-title">On Hold</h2>
        <div class="card-grid" style="margin-bottom: 2rem;">
          ${paused.map((e: AnimeEntry, i: number) => renderCard(e, true, i)).join('')}
        </div>
      </section>
    `;
  }

  const dropped = filterEntries(data.dropped);
  if (dropped.length > 0) {
    html += `
      <section id="section-dropped" class="year-section">
        <h2 class="year-title">Dropped</h2>
        <div class="card-grid" style="margin-bottom: 2rem;">
          ${dropped.map((e: AnimeEntry, i: number) => renderCard(e, true, i)).join('')}
        </div>
      </section>
    `;
  }

  if (data.timeline && data.timeline.length > 0) {
    html += `<div id="section-completed"></div>`;
  }

  const seasonsOrder = ['WINTER', 'SPRING', 'SUMMER', 'FALL', 'UNKNOWN'];

  for (const yearGrp of data.timeline) {
    let hasEntries = false;
    let yearHtml = `<section class="year-section"><h2 class="year-title">${yearGrp.year}</h2>`;

    for (const season of seasonsOrder) {
      const entries = filterEntries(yearGrp.seasons[season]);
      if (entries && entries.length > 0) {
        hasEntries = true;
        yearHtml += `
          <div class="season-section">
            <h3 class="season-title">${season}</h3>
            <div class="card-grid">
              ${entries.map((e: AnimeEntry, i: number) => renderCard(e, true, i)).join('')}
            </div>
          </div>
        `;
      }
    }
    yearHtml += `</section>`;
    
    if (hasEntries) {
      html += yearHtml;
    }
  }

  if (filterMasterpiece && html === '') {
    html = '<p style="text-align:center; color: var(--text-color); opacity: 0.7;">No masterpieces (10/10) found.</p>';
  }

  container.innerHTML = html;
}

function renderComparison(u1: string, u2: string, u1Data: any, u2Data: any) {
  const u1Map = new Map<number, AnimeEntry>();
  const u2Map = new Map<number, AnimeEntry>();

  u1Data.timeline.forEach((y: any) => {
    Object.values(y.seasons).forEach((arr: any) => arr.forEach((e: AnimeEntry) => u1Map.set(e.id, e)));
  });
  if (u1Data.watching) u1Data.watching.forEach((e: AnimeEntry) => u1Map.set(e.id, e));
  if (u1Data.planning) u1Data.planning.forEach((e: AnimeEntry) => u1Map.set(e.id, e));
  if (u1Data.paused) u1Data.paused.forEach((e: AnimeEntry) => u1Map.set(e.id, e));
  if (u1Data.dropped) u1Data.dropped.forEach((e: AnimeEntry) => u1Map.set(e.id, e));

  u2Data.timeline.forEach((y: any) => {
    Object.values(y.seasons).forEach((arr: any) => arr.forEach((e: AnimeEntry) => u2Map.set(e.id, e)));
  });
  if (u2Data.watching) u2Data.watching.forEach((e: AnimeEntry) => u2Map.set(e.id, e));
  if (u2Data.planning) u2Data.planning.forEach((e: AnimeEntry) => u2Map.set(e.id, e));
  if (u2Data.paused) u2Data.paused.forEach((e: AnimeEntry) => u2Map.set(e.id, e));
  if (u2Data.dropped) u2Data.dropped.forEach((e: AnimeEntry) => u2Map.set(e.id, e));

  const matches: { e1: AnimeEntry, e2: AnimeEntry }[] = [];
  const planMatches: { e1: AnimeEntry, e2: AnimeEntry }[] = [];
  const onlyU1: AnimeEntry[] = [];
  const onlyU2: AnimeEntry[] = [];

  let affinityScoreDiff = 0;
  let scoreMatches = 0;

  for (const [id, e1] of u1Map.entries()) {
    if (u2Map.has(id)) {
      const e2 = u2Map.get(id)!;
      if (e1.listStatus === 'PLANNING' && e2.listStatus === 'PLANNING') {
        planMatches.push({ e1, e2 });
      } else {
        matches.push({ e1, e2 });
        // Affinity math
        if (e1.score > 0 && e2.score > 0) {
          scoreMatches++;
          let maxScore = 10;
          if (e1.score > 10 || e2.score > 10) maxScore = 100;
          
          let e1Norm = e1.score <= 10 && maxScore === 100 ? e1.score * 10 : e1.score;
          let e2Norm = e2.score <= 10 && maxScore === 100 ? e2.score * 10 : e2.score;
          
          let diff = Math.abs(e1Norm - e2Norm);
          affinityScoreDiff += (diff / maxScore);
        }
      }
    } else {
      onlyU1.push(e1);
    }
  }

  for (const [id, e2] of u2Map.entries()) {
    if (!u1Map.has(id)) {
      onlyU2.push(e2);
    }
  }

  let affinityPercent = 0;
  if (matches.length > 0) {
    let sharedRatio = matches.length / (u1Map.size + u2Map.size - matches.length); 
    
    let scoreSim = 1;
    if (scoreMatches > 0) {
      let avgDiff = affinityScoreDiff / scoreMatches;
      scoreSim = 1 - avgDiff;
    }
    
    affinityPercent = Math.round((sharedRatio * 40) + (scoreSim * 60));
    if (affinityPercent > 100) affinityPercent = 100;
  }

  const fMatches = matches.filter(m => !filterMasterpiece || (m.e1.score === 10 || m.e2.score === 10 || m.e1.score === 100 || m.e2.score === 100));
  const fOnlyU1 = filterEntries(onlyU1);
  const fOnlyU2 = filterEntries(onlyU2);
  const fPlan = planMatches;

  let html = `
    <div style="text-align: center; margin-bottom: 2rem;">
      <h2 style="font-size: 3rem; color: var(--primary-color);">Affinity Match: ${affinityPercent}%</h2>
      <p style="opacity: 0.7;">Based on shared ${currentType.toLowerCase()} and score similarity.</p>
    </div>
  `;
  
  if (fMatches.length > 0) {
    html += `<h2 class="compare-title">Shared</h2><div class="card-grid">`;
    fMatches.forEach(({ e1, e2 }, i) => {
      let scoreHtml = '';
      if (e1.score > 0 || e2.score > 0) {
        scoreHtml = `
          <div class="compare-scores">
            <span class="score-u1">★ ${e1.score || '-'}</span>
            <span class="score-u2">★ ${e2.score || '-'}</span>
          </div>
        `;
      }
      
      html += `
        <article class="anime-card compare" style="--card-color: ${e1.color}; animation-delay: ${i * 0.05}s">
          <div class="cover-wrapper">
            <img src="${e1.cover}" alt="${e1.title} cover" loading="lazy" />
          </div>
          <div class="card-content">
            <h3 class="card-title">${e1.title}</h3>
            ${scoreHtml}
          </div>
        </article>
      `;
    });
    html += `</div>`;
  }

  if (fPlan.length > 0) {
    html += `<h2 class="compare-title" style="margin-top: 3rem;">Both Plan to ${currentType === 'ANIME' ? 'Watch' : 'Read'}</h2><div class="card-grid">`;
    fPlan.forEach(({ e1 }, i) => {
      html += renderCard(e1, false, i);
    });
    html += `</div>`;
  }

  if (fOnlyU1.length > 0) {
    html += `<h2 class="compare-title" style="margin-top: 3rem;">Only ${u1}</h2><div class="card-grid">`;
    fOnlyU1.forEach((e, i) => html += renderCard(e, true, i));
    html += `</div>`;
  }
  
  if (fOnlyU2.length > 0) {
    html += `<h2 class="compare-title" style="margin-top: 3rem;">Only ${u2}</h2><div class="card-grid">`;
    fOnlyU2.forEach((e, i) => html += renderCard(e, true, i));
    html += `</div>`;
  }

  compareStats.innerHTML = html;
  compareStats.classList.remove('hidden');
}

function renderStats(stats: any) {
  statsContainer.innerHTML = `
    <div class="stats-banner">
      <div class="stat-box">
        <span class="stat-label">${currentType === 'ANIME' ? 'COMPLETED' : 'READ'}</span>
        <span class="stat-value">${stats.completed}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">${currentType === 'ANIME' ? 'WATCHING' : 'READING'}</span>
        <span class="stat-value">${stats.watching}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">MEAN SCORE</span>
        <span class="stat-value">${stats.meanScore}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">TOP GENRE</span>
        <span class="stat-value" style="font-size: 1.5rem;">${stats.topGenre}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">${currentType === 'ANIME' ? 'TOP STUDIO' : 'TOP GENRE 2'}</span>
        <span class="stat-value" style="font-size: 1.2rem;">${stats.topStudio}</span>
      </div>
    </div>
  `;
}

function renderCompareStats(s1: any, s2: any) {
  statsContainer.innerHTML = `
    <div class="stats-banner">
      <div class="stat-box">
        <span class="stat-label">${currentType === 'ANIME' ? 'COMPLETED' : 'READ'}</span>
        <span class="stat-value compare">U1: ${s1.completed} | U2: ${s2.completed}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">MEAN SCORE</span>
        <span class="stat-value compare">U1: ${s1.meanScore} | U2: ${s2.meanScore}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">TOP GENRE</span>
        <span class="stat-value compare" style="font-size: 1rem;">U1: ${s1.topGenre} | U2: ${s2.topGenre}</span>
      </div>
    </div>
  `;
}

function populateFilters(u1Data: any, u2Data: any) {
  const gSet = new Set<string>(u1Data.uniqueGenres);
  const ySet = new Set<number>(u1Data.uniqueYears);
  if (u2Data) {
    u2Data.uniqueGenres.forEach((g: string) => gSet.add(g));
    u2Data.uniqueYears.forEach((y: number) => ySet.add(y));
  }
  const genres = Array.from(gSet).sort();
  const years = Array.from(ySet).sort((a, b) => b - a);

  let gHtml = '<option value="">All Genres</option>';
  genres.forEach(g => gHtml += `<option value="${g}">${g}</option>`);
  genreFilterSelect.innerHTML = gHtml;
  genreFilterSelect.value = filterGenre;

  let yHtml = '<option value="">All Years</option>';
  years.forEach(y => yHtml += `<option value="${y}">${y}</option>`);
  yearFilterSelect.innerHTML = yHtml;
  yearFilterSelect.value = filterYear;
}

async function handleLoad() {
  const u1 = username1Input.value.trim() || 'howlcipher';
  const u2 = username2Input.value.trim();

  localStorage.setItem('otakuTimeline_u1', u1);
  localStorage.setItem('otakuTimeline_u2', u2);

  hideError();
  loadingDiv.classList.remove('hidden');
  quickNav.classList.add('hidden');
  archiveContent.innerHTML = '';
  compareStats.innerHTML = '';
  statsContainer.innerHTML = '';

  try {
    const u1Data = await fetchUserAnime(u1, currentType);
    lastU1Data = u1Data;
    
    if (u2) {
      const u2Data = await fetchUserAnime(u2, currentType);
      lastU2Data = u2Data;
      
      if (u1Data.latestColor) {
        document.documentElement.style.setProperty('--dynamic-primary', u1Data.latestColor);
      }
      if (u2Data.latestColor) {
        document.documentElement.style.setProperty('--dynamic-secondary', u2Data.latestColor);
      } else {
        document.documentElement.style.removeProperty('--dynamic-secondary');
      }
      
      populateFilters(u1Data, u2Data);
      advancedFilters.classList.remove('hidden');

      renderCompareStats(u1Data.stats, u2Data.stats);
      renderComparison(u1, u2, u1Data, u2Data);
    } else {
      if (u1Data.latestColor) {
        document.documentElement.style.setProperty('--dynamic-primary', u1Data.latestColor);
      }
      document.documentElement.style.removeProperty('--dynamic-secondary');
      
      populateFilters(u1Data, null);
      advancedFilters.classList.remove('hidden');

      renderStats(u1Data.stats);
      renderTimeline(u1Data, archiveContent);
    }
    
    if (!u2) {
      quickNav.classList.remove('hidden');
    }
  } catch (err: any) {
    showError(err.message || 'Failed to fetch data.');
  } finally {
    loadingDiv.classList.add('hidden');
  }
}

function showError(msg: string) {
  errorDiv.textContent = msg;
  errorDiv.classList.remove('hidden');
}

function hideError() {
  errorDiv.classList.add('hidden');
}

themeToggle.addEventListener('click', () => {
  isLight = !isLight;
  if (isLight) {
    document.documentElement.setAttribute('data-theme', 'light');
    themeToggle.textContent = '🌙 Dark Mode';
  } else {
    document.documentElement.removeAttribute('data-theme');
    themeToggle.textContent = '☀️ Light Mode';
  }
});

colorBlindToggle.addEventListener('click', () => {
  isColorBlind = !isColorBlind;
  if (isColorBlind) {
    document.documentElement.setAttribute('data-colorblind', 'true');
    colorBlindToggle.textContent = 'Disable High Contrast';
  } else {
    document.documentElement.removeAttribute('data-colorblind');
    colorBlindToggle.textContent = '👁️ High Contrast';
  }
});

loadBtn.addEventListener('click', handleLoad);

function handleEnter(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    handleLoad();
  }
}

username1Input.addEventListener('keydown', handleEnter);
username2Input.addEventListener('keydown', handleEnter);

// Load saved users
const savedU1 = localStorage.getItem('otakuTimeline_u1');
const savedU2 = localStorage.getItem('otakuTimeline_u2');
if (savedU1) username1Input.value = savedU1;
if (savedU2) username2Input.value = savedU2;

handleLoad();
