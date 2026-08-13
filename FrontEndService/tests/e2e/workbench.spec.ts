import { expect, test } from '@playwright/test'
import path from 'node:path'

test('builds the mock scenario and runs query/control paths', async ({ page }, testInfo) => {
  await page.goto('/')
  const root = process.cwd()
  const inputs = page.locator('input[type=file]')
  await inputs.nth(0).setInputFiles(path.join(root, 'public/mock-data/environment.json'))
  await page.getByRole('button', { name: 'Confirm environment' }).click()
  await inputs.nth(1).setInputFiles(path.join(root, 'public/mock-data/resource.json'))
  await page.getByRole('button', { name: 'Confirm resource' }).click()
  await inputs.nth(2).setInputFiles(path.join(root, 'public/mock-data/task.json'))
  await page.getByRole('button', { name: 'Confirm task' }).click()
  await page.getByRole('button', { name: 'Build simulation' }).click()
  await expect(page.getByText('READY', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.getByText('RUNNING', { exact: true }).first()).toBeVisible({ timeout: 3_000 })
  await page.getByRole('textbox', { name: 'Command line input' }).fill('TIME')
  await page.getByRole('textbox', { name: 'Command line input' }).press('Enter')
  await page.getByRole('button', { name: 'QUERY RESULT' }).click()
  await expect(page.getByText(/"operation": "TIME"/)).toBeVisible()
  await page.screenshot({ path: path.join(root, 'tests/screenshots/running-workbench.png'), fullPage: true })
  await testInfo.attach('running-workbench', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
})
