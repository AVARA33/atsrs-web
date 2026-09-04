/* Topic-specific, click-to-load videos for the public homepage. */
(() => {
  'use strict';
  const topics = [
    ['.public-hero-copy', 'workspace', 'Meet your career workspace', '1:37', 'Documents, secure storage, AI assistance, your profile, controlled sharing and the dashboard.'],
    ['.public-job-search-copy', 'jobs', 'See the search-to-application journey', '0:37', 'Search by role and country, review requirements and follow the original employer application link.'],
    ['.public-directory-section .public-section-heading', 'directory', 'Explore jobs, recruiters and companies', '0:50', 'A catalogue walkthrough. Figures in this video are a snapshot from 3 September 2026.'],
    ['#personal-preview .public-preview-copy', 'dashboard', 'Take a look inside the dashboard', '0:18', 'Uploaded, current and expired documents; 90, 60, 30-day and one-week expiry windows; storage usage and quick actions.'],
    ['#platform .public-audience-grid article', 'storage', 'Keep your career files together', '0:11', 'Secure storage brings CVs, certificates and career records together.'],
    ['#how-it-works .public-section-heading', 'workflow', 'Watch the document workflow', '0:41', 'Upload manually or by QR, review AI-generated details, track expiry and control profile sharing. WhatsApp reminders are coming soon.']
  ];
  const root = document.getElementById('landingPage');
  if (!root) return;
  const players = [];
  const theme = () => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  const media = (name, ext) => `assets/videos/${name}${theme() === 'light' ? '-light' : ''}.${ext}${theme() === 'light' ? '?v=3' : ''}`;
  function syncTheme(entry) {
    entry.thumbnail.src = media(entry.name, 'jpg');
    if (!entry.video || entry.theme === theme()) return;
    const video = entry.video, position = video.currentTime || 0, resume = !video.paused && !entry.panel.hidden;
    video.pause();
    entry.theme = theme();
    video.poster = media(entry.name, 'jpg');
    video.src = media(entry.name, 'mp4');
    entry.fallback.href = video.src;
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(position, Number.isFinite(video.duration) ? video.duration : position);
      if (resume && !entry.panel.hidden) video.play().catch(() => {});
      video.onloadedmetadata = null;
    };
    video.load();
  }
  new MutationObserver(() => players.forEach(syncTheme)).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
  function closePlayer(entry) {
    entry.video?.pause();
    entry.panel.hidden = true;
    entry.button.setAttribute('aria-expanded', 'false');
    entry.play.textContent = '\u25b6';
  }
  let scrollFrame = 0;
  window.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      players.forEach(entry => {
        if (entry.panel.hidden || !entry.video || entry.video.webkitDisplayingFullscreen || document.fullscreenElement) return;
        const rect = entry.video.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) closePlayer(entry);
      });
    });
  }, {passive:true, capture:true});
  topics.forEach(([selector, name, title, duration, description]) => {
    const host = root.querySelector(selector);
    if (!host) return;
    const box = document.createElement('div');
    box.className = 'home-topic-video';
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'home-video-trigger';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', `home-video-${name}`);
    const thumbnail = document.createElement('img');
    thumbnail.src = media(name, 'jpg'); thumbnail.alt = ''; thumbnail.loading = 'lazy';
    const label = document.createElement('span');
    const heading = document.createElement('strong'); heading.textContent = title;
    const meta = document.createElement('small'); meta.textContent = `Watch video · ${duration} · English audio`;
    label.append(heading, meta);
    const play = document.createElement('span'); play.className = 'home-video-play'; play.textContent = '▶'; play.setAttribute('aria-hidden','true');
    button.append(thumbnail, label, play);
    const panel = document.createElement('div'); panel.id = `home-video-${name}`; panel.className = 'home-video-panel'; panel.hidden = true;
    let video;
    button.addEventListener('click', () => {
      const opening = panel.hidden;
      players.forEach(p => { if (p !== entry) closePlayer(p); });
      if (opening && !video) {
        video = document.createElement('video'); video.controls = true; video.playsInline = true; video.preload = 'none';
        video.poster = media(name, 'jpg'); video.src = media(name, 'mp4');
        video.setAttribute('aria-label', title);
        const note = document.createElement('p'); note.textContent = description;
        const fallback = document.createElement('a'); fallback.href = video.src; fallback.textContent = 'Open video';
        panel.append(video, note, fallback);
        entry.video = video; entry.theme = theme(); entry.fallback = fallback;
        video.addEventListener('play', () => players.forEach(p => { if (p !== entry) closePlayer(p); }));
      }
      panel.hidden = !opening; button.setAttribute('aria-expanded', String(opening));
      play.textContent = opening ? '×' : '▶';
      if (opening) {
        video.scrollIntoView({block:'nearest', behavior:'instant'});
        video.play().catch(() => { /* Native play control remains available. */ });
      } else closePlayer(entry);
    });
    const entry = {name, thumbnail, video:null, panel, button, play}; players.push(entry);
    box.append(button,panel); host.append(box);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) players.forEach(p => p.video?.pause()); });
  new MutationObserver(() => { if (root.classList.contains('hidden')) players.forEach(closePlayer); }).observe(root,{attributes:true,attributeFilter:['class']});
})();
