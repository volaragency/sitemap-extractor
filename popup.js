/**
 * Sitemap Extractor - Popup Script
 * 
 * Developed by: Volar Agency
 * Website: https://thevolar.com
 * 
 * Features:
 * - Auto-discovery of sitemaps
 * - Recursive WordPress sitemap fetching
 * - Manual URL input support
 * - Intelligent error handling
 */

// DOM Elements
const extractBtn = document.getElementById('extractBtn');
const viewBtn = document.getElementById('viewBtn');
const manualScanBtn = document.getElementById('manualScanBtn');
const manualUrl = document.getElementById('manualUrl');
const statusDiv = document.getElementById('status');
const statsDiv = document.getElementById('stats');
const logContainer = document.getElementById('logContainer');
const sitemapUrlSpan = document.getElementById('sitemapUrl');
const urlCountSpan = document.getElementById('urlCount');
const sitemapTypeSpan = document.getElementById('sitemapType');

// State
let sitemapData = null;

// Event Listeners
extractBtn.addEventListener('click', handleAutoExtract);
viewBtn.addEventListener('click', openViewer);
manualScanBtn.addEventListener('click', handleManualScan);
manualUrl.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleManualScan();
});

/**
 * Handle automatic sitemap extraction from current tab
 */
async function handleAutoExtract() {
  try {
    setLoading(true, extractBtn);
    clearState();
    showStatus('🔍 Starting auto-discovery...', 'info');
    addLog('Initializing sitemap discovery', 'info');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.id) {
      throw new Error('No active tab found');
    }

    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://'))) {
      throw new Error('Cannot access Chrome internal pages');
    }

    const domain = new URL(tab.url).origin;
    addLog(`Domain: ${domain}`, 'info');

    // Execute discovery script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: discoverAndExtractSitemap,
      args: [domain, tab.url]
    });

    if (!results || !results[0]) {
      throw new Error('Failed to execute extraction');
    }

    const result = results[0].result;
    
    if (result.error) {
      throw new Error(result.error);
    }

    await processResults(result);
    
  } catch (err) {
    console.error('Extraction error:', err);
    showStatus(`❌ ${err.message}`, 'error');
    addLog(`Error: ${err.message}`, 'error');
  } finally {
    setLoading(false, extractBtn);
  }
}

/**
 * Handle manual sitemap URL scan
 */
async function handleManualScan() {
  const url = manualUrl.value.trim();
  
  if (!url) {
    showStatus('⚠️ Please enter a sitemap URL', 'warning');
    return;
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    showStatus('❌ Invalid URL format', 'error');
    return;
  }

  try {
    setLoading(true, manualScanBtn);
    clearState();
    showStatus('🔍 Scanning manual URL...', 'info');
    addLog(`Manual scan: ${url}`, 'info');

    // Fetch directly
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const content = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, 'text/xml');

    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Invalid XML format');
    }

    // Parse with recursive fetching using local function
    const result = await parseManualSitemap(xmlDoc, url, new URL(url).origin);
    
    if (result.urls.length === 0) {
      throw new Error('No URLs found in sitemap');
    }

    result.sitemapUrl = url;
    result.discoveryLog = [
      { message: `Manual URL: ${url}`, type: 'info' },
      { message: `Found ${result.urls.length} total URLs`, type: 'success' }
    ];

    await processResults(result);

  } catch (err) {
    console.error('Manual scan error:', err);
    showStatus(`❌ ${err.message}`, 'error');
    addLog(`Error: ${err.message}`, 'error');
  } finally {
    setLoading(false, manualScanBtn);
  }
}

/**
 * Parse sitemap recursively - for manual scan (runs in popup context)
 */
async function parseManualSitemap(xmlDoc, currentUrl, domain) {
  const urls = [];
  const urlSet = new Set();
  let sitemapType = 'Unknown';
  let totalImages = 0;

  // Check for sitemap index first (WordPress style)
  const sitemapIndexElements = xmlDoc.querySelectorAll('sitemapindex > sitemap');
  
  if (sitemapIndexElements.length > 0) {
    sitemapType = 'Sitemap Index (WordPress)';
    addLog(`Found sitemap index with ${sitemapIndexElements.length} child sitemaps`, 'info');

    // Fetch each nested sitemap recursively
    for (const sitemapEl of sitemapIndexElements) {
      const loc = sitemapEl.querySelector('loc');
      if (!loc) continue;

      const nestedUrl = loc.textContent.trim();
      addLog(`Fetching nested: ${nestedUrl}`, 'info');

      try {
        const res = await fetch(nestedUrl);
        if (!res.ok) {
          addLog(`⚠️ Failed to fetch ${nestedUrl}`, 'warning');
          continue;
        }

        const nestedContent = await res.text();
        const nestedParser = new DOMParser();
        const nestedXml = nestedParser.parseFromString(nestedContent, 'text/xml');

        // Recursively parse nested sitemap
        const nestedResult = await parseManualSitemap(nestedXml, nestedUrl, domain);
        
        // Merge results
        nestedResult.urls.forEach(item => {
          if (!urlSet.has(item.url)) {
            urlSet.add(item.url);
            urls.push(item);
          }
        });

        totalImages += nestedResult.totalImages || 0;
        addLog(`✓ Got ${nestedResult.urls.length} URLs from nested sitemap`, 'success');

      } catch (err) {
        addLog(`⚠️ Error: ${err.message}`, 'warning');
      }
    }

    return { urls, sitemapType, totalImages };
  }

  // Standard sitemap parsing
  const urlElements = xmlDoc.querySelectorAll('urlset > url');
  if (urlElements.length > 0) {
    sitemapType = 'Standard Sitemap';
    addLog(`Parsing ${urlElements.length} URLs`, 'info');

    urlElements.forEach((urlEl) => {
      const loc = urlEl.querySelector('loc');
      if (!loc) return;

      const url = loc.textContent.trim();
      if (!url || urlSet.has(url)) return;
      urlSet.add(url);

      const lastmod = urlEl.querySelector('lastmod')?.textContent?.trim() || '';
      const priority = urlEl.querySelector('priority')?.textContent?.trim() || '';
      const changefreq = urlEl.querySelector('changefreq')?.textContent?.trim() || '';

      // Extract images
      const images = [];
      const imageElements = urlEl.querySelectorAll('image\\:image, image');
      imageElements.forEach((img) => {
        const imgLoc = img.querySelector('image\\:loc, loc');
        if (imgLoc) {
          images.push(imgLoc.textContent.trim());
          totalImages++;
        }
      });

      urls.push({ url, lastmod, priority, changefreq, images });
    });
  }

  // RSS/Atom fallback
  if (urls.length === 0) {
    const rssItems = xmlDoc.querySelectorAll('item, entry');
    if (rssItems.length > 0) {
      sitemapType = 'RSS/Atom Feed';
      addLog(`Parsing ${rssItems.length} RSS items`, 'info');

      rssItems.forEach((item) => {
        const link = item.querySelector('link');
        if (!link) return;

        const url = link.textContent.trim() || link.getAttribute('href');
        if (!url || urlSet.has(url)) return;
        urlSet.add(url);

        const pubDate = item.querySelector('pubDate, published')?.textContent?.trim() || '';
        urls.push({ url, lastmod: pubDate, priority: '', changefreq: '', images: [] });
      });
    }
  }

  // Generic XML fallback
  if (urls.length === 0) {
    const allLocs = xmlDoc.querySelectorAll('loc');
    if (allLocs.length > 0) {
      sitemapType = 'Generic XML';
      addLog(`Extracting ${allLocs.length} <loc> tags`, 'info');

      allLocs.forEach((loc) => {
        const url = loc.textContent.trim();
        if (!url || urlSet.has(url)) return;
        
        try {
          new URL(url);
          urlSet.add(url);
          urls.push({ url, lastmod: '', priority: '', changefreq: '', images: [] });
        } catch {}
      });
    }
  }

  return { urls, sitemapType, totalImages };
}

/**
 * Process extraction results
 */
async function processResults(result) {
  sitemapData = result;
  
  // Display logs
  if (result.discoveryLog) {
    result.discoveryLog.forEach(log => addLog(log.message, log.type));
  }

  // Copy to clipboard
  const urlText = result.urls.map(u => u.url).join('\n');
  await navigator.clipboard.writeText(urlText);

  // Update UI
  updateStats(result);
  showStatus(`✅ Copied ${result.urls.length} URLs to clipboard!`, 'success');
  viewBtn.disabled = false;

  // Success animation
  extractBtn.textContent = '✅ Copied!';
  extractBtn.classList.add('success');
  setTimeout(() => {
    extractBtn.textContent = '📋 Extract URLs';
    extractBtn.classList.remove('success');
  }, 2000);
}

/**
 * Main discovery function - runs in page context
 */
async function discoverAndExtractSitemap(domain, currentUrl) {
  const log = [];
  
  function addLog(msg, type = 'info') {
    log.push({ message: msg, type, time: new Date().toISOString() });
  }

  /**
   * Recursive parser - MUST be inside discoverAndExtractSitemap for executeScript
   */
  async function parseAndFetchRecursive(xmlDoc, currentUrl, domain, logFunc = null) {
    const urls = [];
    const urlSet = new Set();
    let sitemapType = 'Unknown';
    let totalImages = 0;

    const log = (msg, type) => {
      if (logFunc) logFunc(msg, type);
    };

    // Check for sitemap index first (WordPress style)
    const sitemapIndexElements = xmlDoc.querySelectorAll('sitemapindex > sitemap');
    
    if (sitemapIndexElements.length > 0) {
      sitemapType = 'Sitemap Index (WordPress)';
      log(`Found sitemap index with ${sitemapIndexElements.length} child sitemaps`, 'info');

      // Fetch each nested sitemap recursively
      for (const sitemapEl of sitemapIndexElements) {
        const loc = sitemapEl.querySelector('loc');
        if (!loc) continue;

        const nestedUrl = loc.textContent.trim();
        log(`Fetching nested sitemap: ${nestedUrl}`, 'info');

        try {
          const res = await fetch(nestedUrl);
          if (!res.ok) {
            log(`⚠️ Failed to fetch ${nestedUrl}`, 'warning');
            continue;
          }

          const nestedContent = await res.text();
          const nestedParser = new DOMParser();
          const nestedXml = nestedParser.parseFromString(nestedContent, 'text/xml');

          // Recursively parse nested sitemap
          const nestedResult = await parseAndFetchRecursive(nestedXml, nestedUrl, domain, logFunc);
          
          // Merge results
          nestedResult.urls.forEach(item => {
            if (!urlSet.has(item.url)) {
              urlSet.add(item.url);
              urls.push(item);
            }
          });

          totalImages += nestedResult.totalImages || 0;
          log(`✓ Extracted ${nestedResult.urls.length} URLs from nested sitemap`, 'success');

        } catch (err) {
          log(`⚠️ Error fetching nested sitemap: ${err.message}`, 'warning');
        }
      }

      return { urls, sitemapType, totalImages };
    }

    // Standard sitemap parsing
    const urlElements = xmlDoc.querySelectorAll('urlset > url');
    if (urlElements.length > 0) {
      sitemapType = 'Standard Sitemap';
      log(`Parsing ${urlElements.length} URLs`, 'info');

      urlElements.forEach((urlEl) => {
        const loc = urlEl.querySelector('loc');
        if (!loc) return;

        const url = loc.textContent.trim();
        if (!url || urlSet.has(url)) return;
        urlSet.add(url);

        const lastmod = urlEl.querySelector('lastmod')?.textContent?.trim() || '';
        const priority = urlEl.querySelector('priority')?.textContent?.trim() || '';
        const changefreq = urlEl.querySelector('changefreq')?.textContent?.trim() || '';

        // Extract images
        const images = [];
        const imageElements = urlEl.querySelectorAll('image\\:image, image');
        imageElements.forEach((img) => {
          const imgLoc = img.querySelector('image\\:loc, loc');
          if (imgLoc) {
            images.push(imgLoc.textContent.trim());
            totalImages++;
          }
        });

        urls.push({ url, lastmod, priority, changefreq, images });
      });
    }

    // RSS/Atom fallback
    if (urls.length === 0) {
      const rssItems = xmlDoc.querySelectorAll('item, entry');
      if (rssItems.length > 0) {
        sitemapType = 'RSS/Atom Feed';
        log(`Parsing ${rssItems.length} RSS items`, 'info');

        rssItems.forEach((item) => {
          const link = item.querySelector('link');
          if (!link) return;

          const url = link.textContent.trim() || link.getAttribute('href');
          if (!url || urlSet.has(url)) return;
          urlSet.add(url);

          const pubDate = item.querySelector('pubDate, published')?.textContent?.trim() || '';
          urls.push({ url, lastmod: pubDate, priority: '', changefreq: '', images: [] });
        });
      }
    }

    // Generic XML fallback
    if (urls.length === 0) {
      const allLocs = xmlDoc.querySelectorAll('loc');
      if (allLocs.length > 0) {
        sitemapType = 'Generic XML';
        log(`Extracting ${allLocs.length} <loc> tags`, 'info');

        allLocs.forEach((loc) => {
          const url = loc.textContent.trim();
          if (!url || urlSet.has(url)) return;
          
          try {
            new URL(url);
            urlSet.add(url);
            urls.push({ url, lastmod: '', priority: '', changefreq: '', images: [] });
          } catch {}
        });
      }
    }

    return { urls, sitemapType, totalImages };
  }

  try {
    let sitemapUrl = null;
    let sitemapContent = null;

    // Check if already on XML page
    const doc = document;
    const isXML = doc.contentType === 'application/xml' || 
                  doc.contentType === 'text/xml' ||
                  doc.querySelector('urlset, sitemapindex');

    if (isXML) {
      addLog('Already on sitemap page', 'success');
      sitemapUrl = currentUrl;
      sitemapContent = doc.documentElement.outerHTML;
    } else {
      addLog('Starting sitemap discovery', 'info');

      // Try robots.txt first
      const robotsUrl = `${domain}/robots.txt`;
      addLog(`Checking ${robotsUrl}`, 'info');

      try {
        const robotsRes = await fetch(robotsUrl);
        if (robotsRes.ok) {
          const robotsText = await robotsRes.text();
          const matches = robotsText.match(/Sitemap:\s*(.+)/gi);
          
          if (matches && matches.length > 0) {
            sitemapUrl = matches[0].replace(/Sitemap:\s*/i, '').trim();
            addLog(`✓ Found in robots.txt: ${sitemapUrl}`, 'success');
          }
        }
      } catch (e) {
        addLog(`robots.txt not accessible`, 'info');
      }

      // Try common paths
      if (!sitemapUrl) {
        const paths = [
          '/sitemap.xml',
          '/sitemap_index.xml',
          '/wp-sitemap.xml',
          '/sitemap-index.xml',
          '/sitemap1.xml',
          '/sitemap/sitemap.xml'
        ];

        addLog('Checking common locations...', 'info');

        for (const path of paths) {
          const testUrl = `${domain}${path}`;
          try {
            const res = await fetch(testUrl, { method: 'HEAD' });
            if (res.ok) {
              const ct = res.headers.get('content-type');
              if (ct && (ct.includes('xml') || ct.includes('text'))) {
                sitemapUrl = testUrl;
                addLog(`✓ Found at ${path}`, 'success');
                break;
              }
            }
          } catch {}
        }
      }

      if (!sitemapUrl) {
        throw new Error('No sitemap found in robots.txt or common locations');
      }

      // Fetch sitemap
      addLog(`Fetching ${sitemapUrl}`, 'info');
      const res = await fetch(sitemapUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch sitemap: ${res.status}`);
      }
      sitemapContent = await res.text();
      addLog('✓ Sitemap retrieved', 'success');
    }

    // Parse XML
    addLog('Parsing sitemap...', 'info');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(sitemapContent, 'text/xml');

    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Invalid XML format');
    }

    // Parse with recursive fetching
    const result = await parseAndFetchRecursive(xmlDoc, sitemapUrl, domain, addLog);
    
    if (result.urls.length === 0) {
      throw new Error('No URLs found in sitemap');
    }

    addLog(`✓ Extracted ${result.urls.length} total URLs`, 'success');

    return {
      ...result,
      sitemapUrl,
      discoveryLog: log
    };

  } catch (err) {
    addLog(`Error: ${err.message}`, 'error');
    return {
      error: err.message,
      discoveryLog: log
    };
  }
}

/**
 * Open viewer in new tab
 */
function openViewer() {
  if (!sitemapData) return;

  const extensionUrl = chrome.runtime.getURL('table.html');
  const viewerUrl = `${extensionUrl}?url=${encodeURIComponent(sitemapData.sitemapUrl)}`;
  chrome.tabs.create({ url: viewerUrl });
}

/**
 * UI Helper Functions
 */
function setLoading(isLoading, btn) {
  btn.disabled = isLoading;
  if (isLoading) {
    const originalText = btn.textContent;
    btn.dataset.originalText = originalText;
    btn.innerHTML = '<span class="loader"></span> Loading...';
  } else {
    const originalText = btn.dataset.originalText || btn.textContent;
    btn.textContent = originalText;
  }
}

function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type} show`;
  
  if (type === 'success') {
    setTimeout(() => {
      statusDiv.classList.remove('show');
    }, 3000);
  }
}

function updateStats(result) {
  const displayUrl = result.sitemapUrl.length > 35 
    ? '...' + result.sitemapUrl.slice(-32)
    : result.sitemapUrl;

  sitemapUrlSpan.textContent = displayUrl;
  sitemapUrlSpan.title = result.sitemapUrl;
  urlCountSpan.textContent = result.urls.length;
  sitemapTypeSpan.textContent = result.sitemapType;
  statsDiv.classList.add('show');
}

function addLog(message, type = 'info') {
  const logItem = document.createElement('div');
  logItem.className = `log-item ${type}`;
  logItem.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logContainer.appendChild(logItem);
  logContainer.classList.add('show');
  logContainer.scrollTop = logContainer.scrollHeight;
}

function clearState() {
  sitemapData = null;
  viewBtn.disabled = true;
  statusDiv.classList.remove('show');
  statsDiv.classList.remove('show');
  logContainer.innerHTML = '';
  logContainer.classList.remove('show');
}
