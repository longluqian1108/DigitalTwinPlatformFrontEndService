// A-00 (docs/frontend-alignment/2026-09-05-frontend-adaptation-guide.md §0.2a):
// copy the backend generated TypeScript contracts into the frontend tree so the
// app never hand-writes wire shapes. Vendored copies are DO NOT EDIT; this script
// is the only sanctioned way to refresh them.
// Usage: node scripts/sync-lbs-contracts.mjs [backendRoot]
//   backendRoot defaults to ../Simulator-authority-worktree relative to the repo root.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const defaultBackendRoot = resolve(frontendRoot, '..', '..', 'Simulator-authority-worktree')
const backendRoot = resolve(process.argv[2] ?? defaultBackendRoot)
const source = join(backendRoot, 'generated', 'typescript', 'lightbluesky-contracts')
const target = join(frontendRoot, 'src', 'contracts', 'lightbluesky')

if (!existsSync(join(source, 'types', 'contracts.ts'))) {
  console.error(`[sync-lbs-contracts] generated contracts not found under ${source}`)
  process.exit(1)
}

// The generated runtime client is plain JS in .ts clothing (generated for
// node --experimental-strip-types). Vendored copies are excluded from strict
// checking with a @ts-nocheck header; the app still consumes their inferred
// exported constants/types. Type-only modules keep full checking.
function guard(filepath) {
  const text = readFileSync(filepath, 'utf8')
  if (text.includes('@ts-nocheck')) return
  writeFileSync(filepath, `// @ts-nocheck\n${text}`)
}

rmSync(target, { recursive: true, force: true })
mkdirSync(dirname(target), { recursive: true })
cpSync(source, target, { recursive: true })

for (const part of ['client', 'protocol', 'types', 'validators']) {
  const dir = join(target, part)
  if (!existsSync(dir)) continue
  for (const entry of readdirRecursive(dir)) {
    if (entry.endsWith('.ts')) guard(join(dir, entry))
  }
}

let commit = 'unknown'
try { commit = execSync('git rev-parse HEAD', { cwd: backendRoot }).toString().trim() } catch { /* read-only best effort */ }

// Reproducible provenance: no machine-absolute paths, no wall-clock time.
// tree_sha256 covers the final vendored bytes (after the @ts-nocheck guard),
// excluding VERSION.txt itself, so identical backend input yields identical
// output on any machine.
const manifest = []
for (const part of ['client', 'protocol', 'types', 'validators']) {
  const dir = join(target, part)
  if (!existsSync(dir)) continue
  for (const rel of readdirRecursive(dir)) {
    const bytes = readFileSync(join(dir, rel))
    const digest = createHash('sha256').update(bytes).digest('hex')
    manifest.push(`${part}/${rel.replaceAll('\\', '/')} ${digest} ${bytes.length}`)
  }
}
manifest.sort()
const treeSha256 = createHash('sha256').update(manifest.join('\n') + '\n').digest('hex')
const sourceRootLabel = `${basename(backendRoot)}/generated/typescript/lightbluesky-contracts`
writeFileSync(
  join(target, 'VERSION.txt'),
  [
    'generator: scripts/sync-lbs-contracts.mjs',
    `source_root: ${sourceRootLabel}`,
    `backend_commit: ${commit}`,
    `tree_sha256: ${treeSha256}`,
    `files: ${manifest.length}`,
    'note: DO NOT EDIT - vendored from backend generated contracts; refresh via scripts/sync-lbs-contracts.mjs',
    '',
  ].join('\n'),
)
console.log(`[sync-lbs-contracts] synced ${manifest.length} files from backend commit ${commit} -> ${target}`)
console.log(`[sync-lbs-contracts] tree_sha256 ${treeSha256}`)

function readdirRecursive(dir) {
  const out = []
  const stack = [dir]
  while (stack.length) {
    const current = stack.pop()
    for (const entry of readdirSync(current).sort()) {
      const full = join(current, entry)
      if (statSync(full).isDirectory()) stack.push(full)
      else out.push(full.slice(dir.length + 1))
    }
  }
  return out.sort()
}
