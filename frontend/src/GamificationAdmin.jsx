import { useCallback, useEffect, useState } from 'react'
import { api } from './lib/api'
import BadgeMedal from './BadgeMedal'

const initialBadge = { name: '', criteriaType: 'quiz_attempt_count', threshold: 1, description: '' }
const criteria = ['class_join', 'quiz_attempt_count', 'perfect_quiz', 'activity_count', 'module_count', 'module_count_all', 'post_test_count', 'xp_threshold']

export default function GamificationAdmin() {
  const [rules, setRules] = useState([])
  const [badges, setBadges] = useState([])
  const [badge, setBadge] = useState(initialBadge)
  const [message, setMessage] = useState('')
  const reload = useCallback(async () => {
    const [ruleRows, badgeRows] = await Promise.all([api.get('/api/admin/rules'), api.get('/api/admin/badges')])
    setRules(ruleRows); setBadges(badgeRows)
  }, [])
  useEffect(() => { Promise.resolve().then(reload).catch((error) => setMessage(error.message)) }, [reload])
  async function saveRule(item) {
    try { await api.patch(`/api/admin/rules/${item.rule_id}`, { xpAmount: Number(item.xp_amount), isActive: Boolean(item.is_active) }); await reload(); setMessage('XP rule saved.') }
    catch (error) { setMessage(error.message) }
  }
  async function createBadge(event) {
    event.preventDefault()
    try { await api.post('/api/admin/badges', badge); setBadge(initialBadge); await reload(); setMessage('Badge created.') }
    catch (error) { setMessage(error.message) }
  }
  async function toggleBadge(item) {
    try { await api.patch(`/api/admin/badges/${item.badge_id}`, { isActive: !item.is_active }); await reload(); setMessage('Badge updated.') }
    catch (error) { setMessage(error.message) }
  }
  return <div className="dashboard-content"><div className="section-intro"><div><span className="eyebrow">Administrator</span><h2>XP and badges</h2><p>Set rewards and manage the milestones learners can earn.</p></div></div>{message && <p className="panel admin-message" role="status">{message}</p>}
    <div className="admin-columns"><section className="panel admin-editor"><h3>XP rules</h3>{rules.map((item) => <div className="admin-list-item" key={item.rule_id}><strong>{item.name}</strong><small>{item.code}</small><div className="admin-actions"><label>XP<input type="number" min="0" value={item.xp_amount} onChange={(event) => setRules((current) => current.map((rule) => rule.rule_id === item.rule_id ? { ...rule, xp_amount: event.target.value } : rule))} /></label><label><input type="checkbox" checked={Boolean(item.is_active)} onChange={(event) => setRules((current) => current.map((rule) => rule.rule_id === item.rule_id ? { ...rule, is_active: event.target.checked } : rule))} /> Active</label><button type="button" className="secondary-small" onClick={() => saveRule(item)}>Save</button></div></div>)}</section>
      <section className="panel admin-editor"><h3>Badges</h3>{badges.map((item) => <div className="admin-list-item admin-badge-item" data-active={Boolean(item.is_active)} key={item.badge_id}><BadgeMedal badge={item} /><div><strong>{item.name}</strong><small>{item.criteria || `${item.criteria_type.replaceAll('_', ' ')} · ${item.criteria_threshold}`}</small></div><button type="button" className="secondary-small" onClick={() => toggleBadge(item)}>{item.is_active ? 'Deactivate' : 'Activate'}</button></div>)}<form onSubmit={createBadge}><h3>Add badge</h3><div className="admin-badge-preview" aria-label="Badge preview"><BadgeMedal badge={{ name: badge.name, criteria_type: badge.criteriaType }} /><div><h4>{badge.name || 'Your new achievement'}</h4><p>{badge.description || 'Set a milestone and give your learners something to work towards.'}</p></div></div><label>Name<input value={badge.name} onChange={(event) => setBadge({ ...badge, name: event.target.value })} required /></label><label>Milestone<select value={badge.criteriaType} onChange={(event) => setBadge({ ...badge, criteriaType: event.target.value })}>{criteria.map((item) => <option value={item} key={item}>{item.replaceAll('_', ' ')}</option>)}</select></label><label>Threshold<input type="number" min="1" value={badge.threshold} onChange={(event) => setBadge({ ...badge, threshold: Number(event.target.value) })} required /></label><label>Description<textarea value={badge.description} onChange={(event) => setBadge({ ...badge, description: event.target.value })} /></label><button className="primary-small">Add badge</button></form></section></div>
  </div>
}
