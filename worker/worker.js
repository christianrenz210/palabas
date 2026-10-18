// Palabas API — Cloudflare Worker
// Mirrors the Laravel backend: TMDB proxy + Internet Archive free films.

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMG  = 'https://image.tmdb.org/t/p'
const ARCH_BASE = 'https://archive.org'

const GENRES = {
  action:      { name: 'Action',       movie: 28,    tv: 10759 },
  comedy:      { name: 'Comedy',       movie: 35,    tv: 35    },
  drama:       { name: 'Drama',        movie: 18,    tv: 18    },
  thriller:    { name: 'Thriller',     movie: 53,    tv: 9648  },
  horror:      { name: 'Horror',       movie: 27,    tv: null  },
  romance:     { name: 'Romance',      movie: 10749, tv: null  },
  scifi:       { name: 'Sci-Fi',       movie: 878,   tv: 10765 },
  crime:       { name: 'Crime',        movie: 80,    tv: 80    },
  animation:   { name: 'Animation',   movie: 16,    tv: 16    },
  family:      { name: 'Family',       movie: 10751, tv: 10751 },
  adventure:   { name: 'Adventure',   movie: 12,    tv: 10759 },
  documentary: { name: 'Documentary', movie: 99,    tv: 99    },
}
const KIDS_GENRES  = ['animation', 'family', 'comedy', 'adventure']
const KIDS_RATINGS = ['G','PG','TV-Y','TV-Y7','TV-Y7-FV','TV-G','TV-PG','All','GP']
const NOT_FOR_KIDS = [27, 53, 80, 10752, 9648]
const LIST_TTL   = 1800
const DETAIL_TTL = 21600

// ─── Cache ────────────────────────────────────────────────────────────────────

async function cached(key, ttl, fn) {
  const cache = caches.default
  const req   = new Request(`https://palabas-cache.internal/${encodeURIComponent(key)}`)
  const hit   = await cache.match(req)
  if (hit) return hit.json()
  const data  = await fn()
  const res   = new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${ttl}` },
  })
  await cache.put(req, res)
  return data
}

// ─── TMDB HTTP ────────────────────────────────────────────────────────────────

function tmdbUrl(path, params, env) {
  const q = new URLSearchParams({ language: env.TMDB_LANGUAGE || 'en-US', ...params })
  return `${TMDB_BASE}${path}?${q}`
}

function tmdbHeaders(env) {
  return { Authorization: `Bearer ${env.TMDB_TOKEN}`, Accept: 'application/json' }
}

async function tmdbGet(path, params, env) {
  const res = await fetch(tmdbUrl(path, params, env), { headers: tmdbHeaders(env) })
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`)
  return res.json()
}

async function tmdbMany(calls, env, allow404 = false) {
  const entries = Object.entries(calls)
  const results = await Promise.all(entries.map(([, [path, params]]) =>
    fetch(tmdbUrl(path, params, env), { headers: tmdbHeaders(env) })
      .then(r => (allow404 && r.status === 404) ? {} : r.json())
  ))
  return Object.fromEntries(entries.map(([k], i) => [k, results[i]]))
}

// ─── Shape helpers ────────────────────────────────────────────────────────────

const img  = (path, size) => path ? `${TMDB_IMG}/${size}${path}` : null
const yr   = date => date ? +date.slice(0, 4) : null
const uniq = (arr, key) => [...new Map(arr.map(i => [key(i), i])).values()]

function kidsSafe(type, ids, rating, adult) {
  if (adult) return false
  if (rating != null) return KIDS_RATINGS.includes(rating)
  if (ids.some(id => NOT_FOR_KIDS.includes(id))) return false
  return type === 'movie'
    ? ids.includes(10751) || ids.includes(16)
    : ids.includes(10762) || (ids.includes(16) && ids.includes(10751))
}

// TMDB keyword IDs for adult/explicit content (nudity, erotica, softcore, etc.)
const ADULT_KEYWORDS = new Set([10683,155030,189675,262447,156186])
// Title words that signal adult/explicit content
const ADULT_TITLE_RE = /\b(sex|erotic|nude|naked|porn|xxx|seduct|kinky|horny|lust[yi]|naughty|risqu[eé]|sensual(?:ity)?|scandalous|indecent|lewd|filthy|dirty|affair|mistress|kabit|kerida|ligawan|libog)\b|cheating\s+(wife|husband)|malibog|nakakalibog|hubad|bastos|pakikipagtalik|one\s*night\s*stand|friends\s+with\s+benefits/i

function shapeItems(raw, type, kids, gmap, strictAdult = false) {
  const out = []
  for (const r of raw) {
    const t = r.media_type || type
    if (!['movie','tv'].includes(t) || r.adult || !r.poster_path) continue
    const ids = r.genre_ids || []
    if (kids && !kidsSafe(t, ids, null, false)) continue
    // Skip titles tagged with adult-content keywords
    if ((r.keyword_ids||[]).some(id => ADULT_KEYWORDS.has(id))) continue
    // Strict mode: also check title text and require minimum votes
    if (strictAdult) {
      const title = r.title || r.name || ''
      if (ADULT_TITLE_RE.test(title)) continue
      if ((r.vote_count || 0) < 300 && (r.popularity || 0) < 15) continue
    }
    out.push({
      type: t, id: r.id,
      title: r.title || r.name || 'Untitled',
      overview: r.overview || '',
      year: yr(r.release_date || r.first_air_date),
      score: Math.round((r.vote_average || 0) * 10) / 10,
      genres: ids.map(id => gmap[id]).filter(Boolean),
      poster:   img(r.poster_path, 'w342'),
      backdrop: img(r.backdrop_path, 'w780'),
    })
  }
  return out
}

function shapeCast(cast, aggregate = false) {
  return cast.slice(0, 10).map(p => ({
    id: p.id, name: p.name,
    character: (aggregate ? p.roles?.[0]?.character : p.character) || null,
    photo: img(p.profile_path, 'w185'),
  }))
}

function shapeProviders(byCountry, region) {
  const r = byCountry[region]
  if (!r) return null
  const groups = [['flatrate','Stream'],['free','Free'],['ads','Free with ads'],['rent','Rent'],['buy','Buy']]
  const out = []
  for (const [key, label] of groups) {
    if (r[key]?.length) {
      out.push({ kind: key, label, services: [...r[key]]
        .sort((a,b) => (a.display_priority||0)-(b.display_priority||0))
        .map(p => ({ id: p.provider_id, name: p.provider_name, logo: img(p.logo_path,'w92') })) })
    }
  }
  return out.length ? { link: r.link || null, region, groups: out } : null
}

function pickTrailer(videos) {
  return ([...(videos||[])]
    .filter(v => v.site === 'YouTube' && ['Trailer','Teaser'].includes(v.type))
    .sort((a,b) => (a.type==='Trailer'?0:2)+(a.official?0:1) - ((b.type==='Trailer'?0:2)+(b.official?0:1)))
  )[0]?.key || null
}

function movieRating(t, region) {
  for (const c of [region,'US']) {
    const cert = ((t.release_dates?.results||[]).find(r=>r.iso_3166_1===c)?.release_dates||[])
      .map(r=>(r.certification||'').trim()).find(x=>x)
    if (cert) return cert
  }
  return null
}

function tvRating(t, region) {
  for (const c of [region,'US']) {
    const r = (t.content_ratings?.results||[]).find(r=>r.iso_3166_1===c)?.rating
    if (r) return r
  }
  return null
}

async function getGenreMap(env) {
  return cached('tmdb:gmap:' + (env.TMDB_LANGUAGE||'en-US'), 86400, async () => {
    const res = await tmdbMany({ movie:['/genre/movie/list',{}], tv:['/genre/tv/list',{}] }, env)
    const map = {}
    for (const g of [...(res.movie?.genres||[]), ...(res.tv?.genres||[])]) map[g.id] = g.name
    return map
  })
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleHome(kids, env) {
  const ck = `tmdb:home:v4:${kids?'kids':'all'}:${env.TMDB_REGION}:${env.TMDB_LANGUAGE}`
  return cached(ck, LIST_TTL, async () => {
    const region = env.TMDB_REGION || 'PH'
    const y = new Date().getFullYear()
    const localLabel = {PH:'Filipino films',US:'American films',KR:'Korean films',JP:'Japanese films'}[region] || 'Popular where you are'
    const KM = { certification_country:'US', 'certification.lte':'PG', include_adult:'false' }

    const rows = kids ? {
      top:      ['Top 10 for kids today', '/discover/movie', {...KM, with_genres:'10751|16', sort_by:'popularity.desc'}, 'movie', 'top10'],
      kids_tv:  ['Cartoons & kids series', '/discover/tv', {with_genres:'10762', sort_by:'popularity.desc'}, 'tv'],
      animated: ['Animated movies', '/discover/movie', {...KM, with_genres:'16', sort_by:'popularity.desc'}, 'movie'],
      family:   ['Family favourites', '/discover/movie', {...KM, with_genres:'10751', sort_by:'vote_count.desc'}, 'movie'],
      new:      [`New in ${y}`, '/discover/movie', {...KM, with_genres:'10751|16', primary_release_year:y, sort_by:'popularity.desc'}, 'movie'],
    } : {
      top:         ['Top 10 on Palabas today', '/trending/all/day', {}, null, 'top10'],
      trending:    ['Trending this week', '/trending/all/week', {page:2}, null],
      series:      ['Popular series', '/tv/popular', {}, 'tv'],
      movies:      ['Popular movies', '/movie/popular', {region}, 'movie'],
      new:         [`New in ${y}`, '/discover/movie', {primary_release_year:y, sort_by:'popularity.desc', 'vote_count.gte':20, include_adult:'false'}, 'movie'],
      local:       [localLabel, '/discover/movie', {with_origin_country:region, sort_by:'popularity.desc', include_adult:'false', 'vote_count.gte':500, without_genres:'10749', without_keywords:'10683,155030,189675,262447,156186'}, 'movie', null, true],
      acclaimed:   ['Critically acclaimed', '/movie/top_rated', {}, 'movie'],
      tv_acclaimed:['Binge-worthy series', '/tv/top_rated', {}, 'tv'],
    }

    const calls = {}
    for (const [id, [,path,params]] of Object.entries(rows))
      calls[id] = [path, {...params, include_adult:'false'}]

    const [responses, gmap] = await Promise.all([tmdbMany(calls, env), getGenreMap(env)])

    const out = []
    for (const [id, [title,,, type, style, strictAdult]] of Object.entries(rows)) {
      const items = shapeItems(responses[id]?.results||[], type, kids, gmap, !!strictAdult)
      if (items.length) out.push({ id, title, style: style||'poster', items: style==='top10' ? items.slice(0,10) : items })
    }

    let billboard = (out[0]?.items||[]).find(i => i.backdrop && i.overview) || null
    if (billboard) billboard = {...billboard, backdrop: billboard.backdrop.replace('/w780/','/original/')}
    return { billboard, rows: out }
  })
}

async function handleGenres(kids) {
  return Object.entries(GENRES)
    .filter(([s]) => !kids || KIDS_GENRES.includes(s))
    .map(([slug, g]) => ({ slug, name: g.name }))
}

async function handleBrowse(slug, kids, env) {
  const g = GENRES[slug]
  if (!g || (kids && !KIDS_GENRES.includes(slug))) return null
  const ck = `tmdb:browse:${slug}:${kids?'kids':'all'}:${env.TMDB_REGION}:${env.TMDB_LANGUAGE}`
  return cached(ck, LIST_TTL, async () => {
    const KM = kids ? {certification_country:'US','certification.lte':'PG'} : {}
    const calls = {}
    for (const page of [1,2]) {
      if (g.movie) calls[`movie${page}`] = ['/discover/movie', {with_genres:String(g.movie)+(kids?',10751':''), sort_by:'popularity.desc','vote_count.gte':50,include_adult:'false',page,...KM}]
      if (g.tv)    calls[`tv${page}`]    = ['/discover/tv',    {with_genres:String(g.tv)+(kids?',10762':''),    sort_by:'popularity.desc','vote_count.gte':20,page}]
    }
    const [res, gmap] = await Promise.all([tmdbMany(calls, env), getGenreMap(env)])
    const movies = Object.keys(res).filter(k=>k.startsWith('movie')).flatMap(k=>shapeItems(res[k]?.results||[],'movie',kids,gmap))
    const series = Object.keys(res).filter(k=>k.startsWith('tv')).flatMap(k=>shapeItems(res[k]?.results||[],'tv',kids,gmap))
    const mixed = []; for (let i=0; i<Math.max(movies.length,series.length); i++) { if (movies[i]) mixed.push(movies[i]); if (series[i]) mixed.push(series[i]) }
    return { genre: g.name, results: uniq(mixed, i => i.type+i.id) }
  })
}

async function handleSearch(q, kids, env) {
  q = q.trim()
  const ck = `tmdb:search:${btoa(unescape(encodeURIComponent(q.toLowerCase())))}:${kids?'kids':'all'}:${env.TMDB_LANGUAGE}`
  return cached(ck, LIST_TTL, async () => {
    const [raw, gmap] = await Promise.all([tmdbGet('/search/multi', {query:q, include_adult:'false'}, env), getGenreMap(env)])
    const results = []
    for (const r of raw.results||[]) {
      if (r.media_type === 'person') { for (const item of shapeItems(r.known_for||[], null, kids, gmap)) results.push({...item, matched_cast:r.name}) }
      else if (['movie','tv'].includes(r.media_type)) results.push(...shapeItems([r], r.media_type, kids, gmap))
    }
    return { query: q, results: uniq(results, i=>i.type+i.id).slice(0,40) }
  })
}

const CATALOG_LISTS = {
  movie: { popular:'Popular', now_playing:'Now playing', upcoming:'Upcoming', top_rated:'Top rated', filipino:'Filipino Films' },
  tv:    { popular:'Popular', airing_today:'Airing today', on_the_air:'On the air', top_rated:'Top rated', filipino:'Filipino Films' },
}

async function handleCatalog(type, url, env) {
  const list  = url.searchParams.get('list') || 'popular'
  const genre = url.searchParams.get('genre') || null
  const page  = +(url.searchParams.get('page') || 1)
  const kids  = url.searchParams.get('kids') === '1'
  if (!CATALOG_LISTS[type]?.[list]) return null
  const g = genre ? GENRES[genre] : null
  if (genre && (!g || !g[type])) return null
  const ck = `tmdb:cat:v4:${type}:${list}:${genre}:${page}:${kids?'kids':'all'}:${env.TMDB_REGION}:${env.TMDB_LANGUAGE}`
  return cached(ck, LIST_TTL, async () => {
    const region = env.TMDB_REGION || 'PH'
    const today  = new Date().toISOString().slice(0,10)
    let res
    const isFilipino = list === 'filipino'
    if (isFilipino) {
      const query = { page, with_origin_country:'PH', sort_by:'popularity.desc', include_adult:'false', 'vote_count.gte':10 }
      if (g?.[type]) query.with_genres = g[type]
      if (kids) Object.assign(query, { certification_country:'US', 'certification.lte':'PG', with_genres:(type==='movie'?'10751|16':'10762') })
      res = await tmdbGet(`/discover/${type}`, query, env)
    } else if (!g && !kids) {
      res = await tmdbGet(`/${type}/${list}`, {page, ...(type==='movie'?{region}:{})}, env)
    } else {
      const sort   = list==='top_rated' ? 'vote_average.desc' : 'popularity.desc'
      const query  = {page, sort_by:sort, include_adult:'false', 'vote_count.gte': list==='top_rated'?300:20}
      const genres = [g?.[type], kids?(type==='movie'?'10751|16':'10762'):null].filter(Boolean)
      if (genres.length) query.with_genres = genres.join(',')
      if (type === 'movie') {
        if (kids) Object.assign(query, {certification_country:'US','certification.lte':'PG'})
        if (list==='upcoming') { query['primary_release_date.gte']=today; query['vote_count.gte']=0 }
        else if (list==='now_playing') {
          const d=new Date(); d.setDate(d.getDate()-45)
          query['primary_release_date.gte']=d.toISOString().slice(0,10); query['primary_release_date.lte']=today; query['vote_count.gte']=0
        }
      } else if (['airing_today','on_the_air'].includes(list)) {
        const d2=new Date(); d2.setDate(d2.getDate()+(list==='airing_today'?0:7))
        query['air_date.gte']=today; query['air_date.lte']=d2.toISOString().slice(0,10)
      }
      res = await tmdbGet(`/discover/${type}`, query, env)
    }
    const gmap = await getGenreMap(env)
    const genreList = Object.entries(GENRES)
      .filter(([slug, g]) => g[type] != null && (!kids || KIDS_GENRES.includes(slug)))
      .map(([slug, g]) => ({ slug, name: g.name }))
    return {
      results: shapeItems(res.results||[], type, kids, gmap, isFilipino),
      page: res.page||page,
      total_pages: Math.min(res.total_pages||1, 500),
      lists: CATALOG_LISTS[type],
      genres: page === 1 ? genreList : undefined,
    }
  })
}

async function handleTitle(type, id, env) {
  const lang   = env.TMDB_LANGUAGE || 'en-US'
  const region = env.TMDB_REGION   || 'PH'
  const ck     = `tmdb:title:${type}:${id}:${lang}`
  return cached(ck, DETAIL_TTL, async () => {
    const append = type==='movie'
      ? 'credits,release_dates,videos,recommendations,similar,watch/providers'
      : 'aggregate_credits,content_ratings,videos,recommendations,similar,watch/providers'
    const [t, gmap] = await Promise.all([
      tmdbGet(`/${type}/${id}`, {append_to_response:append, include_video_language:'en,null'}, env),
      getGenreMap(env),
    ])
    const genreIds = (t.genres||[]).map(g=>g.id)
    const rating   = type==='movie' ? movieRating(t, region) : tvRating(t, region)
    const moreRaw  = [...(t.recommendations?.results||[]), ...(t.similar?.results||[])]
    const more     = uniq(shapeItems(moreRaw, type, false, gmap), i=>i.id).slice(0,12)

    const base = {
      type, id:t.id, title:t.title||t.name,
      tagline:  t.tagline||null, overview:t.overview||'',
      year:     yr(t.release_date||t.first_air_date),
      score:    Math.round((t.vote_average||0)*10)/10,
      rating, genres:(t.genres||[]).map(g=>g.name),
      poster:   img(t.poster_path,'w342'),
      backdrop: img(t.backdrop_path,'w1280'),
      trailer:  pickTrailer(t.videos?.results),
      kids_safe:kidsSafe(type, genreIds, rating, t.adult||false),
      more, providers:shapeProviders(t['watch/providers']?.results||{}, region),
    }
    if (type==='movie') {
      const dir = (t.credits?.crew||[]).find(c=>c.job==='Director')
      return {...base, runtime:t.runtime||100, credit:dir?`Directed by ${dir.name}`:null, cast:shapeCast(t.credits?.cast||[])}
    }
    const seasons  = (t.seasons||[]).filter(s=>s.season_number>0&&s.episode_count>0&&s.air_date)
      .map(s=>({number:s.season_number, name:s.name, episodes:s.episode_count}))
    const creators = (t.created_by||[]).map(c=>c.name)
    return { ...base,
      runtime: t.episode_run_time?.[0]||t.last_episode_to_air?.runtime||45,
      credit:  creators.length ? `Created by ${creators.join(', ')}` : null,
      cast:    shapeCast(t.aggregate_credits?.cast||[], true),
      seasons,
    }
  })
}

async function handleSeason(id, num, env) {
  const ck = `tmdb:season:${id}:${num}:${env.TMDB_LANGUAGE}`
  return cached(ck, DETAIL_TTL, async () => {
    const s     = await tmdbGet(`/tv/${id}/season/${num}`, {}, env)
    const today = new Date().toISOString().slice(0,10)
    return {
      number: s.season_number, name: s.name,
      episodes: (s.episodes||[]).filter(e=>e.air_date&&e.air_date<=today).map(e=>({
        number: e.episode_number, name: e.name, overview: e.overview||'',
        runtime: e.runtime||null,
        still:    img(e.still_path,'w300'),
        still_lg: img(e.still_path,'w780'),
      })),
    }
  })
}

async function handleVideos(type, id, url, env) {
  const season  = +url.searchParams.get('season')  || null
  const episode = +url.searchParams.get('episode') || null
  const lang    = env.TMDB_LANGUAGE || 'en-US'
  const ck      = `tmdb:videos:${type}:${id}:${season||'-'}:${episode||'-'}:${lang}`
  return cached(ck, DETAIL_TTL, async () => {
    const lp    = { include_video_language: `en,null,${lang.split('-')[0]}` }
    const calls = { title:[`/${type}/${id}/videos`, lp] }
    if (type==='tv'&&season) { calls.season=[`/tv/${id}/season/${season}/videos`,lp]; if(episode) calls.episode=[`/tv/${id}/season/${season}/episode/${episode}/videos`,lp] }
    const res  = await tmdbMany(calls, env, true)
    const rank = {Trailer:0,Teaser:1,Clip:2,Featurette:3,'Opening Credits':4,'Behind the Scenes':5,Bloopers:6}
    const videos=[]
    for (const source of ['episode','season','title']) {
      for (const v of [...(res[source]?.results||[])].filter(v=>v.site==='YouTube').sort((a,b)=>{
        const ra=(rank[a.type]??9)+(a.official?0:1), rb=(rank[b.type]??9)+(b.official?0:1)
        return ra!==rb?ra-rb:new Date(b.published_at||0)-new Date(a.published_at||0)
      })) videos.push({key:v.key,name:v.name,type:v.type,source})
    }
    return { videos: uniq(videos,v=>v.key).slice(0,20) }
  })
}

// ─── Internet Archive ─────────────────────────────────────────────────────────

const ARCH_EXCL = ' AND -subject:(sex OR sexploitation OR erotic OR erotica OR nudity OR nudist OR adult OR xxx OR burlesque OR "stag film") AND -title:(sex OR nude OR nudist OR erotic OR naked)'

function archYr(d) { const v=Array.isArray(d.year||d.date)?((d.year||d.date)||[])[0]:(d.year||d.date); const m=String(v||'').match(/\d{4}/); return m?+m[0]:null }
function cleanTitle(t) { t=Array.isArray(t)?t[0]||'':t; return t.trim().replace(/\s*[\(\[]\s*\d{4}\s*[\)\]]\s*$/,'').trim() }
function plainText(h) { return (h||'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim().slice(0,600) }
function archItem(d, match) {
  const id=d.identifier; const thumb=`${ARCH_BASE}/services/img/${encodeURIComponent(id)}`
  return { type:'free', id, title:match?.title||cleanTitle(d.title||id), year:archYr(d)||match?.year||null,
    overview:(match?.overview||'')||plainText(d.description||''), score:match?.score||0, genres:match?.genres||[],
    poster:match?.poster||thumb, backdrop:match?.backdrop||thumb, tmdb_id:match?.id||null }
}
function archRuntime(r) {
  if (!r) return null; let m
  if ((m=String(r).match(/^(\d+):(\d{2}):(\d{2})$/))) return +m[1]*60+ +m[2]
  if ((m=String(r).match(/^(\d+):(\d{2})$/))) return +m[1]
  if ((m=String(r).match(/(\d+)\s*min/i))) return +m[1]
  return null
}
function bestVideo(files) {
  const mp4s=files.filter(f=>(f.name||'').toLowerCase().endsWith('.mp4'))
  const sc=f=>{const n=(f.name||'').toLowerCase(),s=+(f.size||0);if(n.includes('512kb'))return[3,s];if(f.format==='h.264'&&s<2.5e9)return[0,s];return[s<2.5e9?1:2,s]}
  return [...mp4s].sort((a,b)=>{const[sa,sza]=sc(a),[sb,szb]=sc(b);return sa!==sb?sa-sb:sza-szb})[0]?.name||null
}
async function matchMovies(pairs, env) {
  const calls={}, out=new Array(pairs.length).fill(null)
  for (let i=0;i<pairs.length;i++) { const[t,y]=pairs[i]; if(t) calls[i]=['/search/movie',{query:t,include_adult:'false',...(y?{year:y}:{})}] }
  if (!Object.keys(calls).length) return out
  const [res, gmap] = await Promise.all([tmdbMany(calls, env), getGenreMap(env)])
  for (const i of Object.keys(calls)) { const hit=(res[i]?.results||[]).find(m=>m.poster_path); out[+i]=hit?(shapeItems([hit],'movie',false,gmap)[0]||null):null }
  return out
}

async function handleFreeList(url, env) {
  const page=+(url.searchParams.get('page')||1); const q=url.searchParams.get('q')||''
  const ck=`arch:list:${page}:${btoa(unescape(encodeURIComponent(q.toLowerCase())))}`
  return cached(ck, 86400, async () => {
    const PER=24
    let query=`collection:feature_films AND mediatype:movies AND year:[1900 TO 2030]${ARCH_EXCL}`
    if (q.trim()) query+=` AND title:(${q.trim().replace(/[^\p{L}\p{N}\s'\-:]/gu,' ')})`
    const aurl=`${ARCH_BASE}/advancedsearch.php?`+new URLSearchParams({q:query,fl:'identifier,title,year,date,description,downloads',sort:'downloads desc',rows:PER,page,output:'json'})
    const res=await fetch(aurl).then(r=>r.json())
    const docs=res.response?.docs||[]; const total=res.response?.numFound||0
    const matches=await matchMovies(docs.map(d=>[cleanTitle(d.title||''),archYr(d)]),env)
    return { results:docs.map((d,i)=>archItem(d,matches[i]||null)), page, total_pages:Math.ceil(Math.min(total,2400)/PER) }
  })
}

async function handleFreeFilm(id, env) {
  return cached(`arch:film:${id}`, 86400, async () => {
    const meta=await fetch(`${ARCH_BASE}/metadata/${encodeURIComponent(id)}`).then(r=>r.json())
    const m=meta.metadata; if (!m||m.mediatype!=='movies') return null
    const title=cleanTitle(Array.isArray(m.title)?m.title[0]:(m.title||id)); const y=archYr(m)
    const match=(await matchMovies([[title,y]],env))[0]||null
    const file=bestVideo(meta.files||[])
    const desc=Array.isArray(m.description)?m.description[0]:(m.description||'')
    return { ...archItem({identifier:id,title,year:y,description:desc},match),
      runtime:archRuntime(Array.isArray(m.runtime)?m.runtime[0]:m.runtime),
      video:file?`${ARCH_BASE}/download/${encodeURIComponent(id)}/${file.split('/').map(encodeURIComponent).join('/')}`:null,
      embed:`${ARCH_BASE}/embed/${encodeURIComponent(id)}`,
      source:`${ARCH_BASE}/details/${encodeURIComponent(id)}`,
    }
  })
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url    = new URL(request.url)
    const origin = request.headers.get('Origin') || ''
    const allowed= (env.FRONTEND_URL||'*').split(',').map(s=>s.trim())
    const ok     = allowed.includes('*') || allowed.includes(origin) || !origin
    const cors   = {
      'Access-Control-Allow-Origin':  ok ? (origin || '*') : (allowed[0]||'*'),
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
    if (request.method==='OPTIONS') return new Response(null,{status:204,headers:cors})

    const path = url.pathname.replace(/^\/api/,'')
    const kids = url.searchParams.get('kids')==='1'

    if (!env.TMDB_TOKEN) return json({error:'TMDB_TOKEN secret not set on this Worker.'},500,cors)

    try {
      let data, m
      if      (path==='/home')                                    data = await handleHome(kids,env)
      else if (path==='/genres')                                  data = {genres: await handleGenres(kids)}
      else if ((m=path.match(/^\/browse\/([a-z]+)$/)))            data = await handleBrowse(m[1],kids,env)
      else if (path==='/search') {
        const q=url.searchParams.get('q')||''
        if (q.length<2) return json({error:'Query too short'},422,cors)
        data = await handleSearch(q,kids,env)
      }
      else if ((m=path.match(/^\/catalog\/(movie|tv)$/)))         data = await handleCatalog(m[1],url,env)
      else if (path==='/free')                                    data = await handleFreeList(url,env)
      else if ((m=path.match(/^\/free\/([A-Za-z0-9._-]+)$/)))    data = await handleFreeFilm(m[1],env)
      else if ((m=path.match(/^\/title\/(movie|tv)\/(\d+)$/)))   data = await handleTitle(m[1],m[2],env)
      else if ((m=path.match(/^\/title\/tv\/(\d+)\/season\/(\d+)$/))) data = await handleSeason(m[1],m[2],env)
      else if ((m=path.match(/^\/videos\/(movie|tv)\/(\d+)$/)))  data = await handleVideos(m[1],m[2],url,env)
      else return json({error:'Not found'},404,cors)

      if (data==null) return json({error:'Not found'},404,cors)
      return json(data,200,cors)
    } catch(e) {
      console.error(e)
      return json({error:e.message||'Internal error'},500,cors)
    }
  }
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json',...headers}})
}
