import './style.css';
import { fetchUserAnime, filterAnimeEntries, type AnimeEntry } from './api';

const themeToggle = document.getElementById('themeToggle') as HTMLButtonElement;
const colorBlindToggle = document.getElementById('colorBlindToggle') as HTMLButtonElement;
const mobileMenuToggle = document.getElementById('mobileMenuToggle') as HTMLButtonElement;
const headerContent = document.getElementById('headerContent') as HTMLDivElement;
const username1Input = document.getElementById('username1') as HTMLInputElement;
const username2Input = document.getElementById('username2') as HTMLInputElement;
const addCompareBtn = document.getElementById('addCompareBtn') as HTMLButtonElement;
const removeCompareBtn = document.getElementById('removeCompareBtn') as HTMLButtonElement;
const username2Container = document.getElementById('username2Container') as HTMLDivElement;
const loadBtn = document.getElementById('loadBtn') as HTMLButtonElement;
const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
const skeletonContainer = document.getElementById('skeleton-container') as HTMLDivElement;
const toastContainer = document.getElementById('toast-container') as HTMLDivElement;
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
let isLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
let isComparing = false;
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
  const u2 = isComparing ? username2Input.value.trim() : '';
  if (u2 && lastU2Data) {
    renderCompareStats(lastU1Data, lastU2Data);
    renderComparison(username1Input.value.trim(), u2, lastU1Data, lastU2Data);
  } else {
    renderStats(lastU1Data);
    renderTimeline(lastU1Data, archiveContent);
  }
}

// Intersection Observer for Scroll Reveal
const observerOptions = {
  root: null,
  rootMargin: '0px',
  threshold: 0.1
};

const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('show');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

function observeReveals() {
  const reveals = document.querySelectorAll('.scroll-reveal');
  reveals.forEach(el => observer.observe(el));
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
    <article class="anime-card scroll-reveal" style="--card-color: ${entry.color}; animation-delay: ${index * 0.05}s">
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
  return filterAnimeEntries(entries, {
    filterMasterpiece,
    searchQuery,
    filterGenre,
    filterYear
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
  observeReveals();
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

  const fMatches = matches.filter(m => {
    const passesGeneral = (
      (!searchQuery || m.e1.title.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (!filterGenre || (m.e1.genres && m.e1.genres.includes(filterGenre))) &&
      (!filterYear || m.e1.year.toString() === filterYear)
    );
    if (!passesGeneral) return false;
    if (filterMasterpiece) {
      return m.e1.score === 10 || m.e2.score === 10 || m.e1.score === 100 || m.e2.score === 100;
    }
    return true;
  });
  
  const fPlan = planMatches.filter(m => {
    const passesGeneral = (
      (!searchQuery || m.e1.title.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (!filterGenre || (m.e1.genres && m.e1.genres.includes(filterGenre))) &&
      (!filterYear || m.e1.year.toString() === filterYear)
    );
    if (!passesGeneral) return false;
    if (filterMasterpiece) {
      return false; // Planning items usually don't have scores, so they can't be masterpieces
    }
    return true;
  });

  const fOnlyU1 = filterEntries(onlyU1);
  const fOnlyU2 = filterEntries(onlyU2);

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
    html += `<h2 class="compare-title scroll-reveal" style="margin-top: 3rem;">Only ${u1}</h2><div class="card-grid">`;
    fOnlyU1.forEach((e, i) => html += renderCard(e, true, i));
    html += `</div>`;
  }
  
  if (fOnlyU2.length > 0) {
    html += `<h2 class="compare-title scroll-reveal" style="margin-top: 3rem;">Only ${u2}</h2><div class="card-grid">`;
    fOnlyU2.forEach((e, i) => html += renderCard(e, true, i));
    html += `</div>`;
  }

  compareStats.innerHTML = html;
  compareStats.classList.remove('hidden');
  observeReveals();
}

const GENRE_COLORS = [
  '#ff5555', '#50fa7b', '#8be9fd', '#bd93f9', '#f1fa8c', '#ffb86c', '#ff79c6'
];

function renderStats(userData: any) {
  const stats = userData.stats;
  const topGenres = stats.top5Genres || [];
  
  let visualizerHtml = '';
  let legendHtml = '';
  
  if (topGenres.length > 0) {
    const totalTop = topGenres.reduce((acc: number, g: any) => acc + g.count, 0);
    
    visualizerHtml = `<div class="genre-visualizer scroll-reveal">`;
    legendHtml = `<div class="genre-legend scroll-reveal">`;
    
    topGenres.forEach((g: any, i: number) => {
      const color = GENRE_COLORS[i % GENRE_COLORS.length];
      const pct = (g.count / totalTop) * 100;
      visualizerHtml += `<div class="genre-bar" style="width: ${pct}%; background-color: ${color};" title="${g.name}: ${g.count}"></div>`;
      legendHtml += `<div class="legend-item"><div class="legend-color" style="background-color: ${color};"></div><span>${g.name}</span></div>`;
    });
    
    visualizerHtml += `</div>`;
    legendHtml += `</div>`;
  }

  statsContainer.innerHTML = `
    <div class="stats-banner scroll-reveal">
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
      <div class="stat-box" style="flex: 2;">
        <span class="stat-label">TOP GENRES</span>
        ${visualizerHtml}
        ${legendHtml}
      </div>
    </div>
  `;
  observeReveals();
}

function renderCompareStats(u1Data: any, u2Data: any) {
  const s1 = u1Data.stats;
  const s2 = u2Data.stats;

  const renderUserLabel = (data: any, val: string | number) => {
    const avatar = data.userAvatar ? `<img src="${data.userAvatar}" alt="${data.userName}" style="width:24px; height:24px; border-radius:50%; object-fit: cover;">` : `<span>${data.userName}:</span>`;
    return `<span style="display: flex; align-items: center; gap: 0.5rem; justify-content: center;">
      ${avatar} <span style="max-width:90px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${val}">${val}</span>
    </span>`;
  };

  statsContainer.innerHTML = `
    <div class="stats-banner">
      <div class="stat-box">
        <span class="stat-label">${currentType === 'ANIME' ? 'COMPLETED' : 'READ'}</span>
        <div class="stat-value compare" style="display: flex; gap: 1.5rem; align-items: center; justify-content: center; margin-top: 0.25rem;">
          ${renderUserLabel(u1Data, s1.completed)}
          ${renderUserLabel(u2Data, s2.completed)}
        </div>
      </div>
      <div class="stat-box">
        <span class="stat-label">MEAN SCORE</span>
        <div class="stat-value compare" style="display: flex; gap: 1.5rem; align-items: center; justify-content: center; margin-top: 0.25rem;">
          ${renderUserLabel(u1Data, s1.meanScore)}
          ${renderUserLabel(u2Data, s2.meanScore)}
        </div>
      </div>
      <div class="stat-box">
        <span class="stat-label">TOP GENRE</span>
        <div class="stat-value compare" style="display: flex; gap: 1.5rem; align-items: center; justify-content: center; margin-top: 0.25rem; font-size: 1.1rem;">
          ${renderUserLabel(u1Data, s1.topGenre)}
          ${renderUserLabel(u2Data, s2.topGenre)}
        </div>
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

function showSkeleton() {
  let skeletons = '';
  for (let i = 0; i < 12; i++) {
    skeletons += `
      <div class="skeleton-card">
        <div class="skeleton-cover"></div>
        <div class="skeleton-text"></div>
        <div class="skeleton-text" style="width: 60%;"></div>
      </div>
    `;
  }
  skeletonContainer.innerHTML = `<div class="card-grid">${skeletons}</div>`;
  skeletonContainer.classList.remove('hidden');
}

function hideSkeleton() {
  skeletonContainer.classList.add('hidden');
}

async function handleLoad() {
  const u1 = username1Input.value.trim() || 'howlcipher';
  const u2 = isComparing ? username2Input.value.trim() : '';

  localStorage.setItem('otakuTimeline_u1', u1);
  if (isComparing && u2) {
    localStorage.setItem('otakuTimeline_u2', u2);
  } else {
    localStorage.removeItem('otakuTimeline_u2');
  }

  // Update Shareable URL
  const newUrl = new URL(window.location.href);
  newUrl.searchParams.set('u1', u1);
  if (u2) newUrl.searchParams.set('u2', u2);
  else newUrl.searchParams.delete('u2');
  newUrl.searchParams.set('type', currentType);
  window.history.pushState({}, '', newUrl);

  showSkeleton();
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

      renderCompareStats(u1Data, u2Data);
      renderComparison(u1, u2, u1Data, u2Data);
    } else {
      if (u1Data.latestColor) {
        document.documentElement.style.setProperty('--dynamic-primary', u1Data.latestColor);
      }
      document.documentElement.style.removeProperty('--dynamic-secondary');
      
      populateFilters(u1Data, null);
      advancedFilters.classList.remove('hidden');

      renderStats(u1Data);
      renderTimeline(u1Data, archiveContent);
    }
    
    if (!u2) {
      quickNav.classList.remove('hidden');
    }
  } catch (err: any) {
    showToast(err.message || 'Failed to fetch data.', 'error');
  } finally {
    hideSkeleton();
  }
}

function showToast(msg: string, type: 'error' | 'success' | 'info' = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  
  if (type === 'error') {
    toast.style.borderLeftColor = '#ff5555';
    toast.style.color = '#ff5555';
  } else if (type === 'success') {
    toast.style.borderLeftColor = '#50fa7b';
    toast.style.color = '#50fa7b';
  }
  
  toast.textContent = msg;
  toastContainer.appendChild(toast);
  
  // Trigger reflow for animation
  void toast.offsetWidth;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// Initialize Theme
if (isLight) {
  document.body.setAttribute('data-theme', 'light');
  themeToggle.textContent = '🌙 Dark Mode';
} else {
  themeToggle.textContent = '☀️ Light Mode';
}

// Export as Image
exportBtn.addEventListener('click', async () => {
  // @ts-ignore
  if (!window.html2canvas) {
    return showToast('Export library is still loading...', 'info');
  }
  
  if (!statsContainer.innerHTML.trim()) {
    return showToast('No stats to export! Fetch data first.', 'error');
  }
  
  showToast('Generating image...', 'info');
  try {
    // @ts-ignore
    const canvas = await window.html2canvas(statsContainer, { 
      backgroundColor: document.body.getAttribute('data-theme') === 'light' ? '#f4f4f4' : '#121212',
      scale: 2
    });
    
    const link = document.createElement('a');
    link.download = `OtakuTimeline-${username1Input.value || 'stats'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Export successful!', 'success');
  } catch (err) {
    console.error(err);
    showToast('Export failed.', 'error');
  }
});

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

mobileMenuToggle.addEventListener('click', () => {
  headerContent.classList.toggle('open');
});

addCompareBtn.addEventListener('click', () => {
  isComparing = true;
  addCompareBtn.style.display = 'none';
  username2Container.style.display = 'flex';
  username2Input.focus();
});

removeCompareBtn.addEventListener('click', () => {
  isComparing = false;
  username2Input.value = '';
  username2Container.style.display = 'none';
  addCompareBtn.style.display = 'inline-block';
  handleLoad();
});

loadBtn.addEventListener('click', handleLoad);

function handleEnter(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    handleLoad();
  }
}

username1Input.addEventListener('keydown', handleEnter);
username2Input.addEventListener('keydown', handleEnter);

// Handle Shareable URLs or Load saved users
const params = new URLSearchParams(window.location.search);
const pU1 = params.get('u1');
const pU2 = params.get('u2');
const pType = params.get('type');

const savedU1 = localStorage.getItem('otakuTimeline_u1');
const savedU2 = localStorage.getItem('otakuTimeline_u2');

if (pU1) {
  username1Input.value = pU1;
  if (pU2) {
    username2Input.value = pU2;
    isComparing = true;
    username2Container.style.display = 'flex';
    addCompareBtn.style.display = 'none';
  }
  if (pType === 'MANGA') {
    currentType = 'MANGA';
    typeToggleBtn.textContent = 'Mode: MANGA';
  }
} else {
  if (savedU1) username1Input.value = savedU1;
  if (savedU2) {
    username2Input.value = savedU2;
    isComparing = true;
    addCompareBtn.style.display = 'none';
    username2Container.style.display = 'flex';
  }
}

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service Worker registration failed:', err);
    });
  });
}

handleLoad();
