async page => {
  const errors = [];
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.context().clearCookies();
  await page.goto('http://127.0.0.1:4179/');
  async function login(role, email) {
    if (await page.getByRole('button', { name: 'Sign Out' }).count()) await page.getByRole('button', { name: 'Sign Out' }).click();
    await page.locator('.role-' + role).click();
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('BrowserTest2026!');
    await page.getByRole('button', { name: 'Sign in & keep learning' }).click();
    await page.locator('.workspace-header h1').waitFor();
  }
  await login('administrator', 'admin@browser.test');
  await page.getByRole('button', { name: 'Manage Users', exact: true }).click();
  const account = page.locator('.account-create-panel');
  for (const user of [{ name: 'Survey Teacher', email: 'teacher@survey.test', role: 'teacher' }, { name: 'Survey Learner', email: 'student@survey.test', role: 'student' }]) {
    await account.getByRole('textbox', { name: 'Name', exact: true }).fill(user.name);
    await account.getByRole('textbox', { name: 'Email', exact: true }).fill(user.email);
    await account.getByLabel('Password', { exact: true }).fill('BrowserTest2026!');
    await account.getByRole('combobox', { name: 'Role', exact: true }).selectOption(user.role);
    await account.getByRole('button', { name: 'Create account', exact: true }).click();
    await page.getByText(`Created ${user.role} account for ${user.email}`, { exact: true }).waitFor();
  }
  await page.getByRole('button', { name: 'Research & Evidence', exact: true }).click();
  await page.getByRole('combobox', { name: 'Student', exact: true }).selectOption({ label: 'Survey Learner (student@survey.test)' });
  const enrol = page.locator('.research-enrol-form');
  for (const checkbox of await enrol.getByRole('checkbox').all()) await checkbox.check();
  await page.getByRole('button', { name: 'Create record', exact: true }).click();
  await page.getByText('Participant record created.', { exact: true }).waitFor();
  await page.getByRole('checkbox', { name: 'Require research authorisation' }).check();
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await page.getByText('System settings updated.', { exact: true }).waitFor();
  await page.locator('.research-instrument-list button').filter({ hasText: 'Software testing understanding — before learning' }).click();
  if (await page.getByRole('textbox', { name: 'Correct answer', exact: true }).count()) throw new Error('Rating editor requests a correct answer');
  if (await page.getByRole('combobox', { name: 'Type', exact: true }).first().inputValue() !== 'rating') throw new Error('Rating editor lost its question type');
  await page.screenshot({ path: 'design-review/playwright/24-survey-editor.png', fullPage: true });
  await login('teacher', 'teacher@survey.test');
  await page.getByRole('button', { name: 'Classes', exact: true }).click();
  await page.getByPlaceholder('New class name').fill('Survey QA Class');
  await page.getByRole('button', { name: 'Create class', exact: true }).click();
  await page.getByRole('heading', { name: 'Survey QA Class', exact: true }).waitFor();
  await login('student', 'student@survey.test');
  await page.getByRole('button', { name: 'Classes', exact: true }).click();
  await page.getByRole('button', { name: 'Join class', exact: true }).click();
  await page.getByRole('heading', { name: 'Pre-test survey', exact: true }).waitFor();
  const preStatements = await page.locator('.assessment-question legend').allTextContents();
  if (preStatements.length !== 10) throw new Error('Expected ten understanding statements');
  for (const width of [1440, 1024, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error('Rating form overflows at ' + width);
    await page.screenshot({ path: `design-review/playwright/25-pre-survey-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Submit pre-test', exact: true }).click();
  if (!await page.getByRole('heading', { name: 'Pre-test survey', exact: true }).isVisible()) throw new Error('Incomplete form submitted');
  const groups = page.getByRole('group');
  const first = groups.first().getByRole('radio').first();
  await first.focus();
  await page.keyboard.press('ArrowRight');
  if (!await groups.first().getByRole('radio').nth(1).isChecked()) throw new Error('Native keyboard rating selection failed');
  for (const group of await groups.all()) await group.getByRole('radio', { name: '2 Disagree', exact: true }).check();
  await page.getByRole('button', { name: 'Submit pre-test', exact: true }).click();
  await page.locator('.pre-test-page').waitFor({ state: 'hidden' });
  await page.reload();
  await page.getByRole('button', { name: 'Survey Results', exact: true }).click();
  await page.getByRole('heading', { name: 'Your understanding surveys', exact: true }).waitFor();
  if ((await page.locator('.workspace').innerText()).includes('null%')) throw new Error('Rating displayed as a percentage');
  await page.getByRole('button', { name: 'Learning Path', exact: true }).click();
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
    await page.locator('.quiz-submitted').getByText(/Latest attempt: 100%/).waitFor();
    await page.locator('.feedback-list').getByRole('heading', { name: 'Answer feedback' }).waitFor();
    if (index === 0) await page.screenshot({ path: 'design-review/playwright/07-quiz-feedback.png', fullPage: true });
    await page.getByRole('button', { name: /Return to Learning Path/ }).click();
    if (index === 0) {
      await page.getByRole('button', { name: 'Retake Quiz', exact: true }).click();
      await answerQuiz(module.answers);
      await page.getByRole('button', { name: 'Submit retake', exact: true }).click();
      await page.locator('.quiz-submitted').getByText(/Latest attempt: 100%/).waitFor();
      await page.getByRole('button', { name: /Return to Learning Path/ }).click();
    }
  }

  await page.getByRole('button', { name: 'Post-test', exact: true }).click();
  await page.getByRole('heading', { name: 'Post-test survey', exact: true }).waitFor();
  const postStatements = await page.locator('.assessment-question legend').allTextContents();
  if (JSON.stringify(preStatements) !== JSON.stringify(postStatements)) throw new Error('Pre/post statements differ');
  for (const group of await page.getByRole('group').all()) await group.getByRole('radio', { name: '4 Agree', exact: true }).check();
  await page.screenshot({ path: 'design-review/playwright/26-post-survey.png', fullPage: true });
  await page.getByRole('button', { name: 'Submit post-test', exact: true }).click();
  await page.getByRole('heading', { name: 'Post-test survey complete', exact: true }).waitFor();
  await page.reload();
  await page.getByRole('button', { name: 'Post-test', exact: true }).click();
  await page.getByRole('heading', { name: 'Post-test survey complete', exact: true }).waitFor();
  if (await page.getByRole('button', { name: 'Submit post-test', exact: true }).count()) throw new Error('Completed survey allows resubmission after reload');
  await page.getByRole('heading', { name: 'Tell us about your experience', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Survey Results', exact: true }).click();
  await page.getByText('+2', { exact: true }).waitFor();
  await page.screenshot({ path: 'design-review/playwright/27-student-survey-comparison.png', fullPage: true });
  await login('teacher', 'teacher@survey.test');
  await page.getByRole('button', { name: 'Monitoring', exact: true }).click();
  await page.locator('.monitoring-row').getByText('2 / 5 · 4 / 5', { exact: true }).waitFor();
  await page.screenshot({ path: 'design-review/playwright/28-teacher-survey-results.png', fullPage: true });
  await login('administrator', 'admin@browser.test');
  await page.getByRole('button', { name: 'Research & Evidence', exact: true }).click();
  await page.getByRole('heading', { name: 'Understanding survey results', exact: true }).waitFor();
  await page.getByRole('region', { name: 'Understanding by statement' }).getByRole('row').nth(1).waitFor();
  if (await page.getByRole('region', { name: 'Understanding by statement' }).getByRole('row').count() !== 11) throw new Error('Statement comparison is incomplete');
  await page.getByText('+2', { exact: true }).first().waitFor();
  await page.screenshot({ path: 'design-review/playwright/29-admin-survey-comparison.png', fullPage: true });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  await (await download).saveAs('design-review/playwright/understanding-survey.csv');
  page.off('pageerror', onError);
  if (errors.length) throw new Error(JSON.stringify(errors));
  return { passed: ['rating instrument editor without answer keys', 'ten matched software testing statements', 'desktop/tablet forms', 'required answers and keyboard selection', 'pre-survey completion gate', 'all five learning modules', 'post-survey and reload protection', 'student 1–5 comparison', 'teacher report ratings', 'admin paired item analysis and export'], browserErrors: errors };
}
