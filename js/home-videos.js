/* Topic-specific, click-to-load videos for the public homepage. */
(() => {
  'use strict';
  const topics = [
  [
    ".public-hero-copy",
    "intro-topic",
    "Meet your career workspace",
    "0:08",
    "A quick introduction to the ATSRS career workspace."
  ],
  [
    ".public-job-search-copy",
    "jobs",
    "See the search-to-application journey",
    "0:37",
    "Search by role and country, review requirements and follow the original employer application link."
  ],
  [
    ".public-directory-section .public-section-heading",
    "directory-topic",
    "Explore recruiters and companies",
    "0:16",
    "Recruiter and company directory previews. Figures shown are a snapshot from 3 September 2026."
  ],
  [
    "#personal-preview .public-preview-copy",
    "dashboard-topic",
    "Take a look inside the dashboard",
    "0:18",
    "Document status, expiry windows, storage usage and quick actions."
  ],
  [
    "#platform .public-audience-grid article:nth-child(1)",
    "storage-topic",
    "Keep your career files together",
    "0:11",
    "Secure storage for CVs, certificates and career records."
  ],
  [
    "#platform .public-audience-grid article:nth-child(2)",
    "profile-topic",
    "Present your professional profile",
    "0:08",
    "Your CV, references, appraisals and work availability."
  ],
  [
    "#how-it-works .public-steps li:nth-child(1)",
    "upload-topic",
    "Upload your documents",
    "0:09",
    "Manual uploads and QR phone uploads."
  ],
  [
    "#how-it-works .public-steps li:nth-child(2)",
    "ai-topic",
    "Review AI assistance",
    "0:10",
    "AI document scanning and CV drafts for your review."
  ],
  [
    "#how-it-works .public-steps li:nth-child(3)",
    "reminders-topic",
    "Stay ahead of expiry",
    "0:06",
    "Email expiry reminders. WhatsApp reminders are coming soon."
  ],
  [
    "#how-it-works .public-steps li:nth-child(4)",
    "sharing-topic",
    "Share with control",
    "0:09",
    "Controlled links and recipient-specific, 24-hour recruiter sharing."
  ]
];
  const root = document.getElementById('landingPage');
  if (!root) return;
  const players = [];
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
    thumbnail.src = `assets/videos/${name}.jpg`; thumbnail.alt = ''; thumbnail.loading = 'lazy';
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
      players.forEach(p => { if (p.video) p.video.pause(); });
      if (opening && !video) {
        video = document.createElement('video'); video.controls = true; video.playsInline = true; video.preload = 'none';
        video.poster = `assets/videos/${name}.jpg`; video.src = `assets/videos/${name}.mp4`;
        video.setAttribute('aria-label', title);
        const note = document.createElement('p'); note.textContent = description;
        const fallback = document.createElement('a'); fallback.href = video.src; fallback.textContent = 'Open video';
        panel.append(video, note, fallback);
        entry.video = video;
        video.addEventListener('play', () => players.forEach(p => { if (p.video && p.video !== video) p.video.pause(); }));
      }
      panel.hidden = !opening; button.setAttribute('aria-expanded', String(opening));
      play.textContent = opening ? '×' : '▶';
      if (opening) video.play().catch(() => { /* Native play control remains available. */ });
    });
    const entry = {video:null}; players.push(entry);
    box.append(button,panel); host.append(box);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) players.forEach(p => p.video?.pause()); });
  new MutationObserver(() => { if (root.classList.contains('hidden')) players.forEach(p => p.video?.pause()); }).observe(root,{attributes:true,attributeFilter:['class']});
})();
