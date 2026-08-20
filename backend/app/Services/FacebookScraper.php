<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Carbon;
use Exception;

class FacebookScraper
{
    public function scrape(string $url): array
    {
        $response = Http::timeout(60)->post('http://scraper:4000/fetch-facebook', [
            'url' => $url,
        ]);

        if (!$response->successful()) {
            throw new Exception('Scraper service error: ' . $response->body());
        }

        $result = $response->json();
        $html = $result['html'] ?? '';
        $meta = $result['meta'] ?? [];

        $thumbnail = $meta['ogImage'] ?? $this->extractMeta($html, 'og:image');
        $views = $this->extractViews($html, $meta);
        $likes = $this->extractLikes($html, $meta);
        $comments = $this->extractComments($html, $meta);
        $shares = $this->extractShares($html, $meta);
        $postedAt = $this->extractPublishDate($html);
        $caption = $meta['ogDescription'] ?? $meta['description'] ?? $meta['ogTitle'] ?? null;

        return [
            'views' => $views,
            'likes' => $likes,
            'comments' => $comments,
            'shares' => $shares,
            'caption' => $caption,
            'posted_at' => $postedAt,
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

    private function extractMeta(string $html, string $prop): ?string
    {
        if (preg_match('/<meta\s+(?:property|name)=["\']' . preg_quote($prop, '/') . '["\']\s+content=["\']([^"\']+)["\']/i', $html, $matches)) {
            return html_entity_decode($matches[1], ENT_QUOTES | ENT_HTML5);
        }
        return null;
    }

    private function extractViews(string $html, array $meta): int
    {
        // 1. Prioritize EXACT unrounded raw integer counts in JSON/Relay state/JSON-LD
        // e.g. "video_view_count": 26453, "play_count": 26453, "userInteractionCount": "26453"
        if (preg_match('/"(?:video_view_count|play_count|viewCount|views_count|view_count|video_play_count|watch_count)":\s*"?(\d+)"?/i', $html, $matches)) {
            return (int) $matches[1];
        }

        if (preg_match('/"interactionType":\s*"https?:\/\/schema\.org\/WatchAction"[^}]*?"userInteractionCount":\s*"?(\d+)"?/i', $html, $matches)) {
            return (int) $matches[1];
        }

        if (preg_match('/"userInteractionCount":\s*"?(\d{3,15})"?/i', $html, $matches)) {
            return (int) $matches[1];
        }

        // 2. Check full unrounded count with commas in aria-label or title (e.g. "26,453 views")
        if (preg_match('/(?:aria-label|title)=["\']([\d,]{4,})\s*(?:views|plays|Views|Plays)["\']/i', $html, $matches)) {
            return (int) str_replace(',', '', $matches[1]);
        }

        // 3. Check exact comma-formatted number in HTML text (e.g., ">26,453 views<")
        if (preg_match('/>\s*([\d,]{4,})\s*(?:views|plays|Views|Plays)\s*</i', $html, $matches)) {
            return (int) str_replace(',', '', $matches[1]);
        }

        // 4. Fallback: Abbreviated DOM extraction from Playwright (e.g. "26.4K")
        if (!empty($meta['domViews'])) {
            return $this->parseFormattedCount($meta['domViews']);
        }

        // 5. Fallback: Meta description (e.g., "1.2M views · 45K likes")
        $desc = ($meta['ogDescription'] ?? '') . ' ' . ($meta['description'] ?? '');
        if (preg_match('/([\d,.]+[KkMmBb]?)\s*(?:views|plays|Views|Plays)/', $desc, $matches)) {
            return $this->parseFormattedCount($matches[1]);
        }

        // 6. Fallback: Search HTML text
        if (preg_match('/([\d,.]+[KkMmBb]?)\s*(?:views|plays|Views|Plays)/i', $html, $matches)) {
            return $this->parseFormattedCount($matches[1]);
        }

        return 0;
    }

    private function extractLikes(string $html, array $meta): int
    {
        // 1. Prioritize EXACT unrounded raw integer reaction count in JSON
        if (preg_match('/"(?:reaction_count|reactionCount|like_count|likeCount|total_reaction_count)":\s*(?:\{"count":)?(\d+)/i', $html, $matches)) {
            return (int) $matches[1];
        }

        if (preg_match('/"interactionType":\s*"https?:\/\/schema\.org\/LikeAction"[^}]*?"userInteractionCount":\s*"?(\d+)"?/i', $html, $matches)) {
            return (int) $matches[1];
        }

        // 2. Exact full number with commas in tooltip or aria-label
        if (preg_match('/(?:aria-label|title)=["\']([\d,]{4,})\s*(?:likes|reactions|Likes|Reactions)["\']/i', $html, $matches)) {
            return (int) str_replace(',', '', $matches[1]);
        }

        if (preg_match('/"i18n_reaction_count":\s*"([^"]+)"/i', $html, $matches)) {
            return $this->parseFormattedCount($matches[1]);
        }

        // 3. Fallback: Direct DOM extraction
        if (!empty($meta['domLikes'])) {
            return $this->parseFormattedCount($meta['domLikes']);
        }

        // 4. Fallback: Meta title / description (e.g. "81K views · 2.5K reactions")
        $metaCombined = ($meta['ogTitle'] ?? '') . ' ' . ($meta['ogDescription'] ?? '') . ' ' . ($meta['description'] ?? '');
        if (preg_match('/([\d,.]+[KkMmBb]?)\s*(?:likes|like|reactions|reaction|Likes|Like|Reactions|Reaction)/i', $metaCombined, $matches)) {
            return $this->parseFormattedCount($matches[1]);
        }

        // 5. Fallback: Search full HTML text for reactions/likes
        if (preg_match('/([\d,.]+[KkMmBb]?)\s*(?:likes|like|reactions|reaction|Likes|Like|Reactions|Reaction)/i', $html, $matches)) {
            return $this->parseFormattedCount($matches[1]);
        }

        return 0;
    }

    private function extractComments(string $html, array $meta): int
    {
        // 1. Prioritize EXACT unrounded comments count in JSON
        if (preg_match('/"(?:comment_count|total_comment_count|commentsCount|commentCount)":\s*(?:\{"total_count":)?(\d+)/i', $html, $matches)) {
            return (int) $matches[1];
        }

        if (preg_match('/"interactionType":\s*"https?:\/\/schema\.org\/CommentAction"[^}]*?"userInteractionCount":\s*"?(\d+)"?/i', $html, $matches)) {
            return (int) $matches[1];
        }

        // 2. Exact full number in aria-label/title
        if (preg_match('/(?:aria-label|title)=["\']([\d,]{4,})\s*(?:comments|Comments)["\']/i', $html, $matches)) {
            return (int) str_replace(',', '', $matches[1]);
        }

        if (preg_match('/"i18n_comment_count":\s*"([^"]+)"/i', $html, $matches)) {
            return $this->parseFormattedCount($matches[1]);
        }

        // 3. Fallback: Direct DOM extraction
        if (!empty($meta['domComments'])) {
            return $this->parseFormattedCount($meta['domComments']);
        }

        // 4. Fallback: Meta description
        $desc = ($meta['ogDescription'] ?? '') . ' ' . ($meta['description'] ?? '');
        if (preg_match('/([\d,.]+[KkMmBb]?)\s*(?:comments|Comments)/', $desc, $matches)) {
            return $this->parseFormattedCount($matches[1]);
        }

        return 0;
    }

    private function extractShares(string $html, array $meta): int
    {
        // 1. Prioritize EXACT unrounded share count in JSON structures
        if (preg_match('/"(?:share_count|shares_count|sharesCount|total_share_count)":\s*(?:\{"count":)?(\d+)/i', $html, $matches)) {
            return (int) $matches[1];
        }

        if (preg_match('/"reshares":\s*\{"count":\s*(\d+)\}/i', $html, $matches)) {
            return (int) $matches[1];
        }

        if (preg_match('/"interactionType":\s*"https?:\/\/schema\.org\/ShareAction"[^}]*?"userInteractionCount":\s*"?(\d+)"?/i', $html, $matches)) {
            return (int) $matches[1];
        }

        // 2. Full unrounded count in aria-label or HTML
        if (preg_match('/(?:aria-label|title)=["\']([\d,]{4,})\s*(?:shares|Shares|share|Share)["\']/i', $html, $matches)) {
            return (int) str_replace(',', '', $matches[1]);
        }

        if (preg_match('/"i18n_share_count":\s*"([^"]+)"/i', $html, $matches)) {
            return $this->parseFormattedCount($matches[1]);
        }

        if (preg_match('/"share_count_reduced":\s*"([^"]+)"/i', $html, $matches)) {
            return $this->parseFormattedCount($matches[1]);
        }

        // 3. Fallback: Direct DOM extraction from Playwright
        if (!empty($meta['domShares'])) {
            return $this->parseFormattedCount($meta['domShares']);
        }

        // 4. Fallback: Meta description
        $desc = ($meta['ogDescription'] ?? '') . ' ' . ($meta['description'] ?? '');
        if (preg_match('/([\d,.]+[KkMmBb]?)\s*(?:shares|Shares|share|Share)/', $desc, $matches)) {
            return $this->parseFormattedCount($matches[1]);
        }

        // 5. Fallback: Search HTML tags for share text
        if (preg_match('/>\s*([\d,.]+[KkMmBb]?)\s*(?:shares|Shares|share|Share)\s*</i', $html, $matches)) {
            return $this->parseFormattedCount($matches[1]);
        }

        return 0;
    }

    private function extractPublishDate(string $html): ?Carbon
    {
        // 1. Meta tag article:published_time
        $published = $this->extractMeta($html, 'article:published_time');
        if ($published) {
            try {
                return Carbon::parse($published);
            } catch (\Exception $e) {}
        }

        // 2. Timestamp in JSON
        if (preg_match('/"(?:publish_time|creation_time|uploadDate)":\s*"?(\d{9,12}|\d{4}-\d{2}-\d{2})"?/i', $html, $matches)) {
            try {
                if (is_numeric($matches[1])) {
                    return Carbon::createFromTimestamp((int) $matches[1]);
                }
                return Carbon::parse($matches[1]);
            } catch (\Exception $e) {}
        }

        return null;
    }
}
