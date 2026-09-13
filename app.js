/* ==========================================================================
   CAT-HOLICS STUDY PORTAL - APPLICATION LOGIC
   Minimal, Sleek, Functional Pure Dark UI
   ========================================================================== */

(function () {
  'use strict';

  // --- STATE ---
  let posts = window.CAT_STUDY_DATA || [];
  const postMap = new Map();
  const postsBySection = { QA: [], DILR: [], VARC: [], Strategy: [] };

  // LocalStorage keys
  const LS_READ = 'cat_vault_read';
  const LS_BOOKMARKS = 'cat_vault_bookmarks';
  const LS_LAST_POST = 'cat_vault_last_post';
  const LS_COLLAPSED = 'cat_vault_collapsed';
  const LS_SIDEBAR_COLLAPSED = 'cat_vault_sidebar_collapsed';

  let readPosts = new Set(JSON.parse(localStorage.getItem(LS_READ) || '[]'));
  let bookmarkedPosts = new Set(JSON.parse(localStorage.getItem(LS_BOOKMARKS) || '[]'));
  let collapsedTopics = new Set(JSON.parse(localStorage.getItem(LS_COLLAPSED) || '[]'));
  let isSidebarCollapsed = localStorage.getItem(LS_SIDEBAR_COLLAPSED) === 'true';
  let currentTab = 'home';
  let activePostId = null;
  let sidebarFilter = 'all'; // 'all' | 'unread' | 'starred'

  // Lightbox state
  let currentZoom = 1.0;
  let isPanning = false;
  let startX = 0, startY = 0, scrollLeft = 0, scrollTop = 0;

  // Initialize Post Indexes
  posts.forEach((p, idx) => {
    p.globalIndex = idx;
    postMap.set(p.id, p);
    if (postsBySection[p.section]) {
      postsBySection[p.section].push(p);
    }
  });

  // --- INITIALIZATION ---
  window.addEventListener('DOMContentLoaded', () => {
    updateBadges();
    initKeyboardShortcuts();

    // Check URL hash or last post
    const hash = window.location.hash.replace('#', '');
    if (hash && hash.startsWith('post-')) {
      const pid = parseInt(hash.replace('post-', ''), 10);
      if (postMap.has(pid)) {
        const p = postMap.get(pid);
        navigateTo(p.section, pid);
        return;
      }
    } else if (hash && ['QA', 'DILR', 'VARC', 'Strategy', 'bookmarks'].includes(hash)) {
      navigateTo(hash);
      return;
    }

    navigateTo('home');
  });

  // --- ROUTING & NAVIGATION ---
  window.navigateTo = function (tab, postId = null) {
    currentTab = tab;
    window.location.hash = postId ? `post-${postId}` : tab;

    // Update Tab UI
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
    });

    const app = document.getElementById('app');

    if (tab === 'home') {
      renderHome(app);
    } else if (tab === 'bookmarks') {
      renderBookmarks(app);
    } else {
      renderSection(app, tab, postId);
    }

    window.scrollTo(0, 0);
  };

  function getSectionStats(sec) {
    const secPosts = postsBySection[sec] || [];
    const total = secPosts.length;
    let readCount = 0;
    for (let i = 0; i < secPosts.length; i++) {
      if (readPosts.has(secPosts[i].id)) readCount++;
    }
    const pct = total > 0 ? Math.round((readCount / total) * 100) : 0;
    return {
      read: readCount,
      total: total,
      pct: pct,
      text: `${readCount} / ${total} Read (${pct}%)`
    };
  }

  function updateBadges() {
    // 1. Overall counter (kept intact as requested)
    const total = posts.length;
    const read = readPosts.size;
    const globalCounter = document.getElementById('read-stats-counter');
    if (globalCounter) {
      globalCounter.textContent = `${read} / ${total} Read (${Math.round((read / total) * 100 || 0)}%)`;
    }

    // 2. Section-wise subtle counters below section names in navbar
    const qa = getSectionStats('QA');
    const dilr = getSectionStats('DILR');
    const varc = getSectionStats('VARC');
    const strat = getSectionStats('Strategy');

    const elQa = document.getElementById('counter-qa');
    if (elQa) elQa.textContent = qa.text;

    const elDilr = document.getElementById('counter-dilr');
    if (elDilr) elDilr.textContent = dilr.text;

    const elVarc = document.getElementById('counter-varc');
    if (elVarc) elVarc.textContent = varc.text;

    const elStrat = document.getElementById('counter-strategy');
    if (elStrat) elStrat.textContent = strat.text;

    // 3. Section sidebar header counter (if viewing a section)
    const sidebarSecCounter = document.getElementById('sidebar-sec-counter');
    if (sidebarSecCounter && ['QA', 'DILR', 'VARC', 'Strategy'].includes(currentTab)) {
      sidebarSecCounter.textContent = getSectionStats(currentTab).text;
    }

    // 4. Home section card footers (if on home view)
    const homeQa = document.getElementById('home-card-qa');
    if (homeQa) homeQa.textContent = qa.text;
    const homeDilr = document.getElementById('home-card-dilr');
    if (homeDilr) homeDilr.textContent = dilr.text;
    const homeVarc = document.getElementById('home-card-varc');
    if (homeVarc) homeVarc.textContent = varc.text;
    const homeStrat = document.getElementById('home-card-strat');
    if (homeStrat) homeStrat.textContent = strat.text;

    // 5. Bookmarks badge
    const bmEl = document.getElementById('badge-bookmarks');
    if (bmEl) bmEl.textContent = bookmarkedPosts.size;
  }

  // --- HOME VIEW ---
  function renderHome(container) {
    const total = posts.length;
    const read = readPosts.size;
    const pct = Math.round((read / total) * 100 || 0);

    const lastId = localStorage.getItem(LS_LAST_POST);
    const lastPost = lastId ? postMap.get(parseInt(lastId, 10)) : null;

    let resumeHtml = '';
    if (lastPost) {
      resumeHtml = `
        <div class="progress-banner" style="margin-bottom: 2rem; border-color: var(--border-light); background: #0c0c0e;">
          <div class="progress-info">
            <span class="progress-label">Jump Back In</span>
            <span style="font-size: 1.05rem; font-weight: 600; color: #fff;">${escapeHtml(lastPost.title)}</span>
            <span style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono);">
              ${lastPost.section} &rsaquo; ${escapeHtml(lastPost.topic)} &rsaquo; ${escapeHtml(lastPost.subtopic)}
            </span>
          </div>
          <button class="action-btn active" style="padding: 0.6rem 1.25rem; font-size: 0.85rem;" onclick="navigateTo('${lastPost.section}', ${lastPost.id})">
            Resume Lesson &rarr;
          </button>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="home-container">
        <div class="home-header">
          <h1 class="home-title">CAT 100th Percentile Study Portal</h1>
          <p class="home-desc">
            Complete, distraction-free study vault curated from the CAT-holics repository by IMS mentor <em>catcracker</em>. 
            All original handwritten sheets, worked solutions, theorems, and discussions preserved at 100% accuracy.
          </p>
        </div>

        ${resumeHtml}

        <div class="progress-banner">
          <div class="progress-info">
            <span class="progress-label">Curriculum Completion</span>
            <span class="progress-count">${read} <span style="font-size:0.9rem; font-weight:400; color:var(--text-muted)">of ${total} lessons read</span></span>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" style="width: ${pct}%;"></div>
          </div>
        </div>

        <div class="section-grid">
          <!-- QA CARD -->
          <div class="section-card" onclick="navigateTo('QA')">
            <div>
              <div class="sec-card-tag">Section 01</div>
              <h2 class="sec-card-title">Quantitative Aptitude</h2>
              <p class="sec-card-desc">
                Algebra 1–22, Time & Work 1–9, Polygons 1–7, Probability 1–29, Number Friends, Remainders, and 29 Challenge Singles.
              </p>
            </div>
            <div class="sec-card-footer">
              <span id="home-card-qa">${getSectionStats('QA').text}</span>
              <span class="sec-card-arrow">&rarr;</span>
            </div>
          </div>

          <!-- DILR CARD -->
          <div class="section-card" onclick="navigateTo('DILR')">
            <div>
              <div class="sec-card-tag">Section 02</div>
              <h2 class="sec-card-title">Data Interpretation & LR</h2>
              <p class="sec-card-desc">
                Seeded Tournaments & Knockouts (1–4), Cube DI & Slicing, Set Theory CAT Scans (1–5), Chessboard Conundrums, and Puzzles (1–20).
              </p>
            </div>
            <div class="sec-card-footer">
              <span id="home-card-dilr">${getSectionStats('DILR').text}</span>
              <span class="sec-card-arrow">&rarr;</span>
            </div>
          </div>

          <!-- VARC CARD -->
          <div class="section-card" onclick="navigateTo('VARC')">
            <div>
              <div class="sec-card-tag">Section 03</div>
              <h2 class="sec-card-title">Verbal Ability & RC</h2>
              <p class="sec-card-desc">
                Critical Reasoning (1–9), Confusions Resolved (1–4), Sentence Correction, Curated Sci-Fi & Philosophy Passages, and High-Frequency Vocab.
              </p>
            </div>
            <div class="sec-card-footer">
              <span id="home-card-varc">${getSectionStats('VARC').text}</span>
              <span class="sec-card-arrow">&rarr;</span>
            </div>
          </div>

          <!-- STRATEGY CARD -->
          <div class="section-card" onclick="navigateTo('Strategy')">
            <div>
              <div class="sec-card-tag">Section 04</div>
              <h2 class="sec-card-title">Test-Taking Strategy</h2>
              <p class="sec-card-desc">
                The ABC Attempt Strategy (Attack, Bookmark, Cancel), Sectional Time Allocation, Mock Error Logging, and Pacing Discipline.
              </p>
            </div>
            <div class="sec-card-footer">
              <span id="home-card-strat">${getSectionStats('Strategy').text}</span>
              <span class="sec-card-arrow">&rarr;</span>
            </div>
          </div>
        </div>

        <div class="quick-series-section">
          <div class="quick-series-header">Direct Links to Flagship Series</div>
          <div class="quick-series-grid">
            <div class="quick-series-pill" onclick="jumpToSubtopic('QA', 'Algebra Series (1-22)')">
              <span class="quick-series-name">Algebra Series</span>
              <span class="quick-series-count">22 Parts</span>
            </div>
            <div class="quick-series-pill" onclick="jumpToSubtopic('QA', 'Time & Work (1-9)')">
              <span class="quick-series-name">Time & Work</span>
              <span class="quick-series-count">9 Parts</span>
            </div>
            <div class="quick-series-pill" onclick="jumpToSubtopic('DILR', 'Knockouts Series (1-4)')">
              <span class="quick-series-name">Tournaments & Knockouts</span>
              <span class="quick-series-count">4 Parts</span>
            </div>
            <div class="quick-series-pill" onclick="jumpToSubtopic('DILR', 'CAT Scan Set Theory & Venn (1-5)')">
              <span class="quick-series-name">Set Theory & Venn</span>
              <span class="quick-series-count">20 Parts</span>
            </div>
            <div class="quick-series-pill" onclick="jumpToSubtopic('DILR', 'Puzzles Series (1-20)')">
              <span class="quick-series-name">Logic Puzzles</span>
              <span class="quick-series-count">21 Parts</span>
            </div>
            <div class="quick-series-pill" onclick="jumpToSubtopic('QA', 'Probability Series (1-29)')">
              <span class="quick-series-name">Probability Series</span>
              <span class="quick-series-count">31 Parts</span>
            </div>
            <div class="quick-series-pill" onclick="jumpToSubtopic('QA', 'Polygons (1-7)')">
              <span class="quick-series-name">Polygons</span>
              <span class="quick-series-count">7 Parts</span>
            </div>
            <div class="quick-series-pill" onclick="jumpToSubtopic('QA', 'Exam Singles (1-29)')">
              <span class="quick-series-name">Exam Challenge Singles</span>
              <span class="quick-series-count">29 Parts</span>
            </div>
            <div class="quick-series-pill" onclick="jumpToSubtopic('VARC', 'Critical Reasoning Series (1-9)')">
              <span class="quick-series-name">Critical Reasoning</span>
              <span class="quick-series-count">9 Parts</span>
            </div>
            <div class="quick-series-pill" onclick="jumpToSubtopic('VARC', 'Confusions Resolved (1-4)')">
              <span class="quick-series-name">Confusions Resolved</span>
              <span class="quick-series-count">9 Parts</span>
            </div>
            <div class="quick-series-pill" onclick="jumpToSubtopic('Strategy', 'Core CAT Test Strategy & Frameworks')">
              <span class="quick-series-name">ABC Attempt Strategy</span>
              <span class="quick-series-count">23 Parts</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  window.jumpToSubtopic = function (section, subtopicName) {
    const secPosts = postsBySection[section] || [];
    const target = secPosts.find(p => p.subtopic === subtopicName);
    if (target) {
      navigateTo(section, target.id);
    } else {
      navigateTo(section);
    }
  };

  // --- SECTION BROWSER VIEW ---
  function renderSection(container, section, targetPostId = null) {
    const secPosts = postsBySection[section] || [];
    if (secPosts.length === 0) {
      container.innerHTML = `<div class="empty-state">No lessons found in this section.</div>`;
      return;
    }

    // Determine active post
    let activePost = null;
    if (targetPostId) {
      activePost = postMap.get(targetPostId);
    }
    if (!activePost || activePost.section !== section) {
      // Pick first unread post, or first post
      activePost = secPosts.find(p => !readPosts.has(p.id)) || secPosts[0];
    }
    activePostId = activePost.id;
    localStorage.setItem(LS_LAST_POST, activePostId);

    // Build hierarchical tree for sidebar
    const topicsMap = new Map();
    secPosts.forEach(p => {
      if (!topicsMap.has(p.topic)) {
        topicsMap.set(p.topic, new Map());
      }
      const subs = topicsMap.get(p.topic);
      if (!subs.has(p.subtopic)) {
        subs.set(p.subtopic, []);
      }
      subs.get(p.subtopic).push(p);
    });

    container.innerHTML = `
      <div class="section-view ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}">
        <aside class="sidebar">
          <div class="sidebar-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <button class="sidebar-toggle-icon-btn" onclick="toggleSidebar()" title="Collapse sidebar (S)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M9 3v18"/>
                  <path d="m14 9-3 3 3 3"/>
                </svg>
              </button>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span class="sidebar-title">${section} Lessons</span>
                <span class="sidebar-counter" id="sidebar-sec-counter">${getSectionStats(section).text}</span>
              </div>
            </div>
            <div style="display: flex; gap: 4px;">
              <button class="sidebar-filter-btn ${sidebarFilter === 'all' ? 'active' : ''}" onclick="setSidebarFilter('all')">All</button>
              <button class="sidebar-filter-btn ${sidebarFilter === 'unread' ? 'active' : ''}" onclick="setSidebarFilter('unread')">Unread</button>
              <button class="sidebar-filter-btn ${sidebarFilter === 'starred' ? 'active' : ''}" onclick="setSidebarFilter('starred')">★</button>
            </div>
          </div>
          <div class="sidebar-scroll" id="sidebar-scroll">
            ${renderSidebarTree(topicsMap, activePostId)}
          </div>
        </aside>

        <section class="content-panel" id="content-panel">
          ${renderPostContent(activePost)}
        </section>
      </div>
    `;

    // Auto-scroll sidebar to active item
    setTimeout(() => {
      const activeEl = document.querySelector('.post-item.active');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 50);
  }

  function renderSidebarTree(topicsMap, currentActiveId) {
    let html = '';

    topicsMap.forEach((subMap, topicName) => {
      const topicKey = `${currentTab}_${topicName}`;
      const isCollapsed = collapsedTopics.has(topicKey);

      // Filter check
      let topicPostCount = 0;
      subMap.forEach(items => {
        items.forEach(p => {
          if (matchesFilter(p)) topicPostCount++;
        });
      });

      if (sidebarFilter !== 'all' && topicPostCount === 0) {
        return; // skip empty topic under filter
      }

      html += `
        <div class="topic-group">
          <div class="topic-header ${isCollapsed ? '' : 'open'}" onclick="toggleTopicCollapse('${escapeHtml(topicKey)}')">
            <span>${escapeHtml(topicName)}</span>
            <span class="topic-arrow">&rsaquo;</span>
          </div>
          <div class="topic-body" style="display: ${isCollapsed ? 'none' : 'block'};">
      `;

      subMap.forEach((postList, subName) => {
        const filteredList = postList.filter(matchesFilter);
        if (filteredList.length === 0) return;

        html += `
          <div class="subtopic-group">
            <div class="subtopic-title">${escapeHtml(subName)}</div>
        `;

        filteredList.forEach(p => {
          const isActive = p.id === currentActiveId;
          const isRead = readPosts.has(p.id);
          const isStarred = bookmarkedPosts.has(p.id);

          html += `
            <div class="post-item ${isActive ? 'active' : ''} ${isRead ? 'read' : ''}" data-post-id="${p.id}" onclick="selectPost(${p.id})">
              <span class="post-item-title">${escapeHtml(p.title)}</span>
              <div class="post-item-meta">
                ${isStarred ? '<span class="post-star-icon">★</span>' : ''}
                ${isRead ? '<span class="post-read-check">&#10003;</span>' : ''}
              </div>
            </div>
          `;
        });

        html += `</div>`;
      });

      html += `</div></div>`;
    });

    if (!html) {
      html = `<div style="padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No lessons matching current filter.</div>`;
    }

    return html;
  }

  function matchesFilter(p) {
    if (sidebarFilter === 'unread') return !readPosts.has(p.id);
    if (sidebarFilter === 'starred') return bookmarkedPosts.has(p.id);
    return true;
  }

  window.setSidebarFilter = function (f) {
    sidebarFilter = f;
    const scroll = document.getElementById('sidebar-scroll');
    if (scroll) {
      // Re-render
      renderSection(document.getElementById('app'), currentTab, activePostId);
    }
  };

  window.toggleTopicCollapse = function (topicKey) {
    if (collapsedTopics.has(topicKey)) {
      collapsedTopics.delete(topicKey);
    } else {
      collapsedTopics.add(topicKey);
    }
    localStorage.setItem(LS_COLLAPSED, JSON.stringify([...collapsedTopics]));
    renderSection(document.getElementById('app'), currentTab, activePostId);
  };

  window.selectPost = function (postId) {
    activePostId = postId;
    localStorage.setItem(LS_LAST_POST, postId);
    window.location.hash = `post-${postId}`;

    // Update active class in sidebar and auto-scroll to it
    document.querySelectorAll('.post-item').forEach(el => {
      const isCurrent = el.getAttribute('data-post-id') === String(postId);
      el.classList.toggle('active', isCurrent);
      if (isCurrent) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });

    const post = postMap.get(postId);
    const panel = document.getElementById('content-panel');
    if (panel && post) {
      panel.innerHTML = renderPostContent(post);
      panel.scrollTop = 0;
    }
  };

  // --- POST CONTENT RENDERER ---
  function renderPostContent(p) {
    const isRead = readPosts.has(p.id);
    const isStarred = bookmarkedPosts.has(p.id);

    // Find previous and next posts in the same section
    const secPosts = postsBySection[p.section] || [];
    const currIdx = secPosts.findIndex(item => item.id === p.id);
    const prevPost = currIdx > 0 ? secPosts[currIdx - 1] : null;
    const nextPost = currIdx < secPosts.length - 1 ? secPosts[currIdx + 1] : null;

    // Render Images
    let imagesHtml = '';
    if (p.images && p.images.length > 0) {
      imagesHtml = `
        <div class="images-container">
          ${p.images.map((img, idx) => `
            <div class="image-card">
              <div class="image-header">
                <span>Problem & Solution Sheet ${idx + 1} of ${p.images.length}</span>
                <span class="image-zoom-hint" onclick="openLightbox('${img.url}', '${escapeHtml(p.title)} (Sheet ${idx + 1})')">&#128269; Click to expand / zoom</span>
              </div>
              <div class="image-card-body" onclick="openLightbox('${img.url}', '${escapeHtml(p.title)} (Sheet ${idx + 1})')">
                <img src="${img.url}" alt="${escapeHtml(img.title || p.title)}" class="sheet-image" loading="lazy">
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Render Tags
    const tagsHtml = (p.tags || []).slice(0, 8).map(t => `<span class="tag-badge">#${escapeHtml(t)}</span>`).join('');

    // Render Comments
    let commentsHtml = '';
    if (p.comments && p.comments.length > 0) {
      commentsHtml = `
        <div class="comments-section">
          <div class="comments-toggle-btn" onclick="toggleCommentsList()">
            <span>Author Discussions & Reader Doubts (${p.comments.length})</span>
            <span id="comments-arrow">&#9662;</span>
          </div>
          <div class="comments-list" id="comments-list" style="display: block;">
            ${p.comments.map(c => `
              <div class="comment-card ${c.is_author ? 'author-comment' : ''}">
                <div class="comment-header">
                  <div class="comment-author">
                    <span>${escapeHtml(c.author)}</span>
                    ${c.is_author ? '<span class="author-pill">Author</span>' : ''}
                  </div>
                  <span class="comment-date">${c.date ? c.date.slice(0, 10) : ''}</span>
                </div>
                <div class="comment-body">${c.content}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Clean post HTML to avoid duplicate images if images array exists
    let cleanContent = p.content_html || '';
    if (p.images && p.images.length > 0 && cleanContent) {
      cleanContent = cleanContent
        .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '')
        .replace(/<img[^>]*>/gi, '')
        .replace(/<p>\s*(?:&nbsp;|\s)*<\/p>/gi, '')
        .trim();
    }

    const bodyHtml = cleanContent 
      ? `<div class="post-body">${cleanContent}</div>` 
      : (!p.images || p.images.length === 0 
          ? `<div class="post-body"><p style="color:var(--text-muted); font-style:italic;">This lesson is primarily contained in the problem sheet below.</p></div>` 
          : '');

    return `
      <div class="post-container">
        <div class="breadcrumbs-row">
          <div class="breadcrumbs">
            <button class="expand-sidebar-pill-btn" onclick="toggleSidebar()" title="Show sidebar (S)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M9 3v18"/>
                <path d="m13 15 3-3-3-3"/>
              </svg>
              <span>Syllabus</span>
            </button>
            <span>${p.section}</span> &rsaquo; <span>${escapeHtml(p.topic)}</span> &rsaquo; <span>${escapeHtml(p.subtopic)}</span>
          </div>
          <button class="action-btn toggle-sidebar-btn" onclick="toggleSidebar()" title="Toggle Sidebar (S)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M9 3v18"/>
            </svg>
            <span class="toggle-sidebar-text">${isSidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}</span>
            <kbd style="font-family: var(--font-mono); font-size: 0.65rem; opacity: 0.6">S</kbd>
          </button>
        </div>

        <div class="post-view-header">
          <h1 class="post-main-title">${escapeHtml(p.title)}</h1>
          <div class="post-meta-toolbar">
            <div class="post-tags-list">
              <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); margin-right: 0.5rem;">${p.date}</span>
              ${tagsHtml}
            </div>
            <div class="post-action-buttons">
              <button class="action-btn nav-btn ${!prevPost ? 'disabled' : ''}" onclick="${prevPost ? `selectPost(${prevPost.id})` : ''}" ${!prevPost ? 'disabled' : ''} title="${prevPost ? 'Previous: ' + escapeHtml(prevPost.title) + ' (Left Arrow or [)' : 'No previous lesson'}">
                <span>&larr; Prev</span>
                <kbd style="font-family: var(--font-mono); font-size: 0.65rem; opacity: 0.6">[</kbd>
              </button>
              <button class="action-btn nav-btn ${!nextPost ? 'disabled' : ''}" onclick="${nextPost ? `selectPost(${nextPost.id})` : ''}" ${!nextPost ? 'disabled' : ''} title="${nextPost ? 'Next: ' + escapeHtml(nextPost.title) + ' (Right Arrow or ])' : 'No next lesson'}">
                <span>Next &rarr;</span>
                <kbd style="font-family: var(--font-mono); font-size: 0.65rem; opacity: 0.6">]</kbd>
              </button>

              <div class="action-divider"></div>

              <button id="btn-mark-read" class="action-btn ${isRead ? 'active' : ''}" onclick="toggleReadStatus(${p.id})" title="Toggle Read Status (M)">
                <span id="label-mark-read">${isRead ? '&#10003; Read' : 'Mark as Read'}</span>
                <kbd style="font-family: var(--font-mono); font-size: 0.65rem; opacity: 0.6">M</kbd>
              </button>
              <button id="btn-star-post" class="action-btn ${isStarred ? 'active' : ''}" onclick="toggleBookmark(${p.id})" title="Bookmark Lesson (B)">
                <span id="label-star-post">${isStarred ? '★ Starred' : '☆ Star'}</span>
                <kbd style="font-family: var(--font-mono); font-size: 0.65rem; opacity: 0.6">B</kbd>
              </button>
              <a href="${p.url}" target="_blank" rel="noopener noreferrer" class="action-btn" title="Open original WordPress blog post">
                <span>Blog ↗</span>
              </a>
            </div>
          </div>
        </div>

        ${bodyHtml}

        ${imagesHtml}

        ${commentsHtml}
      </div>
    `;
  }

  window.toggleSidebar = function () {
    isSidebarCollapsed = !isSidebarCollapsed;
    localStorage.setItem(LS_SIDEBAR_COLLAPSED, isSidebarCollapsed ? 'true' : 'false');
    applySidebarState();
  };

  function applySidebarState() {
    const view = document.querySelector('.section-view');
    if (view) {
      view.classList.toggle('sidebar-collapsed', isSidebarCollapsed);
    }
    document.querySelectorAll('.toggle-sidebar-text').forEach(el => {
      el.textContent = isSidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar';
    });
  }

  window.toggleCommentsList = function () {
    const list = document.getElementById('comments-list');
    const arrow = document.getElementById('comments-arrow');
    if (!list) return;
    const isHidden = list.style.display === 'none';
    list.style.display = isHidden ? 'flex' : 'none';
    if (arrow) arrow.innerHTML = isHidden ? '&#9662;' : '&#9656;';
  };

  window.toggleReadStatus = function (pid) {
    pid = pid || activePostId;
    if (!pid) return;

    if (readPosts.has(pid)) {
      readPosts.delete(pid);
    } else {
      readPosts.add(pid);
    }
    localStorage.setItem(LS_READ, JSON.stringify([...readPosts]));
    updateBadges();

    const isRead = readPosts.has(pid);

    // Update active post toolbar button
    const btn = document.getElementById('btn-mark-read');
    if (btn && activePostId === pid) {
      btn.classList.toggle('active', isRead);
      const span = document.getElementById('label-mark-read') || btn.querySelector('span');
      if (span) span.innerHTML = isRead ? '&#10003; Read' : 'Mark as Read';
    }

    // Refresh sidebar item
    const sidebarEl = document.querySelector(`.post-item[data-post-id="${pid}"]`);
    if (sidebarEl) {
      sidebarEl.classList.toggle('read', isRead);
      const check = sidebarEl.querySelector('.post-read-check');
      if (check) check.remove();
      if (isRead) {
        const meta = sidebarEl.querySelector('.post-item-meta');
        if (meta) meta.insertAdjacentHTML('beforeend', '<span class="post-read-check">&#10003;</span>');
      }
    }
  };

  window.toggleBookmark = function (pid) {
    pid = pid || activePostId;
    if (!pid) return;

    if (bookmarkedPosts.has(pid)) {
      bookmarkedPosts.delete(pid);
    } else {
      bookmarkedPosts.add(pid);
    }
    localStorage.setItem(LS_BOOKMARKS, JSON.stringify([...bookmarkedPosts]));
    updateBadges();

    const isStarred = bookmarkedPosts.has(pid);

    // Update active post toolbar button
    const btn = document.getElementById('btn-star-post');
    if (btn && activePostId === pid) {
      btn.classList.toggle('active', isStarred);
      const span = document.getElementById('label-star-post') || btn.querySelector('span');
      if (span) span.textContent = isStarred ? '★ Starred' : '☆ Star';
    }

    // Refresh sidebar item
    const sidebarEl = document.querySelector(`.post-item[data-post-id="${pid}"]`);
    if (sidebarEl) {
      const star = sidebarEl.querySelector('.post-star-icon');
      if (star) star.remove();
      if (isStarred) {
        const meta = sidebarEl.querySelector('.post-item-meta');
        if (meta) meta.insertAdjacentHTML('afterbegin', '<span class="post-star-icon">★</span>');
      }
    }

    // If currently on bookmarks tab, re-render to reflect changes immediately
    if (currentTab === 'bookmarks') {
      renderBookmarks(document.getElementById('app'));
    }
  };

  // --- BOOKMARKS VIEW ---
  function renderBookmarks(container) {
    const starredList = posts.filter(p => bookmarkedPosts.has(p.id));

    if (starredList.length === 0) {
      container.innerHTML = `
        <div class="home-container">
          <div class="home-header">
            <h1 class="home-title">★ Starred Lessons & Revision Queue</h1>
            <p class="home-desc">Save tricky questions, key shortcut formulas, and DILR sets here for rapid review before your mocks.</p>
          </div>
          <div class="empty-state">
            <div class="empty-icon">☆</div>
            <p style="font-size: 1rem; color: #fff; margin-bottom: 0.5rem;">No bookmarked lessons yet.</p>
            <p>Click the "☆ Star" button on any lesson or press "B" while studying to add it to this list.</p>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="home-container">
        <div class="home-header">
          <h1 class="home-title">★ Starred Lessons & Revision Queue</h1>
          <p class="home-desc">${starredList.length} lessons bookmarked for revision.</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${starredList.map(p => `
            <div class="section-card" style="padding: 1.25rem; flex-direction: row; align-items: center; justify-content: space-between;" onclick="navigateTo('${p.section}', ${p.id})">
              <div>
                <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">
                  ${p.section} &rsaquo; ${escapeHtml(p.topic)} &rsaquo; ${escapeHtml(p.subtopic)}
                </div>
                <div style="font-size: 1rem; font-weight: 600; color: #ffffff;">${escapeHtml(p.title)}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 1rem;">
                <span class="sec-card-arrow">&rarr;</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // --- LIGHTBOX CONTROLS ---
  window.openLightbox = function (url, title) {
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    const titleEl = document.getElementById('lightbox-title');
    currentZoom = 1.0;
    img.style.transform = `scale(${currentZoom})`;
    img.src = url;
    titleEl.textContent = title;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  window.closeLightbox = function () {
    const modal = document.getElementById('lightbox-modal');
    modal.classList.remove('open');
    document.body.style.overflow = '';
  };

  window.closeLightboxOnBackdrop = function (e) {
    if (e.target.id === 'lightbox-modal' || e.target.id === 'lightbox-content') {
      closeLightbox();
    }
  };

  window.zoomImage = function (delta) {
    currentZoom = Math.max(0.5, Math.min(3.5, currentZoom + delta));
    const img = document.getElementById('lightbox-img');
    if (img) img.style.transform = `scale(${currentZoom})`;
  };

  window.resetZoom = function () {
    currentZoom = 1.0;
    const img = document.getElementById('lightbox-img');
    if (img) img.style.transform = `scale(${currentZoom})`;
  };

  // --- SEARCH MODAL ---
  window.openSearchModal = function () {
    const modal = document.getElementById('search-modal');
    const input = document.getElementById('search-input');
    modal.classList.add('open');
    input.value = '';
    input.focus();
    renderSearchResults('');
    document.body.style.overflow = 'hidden';
  };

  window.closeSearchModal = function () {
    const modal = document.getElementById('search-modal');
    modal.classList.remove('open');
    document.body.style.overflow = '';
  };

  window.closeSearchOnBackdrop = function (e) {
    if (e.target.id === 'search-modal') {
      closeSearchModal();
    }
  };

  function renderSearchResults(query) {
    const container = document.getElementById('search-results');
    const q = query.trim().toLowerCase();

    if (!q) {
      container.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          Type to search through all 679 lessons across QA, DILR, VARC, and Strategy...
        </div>
      `;
      return;
    }

    const matches = posts.filter(p => {
      return p.title.toLowerCase().includes(q) ||
             p.topic.toLowerCase().includes(q) ||
             p.subtopic.toLowerCase().includes(q) ||
             (p.tags && p.tags.some(t => t.toLowerCase().includes(q)));
    }).slice(0, 30);

    if (matches.length === 0) {
      container.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          No matching lessons found for "${escapeHtml(query)}"
        </div>
      `;
      return;
    }

    container.innerHTML = matches.map(p => `
      <div class="search-result-item" onclick="navigateTo('${p.section}', ${p.id}); closeSearchModal();">
        <div class="search-res-top">
          <span class="search-res-title">${escapeHtml(p.title)}</span>
          <span class="search-res-sec">${p.section}</span>
        </div>
        <div class="search-res-sub">${escapeHtml(p.topic)} &rsaquo; ${escapeHtml(p.subtopic)}</div>
      </div>
    `).join('');
  }

  // --- KEYBOARD SHORTCUTS ---
  function initKeyboardShortcuts() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        renderSearchResults(e.target.value);
      });
    }

    window.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts if typing in input or textarea
      if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        if (e.key === 'Escape') {
          closeSearchModal();
        }
        return;
      }

      const lightbox = document.getElementById('lightbox-modal');
      const isLightboxOpen = lightbox && lightbox.classList.contains('open');

      const searchModal = document.getElementById('search-modal');
      const isSearchOpen = searchModal && searchModal.classList.contains('open');

      if (e.key === '/') {
        e.preventDefault();
        openSearchModal();
      } else if (e.key === 'Escape') {
        if (isLightboxOpen) closeLightbox();
        if (isSearchOpen) closeSearchModal();
      } else if (e.key === 'm' || e.key === 'M') {
        if (activePostId && !isLightboxOpen && !isSearchOpen) {
          e.preventDefault();
          toggleReadStatus(activePostId);
        }
      } else if (e.key === 'b' || e.key === 'B') {
        if (activePostId && !isLightboxOpen && !isSearchOpen) {
          e.preventDefault();
          toggleBookmark(activePostId);
        }
      } else if (e.key === 's' || e.key === 'S') {
        if (currentTab !== 'home' && currentTab !== 'bookmarks' && !isLightboxOpen && !isSearchOpen) {
          e.preventDefault();
          toggleSidebar();
        }
      } else if (e.key === '[' || e.key === 'ArrowLeft') {
        if (!isLightboxOpen && !isSearchOpen) {
          e.preventDefault();
          navigateStep(-1);
        }
      } else if (e.key === ']' || e.key === 'ArrowRight') {
        if (!isLightboxOpen && !isSearchOpen) {
          e.preventDefault();
          navigateStep(1);
        }
      } else if (isLightboxOpen) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          zoomImage(0.25);
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          zoomImage(-0.25);
        } else if (e.key === '0') {
          e.preventDefault();
          resetZoom();
        }
      }
    });
  }

  function navigateStep(direction) {
    if (!activePostId || !postsBySection[currentTab]) return;
    const secList = postsBySection[currentTab];
    const currIdx = secList.findIndex(p => p.id === activePostId);
    const newIdx = currIdx + direction;
    if (newIdx >= 0 && newIdx < secList.length) {
      selectPost(secList[newIdx].id);
    }
  }

  // Helper
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
