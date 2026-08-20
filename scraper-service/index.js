const express = require('express')
const { chromium } = require('playwright')

const app = express()
app.use(express.json())

// Randomise delay within a range to mimic human timing
function jitter(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Block resource types that aren't needed and add scraping surface
const BLOCKED_TYPES = new Set(['image', 'media', 'font', 'other'])

async function fetchPage(url, { waitForUrlContains = null, checkFor = null, maxRetries = 2 } = {}) {
  let lastHtml = ''
  let lastFinalUrl = ''
  let attempt = 0

  while (attempt <= maxRetries) {
    attempt++
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--window-size=1920,1080',
      ],
    })

    try {
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'sec-ch-ua': '"Chromium";v="127", "Not)A;Brand";v="99", "Google Chrome";v="127"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'Upgrade-Insecure-Requests': '1',
          'sec-fetch-dest': 'document',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'none',
          'sec-fetch-user': '?1',
        },
      })

      // Block images/fonts/media — not needed for data extraction
      await context.route('**/*', (route) => {
        if (BLOCKED_TYPES.has(route.request().resourceType())) {
          route.abort()
        } else {
          route.continue()
        }
      })

      // Patch navigator.webdriver to hide headless signal
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
      })

      const page = await context.newPage()
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })

      if (waitForUrlContains) {
        await page
          .waitForFunction(
            (needle) => window.location.href.includes(needle),
            waitForUrlContains,
            { timeout: 15000 }
          )
          .catch(() => { })
      }

      // Human-like random pause before grabbing HTML
      await page.waitForTimeout(jitter(2000, 4000))

      const html = await page.content()
      const finalUrl = page.url()

      lastHtml = html
      lastFinalUrl = finalUrl

      // If caller wants us to verify a string is present — retry if not
      if (checkFor && !html.includes(checkFor)) {
        console.log(`[scraper] Attempt ${attempt}/${maxRetries + 1} — expected content not found, retrying in 3s…`)
        await browser.close()
        if (attempt <= maxRetries) {
          await new Promise((r) => setTimeout(r, 3000))
          continue
        }
        // All retries exhausted — return what we have plus a flag
        return { html, finalUrl, botBlocked: true }
      }

      return { html, finalUrl, botBlocked: false }
    } finally {
      await browser.close()
    }
  }

  return { html: lastHtml, finalUrl: lastFinalUrl, botBlocked: true }
}

app.post('/fetch-tiktok', async (req, res) => {
  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'Missing url' })

  try {
    const result = await fetchPage(url, {
      waitForUrlContains: '/video/',
      checkFor: '__UNIVERSAL_DATA_FOR_REHYDRATION__',
      maxRetries: 2,
    })
    return res.json(result)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

app.post('/fetch-youtube', async (req, res) => {
  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'Missing url' })

  let browser
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--window-size=1920,1080',
      ],
    })

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
    })

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    })

    const page = await context.newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => { })

    // Dismiss cookie/consent dialog if any
    try {
      const consentBtn = page.locator('button[aria-label*="Accept"], button[aria-label*="Agree"], ytd-button-renderer:has-text("Accept")').first()
      if (await consentBtn.isVisible().catch(() => false)) {
        await consentBtn.click().catch(() => { })
      }
    } catch { }

    // Scroll down slightly to trigger lazy-loaded comment section / engagement panels
    await page.evaluate(() => window.scrollBy(0, 600)).catch(() => { })
    await page.waitForTimeout(jitter(1500, 2500))

    // Extract stats directly from runtime data or DOM
    const metaData = await page.evaluate(() => {
      let domComments = null
      let domLikes = null
      let domViews = null
      let domCaption = null

      // 1. Try reading ytInitialData if available
      try {
        const ytData = window.ytInitialData
        if (ytData) {
          const str = JSON.stringify(ytData)

          // Comments count from ytInitialData
          const commentMatch = str.match(/"commentCount":\s*\{"simpleText":"([\d,.]+[KkMmBb]?)"\}/) ||
            str.match(/"commentsCount":\s*\{"simpleText":"([\d,.]+[KkMmBb]?)"\}/) ||
            str.match(/"accessibilityData":\s*\{"label":"([\d,.]+[KkMmBb]?)\s+comments?"\}/i) ||
            str.match(/"contextualInfo":\s*\{"runs":\[\{"text":"([\d,.]+[KkMmBb]?)"\}/) ||
            str.match(/"header":\s*\{"itemSectionHeaderRenderer":.*?title":.*?"text":"([\d,.]+[KkMmBb]?)"/)
          if (commentMatch) domComments = commentMatch[1]

          // Likes
          const likeMatch = str.match(/"accessibilityData":\s*\{"label":"([\d,.]+[KkMmBb]?)\s+likes"\}/i) ||
            str.match(/"likeCount":\s*"?(\d+)"?/)
          if (likeMatch) domLikes = likeMatch[1]
        }
      } catch { }

      // 2. Try JSON-LD schema
      try {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]')
        for (const s of scripts) {
          const json = JSON.parse(s.textContent || '{}')
          if (json.interactionStatistic) {
            for (const item of (Array.isArray(json.interactionStatistic) ? json.interactionStatistic : [json.interactionStatistic])) {
              const type = item.interactionType?.['@type'] || item.interactionType || ''
              const cnt = item.userInteractionCount
              if (/CommentAction/i.test(type) && cnt && !domComments) domComments = String(cnt)
              if (/LikeAction/i.test(type) && cnt && !domLikes) domLikes = String(cnt)
              if (/WatchAction/i.test(type) && cnt && !domViews) domViews = String(cnt)
            }
          }
          if (json.name && !domCaption) domCaption = json.name
        }
      } catch { }

      // 3. Fallback: Search all DOM elements / aria-labels
      const allEls = document.querySelectorAll('span, yt-formatted-string, div, h2, button')
      for (const el of allEls) {
        const text = (el.innerText || el.textContent || '').trim()
        const aria = (el.getAttribute('aria-label') || '').trim()

        if (!domComments) {
          const match = text.match(/^([\d,.]+[KkMmBb]?)\s+Comments?$/i) ||
            aria.match(/^([\d,.]+[KkMmBb]?)\s+Comments?$/i) ||
            text.match(/([\d,.]+[KkMmBb]?)\s+Comments?/i)
          if (match && !/sort/i.test(text)) domComments = match[1]
        }

        if (!domLikes) {
          const match = aria.match(/([\d,.]+[KkMmBb]?)\s+likes/i) || text.match(/^([\d,.]+[KkMmBb]?)\s+likes$/i)
          if (match) domLikes = match[1]
        }

        if (!domViews) {
          const match = text.match(/^([\d,.]+[KkMmBb]?)\s+views$/i) || aria.match(/([\d,.]+[KkMmBb]?)\s+views/i)
          if (match) domViews = match[1]
        }
      }

      return { domComments, domLikes, domViews, domCaption }
    })

    const html = await page.content()
    const finalUrl = page.url()

    return res.json({
      html,
      finalUrl,
      meta: metaData,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  } finally {
    if (browser) await browser.close()
  }
})

app.post('/fetch-facebook', async (req, res) => {
  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'Missing url' })

  let browser
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--window-size=1920,1080',
      ],
    })

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
    })

    // Patch navigator.webdriver
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    })

    const page = await context.newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => { })

    // Attempt to dismiss cookie banners and login dialogs if any
    try {
      await page.waitForTimeout(1500)
      const closeButtons = [
        '[aria-label="Close"]',
        '[aria-label="Decline optional cookies"]',
        '[data-cookiebanner="accept_button"]',
        'div[role="dialog"] button',
      ]
      for (const sel of closeButtons) {
        const btn = page.locator(sel).first()
        if (await btn.isVisible().catch(() => false)) {
          await btn.click().catch(() => { })
          break
        }
      }
    } catch { }

    await page.waitForTimeout(2000)

    // Extract OpenGraph metadata & text directly from DOM
    const metaData = await page.evaluate(() => {
      const getMeta = (prop) => {
        const el = document.querySelector(`meta[property="${prop}"]`) || document.querySelector(`meta[name="${prop}"]`)
        return el ? el.getAttribute('content') : null
      }

      let domShares = null
      let domLikes = null
      let domComments = null
      let domViews = null

      // Check all elements and their aria-labels/text for counts
      const allElements = document.querySelectorAll('span, div, a, button, p, [role="button"]')
      for (const el of allElements) {
        const txt = (el.innerText || el.textContent || '').trim()
        const aria = (el.getAttribute('aria-label') || '').trim()
        const combined = `${txt} ${aria}`

        // Shares (e.g. "12 shares", "12 Shares", "12 Shares", aria-label="12 shares", "Share: 12", "1.2K Shares")
        if (!domShares) {
          const shareMatch = combined.match(/([\d,.]+[KkMmBb]?)\s*(?:shares|share|Shares|Share|reshares|Reshares)\b/i) ||
            combined.match(/(?:shares|share|Shares|Share):\s*([\d,.]+[KkMmBb]?)/i)
          if (shareMatch) {
            domShares = shareMatch[1]
          }
        }

        // Comments (e.g. "5 comments", "5 Comments", "Comment: 5")
        if (!domComments) {
          const commentMatch = combined.match(/([\d,.]+[KkMmBb]?)\s*(?:comments|comment|Comments|Comment)\b/i) ||
            combined.match(/(?:comments|comment|Comments|Comment):\s*([\d,.]+[KkMmBb]?)/i)
          if (commentMatch) {
            domComments = commentMatch[1]
          }
        }

        // Views (e.g. "10K views", "10K plays")
        if (!domViews) {
          const viewMatch = combined.match(/([\d,.]+[KkMmBb]?)\s*(?:views|view|plays|play|Views|Plays)\b/i)
          if (viewMatch) {
            domViews = viewMatch[1]
          }
        }

        // Likes / Reactions
        if (!domLikes) {
          const likeMatch = combined.match(/([\d,.]+[KkMmBb]?)\s*(?:likes|like|reactions|reaction|Likes|Reactions)\b/i)
          if (likeMatch) {
            domLikes = likeMatch[1]
          }
        }
      }

      // Check script tags for escaped/raw JSON data
      try {
        const scripts = document.querySelectorAll('script')
        for (const s of scripts) {
          const content = s.textContent || ''
          if (!domShares) {
            const sm = content.match(/(?:\\"|")?(?:share_count|shares_count|total_share_count|i18n_share_count|share_count_reduced|reshares|unified_stories_reshare_count)(?:\\"|")?\s*:\s*(?:\{(?:\\"|")?(?:count|total_count)(?:\\"|")?:\s*)?(?:\\"|")?([\d,.]+[KkMmBb]?)(?:\\"|")?/i)
            if (sm) domShares = sm[1]
          }
          if (!domComments) {
            const cm = content.match(/(?:\\"|")?(?:comment_count|total_comment_count|commentsCount|commentCount|i18n_comment_count)(?:\\"|")?\s*:\s*(?:\{(?:\\"|")?(?:count|total_count)(?:\\"|")?:\s*)?(?:\\"|")?([\d,.]+[KkMmBb]?)(?:\\"|")?/i)
            if (cm) domComments = cm[1]
          }
        }
      } catch { }

      return {
        ogImage: getMeta('og:image'),
        ogTitle: getMeta('og:title'),
        ogDescription: getMeta('og:description'),
        description: getMeta('description'),
        domShares,
        domLikes,
        domComments,
        domViews,
      }
    })

    const html = await page.content()
    const finalUrl = page.url()

    return res.json({
      html,
      finalUrl,
      meta: metaData,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  } finally {
    if (browser) await browser.close()
  }
})

const PORT = 4000
app.listen(PORT, () => console.log(`Scraper service running on port ${PORT}`))