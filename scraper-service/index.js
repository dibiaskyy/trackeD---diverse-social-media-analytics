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
          .catch(() => {})
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

  try {
    const result = await fetchPage(url, {
      waitForUrlContains: 'watch?v=',
      maxRetries: 1,
    })
    return res.json(result)
  } catch (err) {
    return res.status(500).json({ error: err.message })
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
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})

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
          await btn.click().catch(() => {})
          break
        }
      }
    } catch {}

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

      const allElements = document.querySelectorAll('span, div, a, button, p')
      for (const el of allElements) {
        const txt = el.innerText || el.textContent || ''
        const trimmed = txt.trim()
        if (/^([\d,.]+[KkMmBb]?)\s*(?:shares|share|Shares|Share)$/i.test(trimmed) && !domShares) {
          domShares = trimmed
        }
        if (/^([\d,.]+[KkMmBb]?)\s*(?:comments|comment|Comments|Comment)$/i.test(trimmed) && !domComments) {
          domComments = trimmed
        }
        if (/^([\d,.]+[KkMmBb]?)\s*(?:views|view|plays|play|Views|Plays)$/i.test(trimmed) && !domViews) {
          domViews = trimmed
        }
      }

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