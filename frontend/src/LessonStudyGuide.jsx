import { useState } from 'react'
import { getGuideReadingMinutes } from './content/lessonGuides'
import './lesson-study-guide.css'

function LessonVideo({ video }) {
  const [loaded, setLoaded] = useState(false)
  const watchUrl = 'https://www.youtube.com/watch?v=' + video.id
  return <section className="guide-video-section" id="lesson-video" aria-labelledby="lesson-video-title">
    <div className="guide-section-label">SEE IT EXPLAINED</div>
    <h3 id="lesson-video-title">Watch, then connect the ideas</h3>
    <p>{video.focus}</p>
    <div className="guide-video">
      {loaded ? <iframe src={'https://www.youtube-nocookie.com/embed/' + video.id + '?rel=0'} title={'YouTube lesson video: ' + video.title} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> : <button className="guide-video-placeholder" type="button" onClick={() => setLoaded(true)} aria-label={'Load lesson video: ' + video.title}><span className="guide-video-decoration" aria-hidden="true">&lt;/&gt;</span><span className="guide-video-play" aria-hidden="true">▶</span><span className="guide-video-button-copy"><strong>Learn it a different way.</strong><small>Load the video to watch here</small></span><span className="guide-video-tag">YOUTUBE LESSON</span></button>}
    </div>
    <div className="guide-video-caption"><div><strong>{video.title}</strong><small>{video.channel}</small></div><a href={watchUrl} target="_blank" rel="noopener noreferrer">Open on YouTube <span aria-hidden="true">↗</span></a></div>
    <p className="guide-video-help">The video is optional. If the player is unavailable, open the YouTube link or continue with the written lesson.</p>
    <div className="guide-watch-prompts"><strong>While you watch, think about…</strong><ul>{video.prompts.map(prompt => <li key={prompt}>{prompt}</li>)}</ul></div>
  </section>
}

export default function LessonStudyGuide({ guide, originalContent, lessonTitle }) {
  if (!guide) return <div className="lesson-content">{originalContent}</div>
  const minutes = getGuideReadingMinutes(guide, originalContent)
  return <div className="lesson-study-guide">
    <div className="guide-intro-card"><span className="guide-section-label">A LITTLE DEEPER, A LOT CLEARER</span><p>{guide.introduction}</p><span className="guide-reading-time">~{minutes} min read <span aria-hidden="true">·</span> {guide.sections.length} guided sections <span aria-hidden="true">·</span> Optional video</span></div>
    <section className="guide-objectives" id="lesson-objectives"><h3>By the end, you’ll be able to…</h3><ul>{guide.objectives.map(objective => <li key={objective}><span aria-hidden="true">✓</span>{objective}</li>)}</ul></section>
    <div className="guide-layout">
      <aside className="guide-contents"><details open><summary>In this lesson</summary><nav aria-label={'Sections in ' + lessonTitle}>{guide.sections.map((section, index) => <a href={'#guide-' + guide.id + '-' + index} key={section.title}><span>{String(index + 1).padStart(2, '0')}</span>{section.title}</a>)}<a href="#lesson-video"><span aria-hidden="true">▶</span>Watch the explanation</a><a href="#lesson-self-check"><span aria-hidden="true">?</span>Check your understanding</a></nav></details></aside>
      <div className="guide-body">
        {originalContent && <details className="guide-teacher-notes" open><summary>Your lesson notes</summary><div className="lesson-content">{originalContent}</div></details>}
        {guide.sections.map((section, index) => <section className="guide-section" id={'guide-' + guide.id + '-' + index} key={section.title}><div className="guide-section-heading"><span>{String(index + 1).padStart(2, '0')}</span><h3>{section.title}</h3></div>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}{section.table && <div className="guide-table-wrap" role="region" aria-label={section.title + ' example table'} tabIndex="0"><table><thead><tr>{section.table.headers.map(header => <th scope="col" key={header}>{header}</th>)}</tr></thead><tbody>{section.table.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, columnIndex) => columnIndex === 0 ? <th scope="row" key={columnIndex}>{cell}</th> : <td key={columnIndex}>{cell}</td>)}</tr>)}</tbody></table></div>}{section.note && <aside className="guide-note"><span aria-hidden="true">✦</span><p>{section.note}</p></aside>}</section>)}
        <section className="guide-takeaways" id="lesson-takeaways"><span className="guide-section-label">THE IDEAS TO KEEP</span><h3>Your key takeaways</h3><ul>{guide.takeaways.map(item => <li key={item}>{item}</li>)}</ul></section>
        <LessonVideo key={guide.video.id} video={guide.video} />
        <section className="guide-self-check" id="lesson-self-check"><div className="guide-section-label">PAUSE & TRY IT</div><h3>Check your understanding</h3><p>Try answering in your own words, then reveal the explanation. These practice questions do not affect your quiz score.</p>{guide.checks.map((check, index) => <details key={check.question}><summary><span>{index + 1}</span>{check.question}</summary><p>{check.answer}</p></details>)}</section>
        <div className="guide-references"><strong>Explore further</strong>{guide.sources.map(source => <a href={source.url} target="_blank" rel="noopener noreferrer" key={source.url}>{source.title} <span aria-hidden="true">↗</span></a>)}</div>
      </div>
    </div>
  </div>
}
