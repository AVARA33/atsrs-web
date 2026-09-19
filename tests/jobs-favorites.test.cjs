const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');

const root=path.join(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const runtime=fs.readFileSync(path.join(root,'js','jobs-prototype.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css','jobs-prototype.css'),'utf8');
const heroCss=fs.readFileSync(path.join(root,'css','jobsearch-hero-v6002.css'),'utf8');
const locale=fs.readFileSync(path.join(root,'js','locale-az.js'),'utf8');
const shellCss=fs.readFileSync(path.join(root,'css','shell-polish.css'),'utf8');
const fixture=fs.readFileSync(path.join(root,'tests','fixtures','jobs-prototype-harness.html'),'utf8');
const migration=fs.readFileSync(path.join(root,'supabase','migrations','20260919090519_job_favorites.sql'),'utf8');

test('JobSearch exposes one accessible saved-jobs filter in the secondary row',()=>{
  assert.equal((index.match(/id="jobsFavoritesOnlyFilter"/g)||[]).length,1);
  assert.match(index,/id="jobsNewOnlyFilter"[\s\S]*id="jobsFavoritesOnlyFilter"/);
  assert.match(index,/jobs-favorites-filter[\s\S]*jobs-check-box[\s\S]*ph ph-check[\s\S]*Favorites/);
  assert.match(heroCss,/#jobsPage \.jobs-secondary-actions\{[\s\S]*?grid-column:1\/-1;[\s\S]*?gap:14px;[\s\S]*?flex-wrap:nowrap;/);
  assert.match(heroCss,/#jobsPage \.jobs-secondary-actions \.jobs-view-switch\{[\s\S]*?margin-left:auto;/);
  assert.equal((fixture.match(/id="jobsFavoritesOnlyFilter"/g)||[]).length,1);
  assert.match(runtime,/favoritesOnly:!!\(id\('jobsFavoritesOnlyFilter'\)/);
  assert.match(runtime,/p_favorites_only:!!state\.favoritesOnly/);
  assert.match(runtime,/pressed\('jobsFavoritesOnlyFilter'\)\?'Select the star on a vacancy to save it here\.'/);
});

test('Job cards provide an accessible persistent star toggle',()=>{
  assert.match(runtime,/function favoriteControl\(job\)/);
  assert.match(runtime,/button=el\('button','job-favorite-toggle'\)/);
  assert.match(runtime,/setAttribute\('aria-pressed',active\?'true':'false'\)/);
  assert.match(runtime,/from\('atsrs_job_favorites'\)\.delete\(\)\.eq\('user_id',userId\)\.eq\('job_id',job\.id\)/);
  assert.match(runtime,/from\('atsrs_job_favorites'\)\.insert\(\{user_id:userId,job_id:job\.id\}\)/);
  assert.match(runtime,/client\.rpc\('atsrs_jobs_feed_v4',params\)/);
  assert.match(runtime,/if\(state\.favoritesOnly\)throw result\.error/);
  assert.match(runtime,/controls=el\('div','job-card-controls'\)/);
  assert.match(runtime,/if\(favorite\)controls\.append\(favorite\);controls\.append\(details\)/);
  assert.match(css,/\.job-card-controls\{[^}]*right:8px[^}]*display:flex[^}]*gap:8px/);
  assert.match(css,/\.job-card-controls \.job-detail-toggle,\.job-card-controls \.job-favorite-toggle\{[^}]*position:relative[^}]*flex:0 0 28px/);
  assert.match(css,/#jobsPage \.job-card-controls \.job-favorite-toggle,html\[data-theme\][^}]*#jobsPage \.job-card-controls \.job-detail-toggle\{[^}]*min-width:28px!important[^}]*min-height:28px!important/);
  assert.match(css,/\.job-favorite-toggle\{[^}]*width:28px!important[^}]*height:28px!important/);
  assert.match(css,/\.job-favorite-toggle\.is-favorite\{[^}]*border-color:#facc15!important[^}]*background:#facc15!important/);
  assert.match(css,/\.jobs-compact-check input:checked\+\.jobs-check-box\{[^}]*border-color:var\(--jobs-filter-focus\)[^}]*background:var\(--jobs-filter-focus\)/);
  assert.doesNotMatch(css,/\.jobs-favorites-filter input:checked\+\.jobs-check-box/);
  assert.match(css,/html\[data-theme\] body #app\.app:not\(\.hidden\) #jobsPage \.job-favorite-toggle\.is-favorite\{[^}]*background:#facc15!important/);
  assert.equal((shellCss.match(/:not\(\.job-favorite-toggle\)/g)||[]).length,3);
  assert.match(css,/\.job-detail-toggle[^}]*right:8px/);
  assert.match(css,/@media\(max-width:1350px\)\{\.jobs-secondary-actions\{grid-column:1\/-1;flex-wrap:wrap\}\}/);
});

test('Azerbaijani copy covers saved-jobs controls',()=>{
  assert.match(locale,/"Favorites"\s*:\s*"Seçilmişlər"/);
  assert.match(locale,/"Save job"\s*:\s*"Elanı seçilmişlərə əlavə et"/);
  assert.match(locale,/"Remove from saved jobs"\s*:\s*"Elanı seçilmişlərdən çıxar"/);
});

test('Saved jobs are isolated by user with RLS and server-side filtering',()=>{
  assert.match(migration,/primary key \(user_id, job_id\)/);
  assert.match(migration,/references auth\.users\(id\) on delete cascade/);
  assert.match(migration,/references public\.atsrs_jobs\(id\) on delete cascade/);
  assert.match(migration,/create index atsrs_job_favorites_job_id_idx/);
  assert.match(migration,/enable row level security/);
  assert.match(migration,/grant select, insert, delete on table public\.atsrs_job_favorites to authenticated/);
  assert.equal((migration.match(/\(select auth\.uid\(\)\) = user_id/g)||[]).length,3);
  assert.match(migration,/create or replace function public\.atsrs_jobs_feed_v4/);
  assert.match(migration,/p_favorites_only boolean default false/);
  assert.match(migration,/favorite\.user_id = v_user_id[\s\S]*favorite\.job_id = job\.id/);
  assert.match(migration,/'is_favorite', exists/);
  assert.match(migration,/grant execute on function public\.atsrs_jobs_feed_v4[\s\S]*to anon, authenticated/);
});

test('QA fixture models save, remove and favorites-only results',()=>{
  assert.match(fixture,/var favoriteIds=new Set\(\['1'\]\)/);
  assert.match(fixture,/name==='atsrs_job_favorites'\?favoriteQuery\(\):query\(\)/);
  assert.match(fixture,/params&&params\.p_favorites_only\?fixture\.filter/);
  assert.match(fixture,/is_favorite:favoriteIds\.has\(String\(job\.id\)\)/);
});
