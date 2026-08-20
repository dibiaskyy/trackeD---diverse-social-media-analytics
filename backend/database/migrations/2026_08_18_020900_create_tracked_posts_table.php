<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tracked_posts', function (Blueprint $table) {
            $table->id();
            $table->enum('platform', ['tiktok', 'facebook']);
            $table->string('post_url');
            $table->string('post_id')->nullable(); // extracted ID from the URL
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tracked_posts');
    }
};