import { fileURLToPath } from 'node:url'
import { defineConfig, searchForWorkspaceRoot } from 'vite'
import react from '@vitejs/plugin-react'

// The game files are the eltobit0/fib-resources repo, checked out next to this one.
const RESOURCES_DIR = fileURLToPath(new URL('../resources', import.meta.url))
const RESOURCES = 'https://github.com/eltobit0/fib-resources'

async function text(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not fetch ${url} (HTTP ${res.status}).`)
  return res.text()
}

// How to Play pins hosts to a release because unicodeGen.py assigns glyphs alphabetically, so the
// pack only matches the unicodeItems.json from the same release.
async function packPin() {
  const latest = await fetch(`${RESOURCES}/releases/latest`, { redirect: 'manual' })
  const tag = latest.headers.get('location')?.split('/releases/tag/')[1]
  if (!tag) throw new Error(`${RESOURCES} has no release to pin How to Play to.`)
  const [sha1, meta] = await Promise.all([
    text(`${RESOURCES}/releases/download/${tag}/ForceItemBattle.zip.sha1`),
    text(`https://raw.githubusercontent.com/eltobit0/fib-resources/${tag}/ForceItemBattle/pack.mcmeta`),
  ])
  // pack.mcmeta's description reads "McPlayHD.net (26.3) [1.0]".
  const version = meta.replace(/§./g, '').match(/\(([^)]+)\)\s*\[([^\]]+)\]/)
  return { tag, sha1: sha1.trim(), version: version ? `${version[1]} [${version[2]}]` : null }
}

export default defineConfig(async () => ({
  resolve: {
    alias: { '@resources': RESOURCES_DIR },
  },
  server: {
    fs: { allow: [searchForWorkspaceRoot(fileURLToPath(new URL('.', import.meta.url))), RESOURCES_DIR] },
    proxy: {
      "/stats-api": {
        target: "https://forceitembattle.net",
        changeOrigin: true,
      },
    },
  },
  define: {
    'import.meta.env.PACK': JSON.stringify(await packPin()),
  },
  plugins: [react()],
  base: '/'
}))
