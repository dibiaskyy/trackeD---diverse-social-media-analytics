<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Carbon;
use Exception;

class YouTubeScraper
{
    public function scrape(string $url): array
    {
        $response = Http::timeout(45)->post('http://scraper:4000/fetch-youtube', [
            'url' => $url,
        ]);

        if (!$response->successful()) {
            throw new Exception('Scraper service error: ' . $response->body());
        }

        $html = $response->json('html');

        $views = $this->extractViews($html);
        $likes = $this->extractLikes($html);
        $comments = $this->extractComments($html);
        $thumbnail = $this->extractThumbnail($url, $html);
        $caption = $this->extractCaption($html);

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

    private function extractViews(string $html): int
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

        return 0;
    }

    private function extractLikes(string $html): int
    {
        if (preg_match('/"accessibilityData":\{"label":"([\d,]+) likes"\}/', $html, $matches)) {
            return (int) str_replace(',', '', $matches[1]);
        }

        if (preg_match('/"likeCount":\s*"?(\d+)"?/', $html, $matches)) {
            return (int) $matches[1];
        }

        return 0;
    }

    private function extractComments(string $html): int
    {
        if (preg_match('/"commentsCount":\{"simpleText":"([\d,]+)"\}/', $html, $matches)) {
            return (int) str_replace(',', '', $matches[1]);
        }

        if (preg_match('/"contextualInfo":\{"runs":\[\{"text":"([\d,]+)"\}/', $html, $matches)) {
            return (int) str_replace(',', '', $matches[1]);
        }

        if (preg_match('/"commentCount":\s*"?(\d+)"?/', $html, $matches)) {
            return (int) $matches[1];
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