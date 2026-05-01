# Glaze Mosaic — Developer & AI Handoff Documentation

Welcome! If you are an AI or developer picking up this project, this document is the authoritative source of truth for how **Glaze Mosaic** works — architecture, state, rendering pipeline, animation system, known bugs, and the full feature set.

This tool maps real-world glazed ceramic tile images onto HTML5 Canvas-drawn text and uploaded images (including animated GIFs). It supports both standard uniform grid systems and adaptive QuadTree subdivisions to retain fine detail while staying performant.

---

## 1. Project Architecture & Stack

- **Framework**: React 19 + Vite (base path `/tiles-mosiac/` — note the typo, it's intentional, matches the GitHub Pages repo name).
- **Styling**: Vanilla CSS (`App.css`, `Workspace.css`, `Sidebar.css`). Dark-mode default, using CSS variables (`--bg-dark`, `--bg-darker`, `--accent`, `--border`, `--text`, `--text-muted`, `--radius-sm`).
- **Core Rendering**: Pure HTML5 Canvas API (no WebGL or Three.js).
- **Animation Export**: `gif.js` (Web Worker-based, non-blocking). Worker script served from public at `gif.worker.js`.
- **GIF Parsing**: `gifuct-js` for parsing uploaded GIF files into composited frame canvases.
- **Icons**: `lucide-react`.

### Key File Structure

```
tile-mosaic/
├── public/
│   ├── tile_metadata.json          # Array of {id, filename, r, g, b, h, type} for normal tiles
│   ├── tile_metadata_vibrant.json  # Same structure for high-saturation "vibrant" tiles
│   ├── tiles/resized/{64,128,256,512}/ # Prerendered tile images at multiple resolutions
│   ├── tiles-vibrant/resized/...   # Same for vibrant tiles
│   └── gif.worker.js               # gif.js Web Worker
├── src/
│   ├── App.jsx                     # Root. Owns global `settings` state + tile metadata.
│   ├── components/
│   │   ├── Sidebar.jsx             # All controls, inputs, GIF export UI (~1160 lines)
│   │   ├── Sidebar.css
│   │   ├── Workspace.jsx           # Rendering engine, canvas pipeline, GIF frame generators
│   │   └── Workspace.css
│   └── utils/
│       ├── mosaic.js               # Color matching, QuadTree, Grid mosaic algorithms
│       └── gif.js                  # GIF frame compositing utilities (compositeGifFrames, compositeGifFramesAsync)
```

---

## 2. Core State Management (`App.jsx`)

All application state lives in a single `settings` object. Every Sidebar control calls `onSettingsChange(prev => ({...prev, key: value}))`. Workspace re-renders on every settings change.

### Settings Properties (Complete Reference)

| Property | Type | Default | Description |
|---|---|---|---|
| `mode` | `'text' \| 'image'` | `'text'` | Main input mode |
| `text` | string | `'Love\nGlazing'` | Text to render in text mode |
| `fontFamily` | string | `'Outfit'` | Font name (system or custom uploaded) |
| `customFont` | string | undefined | Registered FontFace name of uploaded custom font |
| `fontSize` | number | 150 | Font size in px |
| `tracking` | number | 0 | Letter spacing in px (CSS `letterSpacing`) |
| `leading` | number | 1.1 | Line height multiplier (× fontSize) |
| `textOffsetX` | number | 0 | Horizontal text position offset px |
| `textOffsetY` | number | 0 | Vertical text position offset px |
| `textGradientType` | `'radial' \| 'directional'` | `'directional'` | How gradient is applied within text |
| `gradientWidth` | number | 65 | Steps for radial stroke gradient |
| `directionLine` | `{p1:{x,y}, p2:{x,y}}` | `{p1:{x:0.5,y:0.1}, p2:{x:0.5,y:0.9}}` | Direction for directional gradient and QuadTree scaling (normalized 0–1) |
| `useStroke` | bool | false | Add border/stroke to text |
| `strokeWidth` | number | 8 | Stroke width in px |
| `borderTileId` | string\|null | null | Forces specific tile for stroke; null = random |
| `useStrokePalette` | bool | false | Use gradient palette for stroke color too |
| `strokeLine` | `{p1,p2}` | — | Gradient line for stroke palette (if `useStrokePalette`) |
| `gridResolution` | number | 32 | Number of tile columns across the canvas |
| `quadtreeMode` | bool | true | Use QuadTree (adaptive) vs. Grid (uniform) tiling |
| `quadtreeDetail` | number | 10 | Variance threshold for QuadTree splitting (1–100) |
| `quadtreeDirectional` | bool | false | Scale QuadTree tile sizes along `directionLine` |
| `useGradientPalette` | bool | true | In text mode: use gradient line for fill. In image gradient mode: use gradient line for luminosity mapping. |
| `gradientLine` | `{p1:{x,y}, p2:{x,y}}` | `{p1:{x:0.2,y:0.4}, p2:{x:0.8,y:0.6}}` | Line drawn across 8×8 palette grid to extract tile sequence |
| `imageMappingType` | `'direct' \| 'gradient'` | `'direct'` | Color engine for image mode |
| `bezier` | `{x0,y0,x1,y1,x2,y2,x3,y3}` | linear (0,0→1,1) | Full 4-point cubic Bézier. x0/y0 and x3/y3 are the anchors (usually 0,0 and 1,1). x1/y1 and x2/y2 are the editable control handles. |
| `phaseOffset` | number | 0 | Added to `t` values (modulo 1.0) to shift colors cyclically — used during loop GIF export |
| `textOnlyBg` | bool | true | Fill canvas background with solid color (white/black) |
| `bgIsBlack` | bool | false | Background color: black if true, white if false |
| `textOnly` | bool | false | Remove all background tiles (transparent padding) |
| `whiteBgTile` | bool | false | Use the whitest tile as background instead of random |
| `vibrantStops` | `{[tileId]: {t: number}}` | `{}` | Active vibrant overrides mapped to gradient positions (0–1) |
| `vibrantSpread` | number | 0.05 | Tolerance radius around each vibrant stop's `t` |
| `paletteMappings` | `{"r,g,b": tileId}` | `{}` | Manual color-to-tile overrides for image palette |
| `imagePalette` | `[{r,g,b}]` | `[]` | Top 8 dominant colors extracted from the uploaded image |
| `dithering` | `'none'` | `'none'` | Dithering mode (Bayer 4×4 matrix implemented but not yet connected to UI) |
| `colorLock` | bool | false | Reserved for future use |
| `gifFrameIndex` | number | 0 | Current GIF frame index displayed in the workspace |

### Other App-Level State

- `selectedImage`: Either `null`, a base64 data URL string (static images), or an object `{type: 'gif', url: string, frames: [{canvas, delay}]}` for uploaded GIFs.
- `metadata`: Array of standard tile metadata loaded from `tile_metadata.json`.
- `vibrantMetadata`: Array of vibrant tile metadata loaded from `tile_metadata_vibrant.json`.

### Color Palette Extraction (in `App.jsx`)

When `selectedImage` changes, the app renders the first frame (or the image) to a small 100×100 canvas, quantizes pixels to 32-level bins, counts them, and takes the top 8 dominant `{r, g, b}` colors → stored in `settings.imagePalette`. `paletteMappings` is reset on each new image.

---

## 3. The Rendering Engine (`Workspace.jsx`)

Everything happens inside a multi-canvas pipeline in `Workspace.jsx`.

### Canvas Architecture

1. **`hiddenCanvasRef`** (display: none) — The semantic base canvas.
2. **`canvasRef`** (`.mosaic-canvas`) — The visible output where tiles are painted.

### Image Preloading

On metadata load, all tile images are preloaded at all 4 sizes (64, 128, 256, 512px) into a `loadedImages = {64: {tileId: HTMLImageElement}, 128: {...}, ...}` object. Both normal and vibrant tiles are preloaded. Tiles are retrieved by `loadedImages[bestSize][tileId]`.

### `renderFrame(frameSettings, outCanvas, hiddenCanvas, width, height)`

This is the core async function. Called by both the live preview effect and all GIF export methods.

**Step 1 — Draw to Hidden Canvas:**

- **Text Mode**: Fills canvas with `rgb(0, 0, 255)` (semantic blue = background). Then draws text using a two-pass gradient approach:
  - Pass 1 (`textCanvas`): Draws text with fill color encoding. In **directional** mode, uses a `ctx.createLinearGradient` where each stop interpolates the Bézier curve and encodes `t` as the Red channel (`rgb(rVal, 0, 0)`). In **radial** mode, draws multiple concentric strokes (outer → inner) each at a different Bézier-mapped Red value, then fills the center in solid red.
  - Pass 2 (`maskCanvas`): White text on black — used as a `destination-in` mask so the gradient only appears inside the text glyphs.
  - Stroke: If `useStroke`, draws `rgb(0, 255, 0)` (semantic green = border) under the text.

- **Image Mode (static)**: Draws the image scaled to fit (`contain`) in the center of the canvas.
- **Image Mode (GIF)**: Reads `frameSettings.gifFrameIndex` and draws `selectedImage.frames[frameIndex].canvas` scaled to fit.

**Step 2 — Mosaic Generation:**
Extracts `ImageData` from `hiddenCanvas` and passes to `generateQuadtreeMosaic` or `generateGridMosaic` in `mosaic.js`. Returns `[{x, y, size, tileId}]`.

**Step 3 — Paint Output Canvas:**
For each tile placement, picks the best preloaded image resolution (64, 128, 256, or 512px based on `size`) and calls `outCtx.drawImage(img, drawX, drawY, drawW, drawH)`.

### Live Preview Effect

A debounced `useEffect` (100ms timeout) fires on any change to `[settings, metadata, loadedImages, selectedImage]`, calling `renderFrame` and toggling `isProcessing`.

---

## 4. The Mathematical Core (`mosaic.js`)

### Bézier Solver — `getBezier(t, x1, y1, x2, y2)`

Newton's method iterative solver (8 iterations) for CSS cubic-bézier sampling. Used to non-linearly remap brightness/gradient `t` values.

### Color Region Sampling — `getRegionColor(imgData, x, y, w, h, canvasWidth, canvasHeight)`

Averages all pixels in a rectangular region. Also computes per-pixel variance (sum of squared RGB deviations from mean) — used by QuadTree to decide when to subdivide.

### Tile Matching — `findClosestTile(r, g, b, a, x, y, w, h, settings, metadata, vibrantMetadata)`

**Text Mode** (decoded via semantic colors):
- `b > r && b > g` → Background → random bg candidate (or white tile, or null if textOnly).
- `g > r && g > b` → Border → check `borderTileId` override first, then `useStrokePalette`, else random border candidate.
- `r >= g && r >= b` → Fill → `t = r / 255`, pass through `getTileAtGradient(t, gradientLine, ...)` which checks vibrant stops first.
- Tile type buckets (`bg`, `border`, `fill`) are pre-cached via `getCandidates()`.

**Image Mode**:
1. Check `paletteMappings` first (nearest palette color within squared-distance < 4000).
2. Compute `brightness = (r×0.299 + g×0.587 + b×0.114) / 255`.
3. **Gradient Map mode**: Apply Bézier to brightness → add `phaseOffset` (looping) → `getTileAtGradient`.
4. **Direct Color mode**: Apply Bézier + phaseOffset to brightness, scale raw RGB by the brightness ratio, then find nearest tile by Euclidean RGB distance from the full palette.
5. Check `getVibrantOverride` before the final palette search in Direct mode.

### Vibrant Overrides — `getVibrantOverride(t, vibrantMetadata, settings)`

Finds the nearest active `vibrantStops` entry to the given `t`. If within `vibrantSpread` distance, returns that vibrant tile.

### Grid Mode — `generateGridMosaic`

Uniform `gridResolution × rows` grid. `rows = floor(height / cellSizeX)` (square cells). For each cell, average color → `findClosestTile`.

### QuadTree Mode — `generateQuadtreeMosaic`

Recursive power-of-2 subdivision. Starting grid `gridDim` is the smallest power of 2 that covers both `gridResolution` columns and the full canvas height. Splits when `variance > quadtreeDetail * 100`. Stops at `sizeInCells ≤ 1`. If `quadtreeDirectional`, additionally force-splits cells whose computed size exceeds the direction-scaled `desiredSize`.

---

## 5. GIF Upload Pipeline

When the user uploads a GIF file in Image mode:

1. `Sidebar.handleImageChange` reads the file. If `file.type === 'image/gif'`, it uses `gifuct-js` (`parseGIF` + `decompressFrames`) to extract raw frame data.
2. `gif.js`'s `compositeGifFramesAsync(frames, width, height, onProgress)` composites the frames sequentially, respecting GIF disposal types (1 = leave, 2 = clear, 3 = restore previous), and returns `[{canvas: HTMLCanvasElement, delay: number}]`.
3. `onImageUpload` is called with `{type: 'gif', url: firstFrameDataUrl, frames: compositedFrames}`.
4. The Workspace renders the frame at `settings.gifFrameIndex` into the hidden canvas each render.
5. The Sidebar computes `originalFps` from `frames[0].delay` (in ms) and lets the user set `outputFps` for export.

> **Note on `gif.js` frame delay**: `gifuct-js` `decompressFrames` returns `frame.delay` in **centiseconds** (hundredths of a second). `gif.js` compositing multiplies by 10 to get milliseconds (`delay * 10 || 100`).

---

## 6. Animation & GIF Export Pipeline

All export methods are exposed via `React.useImperativeHandle` on `Workspace`. Sidebar calls `workspaceRef.current.exportXxx(...)`.

### `exportGif(keyframeA, keyframeB, frames, delay, onProgress)`
**Wave Effect** — Interpolates the Bézier control handles (x1, y1, x2, y2) linearly between two keyframed states over `frames` steps. Each frame is rendered and added to `gif.js`. Creates a colour-shifting wave across the text/image.

### `exportGifLoop(frames, delay, onProgress)`
**Looping Gradient Cycle** — Keeps all spatial parameters static but increments `phaseOffset` by `i / frames` per frame. Because `(t + phaseOffset) % 1.0` is applied inside `findClosestTile`, the colour assignment cycles through the gradient continuously → seamless loop.

### `exportResGif(resKeyframeA, resKeyframeB, frames, delay, onProgress)`
**Resolution/Zoom Animation** — Interpolates `gridResolution` and `quadtreeDetail` between two keyframes. Creates a "zooming in" or "pixel reveal" animation.

### `exportGifInput(fps, onProgress)`
**Animated GIF Passthrough** — Iterates over every frame of an uploaded GIF (`selectedImage.frames`), renders each through the full mosaic pipeline at `gifFrameIndex: i`, and encodes the result. Preserves the animated source as a mosaiced animation.

### Export Progress Overlay
When `exportProgress !== null`, a full-screen modal overlay (spinner + status text) is rendered in Sidebar. It dismisses automatically 2 seconds after `'Finished'`.

---

## 7. Sidebar UI Structure (Section Order)

1. **Header** — App title, Save/Load Project buttons.
2. **Input Mode** — Text / Image toggle.
3. **Font Settings** *(text mode only)* — Text content, font family (dropdown + custom upload), font size, tracking, leading, X/Y offsets, stroke toggle (+ stroke width + border tile picker), fill gradient width, fill gradient style (radial/directional).
4. **Image Input** *(image mode only)* — Upload button, color mapping engine toggle (Direct / Gradient).
5. **Vibrant Color Overrides** *(if vibrant tiles loaded)* — Draggable gradient strip, spread tolerance slider, vibrant tile toggle grid. **(appears twice in JSX — see Known Issues)**
6. **Image Palette Overrides** *(image mode + palette extracted)* — Dominant color swatches → tile picker. **(appears twice in JSX — see Known Issues)**
7. **Mapping Settings** — Grid/QuadTree toggle, base resolution slider, QuadTree detail slider, Directional Scale checkbox.
8. **Background Settings** — Transparent BG, solid white tile BG, black vs white canvas background.
9. **Gradient Curve** — Interactive 4-point Bézier SVG editor (drag control handles).
10. **Spatial Direction Vector** *(if directional gradient or directional QuadTree is active)* — 2-point direction line editor.
11. **Gradient Spectrum Tool (8×8)** — 8×8 tile palette grid with draggable gradient line selector.
12. **Vibrant / Palette Overrides (duplicate)** — *Second occurrence (see below).*
13. **GIF Export & Animation Settings** — Animated input export (GIF only), wave GIF, loop GIF, resolution GIF sub-sections.

---

## 8. Known Bugs & Issues

### 🐛 Duplicate Sidebar Sections
`Vibrant Color Overrides` and `Image Palette Overrides` render **twice** in the JSX — once between sections 4 and 7 (around line 488), and again between sections 11 and 13 (around line 873 and 969). The second set was the originally intended position. The first set should be removed.

### 🐛 GIF Animation Controls Don't Show (FIXED in v3-docs-giffix)
`outputFps` and `originalFps` were used in the "Export Animated Input" panel but **never declared as state variables**, causing a runtime ReferenceError that prevented that panel from rendering. Fixed by adding:
```js
const [outputFps, setOutputFps] = useState(10);
const [originalFps, setOriginalFps] = useState(null);
```
And a `useEffect` to compute `originalFps` from `selectedImage.frames[0].delay` on GIF load.

### 🐛 Dithering Not Wired to UI
The `bayerMatrix` and `applyBayer` function exist in `mosaic.js` and `settings.dithering` is defined, but no UI control for dithering is rendered in the Sidebar, and `applyBayer` is never called in `findClosestTile`. This is a planned feature.

### 🐛 GIF Frame Scrubbing Not Exposed
`settings.gifFrameIndex` exists and is used for playback in `renderFrame`, but there is no slider in the Sidebar that lets the user manually scrub through uploaded GIF frames. Only the export pipeline iterates frames.

---

## 9. Complete Feature Set

1. **Dual Input Modes** — Procedural text rendering or static/animated image upload.
2. **Typography Controls** — Font Family (system fonts + custom `.ttf/.otf/.woff` upload via `FontFace` API), Font Size, Letter Spacing (Tracking), Line Height (Leading), X/Y Position Offset.
3. **Text Fill Gradient** — Two modes:
   - *Radial*: Concentric stroke-layers from outer to inner, each mapped to a different gradient palette tile.
   - *Directional*: A `createLinearGradient` whose stops are Bézier-mapped Red channel values, defining a gradient across the text bounding box.
4. **Border/Stroke Control** — Variable-width stroke with optional specific tile lock or stroke palette gradient.
5. **Adaptive QuadTree Rendering** — Recursive power-of-2 subdivision: high detail at edges, large tiles in flat areas.
6. **Standard Grid Rendering** — Classic uniform tile matrix.
7. **Directional QuadTree Scaling** — Force tile sizes to decrease along a user-defined direction vector.
8. **Color Matching Engines** (image mode):
   - *Direct Color Match*: Bézier-shifted brightness → nearest Euclidean RGB tile.
   - *Gradient Map*: Luminosity → Bézier curve → gradient line position.
9. **Interactive Bézier Curve Editor** — 4-point cubic Bézier (with draggable P0/P1/P2/P3 handles). Non-linearly remaps all brightness/gradient `t` values in both modes.
10. **8×8 Palette Gradient Line** — Draw a line across the 64-tile sorted palette to define a linear tile sequence for fills, gradients, and loop animations.
11. **Spatial Direction Vector Editor** — 2-point interactive line that controls directional gradient orientation and QuadTree size scaling direction.
12. **Vibrant Color Overrides** — Force specific high-saturation tiles to appear at particular brightness thresholds on a drag-and-drop gradient strip. `vibrantSpread` controls the capture radius.
13. **Image Palette Extraction & Overrides** — Auto-extracts top-8 dominant colours from the uploaded image. Users can manually assign any tile to any palette colour, bypassing the normal matching engine.
14. **Background Tile Options** — Transparent (remove BG tiles), random BG tiles, solid white tile BG, black or white canvas fill.
15. **Tile Mipmapping** — All tiles preloaded at 64/128/256/512px. The correct resolution is chosen based on rendered tile size for maximum sharpness.
16. **Animated GIF Input** — Upload a GIF, parse it with `gifuct-js`, composite frames, and process each frame through the mosaic engine.
17. **Project Save/Load** — Full state (settings + image data) serialized to a `.json` file, loadable in a later session.
18. **Wave Animation Export** — Interpolate Bézier curve between two keyframes → export as looping GIF.
19. **Looping Gradient Export** — Phase-shift the gradient position over time → seamlessly looping color-cycling GIF.
20. **Resolution Animation Export** — Interpolate grid resolution and QuadTree threshold between two keyframes → zoom/enhance GIF.
21. **Animated Input Export** — Re-render every frame of a source GIF through the mosaic pipeline → export as mosaiced animated GIF.
22. **GIF Export Progress Overlay** — Full-screen blocking progress modal with spinner and per-frame status messages during all export operations.

---

## 10. Data Flows at a Glance

```
User Input (Sidebar)
    ↓ settings change
App.jsx (settings state)
    ↓ props
Workspace.jsx
    ↓ renderFrame()
    hiddenCanvas ← text/image drawn with semantic colours
    ↓ getImageData
mosaic.js (generateGridMosaic / generateQuadtreeMosaic)
    ↓ findClosestTile()
        → getBezier() for t-mapping
        → getVibrantOverride() for vibrant stops
        → getTileAtGradient() for gradient line lookup
        → getClosestByRGB() for direct match
    ↓ [{x, y, size, tileId}]
    ↓ drawImage (from loadedImages mipmaps)
outCanvas (visible mosaic)
```

```
GIF Upload Flow:
File input → FileReader → gifuct-js parseGIF/decompressFrames
    → compositeGifFramesAsync (gif.js util)
    → {type:'gif', frames:[{canvas,delay}]}
    → App.selectedImage
    → Workspace renderFrame (reads frames[gifFrameIndex].canvas)

GIF Export Flow:
Sidebar trigger → workspaceRef.current.exportXxx(...)
    → loop: renderFrame(frameSettings) per frame
    → gif.addFrame(canvas, {delay})
    → gif.render() → blob → download
```
