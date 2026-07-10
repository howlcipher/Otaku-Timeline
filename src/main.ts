import './style.css';
import { fetchUserAnime, type AnimeEntry } from './api';

const themeToggle = document.getElementById('themeToggle') as HTMLButtonElement;
const colorBlindToggle = document.getElementById('colorBlindToggle') as HTMLButtonElement;
const loadBtn = document.getElementById('loadBtn') as HTMLButtonElement;
const username1Input = document.getElementById('username1') as HTMLInputElement;
const username2Input = document.getElementById('username2') as HTMLInputElement;
const loadingDiv = document.getElementById('loading') as HTMLDivElement;
const errorDiv = document.getElementById('error') as HTMLDivElement;
const archiveContent = document.getElementById('archive-content') as HTMLDivElement;
const compareStats = document.getElementById('compare-stats') as HTMLElement;
const statsContainer = document.getElementById('stats-container') as HTMLElement;
const quickNav = document.getElementById('quick-nav') as HTMLElement;

// Theming
let isLight = false;
themeToggle.addEventListener('click', () => {
  isLight = !isLight;
  document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
});

let isColorBlind = false;
colorBlindToggle.addEventListener('click', () => {
  isColorBlind = !isColorBlind;
  document.documentElement.setAttribute('data-colorblind', isColorBlind.toString());
});

function showError(msg: string) {
  errorDiv.textContent = msg;
  errorDiv.classList.remove('hidden');
}

function hideError() {
  errorDiv.classList.add('hidden');
}

function renderCard(entry: AnimeEntry, showScore: boolean = true, secondScore?: number): string {
  let extraHtml = '';
  if (secondScore !== undefined) {
    extraHtml = `<div class="card-score">U1: ${entry.score} | U2: ${secondScore}</div>`;
  } else if (entry.listStatus === 'CURRENT') {
    let txt = `${entry.season !== 'UNKNOWN' ? entry.season : ''} ${entry.year}`.trim();
    extraHtml = `<div class="card-score">${txt || 'WATCHING'}</div>`;
  } else if (entry.listStatus === 'PAUSED') {
    extraHtml = `<div class="card-score">ON HOLD</div>`;
  } else if (entry.listStatus === 'DROPPED') {
    extraHtml = `<div class="card-score">DROPPED</div>`;
  } else if (showScore && entry.score > 0) {
    extraHtml = `<div class="card-score">★ ${entry.score}</div>`;
  }

  return `
    <article class="anime-card">
      <img src="${entry.cover}" alt="Cover art for ${entry.title}" class="card-image" loading="lazy">
      <div class="card-info">
        <h3 class="card-title">${entry.title}</h3>
        ${extraHtml}
      </div>
    </article>
  `;
}

function renderTimeline(data: any, container: HTMLElement) {
  let html = '';
  
  if (data.watching && data.watching.length > 0) {
    html += `
      <section id="section-watching" class="year-section">
        <h2 class="year-title">Currently Watching</h2>
        <div class="card-grid" style="margin-bottom: 2rem;">
          ${data.watching.map((e: AnimeEntry) => renderCard(e)).join('')}
        </div>
      </section>
    `;
  }

  if (data.paused && data.paused.length > 0) {
    html += `
      <section id="section-paused" class="year-section">
        <h2 class="year-title">On Hold</h2>
        <div class="card-grid" style="margin-bottom: 2rem;">
          ${data.paused.map((e: AnimeEntry) => renderCard(e)).join('')}
        </div>
      </section>
    `;
  }

  if (data.dropped && data.dropped.length > 0) {
    html += `
      <section id="section-dropped" class="year-section">
        <h2 class="year-title">Dropped</h2>
        <div class="card-grid" style="margin-bottom: 2rem;">
          ${data.dropped.map((e: AnimeEntry) => renderCard(e)).join('')}
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
      const entries = yearGrp.seasons[season as keyof typeof yearGrp.seasons];
      if (entries && entries.length > 0) {
        hasEntries = true;
        yearHtml += `
          <div class="season-section">
            <h3 class="season-title">${season}</h3>
            <div class="card-grid">
              ${entries.map((e: AnimeEntry) => renderCard(e)).join('')}
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

  container.innerHTML = html;
}

function renderComparison(u1Name: string, u2Name: string, u1Data: any, u2Data: any) {
  // Flatten to map for easy lookup
  const u1Map = new Map<number, AnimeEntry>();
  const u2Map = new Map<number, AnimeEntry>();

  u1Data.timeline.forEach((y: any) => {
    Object.values(y.seasons).forEach((arr: any) => {
      arr.forEach((e: AnimeEntry) => u1Map.set(e.id, e));
    });
  });
  if (u1Data.watching) u1Data.watching.forEach((e: AnimeEntry) => u1Map.set(e.id, e));
  if (u1Data.paused) u1Data.paused.forEach((e: AnimeEntry) => u1Map.set(e.id, e));
  if (u1Data.dropped) u1Data.dropped.forEach((e: AnimeEntry) => u1Map.set(e.id, e));

  u2Data.timeline.forEach((y: any) => {
    Object.values(y.seasons).forEach((arr: any) => {
      arr.forEach((e: AnimeEntry) => u2Map.set(e.id, e));
    });
  });
  if (u2Data.watching) u2Data.watching.forEach((e: AnimeEntry) => u2Map.set(e.id, e));
  if (u2Data.paused) u2Data.paused.forEach((e: AnimeEntry) => u2Map.set(e.id, e));
  if (u2Data.dropped) u2Data.dropped.forEach((e: AnimeEntry) => u2Map.set(e.id, e));

  const matches: { e1: AnimeEntry, e2: AnimeEntry }[] = [];
  const onlyU1: AnimeEntry[] = [];
  const onlyU2: AnimeEntry[] = [];

  for (const [id, e1] of u1Map) {
    if (u2Map.has(id)) {
      matches.push({ e1, e2: u2Map.get(id)! });
    } else {
      onlyU1.push(e1);
    }
  }

  for (const [id, e2] of u2Map) {
    if (!u1Map.has(id)) {
      onlyU2.push(e2);
    }
  }

  // Render Compare Layout
  let html = `<h2 class="year-title">Comparison</h2>`;

  html += `<h3 class="compare-title">Shared Matches (${matches.length})</h3>`;
  html += `<div class="card-grid">`;
  html += matches.map(m => renderCard(m.e1, true, m.e2.score)).join('');
  html += `</div>`;

  html += `<h3 class="compare-title">Only ${u1Name} (${onlyU1.length})</h3>`;
  html += `<div class="card-grid">`;
  html += onlyU1.map(e => renderCard(e)).join('');
  html += `</div>`;

  html += `<h3 class="compare-title">Only ${u2Name} (${onlyU2.length})</h3>`;
  html += `<div class="card-grid">`;
  html += onlyU2.map(e => renderCard(e)).join('');
  html += `</div>`;

  archiveContent.innerHTML = html;
  compareStats.classList.add('hidden');
}

function renderStats(stats: any) {
  statsContainer.innerHTML = `
    <div class="stats-banner">
      <div class="stat-box">
        <span class="stat-label">COMPLETED</span>
        <span class="stat-value">${stats.completed}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">WATCHING</span>
        <span class="stat-value">${stats.watching}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">MEAN SCORE</span>
        <span class="stat-value">${stats.meanScore}</span>
      </div>
    </div>
  `;
}

function renderCompareStats(s1: any, s2: any) {
  statsContainer.innerHTML = `
    <div class="stats-banner">
      <div class="stat-box">
        <span class="stat-label">COMPLETED</span>
        <span class="stat-value compare">U1: ${s1.completed} | U2: ${s2.completed}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">WATCHING</span>
        <span class="stat-value compare">U1: ${s1.watching} | U2: ${s2.watching}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">MEAN SCORE</span>
        <span class="stat-value compare">U1: ${s1.meanScore} | U2: ${s2.meanScore}</span>
      </div>
    </div>
  `;
}

async function handleLoad() {
  const u1 = username1Input.value.trim() || 'howlcipher';
  const u2 = username2Input.value.trim();

  hideError();
  loadingDiv.classList.remove('hidden');
  quickNav.classList.add('hidden');
  archiveContent.innerHTML = '';
  compareStats.innerHTML = '';
  statsContainer.innerHTML = '';

  try {
    const u1Data = await fetchUserAnime(u1);

    if (u2) {
      const u2Data = await fetchUserAnime(u2);
      
      if (u1Data.latestColor) {
        document.documentElement.style.setProperty('--dynamic-primary', u1Data.latestColor);
      } else {
        document.documentElement.style.removeProperty('--dynamic-primary');
      }
      if (u2Data.latestColor) {
        document.documentElement.style.setProperty('--dynamic-secondary', u2Data.latestColor);
      } else {
        document.documentElement.style.removeProperty('--dynamic-secondary');
      }
      
      renderCompareStats(u1Data.stats, u2Data.stats);
      renderComparison(u1, u2, u1Data, u2Data);
    } else {
      if (u1Data.latestColor) {
        document.documentElement.style.setProperty('--dynamic-primary', u1Data.latestColor);
      } else {
        document.documentElement.style.removeProperty('--dynamic-primary');
      }
      document.documentElement.style.removeProperty('--dynamic-secondary');
      
      renderStats(u1Data.stats);
      renderTimeline(u1Data, archiveContent);
    }
    
    // Show nav if successful
    if (!u2) {
      quickNav.classList.remove('hidden');
    }
  } catch (err: any) {
    showError(err.message || 'Failed to fetch data.');
  } finally {
    loadingDiv.classList.add('hidden');
  }
}

// Event Listeners
loadBtn.addEventListener('click', handleLoad);

function handleEnter(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    handleLoad();
  }
}

username1Input.addEventListener('keydown', handleEnter);
username2Input.addEventListener('keydown', handleEnter);

// Handle Theme/Accessibility startup
handleLoad();
