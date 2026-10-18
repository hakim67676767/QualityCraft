async page => {
  const errors = [];
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  const layouts = [];
  async function inspect(label) {
    const result = await page.evaluate(() => ({ width: innerWidth, pageWidth: document.documentElement.scrollWidth, brokenImages: Array.from(document.images).filter((image) => !image.complete || !image.naturalWidth).map((image) => image.getAttribute('src')) }));
    layouts.push({ label, ...result });
    if (result.pageWidth > result.width + 1) throw new Error(label + ' overflows the page: ' + JSON.stringify(result));
    if (result.brokenImages.length) throw new Error(label + ' has broken images: ' + JSON.stringify(result.brokenImages));
  }
  for (const width of [1440, 1024, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    await inspect('Research administrator ' + width);
    await page.screenshot({ path: `design-review/playwright/13-admin-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Sign Out' }).click();
  await page.locator('.role-student').click();
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  if (await page.locator('#account-password').getAttribute('type') !== 'text') throw new Error('Show password failed');
  await page.getByRole('button', { name: 'Hide password', exact: true }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('missing@browser.test');
  await page.getByLabel('Password', { exact: true }).fill('BrowserTest2026!');
  await page.getByRole('button', { name: 'Sign in & keep learning' }).click();
  await page.getByRole('alert').getByText('Invalid email or password', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Create a free student account' }).click();
  await page.getByRole('textbox', { name: 'Your name', exact: true }).fill('Browser Signup');
  await page.getByRole('textbox', { name: 'Email address' }).fill('signup@browser.test');
  await page.getByLabel('Password', { exact: true }).fill('BrowserTest2026!');
  await page.getByRole('button', { name: 'Create my account' }).click();
  await page.locator('.workspace-header h1').waitFor();
  await page.getByRole('button', { name: 'Classes', exact: true }).waitFor();
  if (await page.getByRole('button', { name: 'Manage Users', exact: true }).count()) throw new Error('Public sign-up gained administrator navigation');
  await page.reload();
  await page.locator('.workspace-header h1').waitFor();
  await inspect('New student session restored');
  await page.getByRole('button', { name: 'Sign Out' }).click();
  await page.locator('.role-student').click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('student@browser.test');
  await page.getByLabel('Password', { exact: true }).fill('BrowserTest2026!');
  await page.getByRole('button', { name: 'Sign in & keep learning' }).click();
  await page.getByRole('button', { name: 'Learning Path', exact: true }).click();
  for (const width of [1440, 1024, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    await inspect('Student learning path ' + width);
    await page.screenshot({ path: `design-review/playwright/14-student-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Sign Out' }).click();
  await page.locator('.role-teacher').click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('teacher@browser.test');
  await page.getByLabel('Password', { exact: true }).fill('BrowserTest2026!');
  await page.getByRole('button', { name: 'Sign in & keep learning' }).click();
  await page.getByRole('button', { name: 'Monitoring', exact: true }).click();
  await page.locator('.review-selectors').waitFor();
  for (const width of [1440, 1024, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    await inspect('Teacher monitoring ' + width);
    await page.screenshot({ path: `design-review/playwright/15-teacher-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  page.off('pageerror', onError);
  if (errors.length) throw new Error(JSON.stringify(errors));
  return { passed: ['desktop and tablet research layouts', 'password visibility toggle', 'invalid login feedback', 'public student registration', 'session restoration after reload', 'desktop and tablet student layouts', 'desktop and tablet teacher layouts'], layouts, browserErrors: errors };
}
