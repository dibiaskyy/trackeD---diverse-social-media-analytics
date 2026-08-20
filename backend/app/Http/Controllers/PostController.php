<?php

namespace App\Http\Controllers;

use App\Models\TrackedPost;
use App\Models\PostSnapshot;
use App\Services\TikTokScraper;
use App\Services\YouTubeScraper;
use App\Services\FacebookScraper;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class PostController extends Controller
{
    public function index()
    {
        // Automatically prune posts whose tracking schedule has expired
        TrackedPost::whereNotNull('track_until')
            ->where('track_until', '<=', Carbon::now())
            ->delete();

        $posts = TrackedPost::with('latestSnapshot')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($post) => $this->formatPost($post));

        return response()->json($posts);
    }

    public function store(Request $request)
    {
        $request->validate([
            'url' => 'required|string|url',
            'track_until' => 'nullable|date',
        ]);

        $url = $request->input('url');
        $platform = $this->detectPlatform($url);

        if (!$platform) {
            return response()->json(['message' => 'Only TikTok, YouTube, and Facebook links are supported.'], 422);
        }

        $existing = TrackedPost::where('post_url', $url)->first();

        if ($existing) {
            return response()->json(['message' => 'This post is already being tracked.'], 409);
        }

        $trackUntil = $request->input('track_until') ? Carbon::parse($request->input('track_until')) : null;

        $post = TrackedPost::create([
            'platform' => $platform,
            'post_url' => $url,
            'track_until' => $trackUntil,
        ]);

        try {
            $this->scrapeAndSave($post);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $post->load('latestSnapshot');

        return response()->json($this->formatPost($post), 201);
    }

    public function refresh(TrackedPost $post)
    {
        // Check if expired
        if ($post->track_until && $post->track_until->lte(Carbon::now())) {
            $post->delete();
            return response()->json(['message' => 'Tracking for this post has expired and it was deleted.'], 410);
        }

        try {
            $this->scrapeAndSave($post);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $post->load('latestSnapshot');

        return response()->json($this->formatPost($post));
    }

    public function destroy(TrackedPost $post)
    {
        $post->delete();

        return response()->json([
            'message' => 'Post untracked and deleted successfully.',
            'id' => $post->id,
        ]);
    }

    public function updateExpiry(Request $request, TrackedPost $post)
    {
        $request->validate([
            'track_until' => 'nullable|date',
        ]);

        $trackUntil = $request->input('track_until') ? Carbon::parse($request->input('track_until')) : null;

        if ($trackUntil && $trackUntil->lte(Carbon::now())) {
            $post->delete();
            return response()->json(['message' => 'Expiration date was in the past; post has been deleted.', 'deleted' => true]);
        }

        $post->update(['track_until' => $trackUntil]);
        $post->load('latestSnapshot');

        return response()->json($this->formatPost($post));
    }

    public function history(TrackedPost $post)
    {
        // Check if expired
        if ($post->track_until && $post->track_until->lte(Carbon::now())) {
            $post->delete();
            return response()->json(['message' => 'Tracking for this post has expired.'], 404);
        }

        $snapshots = $post->snapshots()
            ->orderBy('fetched_at', 'asc')
            ->get();

        $latest = $snapshots->last();
        $dayAgo = $snapshots
            ->filter(fn ($s) => $s->fetched_at->lte(now()->subDay()))
            ->last();

        $growth = null;
        if ($latest && $dayAgo && $dayAgo->views > 0) {
            $growth = round((($latest->views - $dayAgo->views) / $dayAgo->views) * 100, 1);
        }

        $engagementRate = null;
        if ($latest && $latest->views > 0) {
            $interactions = $post->platform === 'youtube'
                ? ($latest->likes + $latest->comments)
                : ($latest->likes + $latest->comments + $latest->shares);

            $engagementRate = round(($interactions / $latest->views) * 100, 2);
        }

        return response()->json([
            'post' => [
                'id' => $post->id,
                'platform' => $post->platform,
                'post_url' => $post->post_url,
                'caption' => $post->caption,
                'thumbnail_url' => $post->thumbnail_url,
                'track_until' => $post->track_until,
                'created_at' => $post->created_at,
                'posted_at' => $post->posted_at,
            ],
            'latest' => $latest ? [
                'views' => $latest->views,
                'likes' => $latest->likes,
                'comments' => $latest->comments,
                'shares' => $latest->shares,
                'fetched_at' => $latest->fetched_at,
            ] : null,
            'views_1d_ago' => $dayAgo?->views,
            'growth_percent' => $growth,
            'engagement_rate' => $engagementRate,
            'snapshots' => $snapshots->map(fn ($s) => [
                'views' => $s->views,
                'likes' => $s->likes,
                'comments' => $s->comments,
                'shares' => $s->shares,
                'fetched_at' => $s->fetched_at,
            ]),
        ]);
    }

    private function scrapeAndSave(TrackedPost $post): void
    {
        if ($post->platform === 'tiktok') {
            $scraper = new TikTokScraper();
            $stats = $scraper->scrape($post->post_url);
        } elseif ($post->platform === 'youtube') {
            $scraper = new YouTubeScraper();
            $stats = $scraper->scrape($post->post_url);
        } elseif ($post->platform === 'facebook') {
            $scraper = new FacebookScraper();
            $stats = $scraper->scrape($post->post_url);
        } else {
            throw new \Exception('Unsupported platform: ' . $post->platform);
        }

        $updates = [];

        // Only set posted_at once — the video's publish date never changes
        if (!$post->posted_at && !empty($stats['posted_at'])) {
            $updates['posted_at'] = $stats['posted_at'];
        }

        // Update thumbnail_url if available
        if (!empty($stats['thumbnail_url'])) {
            $updates['thumbnail_url'] = $stats['thumbnail_url'];
        }

        // Update caption if available
        if (!empty($stats['caption'])) {
            $updates['caption'] = $stats['caption'];
        }

        if (!empty($updates)) {
            $post->update($updates);
        }

        PostSnapshot::create([
            'tracked_post_id' => $post->id,
            'views' => $stats['views'],
            'likes' => $stats['likes'],
            'comments' => $stats['comments'],
            'shares' => $stats['shares'],
            'fetched_at' => Carbon::now(),
        ]);
    }

    private function detectPlatform(string $url): ?string
    {
        if (str_contains($url, 'tiktok.com')) {
            return 'tiktok';
        }

        if (str_contains($url, 'youtube.com') || str_contains($url, 'youtu.be')) {
            return 'youtube';
        }

        if (str_contains($url, 'facebook.com') || str_contains($url, 'fb.watch') || str_contains($url, 'fb.com')) {
            return 'facebook';
        }

        return null;
    }

    private function formatPost(TrackedPost $post): array
    {
        return [
            'id' => $post->id,
            'platform' => $post->platform,
            'post_url' => $post->post_url,
            'caption' => $post->caption,
            'thumbnail_url' => $post->thumbnail_url,
            'track_until' => $post->track_until,
            'created_at' => $post->created_at,
            'posted_at' => $post->posted_at,
            'latest' => $post->latestSnapshot ? [
                'views' => $post->latestSnapshot->views,
                'likes' => $post->latestSnapshot->likes,
                'comments' => $post->latestSnapshot->comments,
                'shares' => $post->latestSnapshot->shares,
                'fetched_at' => $post->latestSnapshot->fetched_at,
            ] : null,
        ];
    }
}