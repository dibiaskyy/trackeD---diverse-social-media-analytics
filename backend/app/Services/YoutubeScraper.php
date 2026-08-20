<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Carbon;
use Exception;

class YouTubeScraper
{
    public function scrape(string $url): array
    {
        // Normalize shorts / shortlinks to watch URL to ensure full comment & metric payload
        if (preg_match('/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/))([\w-]{11})/', $url, $m)) {
            $url = "https://www.youtube.com/watch?v={$m[1]}";
        }

        $response = Http::timeout(45)->post('http://scraper:4000/fetch-youtube', [
            'url' => $url,
        ]);

        if (!$response->successful()) {
            throw new Exception('Scraper service error: ' . $response->body());
        }

        $result = $response->json();
        $html = $result['html'] ?? '';
        $meta = $result['meta'] ?? [];

        $views = $this->extractViews($html, $meta);
        $likes = $this->extractLikes($html, $meta);
        $comments = $this->extractComments($html, $meta);
        $thumbnail = $this->extractThumbnail($url, $html);
        $caption = $meta['domCaption'] ?? $this->extractCaption($html);

        return [
            'views' => $views,
            'likes' => $likes,
            'comments' => $comments,
            'shares' => 0, // YouTube doesn't publicly expose share counts
            'caption' => $caption,
            'posted_at' => $this->extractPublishDate($html),
            'thumbnail_url' => $thumbnail,
        ];
    }

    private function parseFormattedCount(string $str): int
    {
        $clean = trim($str);
        if (empty($clean)) return 0;

        $multiplier = 1;
        if (stripos($clean, 'K') !== false) {
            $multiplier = 1000;
            $clean = str_ireplace('K', '', $clean);
        } elseif (stripos($clean, 'M') !== false) {
            $multiplier = 1000000;
            $clean = str_ireplace('M', '', $clean);
        } elseif (stripos($clean, 'B') !== false) {
            $multiplier = 1000000000;
            $clean = str_ireplace('B', '', $clean);
        }

        $clean = preg_replace('/[^\d.]/', '', $clean);
        return (int) round(floatval($clean) * $multiplier);
    }

    private function extractThumbnail(string $url, string $html): ?string
    {
        if (preg_match('/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/', $url, $matches)) {
            return "https://img.youtube.com/vi/{$matches[1]}/hqdefault.jpg";
        }

        return null;
    }

    private function extractCaption(string $html): ?string
    {
        if (preg_match('/<meta\s+name="title"\s+content="([^"]+)"/i', $html, $matches)) {
            return html_entity_decode($matches[1], ENT_QUOTES | ENT_HTML5);
        }
        if (preg_match('/<meta\s+property="og:title"\s+content="([^"]+)"/i', $html, $matches)) {
            return html_entity_decode($matches[1], ENT_QUOTES | ENT_HTML5);
        }
        if (preg_match('/<title>([^<]+)<\/title>/i', $html, $matches)) {
            $t = trim(str_replace(' - YouTube', '', html_entity_decode($matches[1], ENT_QUOTES | ENT_HTML5)));
            return $t ?: null;
        }
        return null;
    }

    private function extractViews(string $html, array $meta = []): int
    {
        // 1. Raw integer in videoDetails or microformat (e.g. "viewCount":"26453")
        if (preg_match('/"viewCount":\s*"?(\d+)"?/', $html, $matches)) {
            return (int) $matches[1];
        }

        if (preg_match('/"videoViewCountRenderer":\s*\{"viewCount":\s*\{"simpleText":\s*"([\d,]+)/', $html, $matches)) {
            return (int) str_replace(',', '', $matches[1]);
        }

        if (preg_match('/"view_count":\s*"?(\d+)"?/', $html, $matches)) {
            return (int) $matches[1];
        }

        if (preg_match('/<meta\s+itemprop="interactionCount"\s+content="(\d+)"/i', $html, $matches)) {
            return (int) $matches[1];
        }

        if (!empty($meta['domViews'])) {
            $v = $this->parseFormattedCount($meta['domViews']);
            if ($v > 0) return $v;
        }

        return 0;
    }

    private function extractLikes(string $html, array $meta = []): int
    {
        if (!empty($meta['domLikes'])) {
            $l = $this->parseFormattedCount($meta['domLikes']);
            if ($l > 0) return $l;
        }

        if (preg_match('/"accessibilityData":\{"label":"([\d,.]+[KkMmBb]?)\s+likes"\}/i', $html, $matches)) {
            return $this->parseFormattedCount($matches[1]);
        }

        if (preg_match('/"likeCount":\s*"?(\d+)"?/', $html, $matches)) {
            return (int) $matches[1];
        }

        return 0;
    }

    private function extractComments(string $html, array $meta = []): int
    {
        // 1. Direct Playwright DOM / ytInitialData extraction
        if (!empty($meta['domComments'])) {
            $c = $this->parseFormattedCount($meta['domComments']);
            if ($c > 0) return $c;
        }

        // 2. Schema.org / JSON-LD
        if (preg_match('/"interactionType":\s*(?:\{"@type":\s*"CommentAction"\}|"https?:\/\/schema\.org\/CommentAction")[^}]*?"userInteractionCount":\s*"?(\d+)"?/i', $html, $matches)) {
            return (int) $matches[1];
        }

        // 3. YouTube initial data structures
        if (preg_match('/"(?:commentsCount|commentCount)":\s*(?:\{[^}]*?"simpleText":\s*"([\d,.]+[KkMmBb]?)"|\s*"?(\d+)"?)/i', $html, $matches)) {
            $val = !empty($matches[1]) ? $matches[1] : $matches[2];
            return $this->parseFormattedCount($val);
        }

        if (preg_match('/"contextualInfo":\s*\{"runs":\[\{"text":"([\d,.]+[KkMmBb]?)"\}/i', $html, $matches)) {
            return $this->parseFormattedCount($matches[1]);
        }

        if (preg_match('/"accessibilityData":\s*\{"label":"([\d,.]+[KkMmBb]?)\s+comments?"\}/i', $html, $matches)) {
            return $this->parseFormattedCount($matches[1]);
        }

        if (preg_match('/"totalComments":\s*"?(\d+)"?/', $html, $matches)) {
            return (int) $matches[1];
        }

        if (preg_match('/([\d,.]+[KkMmBb]?)\s+Comments?\b/i', $html, $matches)) {
            return $this->parseFormattedCount($matches[1]);
        }

        return 0;
    }

    private function extractPublishDate(string $html): ?Carbon
    {
        if (preg_match('/"publishDate":"(\d{4}-\d{2}-\d{2})"/', $html, $matches)) {
            return Carbon::parse($matches[1]);
        }

        if (preg_match('/"uploadDate":"(\d{4}-\d{2}-\d{2})"/', $html, $matches)) {
            return Carbon::parse($matches[1]);
        }

        return null;
    }
}