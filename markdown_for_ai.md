# Glaze Mosaic - Developer & AI Handoff Documentation

Welcome! If you are an AI or developer picking up this project, this document provides an extremely detailed breakdown of how the **Glaze Mosaic** web application works under the hood. 

This tool maps real-world glazed tile images onto HTML5 Canvas-drawn text and uploaded images. It supports both standard grid systems and adaptive QuadTree subdivisions to retain detail while maximizing performance.

---

## 1. Project Architecture & Stack

- **Framework**: React 19 + Vite.
- **Styling**: Vanilla CSS (`App.css`, `Workspace.css`). Dark-mode default, using CSS variables for colors (e.g., `var(--bg-dark)`, `var(--accent)`).
- **Core Rendering**: Pure HTML5 Canvas API (no WebGL or Three.js).
- **Animation Export**: `gif.js` utilizing Web Workers for non-blocking client-side GIF rendering.

### Key File Structure
- `src/App.jsx`: The root component. Owns the global `settings` state and the raw tile `metadata`. Passes state down via props.
- `src/components/Sidebar.jsx`: The control panel. Handles all user inputs, UI logic, font/image uploads, and triggers GIF exports.
- `src/components/Workspace.jsx`: The rendering engine. Takes the settings and metadata, draws the hidden base canvases, calculates the mosaic tiles, and renders the final visual output.
- `src/utils/mosaic.js`: The mathematical brain. Contains the algorithms for `generateGridMosaic`, `generateQuadtreeMosaic`, color matching (`findClosestTile`), and bezier curve calculations.

---

## 2. Core State Management (`App.jsx`)

The entire application relies on a single source of truth: the `settings` object in `App.jsx`. Every control in the `Sidebar` updates a property in this object, which immediately triggers a re-render in the `Workspace`.

Important state properties include:
- `mode`: `'text'` or `'image'`. Dictates what is drawn to the hidden base canvas.
- **Typography**: `text`, `fontFamily`, `fontSize`, `tracking`, `leading`, `textOffsetX`, `textOffsetY`.
- **Mosaic Topology**: `quadtreeMode` (boolean), `gridResolution` (for standard grids), `quadtreeDetail` (threshold for subdivision).
- **Color Mapping**: 
  - `imageMappingType`: `'direct'` (finds closest RGB match) or `'gradient'` (maps luminosity to an 8x8 palette gradient line).
  - `bezier`: `{x1, y1, x2, y2}`. A cubic bezier curve used to non-linearly shift brightness/luminosity values.
  - `gradientLine`: `{p1, p2}`. Defines a line across the 8x8 palette grid to extract a specific linear array of tiles.
- **Overrides**: `vibrantStops` (forces highly saturated tiles at specific brightness thresholds), `paletteMappings` (manual user overrides mapping exact extracted colors to specific tiles), `borderTileId` (forces a specific tile for strokes).

---

## 3. The Rendering Engine (`Workspace.jsx`)

The rendering happens entirely inside `Workspace.jsx`. It utilizes a multi-canvas pipeline:

1. **Hidden Base Canvas (`hiddenCanvas`)**: 
   - **Text Mode**: Draws text using standard `ctx.fillText`. It encodes semantics into RGB values.
     - **Blue `rgb(0,0,255)`**: Represents the background.
     - **Green `rgb(0,255,0)`**: Represents the stroke/border (if `useStroke` is true).
     - **Red `rgb(R, 0, 0)`**: Represents the fill. The `R` channel (1 to 255) is heavily manipulated. If a gradient is applied (radial or directional), the Red channel interpolates based on the Bezier curve settings. This `R` value is later extracted by `mosaic.js` to pick a tile along the palette gradient.
   - **Image Mode**: Simply draws the user's uploaded image to the hidden canvas.

2. **Tile Generation**: 
   - `Workspace` extracts the `ImageData` from the hidden canvas and passes it to `mosaic.js` (`generateGridMosaic` or `generateQuadtreeMosaic`).
   - `mosaic.js` returns an array of tile placement objects: `[{ x, y, size, tileId }]`.

3. **Final Output Canvas (`outCanvas`)**: 
   - Clears the canvas.
   - Loops through the returned tile array and uses `ctx.drawImage` to paint the preloaded tile images at the correct coordinates and scales. It uses mipmapping (preloaded 64px, 128px, 256px, 512px versions of the tiles) to ensure sharp rendering regardless of the zoom level.

---

## 4. The Mathematical Core (`mosaic.js`)

This file processes the raw pixel data and determines exactly which tile goes where.

### Topology Algorithms
- **Grid Mode (`generateGridMosaic`)**: Divides the canvas into uniform squares based on `settings.gridResolution`. Calculates the average RGB of each square and matches a tile.
- **QuadTree Mode (`generateQuadtreeMosaic`)**: Recursively subdivides the canvas into four quadrants. If the color variance (standard deviation) within a quadrant exceeds `settings.quadtreeDetail`, it splits again (down to a minimum size). This ensures high detail around text edges and large, efficient tiles in flat background areas.

### Color Matching (`findClosestTile`)
- **Text Mode**: Checks the semantic RGB values. 
  - If Blue is dominant, it's the background.
  - If Green is dominant, it's the border (checks `settings.borderTileId`).
  - If Red is dominant, it's the text fill. It uses the exact Red value (0-255) as a `t` parameter (0.0 - 1.0) to sample a tile along the 8x8 palette `gradientLine`.
- **Image Mode**: 
  - **Direct Match**: Checks `paletteMappings` first. If no manual override exists, it shifts the raw brightness through the `bezier` curve, checks for `vibrantStops` overrides, and then performs a Euclidean distance check (`R^2 + G^2 + B^2`) against all available tile average colors to find the closest match.
  - **Gradient Map**: Converts the image region to grayscale (luminosity), passes that value through the `bezier` curve, and uses the result to sample a tile along the 8x8 palette `gradientLine`.

---

## 5. Animation and Export Pipeline

Animations are achieved by interpolating state values over a set number of frames, rendering each frame to an offscreen canvas, and feeding them to `gif.js`.

The logic resides in `useImperativeHandle` inside `Workspace.jsx`, exposing methods to the `Sidebar`:
- `exportGif`: Interpolates the four points of the `settings.bezier` curve between `keyframeA` and `keyframeB` to create a smoothly shifting wave effect.
- `exportResGif`: Interpolates the resolution (`gridResolution` and `quadtreeDetail`) to create zoom/enhancing animations.
- `exportGifLoop`: Keeps the spatial parameters static but applies a shifting `phaseOffset` to the calculated `t` value inside the gradient mappers. Because `(t + phaseOffset) % 1.0` is used, the colors seamlessly cycle through the text/image indefinitely.

---

## Complete Feature Set

1. **Input Modes**: Switch between procedural Text input and Image upload.
2. **Typography Controls**: Full control over Font Family (including custom `.ttf/.otf` uploads), Font Size, X/Y Offsets, Tracking (Letter Spacing), and Leading (Line Height).
3. **Adaptive QuadTree Rendering**: Recursive subdivision algorithm to map high detail on edges and low detail on flat areas.
4. **Standard Grid Rendering**: Classic uniform tile matrix.
5. **Color Matching Engines**: Choose between strict RGB Euclidean matching or Luminosity-to-Gradient-Palette mapping.
6. **Bezier Easing Curves**: Interactive SVG-based bezier curve to non-linearly shift brightness thresholds and gradient distributions.
7. **8x8 Palette Gradient Line**: Draw a line across a pre-calculated 8x8 color palette to extract a specific linear sequence of tiles for text fills and gradients.
8. **Vibrant Overrides**: Force highly saturated, specific tiles to appear at exact brightness thresholds.
9. **Image Palette Extraction**: Automatically extracts dominant colors from uploaded images and allows manual, hard-coded tile assignments to those specific colors.
10. **Border/Stroke Control**: Add variable-width strokes to text and assign specific, isolated tiles to render the stroke.
11. **Project Save/Load**: Serialize the entire application state and base64 image data into a downloadable JSON file, and restore it later.
12. **Wave Animation Export**: Keyframe bezier curves and export a smooth, in-browser generated GIF.
13. **Looping Gradient Export**: Export an infinitely looping GIF of colors cycling through the defined gradient path.
14. **Resolution Animation Export**: Keyframe the grid resolution or QuadTree threshold to export zooming/enhancing layout GIFs.
