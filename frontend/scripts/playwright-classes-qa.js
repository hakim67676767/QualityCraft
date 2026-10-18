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
  async function openClasses() {
    await page.getByRole('button', { name: 'Classes', exact: true }).click();
    await page.getByRole('heading', { name: 'Your learning community.', exact: true }).or(page.getByRole('heading', { name: 'A space for every class.', exact: true })).waitFor();
    await page.getByText('Loading classes…', { exact: true }).waitFor({ state: 'hidden' });
  }
  async function createClass(name) {
    await page.getByRole('textbox', { name: 'Class name', exact: true }).fill(name);
    await page.getByRole('button', { name: 'Create class', exact: true }).click();
    await page.getByText(name + ' is ready for students to join.', { exact: true }).waitFor();
    await page.getByRole('heading', { name, exact: true }).waitFor();
  }
  async function layout(role) {
    const dismiss = page.getByRole('button', { name: 'Dismiss reward notification', exact: true });
    if (await dismiss.count()) await dismiss.click();
    for (const width of [1440, 1024, 768]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error(role + ' page overflows at ' + width);
      if (await page.locator('.classes-workspace img').evaluateAll(images => images.some(img => !img.complete || img.naturalWidth === 0))) throw new Error('Broken classes icon');
      await page.screenshot({ path: `design-review/playwright/37-classes-${role}-${width}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  await login('administrator', 'admin@browser.test');
  await page.getByRole('button', { name: 'Manage Users', exact: true }).click();
  const account = page.locator('.account-create-panel');
  for (const person of [{ name: 'Classes Teacher', email: 'teacher@classes.test', role: 'teacher' }, { name: 'Classes Learner', email: 'student@classes.test', role: 'student' }]) {
    await account.getByLabel('Name', { exact: true }).fill(person.name);
    await account.getByLabel('Email', { exact: true }).fill(person.email);
    await account.getByLabel('Password', { exact: true }).fill('BrowserTest2026!');
    await account.getByRole('combobox', { name: 'Role', exact: true }).selectOption(person.role);
    await account.getByRole('button', { name: 'Create account', exact: true }).click();
    await page.getByText(`Created ${person.role} account for ${person.email}`, { exact: true }).waitFor();
  }
  await page.getByRole('button', { name: 'Research & Evidence', exact: true }).click();
  await page.getByRole('combobox', { name: 'Student', exact: true }).selectOption({ label: 'Classes Learner (student@classes.test)' });
  for (const checkbox of await page.locator('.research-enrol-form').getByRole('checkbox').all()) await checkbox.check();
  await page.getByRole('button', { name: 'Create record', exact: true }).click();
  await page.getByText('Participant record created.', { exact: true }).waitFor();
  await openClasses();
  await page.getByRole('heading', { name: 'Your next class starts here', exact: true }).waitFor();
  await page.getByRole('link', { name: 'Create your first class →', exact: true }).click();
  if (await page.locator('#new-class-name').evaluate(input => input !== document.activeElement)) throw new Error('Create-class anchor did not focus the input');
  await createClass('Software Quality · Staff Demo');
  await login('teacher', 'teacher@classes.test');
  await openClasses();
  await page.getByRole('heading', { name: 'Your next class starts here', exact: true }).waitFor();
  await page.getByRole('textbox', { name: 'Class name', exact: true }).fill('   ');
  await page.getByRole('button', { name: 'Create class', exact: true }).click();
  await page.getByText('Enter a class name.', { exact: true }).waitFor();
  await page.route('**/api/classes', route => route.request().method() === 'POST' ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Class creation temporarily unavailable.' }) }) : route.continue());
  await page.getByRole('textbox', { name: 'Class name', exact: true }).fill('Software Testing · Group A');
  await page.getByRole('button', { name: 'Create class', exact: true }).click();
  await page.getByText('Class creation temporarily unavailable.', { exact: true }).waitFor();
  await page.unroute('**/api/classes');
  await createClass('Software Testing · Group A');
  await createClass('Quality Assurance · Group B');
  if (await page.locator('.class-card').count() !== 2) throw new Error('Teacher classes include another teacher’s class');
  await layout('teacher');
  await page.getByRole('button', { name: /Set practical work/ }).click();
  await page.getByRole('heading', { name: 'Activity assignments', exact: true }).waitFor();
  await openClasses();
  await page.getByRole('button', { name: /Follow student progress/ }).click();
  await page.getByRole('heading', { name: 'Student monitoring', exact: true }).waitFor();
  await login('student', 'student@classes.test');
  await page.route('**/api/classes', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Classes temporarily unavailable.' }) }));
  await page.getByRole('button', { name: 'Classes', exact: true }).click();
  await page.getByText('Classes temporarily unavailable.', { exact: true }).waitFor();
  await page.unroute('**/api/classes');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await page.getByRole('heading', { name: 'You haven’t joined a class yet', exact: true }).waitFor();
  const search = page.getByRole('searchbox', { name: 'Find a class', exact: true });
  await search.fill('Classes Teacher');
  if (await page.locator('.class-card').count() !== 2) throw new Error('Teacher name search did not filter classes');
  await search.fill('no such classroom');
  await page.getByRole('heading', { name: 'No matching classes', exact: true }).first().waitFor();
  await page.locator('.classes-search').getByRole('button', { name: 'Clear search', exact: true }).click();
  const groupA = page.getByRole('article', { name: 'Software Testing · Group A', exact: true });
  await groupA.getByRole('button', { name: 'Join class', exact: true }).click();
  await page.getByRole('heading', { name: 'Pre-test survey', exact: true }).waitFor();
  for (const group of await page.getByRole('group').all()) await group.getByRole('radio').nth(2).check();
  await page.getByRole('button', { name: 'Submit pre-test', exact: true }).click();
  await page.locator('.pre-test-page').waitFor({ state: 'hidden' });
  await openClasses();
  if (await page.locator('[aria-labelledby="classes-joined"] .class-card').count() !== 1 || await page.locator('[aria-labelledby="classes-available"] .class-card').count() !== 2) throw new Error('Joined and available classes are not separated');
  await layout('student');
  await page.getByRole('button', { name: /Go to learning path/ }).click();
  await page.getByRole('heading', { name: 'Your module roadmap', exact: true }).waitFor();
  await openClasses();
  await page.route('**/api/classes/*/join', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Joining temporarily unavailable.' }) }));
  const groupB = page.getByRole('article', { name: 'Quality Assurance · Group B', exact: true });
  await groupB.getByRole('button', { name: 'Join class', exact: true }).click();
  await groupB.getByText('Joining temporarily unavailable.', { exact: true }).waitFor();
  await page.unroute('**/api/classes/*/join');
  await groupB.getByRole('button', { name: 'Join class', exact: true }).click();
  await page.getByText('You have joined Quality Assurance · Group B.', { exact: true }).waitFor();
  if (await page.locator('[aria-labelledby="classes-joined"] .class-card').count() !== 2) throw new Error('Second joined class did not update');
  await page.reload();
  await page.locator('.workspace-header h1').waitFor();
  await openClasses();
  if (await page.locator('[aria-labelledby="classes-joined"] .class-card').count() !== 2) throw new Error('Memberships were not preserved after reload');
  await login('administrator', 'admin@browser.test');
  await openClasses();
  if (await page.locator('.class-card').count() !== 3) throw new Error('Administrator cannot see all classes');
  await layout('admin');
  page.off('pageerror', onError);
  if (errors.length) throw new Error(JSON.stringify(errors));
  return { passed: ['empty states and create-field focus', 'teacher and administrator class creation', 'teacher ownership filter', 'search and clear', 'load/create/join failure recovery', 'first join opens pre-test', 'joined/available sections', 'additional membership and reload', 'learning path/assignments/monitoring shortcuts', 'three role layouts at 1440/1024/768'], browserErrors: errors };
}
