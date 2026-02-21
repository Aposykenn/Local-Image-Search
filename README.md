# Image Search

An Electron-based desktop application for scraping images from websites and searching for similar images using perceptual hashing.

## Features

- **Web Scraping**: Scrape images from websites using Puppeteer
- **Image Search**: Find similar images using perceptual image hashing
- **Batch Processing**: Process multiple pages automatically
- **Anti-Detection**: Uses stealth plugins to avoid detection

## Requirements

- Node.js (v14 or higher)
- npm

## Installation

```bash
npm install
```

## Usage

1. Start the application:

```bash
npm start
```

2. **Scrape Images**:
   - Enter a URL in the URL input field
   - Click "Scrape Images" to start scraping
   - Images will be saved to the `temp_images` folder

3. **Search for Similar Images**:
   - Select a reference image using the file input
   - Click "Search" to find similar images in the scraped collection
   - Results are displayed sorted by similarity

4. **View Temp Files**:
   - Click "Temp File" to open the `temp_images` folder

## Dependencies

- `electron` - Desktop application framework
- `puppeteer-extra` - Web scraping with stealth features
- `image-hash` - Perceptual image hashing for similarity detection
- `axios` - HTTP client for downloading images

## Project Structure

```
image-search/
├── main.js          # Main Electron process
├── preload.js       # IPC bridge between renderer and main process
├── renderer.js      # Frontend logic
├── index.html       # UI markup
├── main.css         # Styling
└── temp_images/     # Downloaded images directory (auto-created)
```

## Notes

- Images are temporarily stored in `temp_images/` directory
- The similarity threshold for image matching is set to 50 (adjustable in main.js)
- The scraper is configured for a specific domain keyword filter
