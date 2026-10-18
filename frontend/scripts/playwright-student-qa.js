async page => {
  const errors = [];
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  await page.getByRole('button', { name: 'Sign Out' }).click();
  await page.locator('.role-student').click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('student@browser.test');
  await page.getByLabel('Password', { exact: true }).fill('BrowserTest2026!');
  await page.getByRole('button', { name: 'Sign in & keep learning' }).click();
  await page.getByRole('button', { name: 'Classes', exact: true }).click();
  await page.getByRole('button', { name: 'Join class', exact: true }).click();
  await page.getByRole('heading', { name: 'Pre-test', exact: true }).waitFor();
  await page.getByRole('radio', { name: 'Prevent defects', exact: true }).check();
  await page.screenshot({ path: 'design-review/playwright/04-published-pre-test.png', fullPage: true });
  await page.getByRole('button', { name: 'Submit pre-test', exact: true }).click();
  await page.locator('.pre-test-page').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Learning Path', exact: true }).click();
  await page.getByRole('heading', { name: 'Your class assignments', exact: true }).waitFor();
  await page.locator('.assigned-activities').getByText(/Browser QA Class/).waitFor();
  await page.screenshot({ path: 'design-review/playwright/05-student-assignments.png', fullPage: true });
  const modules = [
    { title: 'Foundations of Quality', answers: ['Prevent defects', 'false', 'Peer review', 'Test plan', 'A consistent benchmark'] },
    { title: 'Testing Strategies', answers: ['High-impact risks', 'true', 'Unit test', 'Negative testing', 'Reintroduced defects'] },
    { title: 'Continuous Improvement', answers: ['Improve the way the team works', 'false', 'Defect trend', 'Continuous improvement', 'A defined success metric'] },
    { title: 'Test Case Design', answers: ['Expected result', 'true', 'Starting conditions', 'Actual result', 'Repeatable steps'] },
    { title: 'Defect Reporting', answers: ['Steps to reproduce', 'true', 'Observed behavior', 'Severity', 'Reproducible details'] },
  ];
  async function answerQuiz(answers) {
    for (const [index, answer] of answers.entries()) {
      const item = page.locator('.lesson-quiz ol > li').nth(index);
      if (await item.locator('.answer-input').count()) await item.locator('.answer-input').fill(answer);
      else await item.getByRole('radio', { name: new RegExp('^' + answer + '$', 'i') }).check();
    }
  }
  for (const [index, module] of modules.entries()) {
    await page.locator('.path-card').filter({ hasText: module.title }).click();
    await page.locator('.lesson-choice').click();
    await page.getByRole('button', { name: 'I have finished this lesson', exact: true }).click();
    await page.locator('.lesson-done').waitFor();
    await answerQuiz(module.answers);
    if (index === 0) {
      await page.getByRole('button', { name: 'Submit lesson quiz', exact: true }).click();
      await page.getByText('Submit every required practical activity before taking this quiz', { exact: true }).waitFor();
      await page.screenshot({ path: 'design-review/playwright/06-required-activity-gate.png', fullPage: true });
    }
    const activity = page.locator('.activity-form');
    for (const field of await activity.getByRole('textbox').all()) await field.fill('Browser test: ' + module.title + ' practical response');
    if (await activity.getByRole('combobox').count()) await activity.getByRole('combobox').selectOption('Low');
    await activity.getByRole('button', { name: 'Save activity', exact: true }).click();
    await activity.locator('.pill').filter({ hasText: /Submitted|Saved/ }).waitFor();
    await page.getByRole('button', { name: 'Submit lesson quiz', exact: true }).click();
    await page.locator('.quiz-submitted').getByText(/Latest score: 100%/).waitFor();
    await page.locator('.feedback-list').getByRole('heading', { name: 'Answer feedback' }).waitFor();
    if (index === 0) await page.screenshot({ path: 'design-review/playwright/07-quiz-feedback.png', fullPage: true });
    await page.getByRole('button', { name: /Return to Learning Path/ }).click();
    if (index === 0) {
      await page.getByRole('button', { name: 'Retake Quiz', exact: true }).click();
      await answerQuiz(module.answers);
      await page.getByRole('button', { name: 'Submit retake', exact: true }).click();
      await page.locator('.quiz-submitted').getByText(/Latest score: 100%/).waitFor();
      await page.getByRole('button', { name: /Return to Learning Path/ }).click();
    }
  }
  await page.getByRole('button', { name: 'Post-test', exact: true }).click();
  await page.getByRole('radio', { name: 'Peer review', exact: true }).check();
  await page.getByRole('button', { name: 'Submit post-test', exact: true }).click();
  await page.getByRole('heading', { name: 'Tell us about your experience', exact: true }).waitFor();
  for (const select of await page.locator('.pre-test-panel select').all()) await select.selectOption('5');
  await page.getByRole('textbox', { name: 'Optional suggestion' }).fill('Browser QA: clear learning journey.');
  await page.getByRole('button', { name: 'Submit feedback', exact: true }).click();
  await page.getByRole('heading', { name: 'Suitability feedback received', exact: true }).waitFor();
  await page.screenshot({ path: 'design-review/playwright/08-course-complete.png', fullPage: true });
  await page.getByRole('button', { name: 'Badges', exact: true }).click();
  await page.locator('.dashboard-content').waitFor();
  page.off('pageerror', onError);
  if (errors.length) throw new Error(JSON.stringify(errors));
  return { passed: ['student login', 'class join', 'published multiple-choice pre-test', 'assignment visibility', 'required activity gate', 'five lesson/activity/quiz journeys', 'answer feedback', 'explicit quiz retake', 'post-test', 'suitability survey', 'badges view'], browserErrors: errors };
}
