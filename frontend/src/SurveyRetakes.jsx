function timestamp(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date not recorded' : date.toLocaleString()
}

export default function SurveyRetakes({ surveys, retakes = [], onRetake, loading, error, message }) {
  return <section className="panel survey-retake-panel" aria-labelledby="survey-retake-heading">
    <div><span className="eyebrow">Another chance to reflect</span><h3 id="survey-retake-heading">Retake your surveys</h3><p>You can answer the current software-testing survey again. Your original submissions and learning progress are kept. Retakes are saved separately and earn no extra XP.</p></div>
    <div className="survey-retake-actions">{[['pre', 'pre-test'], ['post', 'post-test']].map(([phase, label]) => <button type="button" className="secondary-small" key={phase} disabled={Boolean(loading) || !surveys.some((item) => item.phase === phase)} onClick={() => onRetake(phase)}>{loading === phase ? 'Loading survey…' : `Retake ${label} survey`}</button>)}</div>
    {!surveys.some((item) => item.phase === 'post') && <small>Complete the original post-test survey after your learning modules to unlock its retake.</small>}
    {error && <p className="error-message" role="alert">{error}</p>}{message && <p className="survey-retake-saved" role="status">{message}</p>}
    {retakes.length > 0 && <details className="survey-retake-history" open><summary>Saved retakes ({retakes.length})</summary><p>These show your understanding when you retook the survey. Original responses are used for the before/after study comparison.</p><div className="research-table-wrap" role="region" aria-label="Survey retake history" tabIndex="0"><table><thead><tr><th scope="col">Survey</th><th scope="col">Average agreement</th><th scope="col">Version</th><th scope="col">Submitted</th></tr></thead><tbody>{retakes.map((item) => <tr key={item.assessment_attempt_id}><th scope="row">{item.phase === 'pre' ? 'Pre-test retake' : 'Post-test retake'}</th><td>{Number(item.rating_mean)} / 5</td><td>{item.version || 'Earlier version'}</td><td><time dateTime={item.submitted_at}>{timestamp(item.submitted_at)}</time></td></tr>)}</tbody></table></div></details>}
  </section>
}
