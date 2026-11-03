import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// How to Play pins hosts to a commit because unicodeGen.py assigns glyphs alphabetically, so the
// pack only matches the unicodeItems.json from the same commit. Read from git, not the working tree.
function packPin() {
  const git = (...args) => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024 })
  const commit = git('log', '-1', '--format=%H', '--', 'ForceItemBattle.zip').toString().trim()
  if (!commit) throw new Error('ForceItemBattle.zip has no commit to pin How to Play to.')
  const sha1 = createHash('sha1').update(git('show', `${commit}:ForceItemBattle.zip`)).digest('hex')
  // pack.mcmeta's description reads "McPlayHD.net (26.3) [1.0]".
  const meta = git('show', `${commit}:ForceItemBattle/pack.mcmeta`).toString().replace(/§./g, '')
  const version = meta.match(/\(([^)]+)\)\s*\[([^\]]+)\]/)
  return { commit, sha1, version: version ? `${version[1]} [${version[2]}]` : null }
}

export default defineConfig({
  server: {
    proxy: {
      "/stats-api": {
        target: "https://forceitembattle.net",
        changeOrigin: true,
      },
    },
  },
  define: {
    'import.meta.env.PACK': JSON.stringify(packPin()),
  },
  plugins: [react()],
  base: '/'
})
