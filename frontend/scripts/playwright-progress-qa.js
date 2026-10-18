async page => {
  const errors = [];
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  await page.context().clearCookies();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://127.0.0.1:4179/');
  async function login(role, email) {
    const signOut = page.getByRole('button', { name: /Sign Out/ });
    if (await signOut.count()) await signOut.click();
    await page.locator('.role-' + role).click();
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('BrowserTest2026!');
    await page.getByRole('button', { name: 'Sign in & keep learning' }).click();
    await page.locator('.workspace-header h1').waitFor();
  }
  async function progressPage() {
    await page.getByRole('button', { name: 'Progress', exact: true }).click();
    await page.getByRole('heading', { name: 'See how far you’ve come.', exact: true }).waitFor();
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  async function layout(state) {
    const dismiss = page.getByRole('button', { name: 'Dismiss reward notification', exact: true });
    if (await dismiss.count()) await dismiss.click();
    for (const colorScheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme });
      if (await page.locator('.progress-intro h2').evaluate(element => getComputedStyle(element).color) !== 'rgb(51, 43, 71)') throw new Error('Unreadable Progress heading in ' + colorScheme);
      for (const width of [1440, 1024, 768]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(() => window.scrollTo(0, 0));
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error('Progress overflows at ' + width + ' in ' + colorScheme);
        if (await page.locator('.progress-workspace img').evaluateAll(images => images.some(img => !img.complete || img.naturalWidth === 0))) throw new Error('Broken progress icon');
        const action = await page.locator('.progress-next-action button').boundingBox();
        if (!action || action.y + action.height > 1000) throw new Error('Next action is below the first screen at ' + width);
        if (colorScheme === 'light') await page.screenshot({ path: `design-review/playwright/44-progress-${state}-${width}.png`, fullPage: true });
      }
    }
    await page.emulateMedia({ colorScheme: 'light' });
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  function moduleRow(title) { return page.locator('.progress-module-list > li').filter({ has: page.getByRole('heading', { name: title, exact: true }) }); }
  async function openLesson(title) {
    await page.getByRole('button', { name: 'Learning Path', exact: true }).click();
    await page.locator('.path-card').filter({ hasText: title }).click();
    await page.locator('.lesson-choice').click();
  }
  async function saveActivity() {
    const form = page.locator('.activity-form');
    for (const field of await form.getByRole('textbox').all()) await field.fill('Progress QA practical response');
    if (await form.getByRole('combobox').count()) await form.getByRole('combobox').selectOption('Low');
    await form.getByRole('button', { name: 'Save activity', exact: true }).click();
    await form.locator('.pill').filter({ hasText: /Submitted|Saved/ }).waitFor();
  }
  async function answerQuiz(answers, retake = false) {
    for (const [index, answer] of answers.entries()) {
      const question = page.locator('.lesson-quiz ol > li').nth(index);
      if (await question.locator('.answer-input').count()) await question.locator('.answer-input').fill(answer);
      else await question.getByRole('radio', { name: new RegExp('^' + answer + '$', 'i') }).check();
    }
    await page.getByRole('button', { name: retake ? 'Submit retake' : 'Submit lesson quiz', exact: true }).click();
  }
  await login('administrator', 'admin@browser.test');
  await page.getByRole('button', { name: 'Manage Users', exact: true }).click();
  const account = page.locator('.account-create-panel');
  for (const person of [{ name: 'Progress Teacher', email: 'teacher@progress.test', role: 'teacher' }, { name: 'Progress Learner', email: 'student@progress.test', role: 'student' }]) {
    await account.getByLabel('Name', { exact: true }).fill(person.name);
    await account.getByLabel('Email', { exact: true }).fill(person.email);
    await account.getByLabel('Password', { exact: true }).fill('BrowserTest2026!');
    await account.getByRole('combobox', { name: 'Role', exact: true }).selectOption(person.role);
    await account.getByRole('button', { name: 'Create account', exact: true }).click();
    await page.getByText(`Created ${person.role} account for ${person.email}`, { exact: true }).waitFor();
  }
  await page.getByRole('button', { name: 'Research & Evidence', exact: true }).click();
  await page.getByRole('combobox', { name: 'Student', exact: true }).selectOption({ label: 'Progress Learner (student@progress.test)' });
  for (const checkbox of await page.locator('.research-enrol-form').getByRole('checkbox').all()) await checkbox.check();
  await page.getByRole('button', { name: 'Create record', exact: true }).click();
  await page.getByText('Participant record created.', { exact: true }).waitFor();
  await login('teacher', 'teacher@progress.test');
  await page.getByRole('button', { name: 'Classes', exact: true }).click();
  await page.getByLabel('Class name', { exact: true }).fill('Progress QA Class');
  await page.getByRole('button', { name: 'Create class', exact: true }).click();
  await page.getByRole('heading', { name: 'Progress QA Class', exact: true }).waitFor();
  await login('student', 'student@progress.test');
  await page.getByRole('button', { name: 'Classes', exact: true }).click();
  await page.getByRole('button', { name: 'Join class', exact: true }).click();
  await page.getByRole('heading', { name: 'Pre-test survey', exact: true }).waitFor();
  for (const group of await page.getByRole('group').all()) await group.getByRole('radio').nth(2).check();
  await page.getByRole('button', { name: 'Submit pre-test', exact: true }).click();
  await page.locator('.pre-test-page').waitFor({ state: 'hidden' });
  await progressPage();
  if (await page.locator('.progress-module-list > li').count() !== 5 || await page.locator('.progress-course-total > strong').innerText() !== '0%') throw new Error('New learner does not see all five modules at 0%');
  if (JSON.stringify(await page.locator('.progress-status-counts dd').allTextContents()) !== JSON.stringify(['0', '0', '5'])) throw new Error('Initial status counts are incorrect');
  await page.getByRole('heading', { name: 'Your first quiz is ahead of you.', exact: true }).waitFor();
  await page.getByRole('combobox', { name: 'Show modules', exact: true }).selectOption('complete');
  await page.getByRole('heading', { name: 'No modules in this view yet.', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Show all modules', exact: true }).click();
  await layout('starting');
  await page.locator('.progress-next-action').getByRole('button', { name: /^Open Learning Path/ }).click();
  await page.getByRole('heading', { name: 'Your module roadmap', exact: true }).waitFor();
  const firstTitle = 'Foundations of Quality';
  const firstAnswers = ['Prevent defects', 'false', 'Peer review', 'Test plan', 'A consistent benchmark'];
  await openLesson(firstTitle);
  await page.getByRole('button', { name: 'I have finished this lesson', exact: true }).click();
  await page.locator('.lesson-done').waitFor();
  await progressPage();
  await moduleRow(firstTitle).getByText('20%', { exact: true }).waitFor();
  await openLesson(firstTitle);
  await saveActivity();
  await progressPage();
  await moduleRow(firstTitle).getByText('50%', { exact: true }).waitFor();
  await openLesson(firstTitle);
  await answerQuiz(['Write more code', ...firstAnswers.slice(1)]);
  await page.locator('.quiz-submitted').getByText(/Latest score: 80%/).waitFor();
  await progressPage();
  await moduleRow(firstTitle).getByText('90%', { exact: true }).waitFor();
  if (await page.locator('.progress-course-total > strong').innerText() !== '0%') throw new Error('Partial module incorrectly completes the course');
  await page.getByRole('combobox', { name: 'Show modules', exact: true }).selectOption('in_progress');
  if (await page.locator('.progress-module-list > li').count() !== 1) throw new Error('In-progress filter is incorrect');
  await page.getByRole('combobox', { name: 'Show modules', exact: true }).selectOption('not_started');
  if (await page.locator('.progress-module-list > li').count() !== 4) throw new Error('Not-started filter is incorrect');
  await page.getByRole('combobox', { name: 'Show modules', exact: true }).selectOption('all');
  await layout('partial');
  await page.getByRole('button', { name: 'Learning Path', exact: true }).click();
  await page.getByRole('button', { name: 'Retake Quiz', exact: true }).click();
  await answerQuiz(firstAnswers, true);
  await page.locator('.quiz-submitted').getByText(/Latest score: 100%/).waitFor();
  await progressPage();
  if (await page.locator('.progress-course-total > strong').innerText() !== '20%') throw new Error('One of five completed modules must show 20% course completion');
  await moduleRow(firstTitle).getByText('100%', { exact: true }).waitFor();
  await moduleRow(firstTitle).getByText('1 lesson · Best quiz score: 100%', { exact: true }).waitFor();
  await page.getByRole('combobox', { name: 'Show modules', exact: true }).selectOption('complete');
  if (await page.locator('.progress-module-list > li').count() !== 1) throw new Error('Completed filter is incorrect');
  await page.getByRole('combobox', { name: 'Show modules', exact: true }).selectOption('all');
  await layout('advancing');
  const modules = [
    ['Testing Strategies', ['High-impact risks', 'true', 'Unit test', 'Negative testing', 'Reintroduced defects']],
    ['Continuous Improvement', ['Improve the way the team works', 'false', 'Defect trend', 'Continuous improvement', 'A defined success metric']],
    ['Test Case Design', ['Expected result', 'true', 'Starting conditions', 'Actual result', 'Repeatable steps']],
    ['Defect Reporting', ['Steps to reproduce', 'true', 'Observed behavior', 'Severity', 'Reproducible details']],
  ];
  for (const [title, answers] of modules) {
    await openLesson(title);
    await page.getByRole('button', { name: 'I have finished this lesson', exact: true }).click();
    await page.locator('.lesson-done').waitFor();
    await saveActivity();
    await answerQuiz(answers);
    await page.locator('.quiz-submitted').getByText(/Latest score: 100%/).waitFor();
    await page.getByRole('button', { name: /Return to Learning Path/ }).click();
  }
  await progressPage();
  if (await page.locator('.progress-course-total > strong').innerText() !== '100%' || await page.locator('.progress-module-list > li[data-state="complete"]').count() !== 5) throw new Error('Completed course is incorrect');
  const history = page.getByRole('region', { name: 'Quiz attempt history', exact: true });
  if (await history.getByRole('row').count() !== 6) throw new Error('Quiz history should initially show five attempts');
  await page.getByRole('button', { name: 'Show all attempts', exact: true }).click();
  if (await history.getByRole('row').count() !== 7) throw new Error('Expanded history must show six attempts');
  await history.getByText('80%', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Show latest five', exact: true }).click();
  await layout('complete');
  await page.locator('.progress-next-action').getByRole('button', { name: /^Open post-test survey/ }).click();
  await page.getByRole('heading', { name: 'Post-test survey', exact: true }).waitFor();
  for (const group of await page.getByRole('group').all()) await group.getByRole('radio').nth(3).check();
  await page.getByRole('button', { name: 'Submit post-test', exact: true }).click();
  await page.getByRole('heading', { name: 'Post-test survey complete', exact: true }).waitFor();
  await progressPage();
  await page.locator('.progress-next-action').getByRole('button', { name: /^View survey results/ }).click();
  await page.getByRole('heading', { name: 'Your understanding surveys', exact: true }).waitFor();
  await progressPage();
  await page.locator('.progress-reflection-link').getByRole('button', { name: /View survey results/ }).click();
  await page.getByRole('heading', { name: 'Your understanding surveys', exact: true }).waitFor();
  await page.reload();
  await page.locator('.workspace-header h1').waitFor();
  await progressPage();
  if (await page.locator('.progress-course-total > strong').innerText() !== '100%') throw new Error('Progress did not persist after reload');
  await page.route('**/api/me/journey', async route => {
    const response = await route.fetch();
    const payload = await response.json();
    await route.fulfill({ response, json: { ...payload, moduleIds: [], unlockedModuleIds: [], completedModuleIds: [], allModulesComplete: false } });
  });
  await page.route('**/api/modules', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.reload();
  await page.locator('.workspace-header h1').waitFor();
  await progressPage();
  await page.getByRole('heading', { name: 'Your next chapter is on its way.', exact: true }).waitFor();
  if (await page.locator('.progress-course-total > strong').innerText() !== '0%' || await page.locator('.progress-module-list > li').count()) throw new Error('Empty catalogue includes old progress or invalid percentage');
  await page.unroute('**/api/me/journey');
  await page.unroute('**/api/modules');
  await page.reload();
  await page.locator('.workspace-header h1').waitFor();
  await progressPage();
  page.off('pageerror', onError);
  if (errors.length) throw new Error(JSON.stringify(errors));
  return { passed: ['all modules before learning', 'reading/practical/quiz progress of 20/50/90/100 percent', 'correct 0/20/100 course completion', 'module status filters and empty filter', 'quiz retake and full history', 'post-test and results actions', 'reload persistence', 'empty published catalogue', 'four progress states at 1440/1024/768 in light and dark system preferences'], browserErrors: errors };
}
