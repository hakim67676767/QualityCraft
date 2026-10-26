async page => {
  const errors = [];
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  async function login(role, email) {
    await page.getByRole('button', { name: 'Sign Out' }).click();
    await page.locator('.role-' + role).click();
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('BrowserTest2026!');
    await page.getByRole('button', { name: 'Sign in & keep learning' }).click();
    await page.locator('.workspace-header h1').waitFor();
  }
  const email = `path-${Date.now()}@browser.test`;
  await page.reload();
  await page.locator('.workspace-header h1').waitFor();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login('administrator', 'admin@browser.test');
  await page.getByRole('button', { name: 'Manage Users', exact: true }).click();
  const account = page.locator('.account-create-panel');
  await account.getByRole('textbox', { name: 'Name', exact: true }).fill('Learning Path Learner');
  await account.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await account.getByLabel('Password', { exact: true }).fill('BrowserTest2026!');
  await account.getByRole('combobox', { name: 'Role', exact: true }).selectOption('student');
  await account.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByText(`Created student account for ${email}`, { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Research & Evidence', exact: true }).click();
  await page.getByRole('combobox', { name: 'Student', exact: true }).selectOption({ label: `Learning Path Learner (${email})` });
  for (const checkbox of await page.locator('.research-enrol-form').getByRole('checkbox').all()) await checkbox.check();
  await page.getByRole('button', { name: 'Create record', exact: true }).click();
  await page.getByText('Participant record created.', { exact: true }).waitFor();
  await login('student', email);
  await page.getByRole('button', { name: 'Classes', exact: true }).click();
  await page.getByRole('button', { name: 'Join class', exact: true }).click();
  await page.getByRole('heading', { name: 'Pre-test survey', exact: true }).waitFor();
  for (const group of await page.getByRole('group').all()) await group.getByRole('radio').nth(2).check();
  await page.getByRole('button', { name: 'Submit pre-test', exact: true }).click();
  await page.locator('.pre-test-page').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Learning Path', exact: true }).click();
  for (const width of [1440, 1024, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    if (await page.getByRole('button', { name: /^Start learning/ }).count() !== 1) throw new Error('Expected one visible next action at ' + width);
    const actionBox = await page.getByRole('button', { name: /^Start learning/ }).boundingBox();
    if (!actionBox || actionBox.y + actionBox.height > 1000) throw new Error('Next action is below the first screen at ' + width);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error('Roadmap overflows at ' + width);
    await page.screenshot({ path: `design-review/playwright/31-learning-roadmap-${width}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: /^Start learning/ }).click();
  await page.locator('.module-checklist').getByText('0% complete', { exact: true }).waitFor();
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error('Module overview overflows on tablet');
  await page.locator('.lesson-choice').click();
  await page.getByRole('button', { name: 'I have finished this lesson', exact: true }).click();
  await page.locator('.lesson-done').waitFor();
  await page.getByRole('button', { name: '← Back to Foundations of Quality', exact: true }).click();
  await page.locator('.module-checklist').getByText('33% complete', { exact: true }).waitFor();
  await page.getByRole('button', { name: '← Back to Learning Path', exact: true }).click();
  await page.getByRole('button', { name: 'Open activity', exact: true }).click();
  const activity = page.locator('.activity-form');
  for (const input of await activity.getByRole('textbox').all()) await input.fill('Learning path progress check');
  await activity.getByRole('button', { name: 'Save activity', exact: true }).click();
  await activity.locator('.pill').filter({ hasText: /Submitted|Saved/ }).waitFor();
  await page.getByRole('button', { name: '← Back to Foundations of Quality', exact: true }).click();
  await page.locator('.module-checklist').getByText('67% complete', { exact: true }).waitFor();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'design-review/playwright/35-module-progress.png', fullPage: true });
  await page.locator('.lesson-choice').click();
  async function answerQuiz(firstAnswer) {
    const answers = [firstAnswer, 'false', 'Peer review', 'Test plan', 'A consistent benchmark'];
    for (const [index, answer] of answers.entries()) {
      const question = page.locator('.lesson-quiz ol > li').nth(index);
      if (await question.locator('.answer-input').count()) await question.locator('.answer-input').fill(answer);
      else await question.getByRole('radio', { name: new RegExp('^' + answer + '$', 'i') }).check();
    }
  }
  await answerQuiz('Write more code');
  await page.getByRole('button', { name: 'Submit lesson quiz', exact: true }).click();
  await page.locator('.quiz-submitted').getByText(/Latest attempt: 80%/).waitFor();
  await page.getByRole('button', { name: /Return to Learning Path/ }).click();
  if (await page.locator('.path-card:disabled').count() !== 4) throw new Error('An 80% quiz unlocked the next module');
  await page.getByRole('button', { name: 'Retake Quiz', exact: true }).click();
  await answerQuiz('Prevent defects');
  await page.getByRole('button', { name: 'Submit retake', exact: true }).click();
  await page.locator('.quiz-submitted').getByText(/Latest attempt: 100%/).waitFor();
  await page.getByRole('button', { name: /Return to Learning Path/ }).click();
  if (await page.locator('.path-card[data-state="complete"]').count() !== 1 || await page.locator('.path-card[data-state="current"]').count() !== 1 || await page.locator('.path-card:disabled').count() !== 3) throw new Error('Module completion did not advance the roadmap');
  await page.screenshot({ path: 'design-review/playwright/36-advancing-learning-path.png', fullPage: true });
  await login('student', 'student@survey.test');
  await page.getByRole('button', { name: 'Learning Path', exact: true }).click();
  await page.setViewportSize({ width: 768, height: 1000 });
  await page.getByRole('button', { name: /^View survey results/ }).click();
  await page.getByRole('heading', { name: 'Your understanding surveys', exact: true }).waitFor();
  page.off('pageerror', onError);
  if (errors.length) throw new Error(JSON.stringify(errors));
  return { passed: ['visible next action at desktop/tablet widths', 'reading raises progress to 33%', 'assigned activity opens correct lesson', 'activity raises progress to 67%', '80% quiz keeps next module locked', '100% retake advances roadmap', 'completed tablet action opens survey results'], browserErrors: errors };
}
