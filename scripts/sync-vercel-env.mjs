import { readFileSync, existsSync } from 'fs'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env')

const TARGETS = ['production', 'preview', 'development']
const PRODUCTION_ONLY_KEYS = new Set(['NEXT_PUBLIC_APP_URL'])
const SYNC_SKIP_KEYS = new Set([
  'DIDIT_WEBHOOK_SECRET_PREVIEW',
  'DIDIT_WEBHOOK_SECRET_DEVELOPMENT',
])

function parseEnv(content) {
  const vars = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    vars[key] = value
  }
  return vars
}

function runVercel(args, input) {
  const result = spawnSync('npx', ['vercel', ...args], {
    cwd: root,
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  return result
}

function vercel(args, input) {
  const result = runVercel(args, input)
  if (result.status !== 0) {
    const message = [result.stdout, result.stderr].filter(Boolean).join('\n')
    throw new Error(message || `vercel ${args.join(' ')} failed`)
  }
  return result.stdout
}

function removeKey(key, targets = TARGETS) {
  for (const target of targets) {
    const result = runVercel(['env', 'rm', key, target, '--yes'], undefined)
    if (result.status !== 0) {
      const output = `${result.stdout}${result.stderr}`
      if (!/not found|does not exist/i.test(output)) {
        console.warn(`Could not remove ${key} (${target}): ${output.trim()}`)
      }
    }
  }
}

function envTypeForKey(key) {
  if (key.startsWith('NEXT_PUBLIC_')) return 'config'
  return 'secret'
}

function upsertKey(key, value, targets = TARGETS) {
  if (!value) {
    console.warn(`Skipping ${key} — empty value`)
    return
  }

  removeKey(key, targets)
  vercel(
    [
      'env',
      'add',
      key,
      targets.join(','),
      '--type',
      envTypeForKey(key),
      '--value',
      value,
      '--yes',
      '--force',
    ],
    undefined
  )
}

function ensureLinked() {
  const projectJson = join(root, '.vercel', 'project.json')
  const repoJson = join(root, '.vercel', 'repo.json')
  if (!existsSync(projectJson) && !existsSync(repoJson)) {
    throw new Error('Project is not linked. Run: npm run vercel:link')
  }
}

function ensureAuth() {
  const result = runVercel(['whoami'], undefined)
  if (result.status !== 0) {
    throw new Error('Not logged in to Vercel. Run: npm run vercel:login')
  }
  console.log(result.stdout.trim())
}

function syncDiditWebhookSecrets(vars) {
  const production = vars.DIDIT_WEBHOOK_SECRET
  const preview = vars.DIDIT_WEBHOOK_SECRET_PREVIEW
  const development = vars.DIDIT_WEBHOOK_SECRET_DEVELOPMENT

  if (!production) {
    console.warn('Missing DIDIT_WEBHOOK_SECRET — skipping Didit webhook sync')
    return
  }

  console.log('Setting DIDIT_WEBHOOK_SECRET (production)...')
  upsertKey('DIDIT_WEBHOOK_SECRET', production, ['production'])

  if (preview) {
    console.log('Setting DIDIT_WEBHOOK_SECRET (preview)...')
    upsertKey('DIDIT_WEBHOOK_SECRET', preview, ['preview'])
  } else {
    console.warn(
      'Missing DIDIT_WEBHOOK_SECRET_PREVIEW — add Staging API signing secret from Didit to .env'
    )
  }

  if (development) {
    console.log('Setting DIDIT_WEBHOOK_SECRET (development)...')
    upsertKey('DIDIT_WEBHOOK_SECRET', development, ['development'])
  }
}

if (!existsSync(envPath)) {
  console.error('Missing .env — copy .env.example and fill in secrets first.')
  process.exit(1)
}

ensureAuth()
ensureLinked()

const vars = parseEnv(readFileSync(envPath, 'utf8'))
const keys = Object.keys(vars).filter(key => !SYNC_SKIP_KEYS.has(key))

console.log(
  `Syncing ${keys.length} variables to Vercel (${TARGETS.join(', ')})...`
)

for (const key of keys) {
  if (key === 'DIDIT_WEBHOOK_SECRET') {
    continue
  }

  if (PRODUCTION_ONLY_KEYS.has(key)) {
    console.log(`Setting ${key} (production only)...`)
    upsertKey(key, vars[key], ['production'])
    continue
  }

  console.log(`Setting ${key}...`)
  upsertKey(key, vars[key])
}

syncDiditWebhookSecrets(vars)

console.log(
  'Done. Preview deployments use VERCEL_URL for links automatically. Redeploy for changes to take effect.'
)
