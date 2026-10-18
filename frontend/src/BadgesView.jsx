import { useState } from 'react'
import BadgeMedal, { BadgeCategory } from './BadgeMedal'
import './badges.css'

function earnedDate(value) {
  const date = new Date(value)
  return value && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date not recorded'
}

export default function BadgesView({ badges, onContinue }) {
  const [sort, setSort] = useState('latest')
  const ordered = [...badges].sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : (sort === 'oldest' ? 1 : -1) * ((Date.parse(a.awarded_at) || 0) - (Date.parse(b.awarded_at) || 0)))
  const latest = [...badges].sort((a, b) => (Date.parse(b.awarded_at) || 0) - (Date.parse(a.awarded_at) || 0))[0]

  return <div className="dashboard-content achievement-page">
    <div className="section-intro"><div><span className="eyebrow">Your achievements</span><h2>A collection worth earning.</h2><p>Every badge marks a skill you’ve practised and a milestone you’ve reached.</p></div><button type="button" className="secondary-small" onClick={onContinue}>Continue learning <span aria-hidden="true">↗</span></button></div>
    <section className="achievement-showcase" aria-label="Achievement collection summary">
      <div className="achievement-showcase-copy"><span className="achievement-overline">THE QUALITYCRAFT COLLECTION</span><h3>Small wins.<br />Lasting skills.</h3><p>Your curiosity and effort, collected one achievement at a time.</p><div className="achievement-total"><strong>{badges.length}</strong><span>{badges.length === 1 ? 'achievement earned' : 'achievements earned'}<small>Yours to be proud of.</small></span></div></div>
      <div className="achievement-featured"><div className="achievement-medal-plinth"><BadgeMedal badge={latest} /></div><div><span className="achievement-overline">{latest ? 'LATEST ACHIEVEMENT' : 'YOUR NEXT CHAPTER'}</span><h3>{latest?.name || 'Your first achievement awaits'}</h3><p>{latest ? `Earned ${earnedDate(latest.awarded_at)}` : 'Learn, practise, and make your first mark.'}</p></div></div>
    </section>

    <div className="achievement-collection-heading"><div><h3>Your badge cabinet</h3><p>{badges.length ? 'A closer look at what you’ve accomplished.' : 'A place for every milestone ahead.'}</p></div>{badges.length > 1 && <label>Sort badges<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="latest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Badge name</option></select></label>}</div>
    {badges.length ? <section className="achievement-grid" aria-label="Earned badges">{ordered.map((badge) => <article className="achievement-card" key={badge.badge_id}>
      <div className="achievement-card-art"><span className="achievement-category"><BadgeCategory badge={badge} /></span><BadgeMedal badge={badge} /><span className="achievement-earned"><span aria-hidden="true">✓</span> Earned</span></div>
      <div className="achievement-card-copy"><h3>{badge.name}</h3><p>{badge.description || badge.criteria || 'Awarded for reaching a learning milestone.'}</p><div className="achievement-awarded"><span>Added to your collection</span><time dateTime={badge.awarded_at}>{earnedDate(badge.awarded_at)}</time></div></div>
    </article>)}</section> : <section className="achievement-empty"><BadgeMedal /><div><h3>Great collections start with a first step.</h3><p>Complete lessons, submit practical activities, and take quizzes to earn your achievements.</p><button type="button" className="primary-small" onClick={onContinue}>Explore your learning path <span aria-hidden="true">→</span></button></div></section>}
  </div>
}
