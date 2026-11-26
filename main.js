(() => {
  'use strict';

  const THEME_STORAGE_KEY = 'nq_theme';
  const root = document.documentElement;
  const metaThemeColor = document.getElementById('meta-theme-color');
  const darkMediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function normalizeText(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim();
  }

  function applyTheme(theme) {
    const valid = theme === 'light' || theme === 'dark' || theme === 'auto' ? theme : 'auto';
    root.dataset.theme = valid;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, valid);
    } catch (_) {}

    document.querySelectorAll('.theme-btn[data-theme-value]').forEach((btn) => {
      btn.setAttribute('aria-pressed', btn.dataset.themeValue === valid ? 'true' : 'false');
    });

    const isDark = valid === 'dark' || (valid === 'auto' && darkMediaQuery && darkMediaQuery.matches);
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#090e1a' : '#f6f8fb');
    }
  }

  function initThemeControls() {
    const initial = root.dataset.theme || 'auto';
    applyTheme(initial);

    document.querySelectorAll('.theme-btn[data-theme-value]').forEach((btn) => {
      btn.addEventListener('click', () => applyTheme(btn.dataset.themeValue));
    });

    if (darkMediaQuery && typeof darkMediaQuery.addEventListener === 'function') {
      darkMediaQuery.addEventListener('change', () => {
        if ((root.dataset.theme || 'auto') === 'auto') {
          applyTheme('auto');
        }
      });
    }
  }

  function createSvgIcon(pathD) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ui-svg');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2.1');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    svg.appendChild(path);
    return svg;
  }

  function renderExtraProjectsFromData() {
    const data = window.NIQUITIN_HUB_DATA;
    const listEl = document.getElementById('project-list');
    const filterGroup = document.getElementById('filter-group');
    const statCount = document.getElementById('stat-project-count');
    if (!data || !Array.isArray(data.projects) || !listEl) return;

    const existingIds = new Set(
      Array.from(listEl.querySelectorAll('.project-card[data-project-id]')).map((el) => el.dataset.projectId)
    );

    if (statCount) {
      statCount.textContent = String(data.projects.length).padStart(2, '0');
    }

    // Add any extra categories defined in projects.js that are not yet in HTML
    if (filterGroup && Array.isArray(data.categories)) {
      const existingFilters = new Set(
        Array.from(filterGroup.querySelectorAll('.filter-chip[data-filter]')).map((btn) => btn.dataset.filter)
      );
      data.categories.forEach((cat) => {
        if (!cat || !cat.id || existingFilters.has(cat.id)) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'filter-chip';
        btn.dataset.filter = cat.id;
        btn.setAttribute('aria-pressed', 'false');
        btn.textContent = cat.label + ' ';
        const countSpan = document.createElement('span');
        countSpan.className = 'chip-count';
        countSpan.textContent = String(data.projects.filter((p) => p.category === cat.id).length);
        btn.appendChild(countSpan);
        filterGroup.appendChild(btn);
      });
    }

    data.projects.forEach((project) => {
      if (!project || !project.id || existingIds.has(project.id)) return;

      const card = document.createElement('article');
      card.className = 'project-card';
      card.dataset.projectId = project.id;
      card.dataset.category = project.category || 'other';
      card.dataset.accent = project.accent || 'teal';
      card.dataset.keywords = project.keywords || normalizeText(`${project.name} ${project.subtitle} ${project.summary}`);

      const info = document.createElement('div');
      info.className = 'project-info';

      const primaryUrl = project.url || project.actions?.[0]?.url || '';
      const head = document.createElement('div');
      head.className = 'project-head';
      if (project.icon) {
        const icon = document.createElement('img');
        icon.className = 'app-icon';
        icon.src = project.icon;
        icon.alt = `Biểu tượng ${project.name}`;
        icon.width = 64;
        icon.height = 64;
        if (primaryUrl) {
          const iconLink = document.createElement('a');
          iconLink.className = 'app-icon-link';
          iconLink.href = primaryUrl;
          iconLink.target = '_blank';
          iconLink.rel = 'noopener noreferrer';
          iconLink.tabIndex = -1;
          iconLink.setAttribute('aria-hidden', 'true');
          iconLink.appendChild(icon);
          head.appendChild(iconLink);
        } else {
          head.appendChild(icon);
        }
      }

      const titles = document.createElement('div');
      titles.className = 'project-titles';
      const badgeRow = document.createElement('div');
      badgeRow.className = 'badge-row';

      const statusSpan = document.createElement('span');
      statusSpan.className = 'badge-status';
      statusSpan.textContent = project.statusBadge || 'Đang phát triển';
      badgeRow.appendChild(statusSpan);

      const verSpan = document.createElement('span');
      verSpan.className = 'badge-version';
      verSpan.setAttribute('data-version-badge', '');
      verSpan.textContent = project.fallbackVersion || 'v1.0';
      badgeRow.appendChild(verSpan);

      if (project.fallbackUpdated) {
        const metaSpan = document.createElement('span');
        metaSpan.className = 'badge-meta';
        metaSpan.textContent = 'Cập nhật ';
        const dateSpan = document.createElement('span');
        dateSpan.setAttribute('data-updated-date', '');
        dateSpan.textContent = project.fallbackUpdated;
        metaSpan.appendChild(dateSpan);
        badgeRow.appendChild(metaSpan);
      }

      const h3 = document.createElement('h3');
      if (primaryUrl) {
        const titleLink = document.createElement('a');
        titleLink.className = 'project-title-link';
        titleLink.href = primaryUrl;
        titleLink.target = '_blank';
        titleLink.rel = 'noopener noreferrer';
        titleLink.textContent = project.name;
        h3.appendChild(titleLink);
      } else {
        h3.textContent = project.name;
      }
      const sub = document.createElement('p');
      sub.className = 'project-subtitle';
      sub.textContent = project.subtitle || '';
      titles.append(badgeRow, h3, sub);
      head.appendChild(titles);

      const summary = document.createElement('p');
      summary.className = 'project-summary';
      summary.textContent = project.summary || '';

      const ul = document.createElement('ul');
      ul.className = 'highlight-list';
      (project.highlights || []).forEach((item) => {
        const li = document.createElement('li');
        li.appendChild(createSvgIcon('M20 6 9 17l-5-5'));
        const span = document.createElement('span');
        span.textContent = item;
        li.appendChild(span);
        ul.appendChild(li);
      });

      const tags = document.createElement('div');
      tags.className = 'project-tags';
      [project.categoryLabel, project.platformBadge].filter(Boolean).forEach((t) => {
        const span = document.createElement('span');
        span.textContent = t;
        tags.appendChild(span);
      });

      const actions = document.createElement('div');
      actions.className = 'action-grid';
      (project.actions || []).forEach((act) => {
        if (!act || !act.url) return;
        const a = document.createElement('a');
        a.className = `btn btn-card-${act.variant || 'secondary'}`;
        a.href = act.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        const labelSpan = document.createElement('span');
        labelSpan.textContent = act.label;
        a.append(labelSpan, createSvgIcon('M7 17 17 7M7 7h10v10'));
        actions.appendChild(a);
      });

      info.append(head, summary, ul, tags, actions);
      if (project.disclaimer) {
        const disc = document.createElement('p');
        disc.className = 'project-disclaimer';
        disc.textContent = project.disclaimer;
        info.appendChild(disc);
      }

      card.appendChild(info);

      if (project.screens && (project.screens.phone?.length || project.screens.tablet?.length)) {
        const stage = document.createElement('div');
        stage.className = 'project-stage';
        const phoneShots = project.screens.phone || [];
        const tabletShots = project.screens.tablet || [];

        const stageBar = document.createElement('div');
        stageBar.className = 'stage-bar';
        const lbl = document.createElement('span');
        lbl.className = 'stage-label';
        lbl.textContent = 'Ảnh thật trên thiết bị';
        stageBar.appendChild(lbl);

        if (phoneShots.length && tabletShots.length) {
          const sw = document.createElement('div');
          sw.className = 'device-switch';
          sw.setAttribute('role', 'group');
          sw.setAttribute('aria-label', `Chọn giao diện minh họa của ${project.name}`);

          const pBtn = document.createElement('button');
          pBtn.type = 'button';
          pBtn.className = 'device-btn';
          pBtn.dataset.deviceTarget = 'phone';
          pBtn.setAttribute('aria-pressed', 'true');
          pBtn.textContent = 'Điện thoại';

          const tBtn = document.createElement('button');
          tBtn.type = 'button';
          tBtn.className = 'device-btn';
          tBtn.dataset.deviceTarget = 'tablet';
          tBtn.setAttribute('aria-pressed', 'false');
          tBtn.textContent = 'Máy tính bảng';

          sw.append(pBtn, tBtn);
          stageBar.appendChild(sw);
        }
        stage.appendChild(stageBar);

        const buildShotsPanel = (type, shots, hidden) => {
          const panel = document.createElement('div');
          panel.className = `device-panel device-panel-${type}`;
          panel.dataset.devicePanel = type;
          if (hidden) panel.hidden = true;
          shots.forEach((shot) => {
            const fig = document.createElement('figure');
            fig.className = type === 'tablet' ? 'shot-card shot-card-wide' : 'shot-card';
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'shot-trigger';
            btn.dataset.zoomSrc = shot.src;
            btn.dataset.zoomCaption = `${project.name} — ${shot.caption}`;
            btn.setAttribute('aria-label', `Phóng to ảnh ${shot.caption} của ${project.name}`);
            const img = document.createElement('img');
            img.src = shot.src;
            img.alt = shot.alt || shot.caption;
            img.width = shot.width || 600;
            img.height = shot.height || 1000;
            img.loading = 'lazy';
            img.decoding = 'async';
            const zoomBadge = document.createElement('span');
            zoomBadge.className = 'zoom-badge';
            zoomBadge.setAttribute('aria-hidden', 'true');
            zoomBadge.textContent = 'Phóng to';
            btn.append(img, zoomBadge);
            const cap = document.createElement('figcaption');
            cap.textContent = shot.caption;
            fig.append(btn, cap);
            panel.appendChild(fig);
          });
          return panel;
        };

        if (phoneShots.length) stage.appendChild(buildShotsPanel('phone', phoneShots, false));
        if (tabletShots.length) stage.appendChild(buildShotsPanel('tablet', tabletShots, phoneShots.length > 0));
        card.appendChild(stage);
      }

      listEl.appendChild(card);
    });

    // Update "Tất cả" chip count
    const allChipCount = filterGroup?.querySelector('[data-filter="all"] .chip-count');
    if (allChipCount) {
      allChipCount.textContent = String(listEl.querySelectorAll('.project-card').length);
    }
  }

  function initFilteringAndSearch() {
    const searchInput = document.getElementById('project-search');
    const clearBtn = document.getElementById('search-clear');
    const resetBtn = document.getElementById('reset-filters-btn');
    const statusEl = document.getElementById('filter-status');
    const emptyEl = document.getElementById('empty-filter-state');
    const cards = Array.from(document.querySelectorAll('.project-card'));
    const filterButtons = Array.from(document.querySelectorAll('.filter-chip[data-filter]'));
    let activeCategory = 'all';

    function applyFilter() {
      const rawQuery = searchInput ? searchInput.value : '';
      const query = normalizeText(rawQuery);
      if (clearBtn) {
        clearBtn.hidden = rawQuery.trim().length === 0;
      }

      let visibleCount = 0;
      cards.forEach((card) => {
        const matchesCategory = activeCategory === 'all' || card.dataset.category === activeCategory;
        const haystack = normalizeText(
          `${card.dataset.keywords || ''} ${card.querySelector('h3')?.textContent || ''} ${card.querySelector('.project-subtitle')?.textContent || ''} ${card.querySelector('.project-summary')?.textContent || ''}`
        );
        const matchesQuery = !query || haystack.includes(query);
        const show = matchesCategory && matchesQuery;
        card.hidden = !show;
        if (show) visibleCount += 1;
      });

      if (emptyEl) {
        emptyEl.hidden = visibleCount > 0;
      }

      if (statusEl) {
        if (visibleCount === 0) {
          statusEl.textContent = 'Không có ứng dụng nào khớp bộ lọc hiện tại.';
        } else if (activeCategory === 'all' && !query) {
          statusEl.textContent = `Đang hiển thị ${visibleCount} ứng dụng.`;
        } else {
          statusEl.textContent = `Tìm thấy ${visibleCount} ứng dụng phù hợp.`;
        }
      }
    }

    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.filter || 'all';
        filterButtons.forEach((item) => {
          item.setAttribute('aria-pressed', item === btn ? 'true' : 'false');
        });
        applyFilter();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', applyFilter);
    }

    if (clearBtn && searchInput) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        applyFilter();
        searchInput.focus();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        activeCategory = 'all';
        if (searchInput) searchInput.value = '';
        filterButtons.forEach((item) => {
          item.setAttribute('aria-pressed', item.dataset.filter === 'all' ? 'true' : 'false');
        });
        applyFilter();
      });
    }

    applyFilter();
  }

  function initDeviceSwitches() {
    document.querySelectorAll('.project-stage').forEach((stage) => {
      const buttons = Array.from(stage.querySelectorAll('.device-btn[data-device-target]'));
      const panels = Array.from(stage.querySelectorAll('.device-panel[data-device-panel]'));
      if (!buttons.length || !panels.length) return;

      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const target = btn.dataset.deviceTarget;
          buttons.forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
          panels.forEach((p) => {
            p.hidden = p.dataset.devicePanel !== target;
          });
        });
      });
    });
  }

  function initLightbox() {
    const dialog = document.getElementById('screen-lightbox');
    const imgEl = document.getElementById('lightbox-img');
    const captionEl = document.getElementById('lightbox-caption');
    const closeBtn = document.getElementById('lightbox-close');
    if (!dialog || !imgEl || !captionEl || typeof dialog.showModal !== 'function') return;

    let lastTrigger = null;

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('.shot-trigger[data-zoom-src]');
      if (!trigger) return;
      lastTrigger = trigger;
      const thumbImg = trigger.querySelector('img');
      imgEl.src = trigger.dataset.zoomSrc;
      imgEl.alt = thumbImg ? thumbImg.alt : (trigger.dataset.zoomCaption || '');
      captionEl.textContent = trigger.dataset.zoomCaption || '';
      dialog.showModal();
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => dialog.close());
    }

    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    });

    dialog.addEventListener('close', () => {
      imgEl.src = 'data:,';
      if (lastTrigger && typeof lastTrigger.focus === 'function') {
        lastTrigger.focus();
      }
    });
  }

  function formatViDate(raw) {
    if (!raw || typeof raw !== 'string') return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [y, m, d] = raw.split('-');
      return `${d}/${m}/${y}`;
    }
    const parsed = Date.parse(raw);
    if (!Number.isFinite(parsed)) return '';
    try {
      return new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(new Date(parsed));
    } catch (_) {
      return '';
    }
  }

  async function syncLiveVersions() {
    const data = window.NIQUITIN_HUB_DATA;
    if (!data || !Array.isArray(data.projects) || typeof fetch !== 'function') return;

    const tasks = data.projects
      .filter((p) => p && p.id && p.liveVersionEndpoint)
      .map(async (project) => {
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), 4000) : null;
        try {
          const response = await fetch(project.liveVersionEndpoint, {
            cache: 'no-cache',
            signal: controller ? controller.signal : undefined
          });
          if (!response.ok) return;
          const payload = await response.json();
          if (!payload || typeof payload !== 'object') return;

          let versionText = '';
          let updatedText = '';

          if (project.liveVersionType === 'melovault' && typeof payload.versionName === 'string') {
            const cleaned = payload.versionName.trim().replace(/-open$/i, '');
            if (/^\d+\.\d+\.\d+/.test(cleaned)) {
              versionText = `v${cleaned}`;
            }
            updatedText = formatViDate(payload.releaseDate);
          } else if (project.liveVersionType === 'vuabannhau' && typeof payload.version === 'string') {
            const cleaned = payload.version.trim();
            if (/^\d+\.\d+\.\d+/.test(cleaned)) {
              versionText = `v${cleaned}`;
            }
            updatedText = formatViDate(payload.publishedAt);
          }

          const card = document.querySelector(`.project-card[data-project-id="${project.id}"]`);
          if (!card) return;
          const versionBadge = card.querySelector('[data-version-badge]');
          const dateBadge = card.querySelector('[data-updated-date]');
          if (versionBadge && versionText) {
            versionBadge.textContent = versionText;
          }
          if (dateBadge && updatedText) {
            dateBadge.textContent = updatedText;
          }
        } catch (_) {
          // Giữ nguyên thông tin phiên bản dự phòng khi mất mạng hoặc bị chặn CORS
        } finally {
          if (timer) clearTimeout(timer);
        }
      });

    await Promise.allSettled(tasks);
  }

  function boot() {
    initThemeControls();
    renderExtraProjectsFromData();
    initFilteringAndSearch();
    initDeviceSwitches();
    initLightbox();
    syncLiveVersions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
