# Van Gogh's Starry Night: Interactive Experience

An interactive particle flow simulation of Van Gogh's masterpiece, built with HTML5 Canvas and pure JavaScript.

## ✨ Features

- **Flow Field Simulation**: Particles follow the actual brushstrokes of Van Gogh's masterpiece
- **Color-Guided Path Following**: Particles intelligently follow paths with similar colors
- **Interactive Controls**: Real-time adjustment of speed, density, opacity, brightness, contrast, and saturation
- **Pan & Zoom**: Explore the painting in detail with smooth panning and zooming
- **Fullscreen Mode**: Immersive viewing experience
- **No Dependencies**: Pure JavaScript, no build step required
- **Self-Contained**: All assets embedded (Base64 image data)

## 🎮 How to Play

### Online

Deploy to any static hosting service (GitHub Pages, Vercel, Netlify, etc.) or simply open `index.html` in a modern browser.

**Live Demo**: [https://djzoom.github.io/starry-night-flow/](https://djzoom.github.io/starry-night-flow/)

### Local Development

1. Clone or download this repository
2. Open `index.html` in a modern browser (Chrome, Firefox, Edge, Safari)
3. No server required! All assets are embedded

## 🎛️ Controls

### Particle Controls
- **Particle Speed**: Adjust particle flow velocity (0.6 - 2.0)
- **Particle Count**: Control number of particles (1600 - 4000)
- **Trail Length**: Adjust trail persistence (0.05 - 0.15)
- **Particle Opacity**: Control particle transparency (0.0 - 0.8)
- **Particle Blur**: Add blur effect to particles (0 - 10)

### Background Controls
- **Background Brightness**: Adjust image brightness (0.4 - 2.0)
- **Background Contrast**: Control image contrast (0.6 - 2.0)
- **Background Saturation**: Adjust color saturation (0.0 - 2.8)

### View Controls
- **Pan**: Click and drag on canvas to move around
- **Zoom**: Mouse wheel to zoom in/out
- **Double Click**: Reset view to fit screen
- **View Button**: Cycle through view modes (fit, fit height, fit width)
- **Fullscreen Button**: Toggle fullscreen mode
- **Random Button**: Randomize all slider values
- **Reset Button**: Reset all sliders to default center positions

## 🌐 Browser Compatibility

**Tested and works in:**
- ✅ Chrome/Edge (latest) - **Recommended**
- ✅ Firefox (latest)
- ✅ Safari (latest)

**Requirements:**
- Modern browser with HTML5 Canvas support
- JavaScript enabled
- No extensions or plugins needed

## 📝 Technical Details

- **Pure JavaScript (ES6+)**: No frameworks or build tools
- **HTML5 Canvas**: High-performance rendering
- **Simplex Noise**: Dynamic flow field generation
- **Base64 Embedded Image**: No external file dependencies
- **Spatial Partitioning**: Optimized collision detection
- **Color-Guided Path Following**: Intelligent particle routing

## 🎨 Default Settings

All sliders are calibrated to center positions:
- Particle Speed: 1.3
- Particle Count: 2800
- Trail Length: 0.1
- Particle Opacity: 0.4
- Particle Blur: 5.0
- Background Brightness: 1.2
- Background Contrast: 1.3
- Background Saturation: 1.4

## 📦 Project Structure

```
starry_night/
├── index.html          # Main HTML file
├── style.css           # Styles and layout
├── script.js           # Core particle simulation logic
├── image_data.js       # Base64 encoded image data
└── README.md           # This file
```

## 📄 License

MIT License

## 👤 Author

**0xGarfield**
- GitHub: [@djzoom](https://github.com/djzoom)
- Twitter: [@DJWZ](https://x.com/DJWZ)

## 🙏 Credits

- Original artwork: Vincent van Gogh's "The Starry Night" (1889)
- Interactive simulation: Custom implementation by 0xGarfield
