# trackeD

A standalone social media analytics tool that tracks public video performance across **TikTok**, **YouTube**, and **Facebook** without requiring platform logins or API keys.

---

## What is trackeD?

trackeD automates metrics tracking for public video links. It uses a headless browser scraper to extract exact, unrounded engagement metrics directly from public URLs, logs periodic snapshots into a database, and visualizes trends and engagement rates in an interactive dashboard.

---

## Core Features

- **Multi-Platform Support**:
  - **TikTok**: Standard video links & shortlinks (`vt.tiktok.com`, `tiktok.com/@user/video/...`)
  - **YouTube**: Regular videos, Shorts, and shortlinks (`youtu.be`, `watch?v=`, `shorts/`)
  - **Facebook**: Public Reels and video posts (`facebook.com/reel/...`, `facebook.com/share/r/...`)
- **Accurate Metric Parsing**: Extracts exact values (views, likes/reactions, comments, shares, publish dates, captions, thumbnails) directly from raw page state.
- **Engagement Rate (ERR)**: Calculates public engagement rates automatically:
  $$\text{ERR} = \frac{\text{Likes} + \text{Comments} + \text{Shares}}{\text{Views}} \times 100$$
  *(YouTube omits shares since public counts are not exposed).*
- **Tracking Schedules & Auto-Cleanup**: Set tracking windows (1d, 3d, 7d, 14d, 30d, or custom date) with live countdown badges and automatic removal upon expiration.
- **Visual Analytics**: Interactive multi-metric charts with independent scaling, platform filters, and performance leaderboards.
- **Instant PDF Export**: Generate formatted single/multi-page A4 PDF summary reports right in the browser.
- **Dark & Light Mode**: Obsidian dark mode and high-contrast light mode.

---

## System Architecture

```mermaid
graph TD
    User([Browser]) <--> Frontend[Next.js Dashboard :3000]
    Frontend <--> Backend[Laravel 11 REST API :8000]
    Backend <--> Database[(MySQL 8 Database :3306)]
    Backend <--> Scraper[Playwright Scraper :4000]
    Scraper <--> Web[TikTok / YouTube / Facebook]
```

### Tech Stack
- **Frontend**: Next.js 15, React 19, Recharts, jsPDF, CSS Modules
- **Backend**: Laravel 11, Eloquent ORM, MySQL 8
- **Scraper**: Node.js, Express, Playwright (Headless Chromium)
- **Deployment**: Docker Compose

---

## Quick Start

### Option A: Local Development (Recommended)

1. **Install Dependencies**
   ```bash
   npm install
   npm install --prefix frontend
   npm install --prefix scraper-service
   ```

2. **Configure Environment**
   Create `frontend/.env.local` (or copy from `frontend/.env.example`):
   ```env
   DATABASE_URL="mysql://avnadmin:YOUR_PASSWORD@YOUR_HOST:PORT/defaultdb?ssl-mode=REQUIRED"
   SCRAPER_URL="http://localhost:4000"
   ```

3. **Run Dev Server**
   ```bash
   npm run dev
   ```
   *This concurrently starts both the Next.js frontend (`:3000`) and the scraper microservice (`:4000`).*

---

### Option B: Docker Compose

1. **Launch Containers**
   ```bash
   docker compose up -d --build
   ```

2. **Run Migrations (if using backend service)**
   ```bash
   docker compose exec backend php artisan migrate --force
   ```

---

### Access URLs
- **Web App**: `http://localhost:3000`
- **Scraper Service**: `http://localhost:4000`
- **REST API** *(Docker backend)*: `http://localhost:8000/api`
- **phpMyAdmin** *(Docker)*: `http://localhost:8080`

---

## REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/posts` | List all tracked posts with latest metrics |
| `POST` | `/api/posts` | Submit a new URL to track and scrape |
| `GET` | `/api/posts/{id}` | Get post details and historical snapshots |
| `POST` | `/api/posts/{id}/refresh` | Fetch fresh real-time metrics |
| `PATCH` | `/api/posts/{id}/expiry` | Update or remove tracking expiration date |
| `DELETE` | `/api/posts/{id}` | Untrack and delete post data |

---

## License

MIT © [dibiaskyy](https://github.com/dibiaskyy)

