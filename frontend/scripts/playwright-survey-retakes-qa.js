async page => {
  const errors = [];
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.context().clearCookies();
  await page.goto('http://127.0.0.1:4179/');
  await page.locator('.role-student').click();
  await page.getByLabel('Email address').fill('student@survey.test');
  await page.getByLabel('Password', { exact: true }).fill('BrowserTest2026!');
  await page.getByRole('button', { name: 'Sign in & keep learning' }).click();
  await page.getByRole('button', { name: 'Survey Results', exact: true }).click();
  const original = await page.evaluate(async () => (await fetch('/api/dashboard')).json());
  await page.getByRole('button', { name: 'Retake pre-test survey', exact: true }).click();
  await page.getByRole('heading', { name: 'Retake pre-test survey', level: 2, exact: true }).waitFor();
  await page.getByRole('button', { name: 'Cancel retake', exact: true }).click();
  if ((await page.evaluate(async () => (await fetch('/api/dashboard')).json())).surveyRetakes.length !== original.surveyRetakes.length) throw new Error('Cancel saved a retake');
  for (const [phase, value] of [['pre', '5'], ['post', '3']]) {
    await page.getByRole('button', { name: `Retake ${phase}-test survey`, exact: true }).click();
    await page.getByRole('heading', { name: `Retake ${phase}-test survey`, level: 2, exact: true }).waitFor();
    for (const group of await page.getByRole('group').all()) await group.getByRole('radio').nth(Number(value) - 1).check();
    await page.getByRole('button', { name: `Submit ${phase}-test`, exact: true }).click();
    await page.getByRole('status').getByText('Your survey retake has been saved separately. Your original responses are unchanged.', { exact: true }).waitFor();
  }
  const after = await page.evaluate(async () => (await fetch('/api/dashboard')).json());
  if (JSON.stringify(after.surveys) !== JSON.stringify(original.surveys)) throw new Error('Retakes replaced original responses');
  if (after.xpPoints !== original.xpPoints) throw new Error('Retakes granted extra XP');
  if (after.surveyRetakes.length !== original.surveyRetakes.length + 2) throw new Error('Both retakes were not saved');
  if (Number(after.surveyRetakes[0].rating_mean) !== 3 || Number(after.surveyRetakes[1].rating_mean) !== 5) throw new Error('Retake responses are incorrect');
  await page.getByRole('region', { name: 'Survey retake history' }).getByText('5 / 5', { exact: true }).first().waitFor();
  await page.getByRole('region', { name: 'Survey retake history' }).getByText('3 / 5', { exact: true }).first().waitFor();
  await page.getByText('+2', { exact: true }).waitFor();
  await page.reload();
  await page.getByRole('button', { name: 'Survey Results', exact: true }).click();
  await page.getByRole('region', { name: 'Survey retake history' }).waitFor();
  for (const width of [1440, 1024, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error('Retake page overflows at ' + width);
    await page.screenshot({ path: `design-review/playwright/30-survey-retakes-${width}.png`, fullPage: true });
  }
  page.off('pageerror', onError);
  if (errors.length) throw new Error(JSON.stringify(errors));
  return { passed: ['cancel without changes', 'pre-test retake', 'post-test retake', 'separate response history', 'original comparison preserved', 'no extra XP', 'reload persistence', 'desktop/tablet layouts'], browserErrors: errors };
}
