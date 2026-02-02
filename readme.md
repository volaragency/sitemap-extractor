<div align="center">

# Sitemap Extractor

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chrome.google.com)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](LICENSE)

**Intelligent sitemap discovery, extraction, and analysis for SEO professionals and web developers.**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage-guide) • [Troubleshooting](#-troubleshooting) • [Support](#-support)

---

</div>

## Overview

**Sitemap Extractor** is a professional-grade Chrome extension that automatically discovers, extracts, and exports sitemap URLs from any website. Built with WordPress in mind, it recursively fetches nested sitemaps and aggregates all URLs into an easily exportable format.

### What It Does

- **Discovers sitemaps automatically** by checking robots.txt and common sitemap locations
- **Handles WordPress sitemap indexes** with recursive fetching of all child sitemaps
- **Copies all URLs to clipboard** with a single click
- **Provides a powerful table viewer** for searching, sorting, and exporting data
- **Extracts image URLs** from sitemap entries for comprehensive SEO analysis

---

## Features

### Core Capabilities

| Feature               | Description                                                       |
| --------------------- | ----------------------------------------------------------------- |
| **Auto-Discovery**    | Automatically finds sitemaps from robots.txt and common locations |
| **WordPress Support** | Recursive fetching of nested sitemaps (sitemap_index.xml)         |
| **Manual Input**      | Direct sitemap URL input for custom or hidden sitemaps            |
| **Instant Copy**      | One-click copy all URLs to clipboard                              |
| **Advanced Viewer**   | Full-featured table viewer with search, sort, and export          |
| **CSV Export**        | Download sitemap data in CSV format                               |
| **Image Detection**   | Identifies and lists images embedded in sitemap entries           |

### Supported Sitemap Formats

- **Standard XML Sitemaps** (`<urlset>` with `<url>` entries)
- **WordPress Sitemap Indexes** (`<sitemapindex>` with nested `<sitemap>` entries)
- **RSS/Atom Feeds** (`<item>` or `<entry>` elements)
- **Generic XML** (any XML containing `<loc>` tags)

---

## Installation

### Method 1: Load Unpacked (Developer Mode)

1. **Clone or download this repository**

   ```bash
   git clone https://github.com/volaragency/sitemap-extractor.git
   ```

   Or download and extract the ZIP file.

2. **Open Chrome Extensions page**
   - Navigate to `chrome://extensions/` in your browser
   - Enable **Developer mode** using the toggle in the top-right corner

3. **Load the extension**
   - Click **"Load unpacked"**
   - Select the extension directory (where `manifest.json` is located)
   - The extension icon will appear in your Chrome toolbar

4. **Pin the extension** (optional)
   - Click the puzzle icon in the toolbar
   - Pin "Sitemap Extractor" for easy access

### Method 2: Chrome Web Store

_Coming soon_

---

## Usage Guide

### Quick Start

1. **Navigate** to any website
2. **Click** the extension icon in your toolbar
3. **Click** "Extract URLs"
4. **Done!** All URLs are copied to your clipboard

### Auto-Discovery Mode

The extension automatically searches for sitemaps in this order:

```
1. Check if current page is already a sitemap (XML content)
2. Parse robots.txt for Sitemap: declarations
3. Try common sitemap paths:
   ├── /sitemap.xml
   ├── /sitemap_index.xml
   ├── /wp-sitemap.xml
   ├── /sitemap-index.xml
   ├── /sitemap1.xml
   └── /sitemap/sitemap.xml
```

### Manual Input Mode

For websites with non-standard sitemap locations:

1. Click the extension icon
2. Enter the sitemap URL in the input field
   ```
   https://example.com/custom-sitemap.xml
   ```
3. Click **"Scan"**
4. URLs are extracted and copied automatically

### Table Viewer

Click **"View Table"** after extraction to access:

| Feature    | Action                                               |
| ---------- | ---------------------------------------------------- |
| **Search** | Type in the search box to filter URLs                |
| **Sort**   | Click any column header to sort ascending/descending |
| **Export** | Click "Export CSV" to download data                  |
| **Copy**   | Click "Copy All" for filtered URLs                   |
| **Images** | Click the image badge to copy image URLs             |

---

## How It Works

### WordPress Sitemap Handling

For WordPress sites, the extension handles multi-level sitemap structures:

```
sitemap_index.xml (main index)
  ├── post-sitemap.xml      → All blog posts
  ├── page-sitemap.xml      → All pages
  ├── category-sitemap.xml  → Category archives
  ├── tag-sitemap.xml       → Tag archives
  └── author-sitemap.xml    → Author pages
```

**The extension automatically:**

1. Detects the sitemap index structure
2. Fetches each child sitemap in sequence
3. Recursively parses nested sitemaps (supports unlimited depth)
4. Aggregates all URLs from all levels
5. Removes duplicates

### Extracted Data

For each URL, the extension captures:

- **URL** - The page location
- **Last Modified** - When the page was last updated
- **Priority** - The sitemap priority value (0.0 - 1.0)
- **Change Frequency** - How often the page changes
- **Images** - Associated image URLs (if present)

---

## Technical Details

### Project Structure

```
sitemap-extractor/
├── manifest.json       # Extension configuration (Manifest V3)
├── popup.html          # Main popup interface
├── popup.js            # Popup logic and sitemap extraction
├── table.html          # Table viewer interface
├── table.js            # Table viewer logic
├── content.js          # Content script (page context)
├── icon16.png          # Toolbar icon (16x16)
├── icon48.png          # Extension icon (48x48)
├── icon128.png         # Store icon (128x128)
└── README.md           # Documentation
```

### Permissions

| Permission       | Purpose                                          |
| ---------------- | ------------------------------------------------ |
| `activeTab`      | Access the current tab to detect sitemap content |
| `scripting`      | Execute extraction scripts in page context       |
| `clipboardWrite` | Copy extracted URLs to clipboard                 |
| `<all_urls>`     | Fetch sitemaps from any domain                   |

### Key Functions

| Function                      | File     | Description                                    |
| ----------------------------- | -------- | ---------------------------------------------- |
| `discoverAndExtractSitemap()` | popup.js | Main discovery engine, runs in page context    |
| `parseAndFetchRecursive()`    | popup.js | Recursive sitemap parser for nested structures |
| `parseManualSitemap()`        | popup.js | Handles manually entered sitemap URLs          |
| `extractSitemapData()`        | table.js | Parses sitemap for the table viewer            |

---

## Troubleshooting

### Common Issues

<details>
<summary><strong>"No sitemap found"</strong></summary>

- The website may not have a publicly accessible sitemap
- Try using **Manual Input** with a known sitemap URL
- Check if `robots.txt` exists and contains a `Sitemap:` directive
- Some sites block sitemap access to bots/extensions

</details>

<details>
<summary><strong>"Failed to fetch sitemap"</strong></summary>

- CORS (Cross-Origin Resource Sharing) may be blocking the request
- The sitemap URL may be incorrect or the file doesn't exist
- The website may be rate-limiting or blocking requests
- Try refreshing the page and trying again

</details>

<details>
<summary><strong>"Invalid XML format"</strong></summary>

- The sitemap may contain malformed XML
- Open the sitemap URL directly in your browser to verify
- Some servers return HTML error pages instead of the sitemap
- Report the issue if the sitemap appears valid in browser

</details>

<details>
<summary><strong>Nested sitemaps not loading</strong></summary>

- Large sitemap indexes may timeout with many child sitemaps
- Try extracting individual child sitemap URLs manually
- Check the extension logs for specific errors
- Network issues may interrupt fetching

</details>

### Debug Mode

To view detailed extraction logs:

1. Right-click the extension icon
2. Select **"Inspect popup"**
3. Go to the **Console** tab
4. Run the extraction again to see detailed logs

---

## Changelog

### Version 3.0.0 (Current)

- Simplified UI with 2 main actions (Extract + View)
- Added manual sitemap URL input
- Implemented recursive WordPress sitemap fetching
- Fixed sitemap_index.xml detection and parsing
- Modernized UI with gradient design
- Improved error handling and logging
- Enhanced table viewer with better UX

### Version 2.0.0

- Initial auto-discovery implementation
- Basic sitemap parsing
- CSV export functionality

---

## Roadmap

Future enhancements planned:

- [ ] Support for compressed sitemaps (`.xml.gz`)
- [ ] Sitemap validation and health reporting
- [ ] Advanced URL filtering (regex patterns)
- [ ] Batch processing for multiple domains
- [ ] Extraction history and saved sessions
- [ ] Dark mode theme
- [ ] JSON export format
- [ ] Sitemap comparison tool

---

## Support

For issues, feature requests, or inquiries:

| Channel              | Link                                 |
| -------------------- | ------------------------------------ |
| **Website**          | [thevolar.com](https://thevolar.com) |
| **Bug Reports**      | [Open an Issue](../../issues)        |
| **Feature Requests** | [Open an Issue](../../issues)        |

---

## Technology Stack

- **JavaScript** - ES6+ with async/await
- **Chrome Extension** - Manifest V3 APIs
- **CSS** - Modern flexbox/grid layouts
- **XML Parsing** - Native DOMParser API
- **Network** - Fetch API for HTTP requests

---

## License

MIT License

Copyright (c) 2026 Volar Agency

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

<div align="center">
**Developed with excellence by [Volar Agency](https://thevolar.com)**
</div>
