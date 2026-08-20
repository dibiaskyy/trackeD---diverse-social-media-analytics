<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TrackedPost extends Model
{
    use HasFactory;

    protected $fillable = [
        'platform',
        'post_url',
        'post_id',
        'caption',
        'posted_at',
        'thumbnail_url',
        'track_until',
    ];

    protected $casts = [
        'posted_at' => 'datetime',
        'track_until' => 'datetime',
    ];

    public function snapshots()
    {
        return $this->hasMany(PostSnapshot::class);
    }

    public function latestSnapshot()
    {
        return $this->hasOne(PostSnapshot::class)->latestOfMany();
    }
}