# Tiles Tithe Mosiac / टाइल्स तिथे मोझियाक  

Hello I'm Kshitij and I wanted to make a typeface out of glazed tiles, we made in a course at IDC School of Design. Then decided why not make a whole tool to play with them instead.
Thank you Akash and Karthikay for the documentation.


*The UX is very bad right now, I wanted to create a tool, which I iterated as I wanted more features, I'll fix the ux in a later version*

# *ai overview* 

TTM is a dynamic, browser-based web application that lets you seamlessly map real glazed tiles onto text or uploaded images. It supports standard grid layouts as well as adaptive quadtree subdivisions to capture varying levels of detail. 


## Key Features

### Color Mapping
- **Direct Color Match**: Maps each tile region to the closest tile by Euclidean RGB distance. A Bezier curve editor lets you non-linearly shift brightness before matching.
- **Gradient Palette Map**: Converts image regions to luminosity and maps them along a user-defined line across the 8×8 tile palette grid.
- **Vibrant Overrides**: Pin specific high-saturation tiles to exact positions along the gradient — useful for forcing accent colours at particular brightness thresholds.
- **Image Palette Extraction**: Extracts the eight dominant colours from an uploaded image and lets you manually assign any tile to any extracted colour.

### Rendering Modes
- **Grid Mode**: Divides the canvas into a uniform square grid. Resolution is controlled by the number of tile columns.
- **QuadTree Mode**: Recursively subdivides regions based on colour variance, placing small tiles in high-detail areas and large tiles in flat ones.
- **Directional QuadTree Scaling**: Forces tile sizes to decrease progressively along a user-defined direction vector.

### Input Modes
- **Text**: Renders arbitrary multi-line text using any system font or a custom-uploaded `.ttf`/`.otf` file. Controls include font size, tracking, leading, X/Y offset, fill gradient style (radial or directional), and optional stroke with a per-tile border override.
- **Image**: Upload a static image. The tool scales it to fit and runs it through the colour matching pipeline.
- **GIF**: Upload an animated GIF. The file is parsed client-side into individual composited frames. A frame scrubber lets you preview any frame. All mosaic settings apply per-frame, and the result can be exported as a processed animated GIF.

### Animation Export
- **Wave Effect**: Keyframe two Bezier curve states and export an animation of the colour distribution transitioning between them.
- **Looping Gradient**: Shifts the palette phase offset across frames to produce a seamlessly looping colour-cycle animation.
- **Resolution Zoom**: Interpolates grid resolution and QuadTree threshold between two keyframes to animate a tile-reveal or zoom effect.
- **Processed GIF Export**: Re-renders each frame of an uploaded GIF through the full mosaic pipeline and encodes the result as a downloadable animated GIF.

### Other
- **Project Save / Load**: Serialises the complete application state — settings, image data, and all mappings — to a `.json` file that can be restored in a later session.
- **Bezier Curve Editor**: An interactive four-point cubic Bezier editor that controls how brightness values are remapped before tile matching. Applied globally across all modes.
- **8×8 Palette Grid**: Visual selector for the gradient line used in palette-gradient and loop-animation modes.

## Tech Stack

React 19 and Vite, rendered entirely on HTML5 Canvas with no WebGL dependency. GIF encoding uses `gif.js` with Web Workers for non-blocking operation. Animated GIF parsing uses `gifuct-js`.
