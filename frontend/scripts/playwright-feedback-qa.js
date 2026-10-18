// Standalone: use a fresh browser-qa-server.js temporary installation.
async page => {
  const errors = [];
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  await page.context().clearCookies();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://127.0.0.1:4179/');
  await page.evaluate(async () => {
    async function api(path, method = 'GET', body) {
      const response = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
      const data = await response.json();
      if (!response.ok) throw new Error(path + ': ' + response.status + ' ' + data.message);
      return data;
    }
    const password = 'BrowserTest2026!';
    await api('/api/auth/login', 'POST', { email: 'admin@browser.test', password });
    await api('/api/management/users', 'POST', { name: 'Feedback Teacher', email: 'teacher@feedback.test', password, role: 'teacher' });
    const student = await api('/api/management/users', 'POST', { name: 'Feedback Learner', email: 'student@feedback.test', password, role: 'student' });
    await api('/api/admin/research-participants', 'POST', { userId: student.id, guardianConsent: true, studentAssent: true, schoolPermission: true });
    const modules = await api('/api/admin/modules');
    const foundation = modules.find(module => module.title === 'Foundations of Quality');
    const lessons = await api('/api/admin/lessons?moduleId=' + foundation.module_id);
    const questions = await api('/api/admin/questions?lessonId=' + lessons[0].lesson_id);
    await api('/api/admin/questions/' + questions[1].question_id, 'PATCH', { explanation: 'Quality is a shared responsibility across the whole team.' });
    await api('/api/admin/questions/' + questions[3].question_id, 'PATCH', { explanation: 'A test plan describes the scope, approach, and resources for testing.' });
    await api('/api/auth/login', 'POST', { email: 'teacher@feedback.test', password });
    const classroom = await api('/api/classes', 'POST', { name: 'Feedback QA Class' });
    await api('/api/auth/login', 'POST', { email: 'student@feedback.test', password });
    await api('/api/classes/' + classroom.classId + '/join', 'POST', {});
    const pre = await api('/api/pre-test');
    await api('/api/pre-test', 'POST', { assessmentToken: pre[0].assessmentToken, answers: pre.map(() => '3') });
  });
  await page.reload();
  await page.locator('.workspace-header h1').waitFor();
  await page.getByRole('button', { name: 'Learning Path', exact: true }).click();
  await page.locator('.path-card').filter({ hasText: 'Foundations of Quality' }).click();
  await page.locator('.lesson-choice').click();
  await page.getByRole('button', { name: 'I have finished this lesson', exact: true }).click();
  await page.locator('.lesson-done').waitFor();
  const activity = page.locator('.activity-form');
  for (const field of await activity.getByRole('textbox').all()) await field.fill('Feedback QA practical response');
  await activity.getByRole('button', { name: 'Save activity', exact: true }).click();
  await activity.locator('.pill').filter({ hasText: /Submitted|Saved/ }).waitFor();
  async function answerQuiz(answers, retake = false) {
    for (const [index, answer] of answers.entries()) {
      const item = page.locator('.lesson-quiz > ol > li').nth(index);
      if (await item.locator('.answer-input').count()) await item.locator('.answer-input').fill(answer);
      else await item.getByRole('radio', { name: new RegExp('^' + answer + '$', 'i') }).check();
    }
    await page.getByRole('button', { name: retake ? 'Submit retake' : 'Submit lesson quiz', exact: true }).click();
    await page.getByRole('region', { name: 'Answer feedback', exact: true }).waitFor();
    const rewardNotice = page.getByRole('button', { name: 'Dismiss reward notification', exact: true });
    if (await rewardNotice.count()) await rewardNotice.click();
  }
  const longAnswer = 'Unrelated answer ' + 'very-long-answer-'.repeat(18);
  await answerQuiz(['Prevent defects', 'false', 'Code deployment', longAnswer, 'A consistent benchmark']);
  const feedback = page.getByRole('region', { name: 'Answer feedback', exact: true });
  const cards = feedback.locator('.quiz-feedback-card');
  if (await cards.count() !== 5) throw new Error('Missing question feedback');
  await feedback.getByText(/3 correct$/).waitFor();
  await feedback.getByText(/2 to review$/).waitFor();
  if (await feedback.locator('.quiz-feedback-card[data-correct="true"]').count() !== 3) throw new Error('Correct state is inaccurate');
  if (await feedback.locator('.quiz-feedback-card[data-correct="false"]').count() !== 2) throw new Error('Review state is inaccurate');
  if (await cards.nth(1).locator('dd').innerText() !== 'False') throw new Error('Boolean answer presentation is inconsistent');
  if (await cards.nth(3).locator('dd').first().innerText() !== longAnswer) throw new Error('Long submitted answer was changed or truncated');
  await cards.nth(3).getByText('Test plan', { exact: true }).waitFor();
  for (const explanation of ['Quality is a shared responsibility across the whole team.', 'A test plan describes the scope, approach, and resources for testing.']) await feedback.getByText(explanation, { exact: true }).waitFor();
  if ((await feedback.innerText()).includes('Re-read this concept in the lesson before retrying')) throw new Error('Legacy generic retry message is still visible');
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const width of [1440, 1024, 768]) {
      await page.setViewportSize({ width, height: 1000 });
      await feedback.evaluate(element => element.scrollIntoView({ block: 'start' }));
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error('Feedback overflows at ' + width);
      const contrastIssues = await feedback.evaluate(root => {
        const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
        const luminance = value => rgb(value).map(channel => { channel /= 255; return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4; }).reduce((sum, channel, i) => sum + channel * [0.2126, 0.7152, 0.0722][i], 0);
        return [...root.querySelectorAll('h3,h4,dt,dd,p,.quiz-feedback-status,.quiz-feedback-number,.quiz-feedback-counts > span,a')].flatMap(element => {
          let parent = element;
          while (parent && ['rgba(0, 0, 0, 0)', 'transparent'].includes(getComputedStyle(parent).backgroundColor)) parent = parent.parentElement;
          const background = parent ? getComputedStyle(parent).backgroundColor : 'rgb(255,255,255)';
          const foreground = getComputedStyle(element).color;
          const a = luminance(foreground), b = luminance(background);
          const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          return ratio < 4.5 ? [{ text: element.textContent.slice(0, 45), ratio }] : [];
        });
      });
      if (contrastIssues.length) throw new Error('Insufficient feedback contrast: ' + JSON.stringify(contrastIssues));
      if (scheme === 'light') await feedback.screenshot({ path: `design-review/playwright/46-feedback-mixed-${width}.png` });
    }
  }
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await feedback.evaluate(element => element.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: 'design-review/playwright/46-feedback-viewport.png' });
  const review = feedback.getByRole('link', { name: 'Review the lesson', exact: false });
  await review.focus();
  await page.keyboard.press('Enter');
  if (await page.evaluate(() => location.hash) !== '#lesson-reading') throw new Error('Keyboard lesson review link failed');
  await page.getByRole('button', { name: /Return to Learning Path/ }).click();
  await page.getByRole('button', { name: 'Retake Quiz', exact: true }).click();
  await answerQuiz(['Prevent defects', 'false', 'Peer review', 'Test plan', 'A consistent benchmark'], true);
  await feedback.getByText(/5 correct$/).waitFor();
  await feedback.getByText(/0 to review$/).waitFor();
  if (await feedback.locator('.quiz-feedback-card[data-correct="false"]').count()) throw new Error('Retake retained stale incorrect feedback');
  if (await feedback.getByRole('link', { name: /Review the lesson/ }).count()) throw new Error('Perfect attempt still shows retry advice');
  if (await feedback.locator('.quiz-feedback-answer').count() !== 5) throw new Error('Correct answers are duplicated');
  await feedback.screenshot({ path: 'design-review/playwright/46-feedback-perfect.png' });
  // A worse retake keeps the best grade, including after a full page reload.
  await page.getByRole('button', { name: /Return to Learning Path/ }).click();
  await page.getByRole('button', { name: 'Retake Quiz', exact: true }).click();
  await answerQuiz(['Prevent defects', 'false', 'Code deployment', 'Wrong test document', 'A consistent benchmark'], true);
  await page.locator('.quiz-submitted').getByText(/Best score: 100%/).waitFor();
  await page.locator('.quiz-submitted').getByText(/Latest attempt: 60%.*3\/5 correct/).waitFor();
  if (await feedback.locator('.quiz-feedback-card[data-correct="false"]').count() !== 2) throw new Error('Feedback does not match the lower retake');
  const retained = await page.evaluate(async () => {
    const dashboard = await (await fetch('/api/dashboard')).json();
    const journey = await (await fetch('/api/me/journey')).json();
    return { scores: dashboard.attempts.map(attempt => Number(attempt.score)), completed: journey.completedModuleIds.length };
  });
  if (retained.scores.join(',') !== '60,100,60' || retained.completed !== 1) throw new Error('Saved attempts or completion changed: ' + JSON.stringify(retained));
  await page.getByRole('button', { name: /Return to Learning Path/ }).click();
  await page.locator('.path-retake').getByText('Best quiz: 100%', { exact: true }).waitFor();
  await page.reload();
  await page.getByRole('button', { name: 'Learning Path', exact: true }).click();
  await page.locator('.path-retake').getByText('Best quiz: 100%', { exact: true }).waitFor();
  await page.locator('.path-card').filter({ hasText: 'Foundations of Quality' }).click();
  await page.locator('.lesson-choice').getByText('Best quiz score: 100%', { exact: true }).waitFor();
  if (await page.locator('.module-checklist').innerText().then(text => !text.includes('1/1'))) throw new Error('Best-score checklist regressed');
  await page.locator('.lesson-choice').click();
  await page.locator('.quiz-submitted').getByText(/Best score: 100%/).waitFor();
  await page.locator('.quiz-submitted').getByText(/Latest attempt: 60%/).waitFor();
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  const quizAverage = page.locator('.student-stat-grid').getByText('Quiz average', { exact: true }).locator('..');
  if (!(await quizAverage.innerText()).includes('100%')) throw new Error('Dashboard average fell after a lower retake');
  await page.getByRole('button', { name: 'Progress', exact: true }).click();
  await page.getByRole('region', { name: 'Quiz attempt history', exact: true }).getByRole('cell', { name: '60%', exact: true }).first().waitFor();
  // Another retake must reference the latest attempt, even though its score is lower.
  await page.getByRole('button', { name: 'Learning Path', exact: true }).click();
  await page.getByRole('button', { name: 'Retake Quiz', exact: true }).click();
  await answerQuiz(['Prevent defects', 'false', 'Peer review', 'Test plan', 'A consistent benchmark'], true);
  await page.locator('.quiz-submitted').getByText(/Best score: 100%/).waitFor();
  page.off('pageerror', onError);
  if (errors.length) throw new Error(JSON.stringify(errors));
  return { passed: ['real quiz submission with mixed results', 'teal correct answers and amber review answers', 'separate submitted/correct values', 'consistent true/false casing', 'long answer wrapping', 'authored explanations retained', 'generic retry text removed', 'WCAG AA text contrast in light/dark at 1440/1024/768', 'keyboard lesson review link', 'all-correct retake without stale advice', 'highest score retained after a lower retake and reload', 'dashboard averages best score per quiz', 'attempt history and completion preserved', 'repeat retakes reference latest attempt'], browserErrors: errors };
}
