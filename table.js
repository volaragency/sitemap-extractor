/**
 * Sitemap Extractor - Table Viewer Script
 * 
 * Developed by: Volar Agency
 * Website: https://thevolar.com
 */

// Get URL parameter
const urlParams = new URLSearchParams(window.location.search);
const sitemapUrl = urlParams.get('url');

// State
let sitemapData = null;
let filteredData = null;
let currentSort = { column: 'index', direction: 'asc' };

// DOM Elements
const sitemapUrlEl = document.getElementById('sitemapUrl');
const totalUrlsEl = document.getElementById('totalUrls');
const visibleUrlsEl = document.getElementById('visibleUrls');
const totalImagesEl = document.getElementById('totalImages');
const sitemapTypeEl = document.getElementById('sitemapType');
const searchBox = document.getElementById('searchBox');
const searchBtn = document.getElementById('searchBtn');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const copyAllBtn = document.getElementById('copyAllBtn');
const filterInfo = document.getElementById('filterInfo');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const dataTable = document.getElementById('dataTable');
const tableBody = document.getElementById('tableBody');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
clearBtn.addEventListener('click', handleClear);
exportBtn.addEventListener('click', handleExport);
copyAllBtn.addEventListener('click', handleCopyAll);
searchBox.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleSearch();
});

// Sorting listeners
document.querySelectorAll('th.sortable').forEach((th) => {
  th.addEventListener('click', () => {
    const column = th.dataset.column;
    handleSort(column);
  });
});

// Initialize
init();

async function init() {
  if (!sitemapUrl) {
    showError('No sitemap URL provided');
    return;
  }

  sitemapUrlEl.textContent = sitemapUrl;

  try {
    const response = await fetch(sitemapUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const sitemapContent = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(sitemapContent, 'text/xml');

    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Invalid XML format');
    }

    // Parse with recursive fetching
    const result = await extractSitemapData(xmlDoc, sitemapUrl);
    sitemapData = result;
    filteredData = [...sitemapData.urls];

    updateStats();
    renderTable();

    loadingState.style.display = 'none';
    dataTable.style.display = 'table';
  } catch (err) {
    showError(err.message);
  }
}

async function extractSitemapData(xmlDoc, currentUrl) {
  const urls = [];
  const urlSet = new Set();
  let sitemapType = 'Unknown';
  let totalImages = 0;

  // Check for sitemap index (WordPress style)
  const sitemapIndexElements = xmlDoc.querySelectorAll('sitemapindex > sitemap');
  
  if (sitemapIndexElements.length > 0) {
    sitemapType = 'Sitemap Index (WordPress)';

    // Fetch each nested sitemap
    for (const sitemapEl of sitemapIndexElements) {
      const loc = sitemapEl.querySelector('loc');
      if (!loc) continue;

      const nestedUrl = loc.textContent.trim();

      try {
        const res = await fetch(nestedUrl);
        if (!res.ok) continue;

        const nestedContent = await res.text();
        const nestedParser = new DOMParser();
        const nestedXml = nestedParser.parseFromString(nestedContent, 'text/xml');

        // Recursively parse nested sitemap
        const nestedResult = await extractSitemapData(nestedXml, nestedUrl);
        
        nestedResult.urls.forEach(item => {
          if (!urlSet.has(item.url)) {
            urlSet.add(item.url);
            urls.push(item);
          }
        });

        totalImages += nestedResult.totalImages || 0;
      } catch (err) {
        console.warn('Failed to fetch nested sitemap:', nestedUrl, err);
      }
    }

    return { urls, sitemapType, totalImages };
  }

  // Standard sitemap
  const urlElements = xmlDoc.querySelectorAll('urlset > url');
  if (urlElements.length > 0) {
    sitemapType = 'Standard Sitemap';

    urlElements.forEach((urlEl, index) => {
      const loc = urlEl.querySelector('loc');
      if (!loc) return;

      const url = loc.textContent.trim();
      if (!url || urlSet.has(url)) return;
      urlSet.add(url);

      const lastmod = urlEl.querySelector('lastmod')?.textContent?.trim() || '';
      const priority = urlEl.querySelector('priority')?.textContent?.trim() || '';
      const changefreq = urlEl.querySelector('changefreq')?.textContent?.trim() || '';

      const images = [];
      const imageElements = urlEl.querySelectorAll('image\\:image, image');
      imageElements.forEach((img) => {
        const imgLoc = img.querySelector('image\\:loc, loc');
        if (imgLoc) {
          images.push(imgLoc.textContent.trim());
          totalImages++;
        }
      });

      urls.push({
        index: index + 1,
        url,
        lastmod,
        priority,
        changefreq,
        images
      });
    });
  }

  // RSS/Atom fallback
  if (urls.length === 0) {
    const rssItems = xmlDoc.querySelectorAll('item, entry');
    if (rssItems.length > 0) {
      sitemapType = 'RSS/Atom Feed';

      rssItems.forEach((item, index) => {
        const link = item.querySelector('link');
        if (!link) return;

        const url = link.textContent.trim() || link.getAttribute('href');
        if (!url || urlSet.has(url)) return;
        urlSet.add(url);

        const pubDate = item.querySelector('pubDate, published')?.textContent?.trim() || '';

        urls.push({
          index: index + 1,
          url,
          lastmod: pubDate,
          priority: '',
          changefreq: '',
          images: []
        });
      });
    }
  }

  // Generic XML fallback
  if (urls.length === 0) {
    const allLocs = xmlDoc.querySelectorAll('loc');
    if (allLocs.length > 0) {
      sitemapType = 'Generic XML';

      allLocs.forEach((loc, index) => {
        const url = loc.textContent.trim();
        if (!url || urlSet.has(url)) return;

        try {
          new URL(url);
          urlSet.add(url);

          urls.push({
            index: index + 1,
            url,
            lastmod: '',
            priority: '',
            changefreq: '',
            images: []
          });
        } catch {}
      });
    }
  }

  return { urls, sitemapType, totalImages };
}

function renderTable() {
  tableBody.innerHTML = '';

  filteredData.forEach((item, index) => {
    const row = document.createElement('tr');

    // Index
    const indexCell = document.createElement('td');
    indexCell.className = 'row-number';
    indexCell.textContent = item.index || index + 1;
    row.appendChild(indexCell);

    // URL
    const urlCell = document.createElement('td');
    urlCell.className = 'url-cell';
    const urlLink = document.createElement('a');
    urlLink.href = item.url;
    urlLink.textContent = item.url;
    urlLink.className = 'url-link';
    urlLink.target = '_blank';
    urlCell.appendChild(urlLink);
    row.appendChild(urlCell);

    // Images
    const imageCell = document.createElement('td');
    if (item.images && item.images.length > 0) {
      const imageBadge = document.createElement('div');
      imageBadge.className = 'image-badge';
      imageBadge.innerHTML = `🖼️ ${item.images.length}`;
      imageBadge.title = item.images.join('\n');
      imageBadge.onclick = () => {
        const imageUrls = item.images.join('\n');
        navigator.clipboard.writeText(imageUrls);
        showToast('✓ Image URLs copied!');
      };
      imageCell.appendChild(imageBadge);
    } else {
      imageCell.textContent = '-';
      imageCell.style.color = '#cbd5e0';
    }
    row.appendChild(imageCell);

    // Last Modified
    const dateCell = document.createElement('td');
    dateCell.className = 'date-cell';
    dateCell.textContent = item.lastmod ? formatDate(item.lastmod) : '-';
    row.appendChild(dateCell);

    // Priority
    const priorityCell = document.createElement('td');
    if (item.priority) {
      const badge = document.createElement('span');
      badge.className = 'priority-badge';
      const priorityNum = parseFloat(item.priority);
      
      if (priorityNum >= 0.8) {
        badge.classList.add('priority-high');
      } else if (priorityNum >= 0.5) {
        badge.classList.add('priority-medium');
      } else {
        badge.classList.add('priority-low');
      }
      
      badge.textContent = item.priority;
      priorityCell.appendChild(badge);
    } else {
      priorityCell.textContent = '-';
      priorityCell.style.color = '#cbd5e0';
    }
    row.appendChild(priorityCell);

    tableBody.appendChild(row);
  });

  updateVisibleCount();
}

function handleSearch() {
  const query = searchBox.value.trim().toLowerCase();
  
  if (!query) {
    filteredData = [...sitemapData.urls];
    filterInfo.style.display = 'none';
  } else {
    filteredData = sitemapData.urls.filter(item => 
      item.url.toLowerCase().includes(query)
    );
    filterInfo.textContent = `Showing ${filteredData.length} of ${sitemapData.urls.length} URLs matching "${query}"`;
    filterInfo.style.display = 'block';
  }

  renderTable();
}

function handleClear() {
  searchBox.value = '';
  filteredData = [...sitemapData.urls];
  filterInfo.style.display = 'none';
  renderTable();
}

function handleSort(column) {
  if (currentSort.column === column) {
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.column = column;
    currentSort.direction = 'asc';
  }

  // Update header classes
  document.querySelectorAll('th.sortable').forEach(th => {
    th.classList.remove('sorted-asc', 'sorted-desc');
    if (th.dataset.column === column) {
      th.classList.add(`sorted-${currentSort.direction}`);
    }
  });

  // Sort data
  filteredData.sort((a, b) => {
    let aVal = a[column];
    let bVal = b[column];

    if (column === 'images') {
      aVal = (a.images || []).length;
      bVal = (b.images || []).length;
    } else if (column === 'priority') {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    }

    if (aVal < bVal) return currentSort.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return currentSort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  renderTable();
}

function handleExport() {
  try {
    const csvRows = [['URL', 'Images', 'Last Modified', 'Priority']];

    filteredData.forEach(item => {
      csvRows.push([
        item.url,
        item.images && item.images.length > 0 ? item.images.join(', ') : '',
        item.lastmod || '',
        item.priority || ''
      ]);
    });

    const csvContent = csvRows
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const domain = new URL(sitemapUrl).hostname;
    const timestamp = new Date().toISOString().split('T')[0];
    link.download = `sitemap_${domain}_${timestamp}.csv`;

    link.click();
    URL.revokeObjectURL(url);

    showToast('✓ CSV exported successfully!');
  } catch (err) {
    showToast('❌ Export failed: ' + err.message);
  }
}

function handleCopyAll() {
  const urlText = filteredData.map(u => u.url).join('\n');
  navigator.clipboard.writeText(urlText);
  showToast(`✓ Copied ${filteredData.length} URLs to clipboard!`);
}

function updateStats() {
  totalUrlsEl.textContent = sitemapData.urls.length;
  totalImagesEl.textContent = sitemapData.totalImages || 0;
  sitemapTypeEl.textContent = sitemapData.sitemapType;
}

function updateVisibleCount() {
  visibleUrlsEl.textContent = filteredData.length;
}

function formatDate(dateStr) {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${month[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function showToast(message) {
  toastMessage.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function showError(message) {
  loadingState.style.display = 'none';
  errorState.innerHTML = `<div class="error-message">❌ Error: ${message}</div>`;
  errorState.style.display = 'block';
}
