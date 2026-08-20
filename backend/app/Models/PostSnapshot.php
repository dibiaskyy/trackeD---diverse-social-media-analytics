<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PostSnapshot extends Model
{
    use HasFactory;

    protected $fillable = [
        'tracked_post_id',
        'views',
        'likes',
        'comments',
        'shares',
        'fetched_at',
    ];

    protected $casts = [
        'fetched_at' => 'datetime',
    ];

    public function trackedPost()
    {
        return $this->belongsTo(TrackedPost::class);
    }
}