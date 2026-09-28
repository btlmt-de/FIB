/**
 * The Antimatter Depths render (public/fib-relics/antimatter_depths.png, 256px) as a map:
 * the outline of each room as it shows in the render, and a point inside it for its name.
 *
 * Measured, not traced by hand. The Depths is a jigsaw structure, but every connector in
 * the datapack targets exactly one other piece, so it always assembles the same way
 * (only the whole is turned): storage at the root; the mines west through a corridor;
 * a T-section south to the main corridor, which leads to the nature room, the start and
 * the vault room; the stairway north to the End Portal room. That assembly, block by
 * block from the datapack's structure files, was fitted to the render's silhouette
 * (2:1 isometric, 1.32px a block, 97.5% overlap), drawn back to front so each pixel
 * belongs to the room in front, and each room's visible region traced and simplified.
 *
 * If the render is ever redrawn, these must be measured again against it; the datapack
 * alone cannot say where the camera stood.
 *
 *   at  where the room's name sits: the centre of its visible region, in the render's px
 *   d   the room's visible outline, an SVG path in the render's 256px
 */

export const DEPTHS_MAP = {
    storage: { at: [113.8, 123.0], d: 'M114.5 97.5 L153.5 116.5 L153.5 138 L146 135 L143.5 133 L140.5 133.5 L140 134.5 L137 135.5 L137 136.5 L132.5 137.5 L130.5 139 L130.5 152 L123 148 L121.5 148 L121 147 L116.5 148.5 L116.5 145 L111.5 142.5 L109.5 143 L109.5 141.5 L104.5 139 L95 143.5 L94.5 146 L80.5 139 L80.5 121 L79 120.5 L79 109 L93 102.5 L93.5 101.5 L99 104.5 L103.5 101.5 L106.5 102Z' },
    mines: { at: [47.7, 171.8], d: 'M57.5 143.5 L59 143.5 L59.5 144.5 L61 144.5 L61.5 145.5 L63 145.5 L65.5 147.5 L68 148 L69.5 149.5 L72 150 L73.5 151.5 L76 152 L76.5 153 L78 153 L80.5 155 L82 155 L84.5 157 L86 157 L92.5 160.5 L92 161.5 L90.5 161.5 L89 163 L86.5 163.5 L82 166.5 L80.5 166.5 L78 168.5 L76.5 168.5 L74 170.5 L64.5 174.5 L65 202.5 L69.5 205 L62.5 208.5 L31.5 193.5 L31 192.5 L27.5 191.5 L26 190 L23.5 189.5 L22 188 L16.5 186 L16 185 L14.5 185 L14.5 165 L21 162 L21 156.5 L46 144 L52 146.5Z' },
    nature: { at: [110.1, 183.3], d: 'M119.5 147 L121 147 L121.5 148 L123 148 L125.5 150 L127 150 L127.5 151 L131 152 L131.5 153 L135 154 L135.5 155 L138 155.5 L139.5 157 L142 157.5 L142.5 158.5 L146 159.5 L152.5 163.5 L154 163.5 L154.5 164.5 L156 164.5 L156 192.5 L101 220 L99.5 220 L97 218 L95.5 218 L93 216 L90.5 215.5 L89 214 L86.5 213.5 L82 210.5 L80.5 210.5 L78 208.5 L76.5 208.5 L74 206.5 L65.5 203 L64.5 174.5 L74 170.5 L74.5 169.5 L78 168.5 L78.5 167.5 L82 166.5 L82.5 165.5 L88 163.5 L89.5 162 L92 161.5 L93.5 160 L97 159 L97.5 158 L107 154 L107.5 153 L111 152 L111.5 151 L115 150Z' },
    vault: { at: [224.3, 130.0], d: 'M223 99.5 L226 99.5 L226.5 100.5 L230 101.5 L230.5 102.5 L233 103 L234.5 104.5 L253 113 L253.5 114 L255 114 L255 147 L253.5 147 L253 148 L249.5 149 L249 150 L245.5 151 L245 152 L243.5 152 L241 154 L239.5 154 L238 155.5 L235.5 156 L222 163.5 L220.5 163.5 L220 164.5 L218.5 164.5 L214 161.5 L203.5 157 L208.5 154 L208.5 139.5 L207.5 138.5 L206 138.5 L203.5 136.5 L202 137.5 L201.5 135.5 L200 135.5 L197.5 133.5 L196 133.5 L195.5 134.5 L188.5 137.5 L188.5 117 L204 109 L206.5 108.5 L209 106.5 L210.5 106.5 L213 104.5 L214.5 104.5 L219 101.5 L220.5 101.5Z' },
    portal_room: { at: [21.1, 53.5], d: 'M18 35 L20.5 36 L26 35.5 L26.5 36.5 L28 36.5 L28.5 37.5 L32 38.5 L32.5 39.5 L36 40.5 L36.5 41.5 L40 42.5 L45.5 46 L47 46 L50.5 48.5 L50.5 53.5 L51.5 54 L47.5 56.5 L46 56.5 L45.5 57.5 L43 56.5 L39 58.5 L38 60 L36 60 L32 62 L32 64 L30.5 65 L23.5 68 L23.5 78 L2.5 68 L2.5 65.5 L0 64.5 L0 47.5 L1 47 L1 43.5Z' },
    start: { at: [181.6, 156.9], d: 'M180 136 L183 136.5 L183.5 137.5 L185 137.5 L197 144 L207.5 138.5 L208.5 139.5 L208.5 154 L203.5 156.5 L203.5 159.5 L201.5 160 L201 161 L198.5 161.5 L197 163 L194.5 161.5 L190.5 163 L190.5 171.5 L188 172 L186.5 173.5 L179 176.5 L178.5 177.5 L171.5 173.5 L169 173.5 L168.5 174.5 L165 175.5 L164.5 176.5 L156 180.5 L156 164.5 L169 158 L169 141.5Z' },
};
