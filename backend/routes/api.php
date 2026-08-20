<?php

use App\Http\Controllers\PostController;
use Illuminate\Support\Facades\Route;

Route::get('/posts', [PostController::class, 'index']);
Route::post('/posts', [PostController::class, 'store']);
Route::post('/posts/{post}/refresh', [PostController::class, 'refresh']);
Route::get('/posts/{post}/history', [PostController::class, 'history']);
Route::delete('/posts/{post}', [PostController::class, 'destroy']);
Route::patch('/posts/{post}/expiry', [PostController::class, 'updateExpiry']);