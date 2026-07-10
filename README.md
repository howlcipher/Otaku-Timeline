# Retro Anime Archive

<div align="center">
  <img src="https://img.shields.io/github/license/howlcipher/anime_list?style=flat-square&color=ff5555" alt="License" />
  <img src="https://img.shields.io/github/stars/howlcipher/anime_list?style=flat-square&color=50fa7b" alt="Stars" />
  <img src="https://img.shields.io/github/issues/howlcipher/anime_list?style=flat-square&color=bd93f9" alt="Issues" />
</div>
<br />
<div align="center">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" height="40" alt="TypeScript" title="TypeScript" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg" height="40" alt="HTML5" title="HTML5" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg" height="40" alt="CSS3" title="CSS3" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vite/vite-original.svg" height="40" alt="Vite" title="Vite" />
</div>

A sleek, retro-minimalist web application for viewing and comparing AniList profiles. 

## Features

- **Live AniList Data:** Dynamically fetches completed and currently watching anime lists directly from the AniList GraphQL API. No backend required!
- **Dynamic Theming:** The entire UI accent color automatically adapts to match the dominant color of the cover art from your most recently completed show.
- **Compare Mode:** Enter two AniList usernames to instantly cross-reference your watch histories. 
  - View shared shows (with both of your scores side-by-side).
  - See what shows you've watched that your friend hasn't (and vice versa).
  - The UI splits to represent User 1 as the primary accent color and User 2 as the secondary accent color.
- **Retro Aesthetic:** Uses `Space Grotesk` and `IBM Plex Mono` typography with a high-contrast, chunky-border design.
- **Accessibility First:** 
  - Built-in Dark and Light modes.
  - Colorblind mode that uses high-contrast black/white and dashed borders to ensure scores are distinguishable without relying on color.
  - Fully navigable via keyboard with ARIA screen-reader labels.
- **Statistics Banner:** Quickly see total completed shows, currently watching shows, and the exact mean score across the profile.

## Tech Stack

- **Frontend:** Vanilla TypeScript + HTML + CSS
- **Build Tool:** Vite
- **API:** AniList GraphQL (https://graphql.anilist.co)

## Getting Started

1. Clone the repository:
   ```bash
   git clone git@github.com:howlcipher/anime_list.git
   cd anime_list
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Deployment

This project is configured as a static site and can be easily hosted on GitHub Pages, Netlify, or Vercel. 
To build the production assets:
```bash
npm run build
```
