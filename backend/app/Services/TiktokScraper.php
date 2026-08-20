<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Carbon;
use Exception;

class TikTokScraper
{
    public function scrape(string $url): array
    {
        $response = Http::timeout(90)->post('http://scraper:4000/fetch-tiktok', [
            'url' => $url,
        ]);

        if (!$response->successful()) {
            throw new Exception('Scraper service error: ' . $response->body());
        }

        $result = $response->json();
        $html = $result['html'] ?? '';
        $botBlocked = $result['botBlocked'] ?? false;

        $json = null;

        // Primary data extraction: __UNIVERSAL_DATA_FOR_REHYDRATION__
        if (preg_match('/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.+?)<\/script>/s', $html, $matches)) {
            $json = json_decode($matches[1], true);
        }

        // Secondary fallback extraction: SIGI_STATE
        if (!$json && preg_match('/<script id="SIGI_STATE"[^>]*>(.+?)<\/script>/s', $html, $matches)) {
            $json = json_decode($matches[1], true);
        }

        // 1. Check __UNIVERSAL_DATA_FOR_REHYDRATION__ structure (contains raw exact integers)
        if ($json) {
            $videoDetail = $json['__DEFAULT_SCOPE__']['webapp.video-detail'] ?? null;

            if ($videoDetail && isset($videoDetail['itemInfo']['itemStruct'])) {
                $item = $videoDetail['itemInfo']['itemStruct'];
                $stats = $item['stats'] ?? [];
                $statsV2 = $item['statsV2'] ?? [];
                $createTime = $item['createTime'] ?? null;
                $video = $item['video'] ?? [];
                $cover = $video['cover'] ?? $video['originCover'] ?? $video['dynamicCover'] ?? null;
                $caption = $item['desc'] ?? null;

                $views = (int) ($stats['playCount'] ?? $statsV2['playCount'] ?? 0);
                $likes = (int) ($stats['diggCount'] ?? $statsV2['diggCount'] ?? 0);
                $comments = (int) ($stats['commentCount'] ?? $statsV2['commentCount'] ?? 0);
                $shares = (int) ($stats['shareCount'] ?? $statsV2['shareCount'] ?? 0);

                return [
                    'views' => $views,
                    'likes' => $likes,
                    'comments' => $comments,
                    'shares' => $shares,
                    'caption' => $caption,
                    'posted_at' => $createTime ? Carbon::createFromTimestamp($createTime) : null,
                    'thumbnail_url' => $cover,
                ];
            }

            // Handle SIGI_STATE fallback structure
            if (isset($json['ItemModule'])) {
                $firstItem = reset($json['ItemModule']);
                if ($firstItem) {
                    $stats = $firstItem['stats'] ?? [];
                    $statsV2 = $firstItem['statsV2'] ?? [];
                    $createTime = $firstItem['createTime'] ?? null;
                    $video = $firstItem['video'] ?? [];
                    $cover = $video['cover'] ?? $video['originCover'] ?? $video['dynamicCover'] ?? null;
                    $caption = $firstItem['desc'] ?? null;

                    return [
                        'views' => (int) ($stats['playCount'] ?? $statsV2['playCount'] ?? 0),
                        'likes' => (int) ($stats['diggCount'] ?? $statsV2['diggCount'] ?? 0),
                        'comments' => (int) ($stats['commentCount'] ?? $statsV2['commentCount'] ?? 0),
                        'shares' => (int) ($stats['shareCount'] ?? $statsV2['shareCount'] ?? 0),
                        'caption' => $caption,
                        'posted_at' => $createTime ? Carbon::createFromTimestamp($createTime) : null,
                        'thumbnail_url' => $cover,
                    ];
                }
            }
        }

        // 2. Check JSON-LD exact integer fallback
        if (preg_match('/<script type="application\/ld\+json"[^>]*>(.+?)<\/script>/s', $html, $matches)) {
            $ldJson = json_decode($matches[1], true);
            if ($ldJson) {
                $views = 0;
                $likes = 0;
                $comments = 0;
                if (!empty($ldJson['interactionStatistic'])) {
                    foreach ($ldJson['interactionStatistic'] as $stat) {
                        $type = $stat['interactionType'] ?? '';
                        $count = (int) ($stat['userInteractionCount'] ?? 0);
                        if (str_contains($type, 'WatchAction') || str_contains($type, 'PlayAction')) {
                            $views = $count;
                        } elseif (str_contains($type, 'LikeAction')) {
                            $likes = $count;
                        } elseif (str_contains($type, 'CommentAction')) {
                            $comments = $count;
                        }
                    }
                }

                if ($views > 0 || $likes > 0) {
                    return [
                        'views' => $views,
                        'likes' => $likes,
                        'comments' => $comments,
                        'shares' => 0,
                        'caption' => $ldJson['name'] ?? $ldJson['description'] ?? null,
                        'posted_at' => !empty($ldJson['uploadDate']) ? Carbon::parse($ldJson['uploadDate']) : null,
                        'thumbnail_url' => $ldJson['thumbnailUrl'][0] ?? null,
                    ];
                }
            }
        }

        if ($botBlocked) {
            throw new Exception('TikTok bot-detection challenge detected. Please wait a minute and try refreshing again.');
        }

        throw new Exception('Could not extract video stats from TikTok page. The video may be private or region-locked.');
    }
}