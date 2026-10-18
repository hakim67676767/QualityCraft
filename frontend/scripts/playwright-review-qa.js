async page => {
  const errors = [];
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  async function login(role, email) {
    await page.getByRole('button', { name: 'Sign Out' }).click();
    await page.locator('.role-' + role).click();
    await page.getByRole('textbox', { name: 'Email address' }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill('BrowserTest2026!');
    await page.getByRole('button', { name: 'Sign in & keep learning' }).click();
    await page.locator('.workspace-header h1').waitFor();
  }
  await login('teacher', 'teacher@browser.test');
  await page.getByRole('button', { name: 'Monitoring', exact: true }).click();
  await page.getByRole('combobox', { name: 'Filter by class' }).selectOption({ label: 'Browser QA Class' });
  await page.locator('.review-selectors select').nth(0).selectOption({ label: 'Browser Learner · Browser QA Class' });
  await page.locator('.review-selectors select').nth(1).selectOption({ label: 'Write a test case · submitted' });
  await page.getByRole('textbox', { name: 'Teacher feedback', exact: true }).fill('Browser teacher review: clear steps and expected result.');
  await page.getByRole('button', { name: 'Save review', exact: true }).click();
  await page.locator('.review-status').filter({ hasText: 'reviewed' }).waitFor();
  await page.screenshot({ path: 'design-review/playwright/09-teacher-review.png', fullPage: true });
  for (const type of ['CSV', 'PDF']) {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export ' + type, exact: true }).click();
    await (await downloadPromise).saveAs('design-review/playwright/teacher-progress.' + type.toLowerCase());
  }
  const teacherAdminStatus = await page.evaluate(async () => (await fetch('/api/admin/research-participants')).status);
  if (teacherAdminStatus !== 403) throw new Error('Teacher gained administrator access');
  await login('student', 'student@browser.test');
  await page.getByRole('button', { name: 'Learning Path', exact: true }).click();
  await page.locator('.path-card').filter({ hasText: 'Foundations of Quality' }).click();
  await page.locator('.lesson-choice').click();
  await page.locator('.activity-review-feedback').getByText('Browser teacher review: clear steps and expected result.', { exact: true }).waitFor();
  await page.screenshot({ path: 'design-review/playwright/10-student-teacher-feedback.png', fullPage: true });
  await page.getByRole('textbox', { name: 'Test case title', exact: true }).fill('Browser revised test case');
  await page.getByRole('button', { name: 'Save activity', exact: true }).click();
  await page.locator('.activity-review-feedback').waitFor({ state: 'hidden' });
  if ((await page.locator('.activity-heading .pill').innerText()) === 'Reviewed') throw new Error('Changed work retained its old review');
  const studentAdminStatus = await page.evaluate(async () => (await fetch('/api/admin/assessment-instruments')).status);
  if (studentAdminStatus !== 403) throw new Error('Student gained administrator access');
  await login('administrator', 'admin@browser.test');
  await page.getByRole('button', { name: 'Research & Evidence', exact: true }).click();
  await page.locator('.research-metrics > div').nth(2).getByText('1', { exact: true }).waitFor();
  await page.getByRole('heading', { name: 'Suitability ratings', exact: true }).waitFor();
  await page.getByText('6 item ratings · average 5 / 5', { exact: true }).waitFor();
  await page.screenshot({ path: 'design-review/playwright/11-paired-research-results.png', fullPage: true });
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  await (await downloadPromise).saveAs('design-review/playwright/anonymised-research.csv');
  const row = page.getByRole('row').filter({ hasText: 'Browser Learner' });
  await row.getByRole('combobox').selectOption('withdrawn');
  await row.getByRole('button', { name: 'Save approvals' }).click();
  await page.getByText('Participant approvals and status updated.', { exact: true }).waitFor();
  await page.locator('.research-metrics > div').nth(2).getByText('0', { exact: true }).waitFor();
  await page.screenshot({ path: 'design-review/playwright/12-withdrawn-excluded.png', fullPage: true });
  await row.getByRole('combobox').selectOption('authorised');
  await row.getByRole('button', { name: 'Save approvals' }).click();
  await page.locator('.research-metrics > div').nth(2).getByText('1', { exact: true }).waitFor();
  page.off('pageerror', onError);
  if (errors.length) throw new Error(JSON.stringify(errors));
  return { passed: ['student/activity review dropdowns', 'save teacher feedback', 'teacher CSV/PDF downloads', 'student receives feedback', 'revised work invalidates old review', 'teacher/student admin restrictions', 'paired results and suitability display', 'anonymised CSV download', 'withdrawn participant excluded from results'], browserErrors: errors };
}
