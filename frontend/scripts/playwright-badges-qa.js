async page => {
  const errors = [];
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  await page.context().clearCookies();
  await page.goto('http://127.0.0.1:4179/');
  await page.locator('.role-student').click();
  await page.getByLabel('Email address').fill('student@browser.test');
  await page.getByLabel('Password', { exact: true }).fill('BrowserTest2026!');
  await page.getByRole('button', { name: 'Sign in & keep learning' }).click();
  await page.getByRole('button', { name: 'Badges', exact: true }).click();
  await page.locator('.achievement-card').first().waitFor();
  const count = await page.locator('.achievement-card').count();
  const data = await page.evaluate(async () => (await fetch('/api/dashboard')).json());
  if (count !== data.badges.length || count < 8) throw new Error('Earned collection does not match the student dashboard');
  if (data.badges.some(badge => !badge.criteria_type || !badge.description)) throw new Error('Badge display metadata is missing');
  const kinds = await page.locator('.achievement-card .badge-medal').evaluateAll(items => [...new Set(items.map(item => item.dataset.kind))]);
  if (kinds.length < 8) throw new Error('Milestones are missing their distinct symbols');
  for (const badge of data.badges) {
    const card = page.locator('.achievement-card').filter({ has: page.getByRole('heading', { name: badge.name, exact: true }) });
    await card.getByText(badge.description, { exact: true }).waitFor();
    if (!await card.locator('time').innerText()) throw new Error('Earned date is missing');
  }
  await page.getByRole('combobox', { name: 'Sort badges' }).selectOption('name');
  const names = await page.locator('.achievement-card h3').allTextContents();
  if (names.join('|') !== [...names].sort((a, b) => a.localeCompare(b)).join('|')) throw new Error('Name sorting failed');
  for (const order of ['oldest', 'latest']) {
    await page.getByRole('combobox', { name: 'Sort badges' }).selectOption(order);
    const dates = await page.locator('.achievement-card time').evaluateAll(items => items.map(item => Date.parse(item.dateTime)));
    if (dates.some((value, index) => index > 0 && (order === 'oldest' ? value < dates[index - 1] : value > dates[index - 1]))) throw new Error('Date sorting failed');
  }
  for (const width of [1440, 1024, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (overflow) throw new Error('Badge collection overflows at ' + width);
    await page.screenshot({ path: `design-review/playwright/20-badge-collection-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Continue learning', exact: false }).click();
  await page.locator('.path-card').first().waitFor();
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.locator('.reward-item .badge-medal').first().waitFor();
  await page.locator('.reward-shelf').screenshot({ path: 'design-review/playwright/21-dashboard-badges.png' });
  // Empty collection is a display fixture; award rules and stored records stay intact.
  const emptyDashboard = async route => {
    const response = await route.fetch();
    const payload = await response.json();
    await route.fulfill({ response, json: { ...payload, badges: [] } });
  };
  await page.route('**/api/dashboard', emptyDashboard);
  await page.reload();
  await page.getByRole('button', { name: 'Badges', exact: true }).click();
  await page.getByRole('heading', { name: 'Great collections start with a first step.', exact: true }).waitFor();
  if (await page.locator('.achievement-card').count()) throw new Error('Empty collection displayed an earned badge');
  await page.screenshot({ path: 'design-review/playwright/22-empty-badges.png', fullPage: true });
  await page.getByRole('button', { name: 'Explore your learning path' }).click();
  await page.locator('.path-card').first().waitFor();
  await page.unroute('**/api/dashboard', emptyDashboard);
  await page.getByRole('button', { name: 'Sign Out' }).click();
  await page.locator('.role-administrator').click();
  await page.getByLabel('Email address').fill('admin@browser.test');
  await page.getByLabel('Password', { exact: true }).fill('BrowserTest2026!');
  await page.getByRole('button', { name: 'Sign in & keep learning' }).click();
  await page.getByRole('button', { name: 'XP & Badges', exact: true }).click();
  await page.locator('.admin-badge-item').first().waitFor();
  const editor = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Add badge', exact: true }) });
  await editor.getByRole('textbox', { name: 'Name', exact: true }).fill('Curious Quality Explorer');
  await editor.getByRole('combobox', { name: 'Milestone', exact: true }).selectOption('activity_count');
  await editor.getByRole('textbox', { name: 'Description', exact: true }).fill('Explore practical testing with care and curiosity.');
  const preview = page.getByLabel('Badge preview', { exact: true });
  await preview.getByRole('heading', { name: 'Curious Quality Explorer', exact: true }).waitFor();
  if (await preview.locator('.badge-medal').getAttribute('data-kind') !== 'activity_count') throw new Error('Admin preview uses the wrong milestone symbol');
  await page.screenshot({ path: 'design-review/playwright/23-admin-badge-preview.png', fullPage: true });
  for (const width of [1024, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error('Administrator badges overflow at ' + width);
  }
  await page.reload();
  await page.locator('.workspace-header h1').waitFor();
  page.off('pageerror', onError);
  if (errors.length) throw new Error(JSON.stringify(errors));
  return { earnedBadges: count, distinctSymbols: kinds.length, passed: ['earned descriptions and dates', 'name and date sorting', 'desktop/tablet layouts', 'continue learning', 'dashboard medals', 'empty collection and action', 'administrator live preview'], browserErrors: errors };
}
