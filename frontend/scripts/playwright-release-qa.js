// Run after playwright-understanding-survey-qa.js in the same temporary server.
async page => {
  const errors = [];
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  await page.setViewportSize({ width: 1440, height: 1000 });
  async function login(role, email) {
    await page.getByRole('button', { name: /Sign Out/ }).click();
    await page.locator('.role-' + role).click();
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('BrowserTest2026!');
    await page.getByRole('button', { name: 'Sign in & keep learning' }).click();
    await page.locator('.workspace-header h1').waitFor();
  }
  await login('teacher', 'teacher@survey.test');
  await page.getByRole('button', { name: 'Assignments', exact: true }).click();
  await page.getByRole('combobox', { name: 'Class', exact: true }).selectOption({ label: 'Survey QA Class' });
  if (!await page.locator('.assignment-table').getByText('Write a test case', { exact: true }).count()) {
  await page.getByRole('combobox', { name: 'Practical activity', exact: true }).selectOption({ label: 'Write a test case' });
  await page.getByLabel('Due date').fill('2026-12-01T12:00');
  await page.getByRole('button', { name: 'Assign activity', exact: true }).click();
  await page.getByText('Activity assigned successfully.', { exact: true }).waitFor();
  await page.locator('.assignment-table').getByText('Write a test case', { exact: true }).waitFor();
  }
  await page.getByRole('button', { name: 'Monitoring', exact: true }).click();
  await page.getByRole('combobox', { name: 'Filter by class' }).selectOption({ label: 'Survey QA Class' });
  await page.locator('.review-selectors select').nth(0).selectOption({ label: 'Survey Learner · Survey QA Class' });
  const activitySelect = page.locator('.review-selectors select').nth(1);
  await activitySelect.selectOption(await activitySelect.locator('option').filter({ hasText: /^Write a test case ·/ }).getAttribute('value'));
  const feedback = 'Release check: clear steps and expected result.';
  await page.getByRole('textbox', { name: 'Teacher feedback', exact: true }).fill(feedback);
  await page.getByRole('button', { name: 'Save review', exact: true }).click();
  await page.locator('.review-status').filter({ hasText: 'reviewed' }).waitFor();
  for (const type of ['CSV', 'PDF']) {
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export ' + type, exact: true }).click();
    const download = await pending;
    await download.saveAs('design-review/playwright/release-teacher-progress.' + type.toLowerCase());
    if (await download.failure()) throw new Error('Failed ' + type + ' export');
  }
  if (await page.evaluate(async () => (await fetch('/api/admin/research-participants')).status) !== 403) throw new Error('Teacher entered administrator API');
  await login('student', 'student@survey.test');
  await page.getByRole('button', { name: 'Learning Path', exact: true }).click();
  await page.getByRole('region', { name: 'Class assignments', exact: true }).getByText('Write a test case', { exact: true }).waitFor();
  await page.locator('.path-card').filter({ hasText: 'Foundations of Quality' }).click();
  await page.locator('.lesson-choice').click();
  await page.locator('.activity-review-feedback').getByText(feedback, { exact: true }).waitFor();
  await page.getByRole('textbox', { name: 'Test case title', exact: true }).fill('Release check revised test case');
  await page.getByRole('button', { name: 'Save activity', exact: true }).click();
  await page.locator('.activity-review-feedback').waitFor({ state: 'hidden' });
  for (const endpoint of ['/api/admin/assessment-instruments', '/api/management/reports/students']) {
    if (await page.evaluate(async endpoint => (await fetch(endpoint)).status, endpoint) !== 403) throw new Error('Student entered staff API');
  }
  await page.getByRole('button', { name: 'Badges', exact: true }).click();
  await page.locator('.achievement-card').first().waitFor();
  const data = await page.evaluate(async () => (await fetch('/api/dashboard')).json());
  if (await page.locator('.achievement-card').count() !== data.badges.length || data.badges.length < 8) throw new Error('Earned badges disagree with saved achievements');
  await page.getByRole('combobox', { name: 'Sort badges' }).selectOption('name');
  const names = await page.locator('.achievement-card h3').allTextContents();
  if (names.join('|') !== [...names].sort((a, b) => a.localeCompare(b)).join('|')) throw new Error('Badge sort failed');
  await page.reload();
  await page.locator('.workspace-header h1').waitFor();
  await page.getByRole('button', { name: /Sign Out/ }).click();
  if (await page.evaluate(async () => (await fetch('/api/me')).status) !== 401) throw new Error('Logout left an authenticated session');
  page.off('pageerror', onError);
  if (errors.length) throw new Error(JSON.stringify(errors));
  return { passed: ['teacher assignment with due date reaches student', 'student/activity review dropdowns', 'saved teacher feedback reaches student', 'revision clears obsolete review', 'teacher CSV/PDF downloads', 'student and teacher role restrictions', 'earned badges and sorting', 'session reload and logout'], browserErrors: errors };
}
