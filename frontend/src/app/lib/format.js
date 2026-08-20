export function formatNumber(num) {
  if (num === null || num === undefined) return '—'
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return num.toString()
}

export function timeAgo(dateString) {
  if (!dateString) return 'never'
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function getPostThumbnail(urlOrPost, platform, explicitThumb) {
  if (typeof urlOrPost === 'object' && urlOrPost !== null) {
    if (urlOrPost.thumbnail_url) return urlOrPost.thumbnail_url
    return getPostThumbnail(urlOrPost.post_url, urlOrPost.platform)
  }

  if (explicitThumb) return explicitThumb
  const url = urlOrPost
  if (!url) return null

  // YouTube thumbnail extraction
  if (platform === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/)
    if (match && match[1]) {
      return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
    }
  }

  return null
}