import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/*
 * The resource pack How to Play pins hosts to. The page's default resource-pack line
 * is a raw.githubusercontent.com link at a COMMIT, not at main, because the pack and
 * unicodeItems.json only work as a pair: scripts/unicodeGen.py hands out glyphs by
 * alphabetical position, so one new texture shifts every glyph after it, and a pack
 * that followed main would drift out of line with the unicodeItems.json a host
 * installed. A commit link never changes, so neither does its hash; the main link is
 * still offered, as the opt-in.
 *
 * The commit is the last one that touched the zip, and everything is read from that
 * commit rather than the working tree, so a local zip that has been rebuilt but not
 * committed cannot pair a hash with a file the link does not serve. The deploy's
 * shallow checkout reports HEAD instead, which holds the same zip: a different link
 * to the same file and the same hash. Locally, an unpushed commit makes the link 404
 * until it is pushed; production builds only from pushes to main.
 *
 * A missing zip or no git fails the build on purpose: the page would otherwise print
 * a link and a hash for a file nobody can download.
 */
function packPin() {
  const git = (...args) => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024 })
  const commit = git('log', '-1', '--format=%H', '--', 'ForceItemBattle.zip').toString().trim()
  if (!commit) throw new Error('ForceItemBattle.zip has no commit to pin How to Play to.')
  const sha1 = createHash('sha1').update(git('show', `${commit}:ForceItemBattle.zip`)).digest('hex')
  // The pack names its version in its description: "McPlayHD.net (26.3) [1.0]".
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
