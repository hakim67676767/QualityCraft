import './badges.css'

const knownBadges = {
  'First Steps': 'class_join',
  'Quiz Rookie': 'quiz_attempt_count',
  'Perfect Score': 'perfect_quiz',
  'Activity Explorer': 'activity_count',
  'Module Master': 'module_count',
  'Course Champion': 'module_count_all',
  'Post-Test Finisher': 'post_test_count',
  'XP Collector': 'xp_threshold',
}

const categories = {
  class_join: 'Community', quiz_attempt_count: 'Quiz practice', perfect_quiz: 'Precision',
  activity_count: 'Practical skills', module_count: 'Learning milestone', module_count_all: 'Course mastery',
  post_test_count: 'Final assessment', xp_threshold: 'Dedication',
}

export function BadgeCategory({ badge }) {
  return categories[badge.criteria_type || knownBadges[badge.name]] || 'Achievement'
}

function MedalSymbol({ type }) {
  switch (type) {
    case 'class_join': return <><path d="M49 72V35m0 2c10-8 18 8 30 0v24c-12 8-20-8-30 0" /><path d="M42 75h15" /></>
    case 'quiz_attempt_count': return <><circle cx="60" cy="55" r="19" /><circle cx="60" cy="55" r="11" /><circle cx="60" cy="55" r="3" fill="currentColor" /><path d="m62 53 20-20m-8 1 8-1-1 8" /></>
    case 'perfect_quiz': return <path d="m60 33 7 14 16 3-11 11 2 16-14-8-14 8 2-16-11-11 16-3 7-14Z" fill="var(--medal-symbol-fill)" />
    case 'activity_count': return <><circle cx="60" cy="55" r="20" /><path d="m70 44-5 17-15 5 5-17 15-5Z" fill="var(--medal-symbol-fill)" /><path d="m57 58 6-6M60 29v3m0 46v3M34 55h3m46 0h3" /></>
    case 'module_count': return <><path d="m38 49 22-13 22 13-22 13-22-13Z" fill="var(--medal-symbol-fill)" /><path d="m38 59 22 13 22-13M38 69l22 13 22-13" /></>
    case 'module_count_all': return <><path d="M47 35h26v15c0 12-6 18-13 18s-13-6-13-18V35Z" fill="var(--medal-symbol-fill)" /><path d="M47 40H37v7c0 10 6 14 14 14m22-21h10v7c0 10-6 14-14 14M60 68v10m-12 2h24M55 45h10" /></>
    case 'post_test_count': return <><path d="m60 32 20 8v16c0 14-20 24-20 24S40 70 40 56V40l20-8Z" fill="var(--medal-symbol-fill)" /><path d="m49 55 8 8 15-17" /></>
    case 'xp_threshold': return <path d="m65 30-25 30h18l-3 22 25-31H62l3-21Z" fill="var(--medal-symbol-fill)" />
    default: return <><path d="m60 34 6 12 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2 6-12Z" fill="var(--medal-symbol-fill)" /><path d="M36 37v8m-4-4h8m40 27v8m-4-4h8" /></>
  }
}

export default function BadgeMedal({ badge = {} }) {
  const type = badge.criteria_type || knownBadges[badge.name] || 'achievement'
  return <svg className="badge-medal" data-kind={type} viewBox="0 0 120 142" fill="none" aria-hidden="true" focusable="false">
    <path d="m33 83-9 47 19-8 12 15 8-44m24-10 9 47-19-8-12 15-8-44" fill="var(--medal-ribbon)" stroke="var(--medal-ribbon-edge)" strokeWidth="2" strokeLinejoin="round" />
    <path d="m37 95-5 22 12-4 8 9 5-24m26-3 5 22-12-4-8 9-5-24" stroke="var(--medal-ribbon-highlight)" strokeWidth="2" />
    <path d="m60 4 12 5 13 1 8 11 11 8 1 13 5 13-5 13-1 13-11 8-8 11-13 1-12 5-12-5-13-1-8-11-11-8-1-13-5-13 5-13 1-13 11-8 8-11 13-1 12-5Z" fill="var(--medal-edge)" stroke="var(--medal-outline)" strokeWidth="2" />
    <circle cx="60" cy="55" r="42" fill="var(--medal-face)" stroke="var(--medal-outline)" strokeWidth="1.5" />
    <circle cx="60" cy="55" r="35" stroke="var(--medal-detail)" strokeWidth="1" />
    <path d="M30 39a34 34 0 0 1 22-17m38 49a34 34 0 0 1-22 17" stroke="white" strokeWidth="3" strokeLinecap="round" />
    <g fill="var(--medal-outline)"><circle cx="60" cy="16" r="2" /><circle cx="21" cy="55" r="2" /><circle cx="99" cy="55" r="2" /><circle cx="60" cy="94" r="2" /></g>
    <g stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><MedalSymbol type={type} /></g>
  </svg>
}
