# trackeD

A standalone social media analytics tool that tracks public video performance across **TikTok**, **YouTube**, and **Facebook** without requiring platform logins or API keys.

---

## What is trackeD?

trackeD automates metrics tracking for public video links. It uses a headless browser scraper to extract exact, unrounded engagement metrics directly from public URLs, logs periodic snapshots into a database (Aiven Cloud MySQL or local/Docker MySQL), and visualizes trends and engagement rates in an interactive dashboard.

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

## Tech Stack
- **Frontend & API**: Next.js 16 (Turbopack), React 19, Recharts, jsPDF, CSS Modules
- **Database & ORM**: MySQL 8 / Aiven Cloud MySQL, `mysql2` connection pooling, Prisma (Studio & Migrations)
- **Scraper Service**: Node.js, Express, Playwright (Headless Chromium)
- **Containerization**: Docker & Docker Compose (Optional)

---

## Quick Start

### Option A: Local Development with Aiven / Cloud MySQL (Recommended)

1. **Install Dependencies**
   ```bash
   npm install
   npm install --prefix frontend
   npm install --prefix scraper-service
   ```

2. **Configure Environment**
   Create `frontend/.env.local` (or copy from `frontend/.env.example`):
   ```env
   DATABASE_URL=mysql://avnadmin:YOUR_PASSWORD@YOUR_AIVEN_HOST:PORT/defaultdb?ssl-mode=REQUIRED
   SCRAPER_URL=http://localhost:4000
   ```

3. **Sync Database Tables**
   ```bash
   cd frontend
   npx prisma db push
   cd ..
   ```

4. **Run Dev Server**
   ```bash
   npm run dev
   ```
   *This concurrently starts both the Next.js frontend (`:3000`) and the scraper microservice (`:4000`).*

5. **Open Database GUI (Optional)**
   ```bash
   cd frontend && npx prisma studio
   ```
   *Visual database management at `http://localhost:5555`.*

---

### Option B: Docker Compose

1. **Launch Containers**
   ```bash
   docker compose up -d --build
   ```

2. **Run Backend Migrations**
   ```bash
   docker compose exec backend php artisan migrate --force
   ```

---

## Access URLs

| Service | URL | Description |
| :--- | :--- | :--- |
| **Web App** | `http://localhost:3000` | Main analytics dashboard |
| **Scraper Microservice** | `http://localhost:4000` | Playwright scraping service |
| **Prisma Studio** | `http://localhost:51212` | Visual database manager (Local mode) |
| **REST API** | `http://localhost:8000/api` | Laravel REST API (Docker mode) |
| **phpMyAdmin** | `http://localhost:8080` | MySQL database manager (Docker mode) |

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

## Repository Branches

- **`main`**: The primary branch with full support for `npm run dev`, Aiven Cloud MySQL, and Docker.
- **`npm-and-docker-version`**: Standalone & containerized setup.
- **`docker-version`**: Dedicated Docker-only environment.

---

## License

MIT © [dibiaskyy](https://github.com/dibiaskyy)


