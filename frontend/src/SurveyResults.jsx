import SurveyRetakes from './SurveyRetakes'
import { CraftIcon } from './StudentExperience'
import './reflection-workspace.css'

function readRatings(value) {
  try { const rows = typeof value === 'string' ? JSON.parse(value) : value; return Array.isArray(rows) ? rows : [] }
  catch { return [] }
}

function submittedDate(value) {
  if (!value) return 'Date not recorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date not recorded' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SurveyResults({ surveys, retakes, onRetake, loading, error, message, onNavigate }) {
  const pre = surveys.find((item) => item.phase === 'pre')
  const post = surveys.find((item) => item.phase === 'post')
  const responseKind = (item) => item?.rating_mean != null ? 'rating' : item?.score != null ? 'score' : null
  const preKind = responseKind(pre)
  const postKind = responseKind(post)
  const mixedFormats = Boolean(preKind && postKind && preKind !== postKind)
  const isRating = preKind === 'rating' || postKind === 'rating' || !surveys.length
  const preRatings = readRatings(pre?.ratings)
  const postRatings = readRatings(post?.ratings)
  const identity = (item) => JSON.stringify([item.constructKey, item.statement])
  const comparableRatings = preKind === 'rating' && postKind === 'rating' && preRatings.length > 0 && preRatings.length === postRatings.length && preRatings.every((item) => postRatings.some((other) => identity(item) === identity(other)))
  const comparable = preKind === postKind && (preKind !== 'rating' || comparableRatings)
  const valueFor = (item, kind) => item == null || kind == null ? null : Number(kind === 'rating' ? item.rating_mean : item.score)
  const before = valueFor(pre, preKind)
  const after = valueFor(post, postKind)
  const change = before == null || after == null || !comparable ? null : Math.round((after - before) * 100) / 100
  const signed = (value) => `${value > 0 ? '+' : ''}${value}`
  const statementRows = [...new Map([...preRatings, ...postRatings].map((item) => [identity(item), item])).values()]
  const formatLabel = (kind) => kind === 'rating' ? 'Understanding survey' : kind === 'score' ? 'Knowledge check' : 'Survey not recorded'
  const renderValue = (value, kind) => <><strong>{value ?? '—'}</strong>{value != null && <span>{kind === 'rating' ? '/ 5' : '%'}</span>}</>
  const renderMeasure = (value, kind, label) => value != null && (kind === 'rating'
    ? <meter min="1" max="5" value={value} aria-label={`${label}: ${value} out of 5`} />
    : <progress max="100" value={value} aria-label={`${label}: ${value}%`} />)

  return <div className="dashboard-content reflection-workspace survey-results-workspace">
    <header className="reflection-intro"><span className="eyebrow">Before and after learning</span><h2>{mixedFormats ? 'Your learning records' : isRating ? 'Your understanding surveys' : 'Knowledge checks'}</h2><p>{mixedFormats ? 'Your original results are shown in their recorded formats.' : isRating ? 'Reflect on your understanding of software testing, from your first lesson to your final activity.' : 'Compare your recorded software testing knowledge checks.'}</p></header>
    <section className="reflection-banner" aria-label="About your results"><span className="reflection-banner-icon"><CraftIcon name="progress.svg" /></span><div><h3>{post ? 'A moment to see how far you’ve come.' : 'Your starting point is part of your story.'}</h3><p>{mixedFormats ? 'Your original pre-test score and post-test rating are both saved. They measure different things, so they are shown separately.' : isRating ? 'These are your original self-reported ratings on a 1–5 scale. They describe how you feel about your understanding and are separate from quiz scores.' : 'These percentages come from your original knowledge-check submissions.'}</p></div><span className="reflection-tag">{post ? 'Before & after' : 'Before learning'}</span></section>
    <div className="survey-comparison-cards">
      {[{ phase: 'pre', title: 'Before learning', item: pre, value: before, kind: preKind }, { phase: 'post', title: 'After learning', item: post, value: after, kind: postKind }].map(({ phase, title, item, value, kind }) => <section className="reflection-card survey-result-card" key={phase} aria-labelledby={`survey-${phase}-title`}><div className="reflection-card-heading"><span className="reflection-step">{phase === 'pre' ? '01' : '02'}</span><span className="reflection-tag">{item ? 'Recorded' : 'Pending'}</span></div><h3 id={`survey-${phase}-title`}>{title}</h3><p>{formatLabel(kind)}</p><div className="survey-result-value">{renderValue(value, kind)}</div>{renderMeasure(value, kind, title)}<small>{item ? `Submitted ${submittedDate(item.submitted_at)}` : 'Complete your learning modules to record this survey.'}</small>{!item && phase === 'post' && <button type="button" className="reflection-text-action" onClick={() => onNavigate('post-test')}>View post-test <span aria-hidden="true">→</span></button>}</section>)}
      <section className="reflection-card survey-change-card" aria-labelledby="survey-change-title"><span className="reflection-step"><CraftIcon name="learning.svg" /></span><h3 id="survey-change-title">{isRating ? 'Change in rating' : 'Score change'}</h3><p>Your original before-and-after comparison</p><div className="survey-result-value"><strong>{change == null ? '—' : signed(change)}</strong><span>{change == null ? '' : 'points'}</span></div><p>{change == null ? pre && post ? preKind !== postKind ? 'Your pre-test was a percentage score and your post-test is a 1–5 rating. Both results are shown, but they cannot be combined into one change score.' : isRating ? 'A comparison needs matching survey statements. These submissions use different statements.' : 'These results cannot be compared.' : 'Complete both surveys to see your change.' : isRating ? 'The difference in average agreement on the 1–5 scale.' : 'The difference between your two knowledge scores.'}</p></section>
    </div>
    {isRating && statementRows.length > 0 && <section className="reflection-card survey-statement-panel"><div className="reflection-section-heading"><div><span className="eyebrow">A closer look</span><h3>Your understanding by statement</h3><p>Review each original response at your own pace.</p></div><span className="reflection-tag">{statementRows.length} statements</span></div><details className="survey-statement-details"><summary>Compare statements ({statementRows.length})</summary><div className="survey-statement-table" role="region" aria-label="Your survey statement comparison" tabIndex={0}><table><caption className="sr-only">Original agreement ratings from 1 to 5. Changes are shown only for matching statements.</caption><thead><tr><th scope="col">Software testing statement</th><th scope="col">Before</th><th scope="col">After</th><th scope="col">Change</th></tr></thead><tbody>{statementRows.map((row) => { const a = preRatings.find((item) => identity(item) === identity(row)); const b = postRatings.find((item) => identity(item) === identity(row)); return <tr key={identity(row)}><th scope="row">{row.statement}</th><td>{a ? `${a.rating} / 5` : '—'}</td><td>{b ? `${b.rating} / 5` : '—'}</td><td>{a && b ? `${signed(Math.round((Number(b.rating) - Number(a.rating)) * 100) / 100)} points` : '—'}</td></tr> })}</tbody></table></div></details></section>}
    <SurveyRetakes surveys={surveys} retakes={retakes} onRetake={onRetake} loading={loading} error={error} message={message} />
  </div>
}
