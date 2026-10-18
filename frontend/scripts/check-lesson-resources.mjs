// Verify published metadata directly with YouTube; no API key or account is used.
import assert from 'node:assert/strict'
import { lessonGuides } from '../src/content/lessonGuides.js'

await Promise.all(lessonGuides.map(async guide => {
  const video = guide.video
  const url = 'https://www.youtube.com/oembed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + video.id) + '&format=json'
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) })
  assert.equal(response.status, 200, 'Video ' + video.id + ' must have publicly available metadata')
  const metadata = await response.json()
  assert.equal(metadata.title, video.title, 'Stored video title matches YouTube')
  assert.equal(metadata.author_name, video.channel, 'Stored channel matches YouTube')
  console.log(JSON.stringify({ lesson: guide.id, id: video.id, title: metadata.title, channel: metadata.author_name }))
}))
