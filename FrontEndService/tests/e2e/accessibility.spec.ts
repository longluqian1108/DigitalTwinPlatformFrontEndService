import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('initial loader has no automatically detectable WCAG A/AA violations', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('dialog', { name: 'Scenario loader' })).toBeVisible()
  const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(
    report.violations,
    report.violations.map((item) => `${item.id}: ${item.help}`).join('\n'),
  ).toEqual([])
})
