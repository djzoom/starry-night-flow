# Van Gogh's Psychedelic Starry Night 🌌

A psychedelic, interactive particle flow simulation of Van Gogh's *The Starry Night*, built with HTML5 Canvas and pure JavaScript.

![Starry Night Demo](https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/600px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg)

## Features

- **Flow Field Simulation**: Particles follow the actual brushstrokes of Van Gogh's masterpiece.
- **Psychedelic Effects**:
  - **Swirl**: Dynamic turbulence based on Simplex Noise.
  - **Trails**: Long-exposure light painting effects.
  - **Blur/Bokeh**: Depth of field simulation.
  - **Color Shift**: 60s-style psychedelic hue cycling.
- **Interactive Controls**: Real-time adjustment of speed, density, opacity, and more.
- **GIF Recording**: Record and download 10-second high-quality GIFs of your creations.

## Tech Stack

- **HTML5 Canvas**: High-performance 2D rendering.
- **No External Runtime Dependencies**: Pure JS (Simplex Noise implementation included).
- **Base64 Asset Embedding**: Images are embedded to prevent CORS issues, ensuring it runs locally out of the box.
- **gif.js**: Client-side GIF encoding.

## How to Run

1. Clone this repository.
2. Open `index.html` in any modern web browser.
   - No server required! (Thanks to Base64 embedding)

## Controls

- **Flow Speed**: Adjust the velocity of the particles.
- **Swirl**: Change the chaos level of the vector field.
- **Trail Length**: Control the "long exposure" effect.
- **Opacity**: Adjust brush stroke transparency.
- **Blur**: Simulate myopia or bokeh effects.

## License

MIT License

