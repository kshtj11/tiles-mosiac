# Glaze Mosaic

Hello I'm Kshitij and I wanted to make a typeface out of these glazed tiles, we made in a course at IDC. Then decided why not make a whole tool to play with them instead.

Thank you Akash and Karthikay for the documentation.

## 🌟 Overview
Glaze Mosaic is a dynamic, browser-based web application that lets you seamlessly map real glazed tiles onto text or uploaded images. It supports standard grid layouts as well as adaptive quadtree subdivisions to capture varying levels of detail. 

## ✨ Key Features

### 🎨 Intelligent Color Mapping
* **Direct Match & Gradient Palette:** Upload an image and let the tool automatically map its brightness and color to specific tiles, or strictly enforce an 8x8 gradient line palette.
* **Vibrant Overrides:** Define specific points along the brightness curve to snap to high-saturation vibrant tiles for that extra pop.
* **Palette Extraction:** The app automatically analyzes your uploaded images and extracts the dominant colors, allowing you to manually map specific tiles to those colors.

### 🧩 Dynamic Grid & QuadTree Rendering
* **Grid Mode:** A classic, uniform layout that resembles a standard mosaic.
* **QuadTree Mode:** An adaptive mapping mode that recursively subdivides the canvas, rendering small tiles for high-detail areas (edges, text) and large tiles for flat backgrounds.

### 🎥 Animation & GIF Export
* **Wave Gradient Export:** Keyframe two different Bezier curves and export an animation of the colors smoothly propagating through your text or image in a wave-like manner.
* **Looping Gradients:** Export a seamless, looping GIF where the gradient colors cyclically wash over the text.
* **Resolution & Zoom Export:** Interpolate the resolution of the grid or quadtree detail between two keyframes to create striking "zooming" or "enhancing" animations.

### 💾 Project Save & Load
* Download your exact state, including your custom tile mapping, font settings, and image data into a lightweight `.json` file to pick up exactly where you left off.

## 🛠️ Tech Stack
Built using React, Vite, and HTML5 Canvas for high-performance rendering, with `gif.js` (and Web Workers) integrated for non-blocking in-browser GIF encoding.
