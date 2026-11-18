/* eslint-disable @typescript-eslint/no-require-imports -- plain Node script run with `node` */
// End-to-end check of the CDP results platform against a running server (npm start) with an empty CDP dataset.
// Needs the admin from the seed (ADMIN_EMAIL/ADMIN_PASSWORD) and the helper files from scripts/make_cdp_fixture.py --invalid.

const { chromium } = require('playwright');
const assert = require('assert');
const B = 'http://localhost:3000';
const SHOTS = process.env.SHOTS || require('os').tmpdir();
const FIX = require('path').join(__dirname, 'fixtures/cdp-synthetic-137.xlsx');
const log = (...a) => console.log('✔', ...a);

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  // login as admin, redirected back to /cdp
  await page.goto(B + '/ar/cdp');
  assert.match(page.url(), /admin\/login\?next=%2Fcdp/);
  await page.fill('#email', process.env.ADMIN_EMAIL || 'admin@example.com');
  await page.fill('#password', process.env.ADMIN_PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL(/\/ar\/cdp/);
  await page.getByText('لا توجد بيانات منشورة بعد').waitFor();
  log('login → /cdp, empty state');

  // invalid uploads
  await page.goto(B + '/ar/admin/cdp');
  for (const [f, expect] of [['' + require('path').join(SHOTS, 'not-excel.xlsx') + '', 'ليس ملف Excel'], ['' + require('path').join(SHOTS, 'no-dept.xlsx') + '', 'أخطاء تمنع نشره']]) {
    await page.setInputFiles('input[type=file]', f);
    await page.click('button:has-text("رفع وتحقق")');
    await page.getByText(expect).first().waitFor();
  }
  await page.getByText('عمود القسم / المجال التشغيلي غير موجود').first().waitFor();
  assert.ok(await page.locator('[data-testid=dataset]').first().locator('button:has-text("نشر")').isDisabled());
  log('invalid files rejected / not publishable');

  // valid upload + publish
  await page.setInputFiles('input[type=file]', FIX);
  await page.click('button:has-text("رفع وتحقق")');
  await page.getByText('تم التحقق من الملف. راجع التقرير').waitFor();
  await page.reload();
  const card = page.locator('[data-testid=dataset]').first();
  await card.getByText('جميع الأعداد مطابقة').waitFor();
  const refs = await card.locator('[data-testid=ref-item]').allInnerTexts();
  assert.equal(refs.length, 1 + 4 + 12);
  await page.screenshot({ path: SHOTS + '/admin-upload.png', fullPage: true });
  page.once('dialog', (d) => d.accept());
  await card.locator('button:has-text("نشر")').click();
  await page.getByText('تم النشر').waitFor();
  log('valid file validated (17 reference checks OK) and published');

  // dashboard
  await page.goto(B + '/ar/cdp');
  assert.equal(await page.textContent('[data-testid=total-responses]'), '137');
  const depts = await page.locator('[data-testid=dept-chart] li').allInnerTexts();
  const flat = depts.map((d) => d.replace(/\s+/g, ' '));
  console.log(flat);
  assert.ok(flat[0].includes('Network and Facilities Operations') && flat[0].includes('102') && flat[0].includes('74.5%'));
  assert.ok(flat[1].includes('Facility Operation') && flat[1].includes('19'));
  assert.ok(flat[2].includes('Electrotechnical') && flat[2].includes('13'));
  assert.ok(flat[3].includes('Physical Security') && flat[3].includes('3') && flat[3].includes('2.2%'));
  const sat = async (id) => (await page.locator(`[data-testid=sat-${id}] dd`).allInnerTexts()).map((s) => s.replace(/\s+/g, ' '));
  const exp = { AQ: [34, 46, 57], AR: [38, 42, 57], AS: [38, 45, 54], AO: [49, 44, 44] };
  for (const [q, [y, p, n]] of Object.entries(exp)) {
    const v = await sat(q);
    assert.ok(v[0].includes(`(${y})`) && v[1].includes(`(${p})`) && v[2].includes(`(${n})`), q + ' ' + v);
  }
  console.log('AQ', await sat('AQ'));
  log('137, departments and 4 satisfaction cards match');
  await page.screenshot({ path: SHOTS + '/dashboard-ar.png', fullPage: false });

  // tab order and question placement
  const panelIds = async (tab) => page.locator(`#panel-${tab} [id^=q-]`).evaluateAll((els) => els.map((e) => e.id.slice(2)));
  const expectTabs = {
    general: ['AQ', 'F', 'G', 'H', 'I', 'AT'],
    cdpt: ['AR', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'],
    ojt: ['AS', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB'],
    huawei: ['AO', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'AM', 'AN', 'AP', 'AV', 'AW'],
  };
  assert.equal(await page.getAttribute('#tab-general', 'aria-selected'), 'true');
  for (const [tab, ids] of Object.entries(expectTabs)) assert.deepEqual(await panelIds(tab), ids, tab);
  log('every question in its tab, satisfaction first, order as specified');

  // filter by department
  await page.locator('[data-testid=dept-chart] button').nth(1).click();
  assert.match(await page.textContent('[data-testid=in-view]'), /19/);
  const filtered = await sat('AQ');
  const sum = filtered.map((s) => Number(s.match(/\((\d+)\)/)[1])).reduce((a, b) => a + b, 0);
  assert.equal(sum, 19);
  assert.match(page.url(), /dept=1/);
  console.log('Facility Operation AQ', filtered);
  await page.selectOption('#dept-filter', '');
  assert.match(await page.textContent('[data-testid=in-view]'), /137/);
  log('filter updates counts; reset to all');

  // tab content: open huawei; admin sees names and original toggle
  await page.click('#tab-huawei');
  await page.locator('[data-testid=people-repeated]').waitFor();
  const repeatedNames = await page.textContent('[data-testid=people-repeated]');
  assert.ok(repeatedNames.includes('Test Alpha'), repeatedNames);
  assert.ok((await page.textContent('[data-testid=thanks-names]')).includes('Test Alpha'));
  await page.click('#tab-general');
  const at = page.locator('#q-AT');
  assert.ok((await at.innerText()).includes('[name]'));
  await at.getByText('عرض النصوص الأصلية').click();
  assert.ok((await at.innerText()).includes('Eng. Test Alpha'));
  log('admin: original texts + thanks names visible');

  // theme edit
  await at.locator('input[type=search]').fill('specialist');
  await at.getByText('تعديل الموضوعات').first().click();
  await at.locator('fieldset label:has-text("وضوح الخطة") input').check();
  await at.locator('fieldset button:has-text("حفظ")').click();
  await at.getByText('تصنيف يدوي').first().waitFor();
  log('manual theme tagging saved');
  await page.screenshot({ path: SHOTS + '/comments-ar.png', fullPage: false, clip: undefined });

  // presentation mode
  await page.click('button:has-text("وضع العرض للإدارة")');
  assert.equal(await page.locator('a:has-text("رفع ملف البيانات")').count(), 0);
  assert.equal(await page.getByText('عرض النصوص الأصلية').count(), 0);
  assert.ok(!(await page.locator('form button:has-text("تسجيل الخروج")').isVisible()));
  assert.match(page.url(), /present=1/);
  await page.screenshot({ path: SHOTS + '/present-ar.png', fullPage: true });
  await page.click('button:has-text("إنهاء وضع العرض")');
  log('presentation mode hides upload/settings');

  // create management viewer
  await page.goto(B + '/ar/admin/users');
  await page.fill('#u-name', 'Board Viewer');
  await page.fill('#u-email', 'viewer@example.com');
  await page.selectOption('#u-role', 'VIEWER');
  await page.fill('#u-password', 'ViewerPass-2026!');
  await page.locator('form button[type=submit]').last().click();
  await page.getByText('Board Viewer').waitFor();
  log('viewer created');

  // english
  await page.goto(B + '/en/cdp?tab=cdpt');
  assert.equal(await page.getAttribute('html', 'dir'), 'ltr');
  await page.getByText('Total Survey Responses').first().waitFor();
  assert.equal(await page.getAttribute('#tab-cdpt', 'aria-selected'), 'true');
  await page.screenshot({ path: SHOTS + '/dashboard-en-cdpt.png', fullPage: false });
  log('English LTR works, tab from URL');

  // viewer session
  const vctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const v = await vctx.newPage();
  await v.goto(B + '/ar/admin/login?next=/cdp');
  await v.fill('#email', 'viewer@example.com');
  await v.fill('#password', 'ViewerPass-2026!');
  await v.click('button[type=submit]');
  await v.waitForURL(/\/ar\/cdp/);
  const html = await v.content();
  for (const secret of ['Test Alpha', 'اختبار تجريبي', '99123456', 'test.person@example.com', 'Respondent Fake', 'respondent001@example.com', 'Demo Charlie'])
    assert.ok(!html.includes(secret), 'viewer HTML leaks ' + secret);
  assert.equal(await v.getByText('عرض النصوص الأصلية').count(), 0);
  assert.ok(await v.locator('[data-testid=dept-chart] button').nth(3).isDisabled(), 'small dept should be locked');
  assert.equal(await v.locator('a:has-text("رفع ملف البيانات")').count(), 0);
  await v.click('#tab-huawei');
  await v.locator('[data-testid=people-locked]').waitFor();
  assert.equal(await v.locator('[data-testid=thanks-locked]').count(), 2);
  // viewer cannot reach admin pages
  await v.goto(B + '/ar/admin/cdp');
  assert.match(v.url(), /\/ar\/cdp/);
  await v.goto(B + '/ar/admin/devices');
  assert.match(v.url(), /\/ar\/cdp/);
  // small dept via URL is ignored
  await v.goto(B + '/ar/cdp?dept=3');
  assert.match(await v.textContent('[data-testid=in-view]'), /137/);
  log('viewer: no raw data in HTML, small department locked, admin pages blocked');

  // management PDF export
  await v.goto(B + '/ar/cdp/report?dept=0');
  const rhtml = await v.content();
  for (const secret of ['Test Alpha', 'Respondent Fake', 'respondent001@example.com', '99123456', 'Demo Charlie']) assert.ok(!rhtml.includes(secret), 'report leaks ' + secret);
  const meta = await v.textContent('[data-testid=report-meta]');
  assert.ok(meta.includes('Network and Facilities Operations') && meta.includes('102') && meta.includes('cdp-synthetic-137.xlsx'));
  await v.emulateMedia({ media: 'print' });
  await v.pdf({ path: SHOTS + '/report-ar.pdf', format: 'A4', printBackground: true });
  // admin's export is also management-level
  await page.goto(B + '/ar/cdp/report');
  const ahtml = await page.content();
  assert.ok(!ahtml.includes('Test Alpha') && !ahtml.includes('Respondent Fake'));
  log('PDF export: dept, count, date, file name; no names/IDs (viewer and admin)');

  // server action authorisation: viewer calling theme action is refused (simulate by checking DB later)
  // mobile
  const m = await browser.newContext({ ...require('playwright').devices['iPhone 13'] });
  const mp = await m.newPage();
  await m.addCookies(await vctx.cookies());
  await mp.goto(B + '/ar/cdp');
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 0, 'horizontal overflow ' + overflow);
  await mp.screenshot({ path: SHOTS + '/mobile-ar.png', fullPage: false });
  log('mobile: no horizontal overflow');

  // missing column + blanks file → warnings, publish, cards show notice
  await page.goto(B + '/ar/admin/cdp');
  await page.setInputFiles('input[type=file]', require('path').join(SHOTS, 'missing-aq.xlsx'));
  await page.click('button:has-text("رفع وتحقق")');
  await page.getByText('تم التحقق من الملف. راجع التقرير').waitFor();
  await page.reload();
  const c2 = page.locator('[data-testid=dataset]').first();
  await c2.getByText('عمود مطلوب غير موجود: AQ').waitFor();
  page.once('dialog', (d) => d.accept());
  await c2.locator('button:has-text("نشر")').click();
  await page.getByText('تم النشر').waitFor();
  await page.goto(B + '/ar/cdp');
  await page.locator('#q-AQ').getByText('لم يُعثر على عمود هذا السؤال').waitFor();
  assert.match(await page.locator('#q-F').innerText(), /ردود فارغة: 42/);
  log('missing column notice + blank count shown');
  // restore the full file
  await page.goto(B + '/ar/admin/cdp');
  const prev = page.locator('[data-testid=dataset]').filter({ hasText: 'cdp-synthetic-137.xlsx' }).first();
  if (!(await prev.evaluate((e) => e.open))) await prev.locator(':scope > summary').click();
  page.once('dialog', (d) => d.accept());
  await prev.locator('button:has-text("نشر")').click();
  await page.getByText('تم النشر').waitFor();

  console.log('page errors:', errors);
  await browser.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
