async page => {
  const errors = [];
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  await page.reload();
  await page.locator('.workspace-header h1').waitFor();
  await page.setViewportSize({ width: 1440, height: 1000 });
  async function login(role, email) {
    await page.getByRole('button', { name: /Sign Out/ }).click();
    await page.locator('.role-' + role).click();
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('BrowserTest2026!');
    await page.getByRole('button', { name: 'Sign in & keep learning' }).click();
    await page.locator('.workspace-header h1').waitFor();
  }
  async function navigate(label) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  async function layout(prefix, heading) {
    const dismiss = page.getByRole('button', { name: 'Dismiss reward notification', exact: true });
    if (await dismiss.count()) await dismiss.click();
    for (const colorScheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme });
      const color = await heading.evaluate(element => getComputedStyle(element).color);
      if (color !== 'rgb(51, 43, 71)') throw new Error(prefix + ' heading is not readable in ' + colorScheme + ': ' + color);
      for (const width of [1440, 1024, 768]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(() => window.scrollTo(0, 0));
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error(prefix + ' overflows at ' + width + ' in ' + colorScheme);
        if (await page.locator('.reflection-workspace img, .classes-workspace img').evaluateAll(images => images.some(img => !img.complete || img.naturalWidth === 0))) throw new Error('Broken local icon');
        if (colorScheme === 'light') await page.screenshot({ path: `design-review/playwright/${prefix}-${width}.png`, fullPage: true });
      }
    }
    await page.emulateMedia({ colorScheme: 'light' });
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  await login('administrator', 'admin@browser.test');
  await page.getByRole('button', { name: 'Manage Users', exact: true }).click();
  const email = `reflection-${Date.now()}@browser.test`;
  const form = page.locator('.account-create-panel');
  await form.getByLabel('Name', { exact: true }).fill('Reflection Learner');
  await form.getByLabel('Email', { exact: true }).fill(email);
  await form.getByLabel('Password', { exact: true }).fill('BrowserTest2026!');
  await form.getByRole('combobox', { name: 'Role', exact: true }).selectOption('student');
  await form.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByText(`Created student account for ${email}`, { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Research & Evidence', exact: true }).click();
  await page.getByRole('combobox', { name: 'Student', exact: true }).selectOption({ label: `Reflection Learner (${email})` });
  for (const checkbox of await page.locator('.research-enrol-form').getByRole('checkbox').all()) await checkbox.check();
  await page.getByRole('button', { name: 'Create record', exact: true }).click();
  await page.getByText('Participant record created.', { exact: true }).waitFor();
  await login('student', email);
  await navigate('Classes');
  await page.getByRole('heading', { name: 'Survey QA Class', exact: true }).waitFor();
  await layout('42-classes-heading', page.locator('.classes-intro h2'));
  await page.getByRole('button', { name: 'Join class', exact: true }).click();
  await page.getByRole('heading', { name: 'Pre-test survey', exact: true }).waitFor();
  for (const group of await page.getByRole('group').all()) await group.getByRole('radio').nth(2).check();
  await page.getByRole('button', { name: 'Submit pre-test', exact: true }).click();
  await page.locator('.pre-test-page').waitFor({ state: 'hidden' });
  await navigate('Profile');
  await page.getByRole('heading', { name: 'Reflection Learner', exact: true }).waitFor();
  if (await page.locator('.learner-profile-stats dd').nth(0).innerText() !== '0 / 5') throw new Error('New profile module count is incorrect');
  await page.locator('.learner-class-memberships').getByRole('heading', { name: 'Survey QA Class', exact: true }).waitFor();
  await layout('40-profile-starting', page.locator('.reflection-intro h2'));
  await page.getByRole('button', { name: 'Manage classes', exact: true }).click();
  await page.locator('.classes-intro h2').waitFor();
  await navigate('Post-test');
  await page.getByRole('heading', { name: 'Post-test locked', exact: true }).waitFor();
  await page.getByText('0 / 5 modules complete', { exact: true }).waitFor();
  await layout('41-post-test-locked', page.locator('.reflection-intro h2'));
  await page.getByRole('button', { name: /^Continue learning/ }).click();
  await page.getByRole('heading', { name: 'Your module roadmap', exact: true }).waitFor();
  await navigate('Survey Results');
  if (!await page.getByRole('button', { name: 'Retake post-test survey', exact: true }).isDisabled()) throw new Error('Post-test retake unlocked before original');
  if (await page.locator('.survey-change-card strong').innerText() !== '—') throw new Error('Missing post-test displayed a false zero change');
  await layout('38-survey-results-before', page.locator('.reflection-intro h2'));
  await page.getByText('Compare statements (10)', { exact: true }).click();
  if (await page.getByRole('region', { name: 'Your survey statement comparison', exact: true }).getByRole('row').count() !== 11) throw new Error('Initial statement table is incomplete');

  await login('student', 'student@survey.test');
  await navigate('Profile');
  if (await page.locator('.learner-profile-stats dd').nth(0).innerText() !== '5 / 5') throw new Error('Completed profile module count is incorrect');
  if (await page.locator('.learner-milestones li[data-complete="true"]').count() !== 4) throw new Error('Completed profile milestones are incorrect');
  await layout('40-profile-complete', page.locator('.reflection-intro h2'));
  await page.getByRole('button', { name: /View your badges/ }).click();
  await page.getByRole('heading', { name: 'Your badge cabinet', exact: true }).waitFor();
  await navigate('Post-test');
  await page.getByRole('heading', { name: 'Post-test survey complete', exact: true }).waitFor();
  if (await page.getByRole('button', { name: 'Submit post-test', exact: true }).count()) throw new Error('Completed original can be submitted again');
  const feedback = page.locator('.post-survey-feedback');
  await feedback.getByRole('heading', { name: 'Tell us about your experience', exact: true }).waitFor();
  await layout('43-post-test-complete', page.locator('.reflection-intro h2'));
  for (const select of await feedback.getByRole('combobox').all()) await select.selectOption('4');
  await feedback.getByRole('textbox', { name: 'Optional suggestion', exact: true }).fill('The redesigned reflection pages are clear.');
  await feedback.getByRole('button', { name: 'Submit feedback', exact: true }).click();
  await feedback.getByRole('heading', { name: 'Suitability feedback received', exact: true }).waitFor();
  await page.getByRole('button', { name: /^View survey results/ }).click();
  await page.getByRole('heading', { name: 'Your understanding surveys', exact: true }).waitFor();
  if (await page.locator('.survey-change-card strong').innerText() !== '+2') throw new Error('Original comparison is incorrect');
  await layout('38-survey-results-complete', page.locator('.reflection-intro h2'));
  await page.getByText('Compare statements (10)', { exact: true }).click();
  const table = page.getByRole('region', { name: 'Your survey statement comparison', exact: true });
  if (await table.getByRole('row').count() !== 11) throw new Error('Matched statement comparison is incomplete');
  for (const row of (await table.getByRole('row').all()).slice(1)) {
    if (JSON.stringify(await row.getByRole('cell').allTextContents()) !== JSON.stringify(['2 / 5', '4 / 5', '+2 points'])) throw new Error('A saved statement comparison is incorrect');
  }
  await page.screenshot({ path: 'design-review/playwright/38-survey-statement-comparison.png', fullPage: true });
  const original = await page.evaluate(async () => (await fetch('/api/dashboard')).json());
  await page.getByRole('button', { name: 'Retake pre-test survey', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel retake', exact: true }).click();
  if ((await page.evaluate(async () => (await fetch('/api/dashboard')).json())).surveyRetakes.length !== original.surveyRetakes.length) throw new Error('Cancel saved a retake');
  await page.getByRole('button', { name: 'Retake pre-test survey', exact: true }).click();
  await page.getByRole('heading', { name: 'Retake pre-test survey', level: 2, exact: true }).waitFor();
  for (const group of await page.getByRole('group').all()) await group.getByRole('radio').nth(4).check();
  await page.getByRole('button', { name: 'Submit pre-test', exact: true }).click();
  await page.getByText('Your survey retake has been saved separately. Your original responses are unchanged.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Retake post-test survey', exact: true }).click();
  await page.getByRole('heading', { name: 'Retake post-test survey', level: 2, exact: true }).waitFor();
  await page.getByRole('button', { name: 'Submit post-test', exact: true }).click();
  if (!await page.getByRole('heading', { name: 'Retake post-test survey', level: 2, exact: true }).isVisible()) throw new Error('Incomplete post-test submitted');
  const first = page.getByRole('group').first().getByRole('radio').first();
  await first.focus();
  await page.keyboard.press('ArrowRight');
  if (!await page.getByRole('group').first().getByRole('radio').nth(1).isChecked()) throw new Error('Post-test keyboard selection failed');
  for (const group of await page.getByRole('group').all()) await group.getByRole('radio').nth(2).check();
  await layout('39-post-test-answering', page.locator('.reflection-intro h2'));
  await page.route('**/api/post-test', route => route.request().method() === 'POST' ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Survey submission temporarily unavailable.' }) }) : route.continue());
  await page.getByRole('button', { name: 'Submit post-test', exact: true }).click();
  await page.getByText('Survey submission temporarily unavailable.', { exact: true }).waitFor();
  if (await page.getByRole('radio', { checked: true }).count() !== 10) throw new Error('Submission failure cleared answers');
  await page.unroute('**/api/post-test');
  await page.getByRole('button', { name: 'Submit post-test', exact: true }).click();
  await page.getByText('Your survey retake has been saved separately. Your original responses are unchanged.', { exact: true }).waitFor();
  const after = await page.evaluate(async () => (await fetch('/api/dashboard')).json());
  if (JSON.stringify(after.surveys) !== JSON.stringify(original.surveys) || after.xpPoints !== original.xpPoints || after.surveyRetakes.length !== original.surveyRetakes.length + 2) throw new Error('Retakes changed originals, XP, or were not saved separately');
  await page.reload();
  await page.locator('.workspace-header h1').waitFor();
  await navigate('Survey Results');
  await page.getByRole('region', { name: 'Survey retake history', exact: true }).getByText('3 / 5', { exact: true }).waitFor();
  await page.getByRole('region', { name: 'Survey retake history', exact: true }).getByText('5 / 5', { exact: true }).waitFor();
  await layout('38-survey-results-retakes', page.locator('.reflection-intro h2'));
  await page.route('**/api/dashboard', async route => {
    const response = await route.fetch();
    const payload = await response.json();
    const post = payload.surveys.find(item => item.phase === 'post');
    const ratings = typeof post.ratings === 'string' ? JSON.parse(post.ratings) : post.ratings;
    ratings[0].statement = 'A different statement';
    post.ratings = ratings;
    await route.fulfill({ response, json: payload });
  });
  await page.reload();
  await page.locator('.workspace-header h1').waitFor();
  await navigate('Survey Results');
  if (await page.locator('.survey-change-card strong').innerText() !== '—') throw new Error('Different statements were compared');
  await page.getByText('A comparison needs matching survey statements. These submissions use different statements or response formats.', { exact: true }).waitFor();
  await page.unroute('**/api/dashboard');
  await page.route('**/api/dashboard', async route => {
    const response = await route.fetch();
    const payload = await response.json();
    payload.surveys = [{ phase: 'pre', score: 40 }, { phase: 'post', score: 80 }];
    await route.fulfill({ response, json: payload });
  });
  await page.reload();
  await page.locator('.workspace-header h1').waitFor();
  await navigate('Survey Results');
  await page.getByRole('heading', { name: 'Knowledge checks', exact: true }).waitFor();
  if (await page.locator('.survey-change-card strong').innerText() !== '+40') throw new Error('Earlier knowledge-check comparison is incorrect');
  await page.unroute('**/api/dashboard');
  await page.reload();
  await page.locator('.workspace-header h1').waitFor();
  await navigate('Profile');
  page.off('pageerror', onError);
  if (errors.length) throw new Error(JSON.stringify(errors));
  return { passed: ['Classes heading in light and dark system preferences', 'locked/answering/completed post-test states', 'required responses and keyboard ratings', 'submission failure recovery', 'suitability feedback', 'original and per-statement comparisons', 'missing/mismatched/earlier results', 'profile counts, milestones, classes and badge action', 'pre/post retakes, cancel and reload', 'original responses and XP preserved', 'all three pages at 1440/1024/768 in both system preferences'], browserErrors: errors };
}
