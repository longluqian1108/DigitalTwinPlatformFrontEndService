import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'

interface LayoutMetrics {
  viewport: { width: number; height: number }
  shell: { width: number; height: number }
  body: { top: number; bottom: number; height: number }
  left: { width: number; height: number }
  map: { width: number; height: number }
  right: { width: number; height: number }
  dock: { top: number; height: number }
  stream: { clientHeight: number; scrollHeight: number }
}

async function metrics(page: Page): Promise<LayoutMetrics> {
  return page.evaluate(() => {
    const rect = (selector: string) => {
      const value = document.querySelector(selector)?.getBoundingClientRect()
      if (!value) throw new Error(`Missing layout element: ${selector}`)
      return value
    }
    const shell = rect('.shell'),
      body = rect('.body'),
      left = rect('.left'),
      map = rect('.map'),
      right = rect('.right'),
      dock = rect('.shell > footer')
    const stream = document.querySelector<HTMLElement>('.stream')
    if (!stream) throw new Error('Missing event stream')
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      shell: { width: shell.width, height: shell.height },
      body: { top: body.top, bottom: body.bottom, height: body.height },
      left: { width: left.width, height: left.height },
      map: { width: map.width, height: map.height },
      right: { width: right.width, height: right.height },
      dock: { top: dock.top, height: dock.height },
      stream: { clientHeight: stream.clientHeight, scrollHeight: stream.scrollHeight },
    }
  })
}

async function buildMockScenario(page: Page) {
  const root = process.cwd(),
    inputs = page.locator('input[type=file]')
  await inputs.nth(0).setInputFiles(path.join(root, 'public/mock-data/environment.json'))
  await page.getByRole('button', { name: 'Confirm environment' }).click()
  await inputs.nth(1).setInputFiles(path.join(root, 'public/mock-data/resource.json'))
  await page.getByRole('button', { name: 'Confirm resource' }).click()
  await inputs.nth(2).setInputFiles(path.join(root, 'public/mock-data/task.json'))
  await page.getByRole('button', { name: 'Confirm task' }).click()
  await page.getByRole('button', { name: 'Build simulation' }).click()
  await expect(page.getByRole('dialog', { name: 'Scenario loader' })).toBeHidden()
}

async function dragHandle(page: Page, name: string, deltaX: number, deltaY: number) {
  const handle = page.getByRole('button', { name })
  const box = await handle.boundingBox()
  if (!box) throw new Error(`${name} is not visible`)
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + deltaX, y + deltaY, { steps: 5 })
  await page.mouse.up()
}

test('fills each viewport and proportionally grows all three columns', async ({ page }) => {
  const samples: LayoutMetrics[] = []
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1600, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.locator('.shell')).toBeVisible()
    const current = await metrics(page)
    expect(current.shell.width).toBeCloseTo(viewport.width, 0)
    expect(current.shell.height).toBeCloseTo(viewport.height, 0)
    expect(current.left.height).toBeCloseTo(current.body.height, 0)
    expect(current.map.height).toBeCloseTo(current.body.height, 0)
    expect(current.right.height).toBeCloseTo(current.body.height, 0)
    samples.push(current)
  }
  expect(samples[1]!.left.width).toBeGreaterThan(samples[0]!.left.width)
  expect(samples[1]!.map.width).toBeGreaterThan(samples[0]!.map.width)
  expect(samples[1]!.right.width).toBeGreaterThan(samples[0]!.right.width)
  expect(samples[2]!.left.width).toBeGreaterThan(samples[1]!.left.width)
  expect(samples[2]!.map.width).toBeGreaterThan(samples[1]!.map.width)
  expect(samples[2]!.right.width).toBeGreaterThan(samples[1]!.right.width)
})

test('keeps the command dock fixed while 80 events scroll inside their panel', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/')
  const before = await metrics(page)
  await page.evaluate(() => {
    const stream = document.querySelector('.stream'),
      original = stream?.querySelector('.event')
    const event =
      original ??
      Object.assign(document.createElement('button'), {
        className: 'event',
        textContent: 'Synthetic realtime event',
      })
    for (let index = 0; index < 80; index += 1) stream?.append(event.cloneNode(true))
  })
  const after = await metrics(page)
  expect(after.shell.height).toBeCloseTo(720, 0)
  expect(after.body.height).toBeCloseTo(before.body.height, 0)
  expect(after.dock.top).toBeCloseTo(before.dock.top, 0)
  expect(after.stream.clientHeight).toBeCloseTo(before.stream.clientHeight, 0)
  expect(after.stream.scrollHeight).toBeGreaterThan(after.stream.clientHeight)
})

test('persists dragged ratios and reapplies them after reload and resize', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto('/')
  await buildMockScenario(page)
  await dragHandle(page, 'Resize events panel', 90, 0)
  await dragHandle(page, 'Resize entity panel', -70, 0)
  await dragHandle(page, 'Resize command dock', 0, -35)
  const dragged = await metrics(page)
  const saved = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('lbs.layout.v2') ?? '{}') as {
        version?: number
        leftRatio?: number
        rightRatio?: number
        dockRatio?: number
      },
  )
  expect(saved.version).toBe(2)
  expect(saved.leftRatio).toBeGreaterThan(0.255)
  expect(saved.rightRatio).toBeGreaterThan(0.35)
  expect(saved.dockRatio).toBeGreaterThan(0.28)

  await page.reload()
  const reloaded = await metrics(page)
  expect(reloaded.left.width).toBeCloseTo(dragged.left.width, 0)
  expect(reloaded.right.width).toBeCloseTo(dragged.right.width, 0)
  expect(reloaded.dock.height).toBeCloseTo(dragged.dock.height, 0)
  await page.setViewportSize({ width: 1920, height: 1080 })
  const resized = await metrics(page)
  expect(resized.left.width).toBeGreaterThan(reloaded.left.width)
  const reloadedShare =
    reloaded.left.width / (reloaded.left.width + reloaded.map.width + reloaded.right.width)
  const resizedShare =
    resized.left.width / (resized.left.width + resized.map.width + resized.right.width)
  expect(resizedShare).toBeCloseTo(reloadedShare, 2)
})
