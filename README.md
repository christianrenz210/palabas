# Palabas

A free, Netflix-style movie and series app built from the Palabas prototype. No ads.

- **backend/**: Laravel 12, API only, **no database**. It proxies TMDB so the API key stays on the server, and caches responses in files.
- **frontend/**: React 19 + Vite. It builds to a static site in `frontend/dist`.

Profiles, My List, ratings and Continue watching are all saved in the browser's localStorage. There are no accounts.

> **About playback:** TMDB lists each title's official YouTube videos (trailers, teasers, clips, featurettes), including per-episode and per-season videos for series. Palabas plays those in an embedded YouTube player. Full movies and episodes are not available through TMDB. Videos that YouTube refuses to embed, or that were deleted, are skipped automatically.

## Setup

### 1. TMDB key
1. Log in at themoviedb.org and go to **Settings → API** (https://www.themoviedb.org/settings/api).
2. Copy the **API Read Access Token** (the long one that starts with `eyJ`).
3. Paste it into `backend/.env`:
   ```
   TMDB_ACCESS_TOKEN=eyJ...
   ```
   (The shorter v3 API key also works: `TMDB_API_KEY=...`.)

### 2. Run (two terminals)
```bash
# terminal 1
cd backend
php artisan serve          # must be on http://127.0.0.1:8000

# terminal 2
cd frontend
npm install                # first time only
npm run dev                # http://localhost:5173
```
In development, Vite proxies `/api` to Laravel.

## Features
- **Who's watching:** add, rename or delete up to 5 profiles. A Kids profile only shows all-ages titles.
- **Home:** a billboard, Continue watching, Top 10 today, Trending, Popular series and movies, New this year, local films (by `TMDB_REGION`), Critically acclaimed, and genre chips.
- **Title page:** score, rating, Play/Resume, My List, Rate, Trailer, Share, episodes with a season picker, cast, and More like this.
- **Search:** titles, series and people. When the box is empty it shows genre tiles.
- **Player:** official videos for the title, or for the episode (then the season, then the series). Pick another video from the list, autoplay into the next episode, and "Watch on YouTube" when a video can't be embedded.

## Settings (`backend/.env`)
- `TMDB_REGION=PH`: drives the "Filipino films" row, ratings and Popular movies.
- `TMDB_LANGUAGE=en-US`: language of titles and descriptions (for example `fil-PH`).
- `FRONTEND_URL`: allowed origin(s) for CORS. Separate several with commas.

## API
| Method | Path | |
|---|---|---|
| GET | `/api/home?kids=1` | billboard and rows |
| GET | `/api/genres?kids=1` | genre chips |
| GET | `/api/browse/{genre}?kids=1` | movies and series in one genre |
| GET | `/api/search?q=&kids=1` | titles, series and people |
| GET | `/api/title/{movie\|tv}/{id}` | details, cast, trailer, seasons, more like this |
| GET | `/api/title/tv/{id}/season/{n}` | episodes that have aired |
| GET | `/api/videos/{movie\|tv}/{id}?season=&episode=` | playable YouTube videos, best first |

## Deploy
- **Frontend (static):** set `VITE_API_URL=https://your-backend` in `frontend/.env`, run `npm run build`, then upload `frontend/dist` to Netlify, Vercel, Cloudflare Pages or GitHub Pages. SPA rewrites are included (`_redirects`, `vercel.json`).
- **Backend:** any PHP 8.2+ host (shared hosting, Railway, Render). No database is needed. Set `FRONTEND_URL` to the static site's URL and `APP_DEBUG=false`.
