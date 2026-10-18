async page => {
  const errors = [];
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const review = page.locator('.practical-review');
  const student = review.getByRole('combobox', { name: 'Student', exact: true });
  const activity = review.getByRole('combobox', { name: 'Activity', exact: true });
  await student.selectOption({ label: 'Browser Learner · Browser QA Class' });
  await activity.selectOption({ label: 'Write a test case · submitted' });
  const awaiting = page.locator('.monitoring-metrics .metric-card').filter({ hasText: 'Activities to review' }).locator('strong');
  const before = Number(await awaiting.innerText());
  await review.getByRole('textbox', { name: 'Teacher feedback', exact: true }).fill('UI review: clear test data; add a specific expected result.');
  await review.getByRole('button', { name: 'Save review', exact: true }).click();
  await review.getByRole('status').getByText('Review saved. The student can now see your feedback.', { exact: true }).waitFor();
  if (Number(await awaiting.innerText()) !== before - 1) throw new Error('Review count did not refresh after saving');
  await page.locator('.monitoring-row').getByText(`${before - 1} awaiting review`, { exact: true }).waitFor();
  // Saving an existing review also works without editing its text.
  await review.getByRole('button', { name: 'Save review', exact: true }).click();
  await review.getByRole('status').waitFor();
  const reviewBeforeProgress = await page.evaluate(() => Boolean(document.querySelector('.practical-review').compareDocumentPosition(document.querySelector('.monitoring-panel')) & Node.DOCUMENT_POSITION_FOLLOWING));
  if (!reviewBeforeProgress) throw new Error('Review must precede progress in document order');
  await page.screenshot({ path: 'design-review/playwright/16-focused-review.png', fullPage: true });
  await page.getByRole('combobox', { name: 'Filter by class' }).selectOption({ label: 'Browser QA Class' });
  await student.waitFor();
  if (await student.inputValue() || await activity.inputValue() || !await activity.isDisabled()) throw new Error('Changing class retained the old review selection');
  if (await page.locator('.selected-submission').count()) throw new Error('Old submission still shown after changing class');
  await page.locator('.monitoring-suitability summary').click();
  await page.getByText('1 student responses · average ratings out of 5', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.locator('.staff-hero').waitFor();
  await page.screenshot({ path: 'design-review/playwright/17-teacher-dashboard.png', fullPage: true });
  await page.getByRole('button', { name: 'Sign Out' }).click();
  await page.locator('.role-administrator').click();
  await page.getByLabel('Email address').fill('admin@browser.test');
  await page.getByLabel('Password', { exact: true }).fill('BrowserTest2026!');
  await page.getByRole('button', { name: 'Sign in & keep learning' }).click();
  await page.locator('.staff-hero').waitFor();
  await page.screenshot({ path: 'design-review/playwright/18-admin-dashboard.png', fullPage: true });
  await page.getByRole('button', { name: 'Research & Evidence', exact: true }).click();
  await page.locator('.research-enrol-form select option').filter({ hasText: 'Browser Signup' }).waitFor({ state: 'attached' });
  for (const [name, target] of [['Assessments', 'research-assessments'], ['Results and exports', 'research-results'], ['Settings and audit', 'research-settings'], ['Participants', 'research-participants']]) {
    const link = page.getByRole('navigation', { name: 'Research sections' }).getByRole('link', { name });
    await link.focus();
    await page.keyboard.press('Enter');
    if (!page.url().endsWith('#' + target)) throw new Error('Section shortcut failed: ' + name);
    if (await page.evaluate(() => document.activeElement.id) !== target) throw new Error('Section shortcut did not move keyboard focus: ' + name);
  }
  const checkboxes = await page.locator('.research-check input').evaluateAll(inputs => inputs.map(input => ({ width: input.getBoundingClientRect().width, height: input.getBoundingClientRect().height })));
  if (!checkboxes.length || checkboxes.some(box => box.width < 14 || box.width > 20 || box.height < 14 || box.height > 20)) throw new Error('Consent checkbox sizing is inconsistent');
  await page.screenshot({ path: 'design-review/playwright/19-research-workspace.png', fullPage: true });
  page.off('pageerror', onError);
  if (errors.length) throw new Error(JSON.stringify(errors));
  return { passed: ['review confirmation and live counts', 'resave unchanged review', 'review first in document order', 'class change clears review', 'expand survey details', 'teacher and admin dashboard previews', 'keyboard section shortcuts', 'consent checkbox sizing'], browserErrors: errors };
}
