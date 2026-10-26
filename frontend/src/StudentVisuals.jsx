import { StudentVisualContext } from './studentVisualContext'

export function StudentVisuals({ children, enabled = true }) {
  return <StudentVisualContext.Provider value={enabled}>{children}</StudentVisualContext.Provider>
}

export function EntryFeatures() {
  return <ul className="entry-features" aria-label="How you learn with QualityCraft">
    <li><TrailIcon name="learning.svg" /><div><strong>Bite-sized lessons</strong><small>Learn at your own pace</small></div></li>
    <li><TrailIcon name="quiz.svg" /><div><strong>Hands-on challenges</strong><small>Put learning into practice</small></div></li>
    <li><TrailIcon name="badges.svg" /><div><strong>Badges &amp; XP</strong><small>See your progress grow</small></div></li>
  </ul>
}

export function TestingPreview() {
  return <div className="testing-preview" aria-hidden="true"><div className="testing-preview-tab"><TrailIcon name="quiz.svg" /><span>quality-check.test.js</span></div><pre><span className="code-keyword">test</span>{"('a better experience', () => {\n"}<span className="code-indent">const expected = 'quality';</span>{"\n"}<span className="code-indent"><span className="code-keyword">expect</span>(actual).toBe(expected);</span>{"\n});"}</pre><div className="testing-preview-flow"><span>Plan</span><span>Test</span><span>Improve</span></div></div>
}

export function StudentLoading({ workspace = false }) {
  return <main className="student-loading" role="status" aria-live="polite"><div className="student-loading-brand"><QualityMark /><span>QualityCraft</span></div><h1>Loading QualityCraft…</h1><p>{workspace ? 'Getting your workspace ready.' : 'Getting things ready for you.'}</p></main>
}

export function TrailIcon({ name, alt = '' }) {
  const paths = {
    'dashboard.svg': 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    'learning.svg': 'M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15',
    'progress.svg': 'M4 20V10m8 10V4m8 16v-7 M2 21h20',
    'badges.svg': 'm9 14-2 7 5-3 5 3-2-7 M18 8a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z',
    'classes.svg': 'M3 21V8l9-5 9 5v13H3Zm6 0v-6h6v6 M7 9h1m8 0h1M7 12h1m8 0h1',
    'quiz.svg': 'M8 4H5v17h14V4h-3 M8 2h8v5H8z M8 12h8m-8 4h5',
    'profile.svg': 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
    'student.svg': 'm2 8 10-5 10 5-10 5-10-5Zm4 3v6c4 3 8 3 12 0v-6 M22 8v8',
    'teacher.svg': 'M3 3h18v13H3z M12 16v5m-5 0h10 M7 11l3-3 3 2 4-4',
    'admin.svg': 'm12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Zm-3 9 2 2 4-4',
    'shield.svg': 'm12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Zm-3 9 2 2 4-4',
    'celebrate.svg': 'M8 3v4m8-4v4M3 8h18v4H3z M5 12v9h14v-9 M12 8v13 M12 8C4 8 6 0 10 4l2 4Zm0 0c8 0 6-8 2-4l-2 4Z',
    'lock.svg': 'M6 10h12v11H6z M8 10V6a4 4 0 0 1 8 0v4 M12 14v3',
    'signout.svg': 'M9 3H4v18h5 M10 12h11m-4-4 4 4-4 4',
    'check.svg': 'm5 12 4 4L19 6',
  }
  return <svg className="trail-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}><path d={paths[name] || paths['learning.svg']} /></svg>
}

export function QualityMark() {
  return <svg className="quality-mark" width="30" height="30" viewBox="0 0 30 30" fill="currentColor" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" d="M7 7h16v16H7z M12 12h6v6h-6z M11 3v4m8-4v4M11 23v4m8-4v4M3 11h4m-4 8h4m16-8h4m-4 8h4" /></svg>
}
