import './style.css';
import { fetchUserAnime, type AnimeEntry, type YearGroup } from './api';

const themeToggle = document.getElementById('themeToggle') as HTMLButtonElement;
const colorBlindToggle = document.getElementById('colorBlindToggle') as HTMLButtonElement;
const loadBtn = document.getElementById('loadBtn') as HTMLButtonElement;
const username1Input = document.getElementById('username1') as HTMLInputElement;
const username2Input = document.getElementById('username2') as HTMLInputElement;
const loadingDiv = document.getElementById('loading') as HTMLDivElement;
const errorDiv = document.getElementById('error') as HTMLDivElement;
const archiveContent = document.getElementById('archive-content') as HTMLDivElement;
const compareStats = document.getElementById('compare-stats') as HTMLElement;

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
  let scoreHtml = showScore && entry.score > 0 ? `<div class="card-score">★ ${entry.score}</div>` : '';
  if (secondScore !== undefined) {
    scoreHtml = `<div class="card-score">U1: ${entry.score} | U2: ${secondScore}</div>`;
  }

  return `
    <article class="anime-card">
      <img src="${entry.cover}" alt="Cover art for ${entry.title}" class="card-image" loading="lazy">
      <div class="card-info">
        <h3 class="card-title">${entry.title}</h3>
        ${scoreHtml}
      </div>
    </article>
  `;
}

function renderTimeline(data: YearGroup[], container: HTMLElement) {
  let html = '';
  const seasonsOrder = ['WINTER', 'SPRING', 'SUMMER', 'FALL', 'UNKNOWN'];

  for (const yearGrp of data) {
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
              ${entries.map(e => renderCard(e)).join('')}
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

function renderComparison(u1Name: string, u2Name: string, u1Data: YearGroup[], u2Data: YearGroup[]) {
  // Flatten to map for easy lookup
  const u1Map = new Map<number, AnimeEntry>();
  const u2Map = new Map<number, AnimeEntry>();

  u1Data.forEach(y => {
    Object.values(y.seasons).forEach((arr: AnimeEntry[]) => {
      arr.forEach(e => u1Map.set(e.id, e));
    });
  });

  u2Data.forEach(y => {
    Object.values(y.seasons).forEach((arr: AnimeEntry[]) => {
      arr.forEach(e => u2Map.set(e.id, e));
    });
  });

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

async function handleLoad() {
  const u1 = username1Input.value.trim() || 'howlcipher';
  const u2 = username2Input.value.trim();

  hideError();
  loadingDiv.classList.remove('hidden');
  archiveContent.innerHTML = '';
  compareStats.innerHTML = '';

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
      
      renderComparison(u1, u2, u1Data.timeline, u2Data.timeline);
    } else {
      if (u1Data.latestColor) {
        document.documentElement.style.setProperty('--dynamic-primary', u1Data.latestColor);
      } else {
        document.documentElement.style.removeProperty('--dynamic-primary');
      }
      document.documentElement.style.removeProperty('--dynamic-secondary');
      
      renderTimeline(u1Data.timeline, archiveContent);
    }
  } catch (err: any) {
    showError(err.message || 'Failed to fetch data.');
  } finally {
    loadingDiv.classList.add('hidden');
  }
}

loadBtn.addEventListener('click', handleLoad);

// Load default on startup
handleLoad();
