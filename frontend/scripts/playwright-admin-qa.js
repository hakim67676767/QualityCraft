async page => {
  const errors = [];
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.context().clearCookies();
  await page.goto('http://127.0.0.1:4179/');
  await page.locator('.role-administrator').click();
  await page.getByLabel('Email address').fill('admin@browser.test');
  await page.getByLabel('Password', { exact: true }).fill('BrowserTest2026!');
  await page.getByRole('button', { name: 'Sign in & keep learning' }).click();
  await page.locator('.workspace-header h1').waitFor();
  await page.getByRole('button', { name: 'Manage Users', exact: true }).click();
  const form = page.locator('.account-create-panel');
  for (const account of [{ name: 'Browser Teacher', email: 'teacher@browser.test', role: 'teacher' }, { name: 'Browser Learner', email: 'student@browser.test', role: 'student' }]) {
    await form.getByLabel('Name', { exact: true }).fill(account.name);
    await form.getByLabel('Email', { exact: true }).fill(account.email);
    await form.getByLabel('Password', { exact: true }).fill('BrowserTest2026!');
    await form.getByRole('combobox', { name: 'Role', exact: true }).selectOption(account.role);
    await form.getByRole('button', { name: 'Create account', exact: true }).click();
    await page.getByText(`Created ${account.role} account for ${account.email}`, { exact: true }).waitFor();
  }
  await page.screenshot({ path: 'design-review/playwright/01-admin-users.png', fullPage: true });
  await page.getByRole('button', { name: 'Research & Evidence', exact: true }).click();
  await page.getByRole('button', { name: 'Refresh data' }).waitFor({ state: 'visible' });
  await page.getByRole('combobox', { name: 'Student', exact: true }).selectOption({ label: 'Browser Learner (student@browser.test)' });
  await page.getByRole('button', { name: 'Create record', exact: true }).click();
  await page.getByText('Participant record created.', { exact: true }).waitFor();
  const row = page.getByRole('row').filter({ hasText: 'Browser Learner' });
  await row.getByRole('checkbox', { name: 'Guardian consent for Browser Learner' }).check();
  await row.getByRole('checkbox', { name: 'Student assent for Browser Learner' }).check();
  await row.getByRole('checkbox', { name: 'School permission for Browser Learner' }).check();
  await row.getByRole('combobox').selectOption('authorised');
  await row.getByRole('button', { name: 'Save approvals' }).click();
  await page.getByText('Participant approvals and status updated.', { exact: true }).waitFor();
  await page.getByRole('checkbox', { name: 'Require research authorisation' }).check();
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await page.getByText('System settings updated.', { exact: true }).waitFor();
  async function createInstrument(phase, title, version, status, prompt, options, answer) {
    const editor = page.locator('.research-instrument-form');
    await editor.getByRole('combobox', { name: 'Phase', exact: true }).selectOption(phase);
    await editor.getByLabel('Version', { exact: true }).fill(version);
    await editor.getByLabel('Instrument title').fill(title);
    await editor.getByRole('combobox', { name: 'Status', exact: true }).selectOption(status);
    await editor.getByLabel('Question', { exact: true }).fill(prompt);
    await editor.getByRole('combobox', { name: 'Type', exact: true }).selectOption('multiple_choice');
    await editor.getByLabel('Answer choices, one per line').fill(options);
    await editor.getByLabel('Correct answer', { exact: true }).fill(answer);
    await editor.getByRole('button', { name: 'Create instrument', exact: true }).click();
    await page.getByText('Assessment instrument created.', { exact: true }).waitFor();
  }
  await createInstrument('pre', 'Browser draft assessment', 'ui-draft', 'draft', 'Draft question', 'A\nB', 'A');
  await page.locator('.research-instrument-list button').filter({ hasText: 'Browser draft assessment' }).click();
  await page.getByLabel('Instrument title').fill('Browser draft updated');
  await page.getByRole('textbox', { name: 'Question', exact: true }).fill('Updated draft question');
  await page.getByRole('button', { name: 'Save instrument', exact: true }).click();
  await page.getByText('Assessment instrument updated.', { exact: true }).waitFor();
  await page.locator('.research-instrument-list button').filter({ hasText: 'Browser draft updated' }).waitFor();
  page.off('pageerror', onError);
  if (errors.length) throw new Error(JSON.stringify(errors));
  return { passed: ['administrator login', 'create teacher and student', 'register pending participant', 'update approvals and authorise', 'enable consent gate', 'edit draft instrument'], browserErrors: errors };
}
