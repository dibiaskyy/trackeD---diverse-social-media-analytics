function parseFormattedCount(str) {
  if (!str) return 0
  const clean = String(str).trim().replace(/,/g, '')
  if (clean === 'null' || clean === 'undefined') return 0
  const match = clean.match(/^([\d.]+)\s*([KkMmBb])?$/i)
  if (!match) return 0
  const num = parseFloat(match[1])
  if (isNaN(num)) return 0
  const suffix = (match[2] || '').toUpperCase()
  if (suffix === 'K') return Math.round(num * 1000)
  if (suffix === 'M') return Math.round(num * 1000000)
  if (suffix === 'B') return Math.round(num * 1000000000)
  return Math.round(num)
}

export function detectPlatform(url) {
  if (!url) return null
  if (url.includes('tiktok.com')) return 'tiktok'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.com')) return 'facebook'
  return null
}

export async function scrapeUrl(url) {
  const platform = detectPlatform(url)
  if (!platform) {
    throw new Error('Unsupported platform URL. Please provide a TikTok, YouTube, or Facebook link.')
  }

  // 1. Try local Playwright scraper service on port 4000 (best for bypassing bot challenge & dynamic DOM)
  try {
    const ep = platform === 'tiktok' ? '/fetch-tiktok' : platform === 'youtube' ? '/fetch-youtube' : '/fetch-facebook'
    const res = await fetch(`http://localhost:4000${ep}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(45000),
    })
    if (res.ok) {
      const data = await res.json()
      if (platform === 'facebook') {
        const parsed = parseFacebookScraper(data.html || '', data.meta || {})
        if (parsed.views > 0 || parsed.likes > 0 || parsed.caption) return parsed
      } else if (platform === 'youtube') {
        const parsed = parseYouTubeScraper(url, data.html || '', data.meta || {})
        if (parsed.views > 0 || parsed.likes > 0 || parsed.caption) return parsed
      } else if (platform === 'tiktok') {
        const parsed = parseTikTokScraper(data.html || '')
        if (parsed.views > 0 || parsed.likes > 0 || parsed.caption) return parsed
      }
    }
  } catch {
    // Scraper service not running or timed out; fall back to direct HTTP
  }

  // 2. Direct pure Node.js HTTP fallback
  if (platform === 'tiktok') {
    return scrapeTikTokDirect(url)
  } else if (platform === 'youtube') {
    return scrapeYouTubeDirect(url)
  } else if (platform === 'facebook') {
    return scrapeFacebookDirect(url)
  }
}

// -------------------------------------------------------------
// YouTube Scraper
// -------------------------------------------------------------
async function scrapeYouTubeDirect(url) {
  try {
    let fetchUrl = url
    const idMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/)
    const videoId = idMatch ? idMatch[1] : null

    if (videoId) {
      fetchUrl = `https://www.youtube.com/watch?v=${videoId}`
    }

    let html = ''
    try {
      const res = await fetch(fetchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+478; SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(9000),
      })
      if (res.ok) {
        html = await res.text()
      }
    } catch (e) {
      console.warn('YouTube HTML fetch warning:', e.message)
    }

    const parsed = parseYouTubeScraper(url, html, {})

    // Fallback: If views, likes, author, or caption are missing on cloud serverless runtimes
    if (videoId && (parsed.views === 0 || parsed.likes === 0 || !parsed.author || !parsed.caption)) {
      try {
        const [rydRes, oembedRes] = await Promise.allSettled([
          fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`, { signal: AbortSignal.timeout(5000) }),
          fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, { signal: AbortSignal.timeout(5000) }),
        ])

        if (rydRes.status === 'fulfilled' && rydRes.value.ok) {
          const rydData = await rydRes.value.json()
          if (parsed.views === 0 && rydData.viewCount) parsed.views = Number(rydData.viewCount)
          if (parsed.likes === 0 && rydData.likes) parsed.likes = Number(rydData.likes)
        }

        if (oembedRes.status === 'fulfilled' && oembedRes.value.ok) {
          const oembedData = await oembedRes.value.json()
          if (!parsed.caption && oembedData.title) parsed.caption = oembedData.title
          if (!parsed.author && oembedData.author_name) parsed.author = oembedData.author_name
          if (!parsed.authorHandle && oembedData.author_url) {
            const handleFromUrl = oembedData.author_url.match(/@([^/]+)/)
            if (handleFromUrl) parsed.authorHandle = `@${handleFromUrl[1]}`
          }
        }
      } catch (err) {
        console.warn('YouTube secondary APIs warning:', err.message)
      }
    }

    return parsed
  } catch {
    return parseYouTubeScraper(url, '', {})
  }
}

function parseYouTubeScraper(url, html, meta = {}) {
  let views = 0
  const viewMatch = html.match(/"viewCount":\s*"?(\d+)"?/)
  if (viewMatch) {
    views = parseInt(viewMatch[1], 10)
  } else if (meta.domViews) {
    views = parseFormattedCount(meta.domViews)
  } else {
    const metaView = html.match(/itemprop="interactionCount"\s+content="(\d+)"/i)
    if (metaView) views = parseInt(metaView[1], 10)
  }

  let likes = 0
  if (meta.domLikes) {
    likes = parseFormattedCount(meta.domLikes)
  } else {
    const likeMatch = html.match(/"likeCount":\s*"?(\d+)"?/)
    if (likeMatch) {
      likes = parseInt(likeMatch[1], 10)
    } else {
      const accessLike = html.match(/"accessibilityData":\{"label":"([\d,.]+[KkMmBb]?)\s+likes"\}/i)
      if (accessLike) likes = parseFormattedCount(accessLike[1])
    }
  }

  let comments = 0
  if (meta.domComments) {
    comments = parseFormattedCount(meta.domComments)
  } else {
    // 1. contextualInfo (YouTube standard engagement panel: {"runs":[{"text":"2.4M"}]})
    const ctxMatch = html.match(/"contextualInfo":\s*\{"runs":\[\{"text":"([\d,.]+[KkMmBb]?)"\}/i)
    if (ctxMatch) {
      comments = parseFormattedCount(ctxMatch[1])
    } else {
      const commentMatch = html.match(/"(?:commentsCount|commentCount)":\s*(?:\{[^}]*?"simpleText":\s*"([\d,.]+[KkMmBb]?)"|\s*"?(\d+)"?)/i)
      if (commentMatch) {
        comments = parseFormattedCount(commentMatch[1] || commentMatch[2])
      } else {
        const schemaMatch = html.match(/"interactionType":\s*(?:\{"@type":\s*"CommentAction"\}|"https?:\/\/schema\.org\/CommentAction")[^}]*?"userInteractionCount":\s*"?(\d+)"?/i)
        if (schemaMatch) {
          comments = parseInt(schemaMatch[1], 10)
        } else {
          const accMatch = html.match(/"accessibilityData":\s*\{\s*"label":\s*"([\d,.]+[KkMmBb]?)\s+comments?"\}/i)
          if (accMatch) {
            comments = parseFormattedCount(accMatch[1])
          } else {
            const domMatch = html.match(/([\d,.]+[KkMmBb]?)\s+Comments?\b/i)
            if (domMatch) comments = parseFormattedCount(domMatch[1])
          }
        }
      }
    }
  }

  let caption = meta.domCaption || null
  if (!caption) {
    const titleMatch = html.match(/<meta\s+name="title"\s+content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i)
    if (titleMatch) {
      caption = titleMatch[1].replace(/ - YouTube$/i, '').trim()
    }
  }

  let author = meta.domAuthor || null
  let authorHandle = null

  const handleMatch = html.match(/"canonicalBaseUrl":\s*"\/@([^"]+)"/) || html.match(/"navigationEndpoint":\{"browseEndpoint":\{"canonicalBaseUrl":"\/@([^"]+)"/)
  if (handleMatch) {
    authorHandle = `@${handleMatch[1].trim()}`
  }

  if (!author) {
    const authorMatch = html.match(/"ownerChannelName":\s*"([^"]+)"/) ||
                        html.match(/"author":\s*"([^"]+)"/) ||
                        html.match(/<link\s+itemprop="name"\s+content="([^"]+)"/i)
    if (authorMatch) {
      author = authorMatch[1].trim()
    }
  }

  let thumbnail = null
  const idMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/)
  if (idMatch) {
    thumbnail = `https://img.youtube.com/vi/${idMatch[1]}/hqdefault.jpg`
  }

  return {
    views,
    likes,
    comments,
    shares: 0,
    caption,
    author: author || authorHandle,
    author_handle: authorHandle || author,
    thumbnail_url: thumbnail,
    posted_at: null,
  }
}

// -------------------------------------------------------------
// Facebook Scraper
// -------------------------------------------------------------
async function scrapeFacebookDirect(url) {
  let data = { views: 0, likes: 0, comments: 0, shares: 0, caption: null, thumbnail_url: null, posted_at: null }

  // 1. Try Desktop Chrome request to extract full SSR state & shares
  try {
    const desktopRes = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
      },
      redirect: 'follow',
    })
    const desktopHtml = await desktopRes.text()
    const desktopParsed = parseFacebookScraper(desktopHtml, {})
    
    data.views = Math.max(data.views, desktopParsed.views)
    data.likes = Math.max(data.likes, desktopParsed.likes)
    data.comments = Math.max(data.comments, desktopParsed.comments)
    data.shares = Math.max(data.shares, desktopParsed.shares)
    if (desktopParsed.caption) data.caption = desktopParsed.caption
    if (desktopParsed.thumbnail_url) data.thumbnail_url = desktopParsed.thumbnail_url
  } catch (e) {
    // ignore desktop fetch error
  }

  // 2. Fetch via crawler header (gets unrounded views, likes, description, thumbnail)
  try {
    const crawlerRes = await fetch(url, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })
    const crawlerHtml = await crawlerRes.text()
    const crawlerParsed = parseFacebookScraper(crawlerHtml, {})

    data.views = Math.max(data.views, crawlerParsed.views)
    data.likes = Math.max(data.likes, crawlerParsed.likes)
    data.comments = Math.max(data.comments, crawlerParsed.comments)
    data.shares = Math.max(data.shares, crawlerParsed.shares)
    if (!data.caption && crawlerParsed.caption) data.caption = crawlerParsed.caption
    if (!data.thumbnail_url && crawlerParsed.thumbnail_url) data.thumbnail_url = crawlerParsed.thumbnail_url
  } catch (e) {
    // ignore crawler fetch error
  }

  // 3. If shares is still 0 and session cookies are configured, enrich shares via Playwright
  const fbCUser = process.env.FB_C_USER
  const fbXs = process.env.FB_XS

  if (data.shares === 0 && fbCUser && fbXs) {
    try {
      const { chromium } = await import('playwright')
      if (chromium) {
        const browser = await chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
          ],
        })

        const context = await browser.newContext({
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
          viewport: { width: 1920, height: 1080 },
          locale: 'en-US',
        })

        await context.addCookies([
          {
            name: 'c_user',
            value: fbCUser.trim(),
            domain: '.facebook.com',
            path: '/',
            httpOnly: false,
            secure: true,
            sameSite: 'None',
          },
          {
            name: 'xs',
            value: decodeURIComponent(fbXs.trim()),
            domain: '.facebook.com',
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'None',
          },
        ])

        const page = await context.newPage()
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
        await page.waitForTimeout(3000)

        const pwShares = await page.evaluate(() => {
          const all = document.querySelectorAll('span, div, a, button, p, [role="button"], [aria-label]')
          for (const el of all) {
            const txt = (el.innerText || el.textContent || '').trim()
            const aria = (el.getAttribute('aria-label') || '').trim()
            const combined = `${txt} ${aria}`
            if (aria.toLowerCase() === 'share' && /^[\d,.]+[KkMmBb]?$/.test(txt)) return txt
            const match = combined.match(/([\d,.]+[KkMmBb]?)\s*(?:shares|share|Shares|Share)\b/i)
            if (match) return match[1]
          }
          return null
        })

        await browser.close()

        if (pwShares) {
          data.shares = parseFormattedCount(pwShares)
        }
      }
    } catch (err) {
      console.warn('Playwright cookie share enrichment fallback:', err.message)
    }
  }

  return data
}

function decodeHtmlEntities(str) {
  if (!str) return ''
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#xb7;/g, '·')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCodePoint(parseInt(hex, 16)))
}

function parseFacebookScraper(html, meta = {}) {
  const rawOgTitle = meta.ogTitle || (html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)?.[1] ?? '')
  const rawOgDesc = meta.ogDescription || (html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)?.[1] ?? '')
  const rawOgImage = meta.ogImage || (html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1] ?? '')
  const rawDesc = meta.description || (html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1] ?? '')

  const ogTitle = decodeHtmlEntities(rawOgTitle)
  const ogDesc = decodeHtmlEntities(rawOgDesc)
  const ogImage = decodeHtmlEntities(rawOgImage)
  const desc = decodeHtmlEntities(rawDesc)
  const combined = `${ogTitle} ${ogDesc} ${desc}`

  // Views
  let views = 0
  if (meta.domViews) {
    views = parseFormattedCount(meta.domViews)
  }
  if (!views) {
    const viewMatch = combined.match(/([\d,.]+[KkMmBb]?)\s*(?:views|plays|Views|Plays)/i)
    if (viewMatch) views = parseFormattedCount(viewMatch[1])
  }
  if (!views) {
    const viewRaw = html.match(/(?:\\"|")?(?:video_view_count|play_count|video_play_count)(?:\\"|")?\s*:\s*"?(\d+)"?/i)
    if (viewRaw) views = parseInt(viewRaw[1], 10)
  }

  // Likes / Reactions
  let likes = 0
  if (meta.domLikes) {
    likes = parseFormattedCount(meta.domLikes)
  }
  if (!likes) {
    const rxMatch = combined.match(/([\d,.]+[KkMmBb]?)\s*(?:likes|like|reactions|reaction|Likes|Reactions)/i)
    if (rxMatch) likes = parseFormattedCount(rxMatch[1])
  }
  if (!likes) {
    const likeRaw = html.match(/(?:\\"|")?(?:reaction_count|like_count|total_reaction_count)(?:\\"|")?\s*:\s*(?:\{(?:\\"|")?count(?:\\"|")?:\s*)?(\d+)/i)
    if (likeRaw && parseInt(likeRaw[1], 10) > 0) likes = parseInt(likeRaw[1], 10)
  }

  // Comments
  let comments = 0
  if (meta.domComments) {
    comments = parseFormattedCount(meta.domComments)
  }
  if (!comments) {
    const commentRaw = html.match(/(?:\\"|")?(?:comment_count|total_comment_count|commentsCount|commentCount)(?:\\"|")?\s*:\s*(?:\{(?:\\"|")?total_count(?:\\"|")?:\s*)?(\d+)/i)
    if (commentRaw && parseInt(commentRaw[1], 10) > 0) comments = parseInt(commentRaw[1], 10)
  }
  if (!comments) {
    const commentMatch = html.match(/>\s*([\d,.]+[KkMmBb]?)\s*(?:comments|Comments)\s*</i) ||
                         combined.match(/([\d,.]+[KkMmBb]?)\s*(?:comments|Comments)/i)
    if (commentMatch) comments = parseFormattedCount(commentMatch[1])
  }

  // Shares — Multi-stage exhaustive extraction
  let shares = 0
  if (meta && meta.domShares) {
    shares = parseFormattedCount(meta.domShares)
  }

  if (!shares) {
    const shareJsonMatch = html.match(/(?:\\"|")?(?:share_count|shares_count|total_share_count|reshare_count|reshares|unified_stories_reshare_count)(?:\\"|")?\s*:\s*(?:\{(?:\\"|")?(?:count|total_count)(?:\\"|")?:\s*)?(?:\\"|")?(\d+)(?:\\"|")?/i)
    if (shareJsonMatch) {
      shares = parseInt(shareJsonMatch[1], 10)
    }
  }

  if (!shares) {
    const shareRaw = html.match(/(?:\\"|")?(?:i18n_share_count|share_count_reduced)(?:\\"|")?\s*:\s*(?:\\"|")?([^\\"]+)(?:\\"|")?/i)
    if (shareRaw) {
      shares = parseFormattedCount(shareRaw[1])
    }
  }

  if (!shares) {
    const metaShare = combined.match(/([\d,.]+[KkMmBb]?)\s*(?:shares|Shares|share|Share|reshares|Reshares)/i)
    if (metaShare) {
      shares = parseFormattedCount(metaShare[1])
    }
  }

  if (!shares) {
    const ariaMatch = html.match(/(?:aria-label|title)=["\'][^"\']*?([\d,.]+[KkMmBb]?)\s*(?:shares|Shares|share|Share)[^"\']*?["\']/i) ||
                      html.match(/>\s*([\d,.]+[KkMmBb]?)\s*(?:shares|Shares|share|Share)\s*</i) ||
                      html.match(/([\d,.]+[KkMmBb]?)\s*(?:shares|Shares|share|Share)/i)
    if (ariaMatch) {
      shares = parseFormattedCount(ariaMatch[1])
    }
  }

  // Extract clean caption
  let caption = ogDesc || desc || null
  if (!caption && ogTitle) {
    if (ogTitle.includes('|')) {
      const parts = ogTitle.split('|').map((p) => p.trim())
      // e.g. "173K views · 2.1K reactions | blazing duwet | Kapitan Pugo" -> "blazing duwet"
      caption = parts.length > 2 ? parts[1] : parts[parts.length - 1]
    } else {
      caption = ogTitle
    }
  }

  return {
    views,
    likes,
    comments,
    shares,
    caption,
    thumbnail_url: ogImage || null,
    posted_at: null,
  }
}

// -------------------------------------------------------------
// TikTok Scraper
// -------------------------------------------------------------
async function scrapeTikTokDirect(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })
    const html = await res.text()
    return parseTikTokScraper(html)
  } catch {
    return parseTikTokScraper('')
  }
}

function parseTikTokScraper(html) {
  let views = 0
  let likes = 0
  let comments = 0
  let shares = 0
  let caption = null
  let thumbnail = null
  let postedAt = null

  // 1. Check __UNIVERSAL_DATA_FOR_REHYDRATION__
  const uniMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.+?)<\/script>/s)
  if (uniMatch) {
    try {
      const json = JSON.parse(uniMatch[1])
      const videoDetail = json['__DEFAULT_SCOPE__']?.['webapp.video-detail']
      if (videoDetail?.itemInfo?.itemStruct) {
        const item = videoDetail.itemInfo.itemStruct
        const stats = item.stats || {}
        const statsV2 = item.statsV2 || {}
        views = parseInt(stats.playCount || statsV2.playCount || 0, 10)
        likes = parseInt(stats.diggCount || statsV2.diggCount || 0, 10)
        comments = parseInt(stats.commentCount || statsV2.commentCount || 0, 10)
        shares = parseInt(stats.shareCount || statsV2.shareCount || 0, 10)
        caption = item.desc || null
        thumbnail = item.video?.cover || item.video?.originCover || null
        if (item.createTime) postedAt = new Date(item.createTime * 1000).toISOString()
      }
    } catch {
      // ignore
    }
  }

  // 2. Check JSON-LD fallback
  if (!views && !likes) {
    const ldMatch = html.match(/<script type="application\/ld\+json"[^>]*>(.+?)<\/script>/s)
    if (ldMatch) {
      try {
        const ld = JSON.parse(ldMatch[1])
        if (ld.interactionStatistic) {
          for (const st of ld.interactionStatistic) {
            const type = st.interactionType || ''
            const cnt = parseInt(st.userInteractionCount || 0, 10)
            if (type.includes('WatchAction') || type.includes('PlayAction')) views = cnt
            else if (type.includes('LikeAction')) likes = cnt
            else if (type.includes('CommentAction')) comments = cnt
          }
        }
        caption = ld.name || ld.description || null
        thumbnail = ld.thumbnailUrl?.[0] || null
        if (ld.uploadDate) postedAt = new Date(ld.uploadDate).toISOString()
      } catch {
        // ignore
      }
    }
  }

  let author = null
  let authorHandle = null

  const urlMatch = html.match(/"author":\{"id":[^}]*?"uniqueId":"([^"]+)"/i) || html.match(/"uniqueId":"([^"]+)"/i)
  if (urlMatch) {
    authorHandle = `@${urlMatch[1]}`
    author = urlMatch[1]
  }

  return {
    views,
    likes,
    comments,
    shares,
    caption,
    author: author || authorHandle,
    author_handle: authorHandle || author,
    thumbnail_url: thumbnail,
    posted_at: postedAt,
  }
}
