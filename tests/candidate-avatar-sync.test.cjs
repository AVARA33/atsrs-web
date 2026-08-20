const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'js', 'talent-directory.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const instrumented = source.replace(
  "  if(document.readyState==='loading')",
  "  window.__candidateAvatarSyncTest={queue:queueOwnAvatarSync,flush:flushOwnAvatarSync,queueResolved:queueResolvedOwnAvatarIfPresent,hydrated:handleIdentityPhotoHydrated,changed:handleProfilePhotoChanged,pending:function(){return {queued:pendingOwnAvatarSync.queued,url:pendingOwnAvatarSync.url}}};\n  if(document.readyState==='loading')"
);

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function harness(options = {}) {
  const listeners = new Map();
  const operations = [];
  const timers = [];
  let automatic = options.automatic !== false;
  let ready = options.ready !== false;
  let currentAvatar = options.currentAvatar || '';
  let storedAvatar = options.storedAvatar === undefined ? null : options.storedAvatar;
  const userId = options.userId || 'owner-user-id';
  const userGate = options.userGate;

  function query(kind, payload) {
    const state = { kind, payload, filters: [] };
    operations.push(state);
    return {
      select() { state.select = [...arguments]; return this; },
      update(value) { state.update = value; return this; },
      eq(column, value) { state.filters.push([column, value]); return this; },
      async maybeSingle() {
        if (userGate) await userGate.promise;
        if (options.readError) return { data: null, error: new Error('read failed') };
        if (options.missingRow) return { data: null, error: null };
        return { data: { avatar_url: storedAvatar }, error: null };
      },
      then(resolve) {
        if (state.update && !options.updateError) storedAvatar = state.update.avatar_url;
        return Promise.resolve(options.updateError ? { error: new Error('update failed') } : { error: null }).then(resolve);
      }
    };
  }

  const client = {
    auth: { async getUser() { if (userGate) await userGate.promise; return { data: { user: { id: userId } } }; } },
    from(table) { assert.equal(table, 'atsrs_talent_profiles'); return query(table); }
  };
  const window = {
    supabaseClient: client,
    useMode: options.mode || 'personal',
    atsrsNormalizedReadRuntime: { automaticWritesAllowed() { return automatic; } },
    atsrsCloudData: { isLoaded() { return ready; } },
    atsrsProfilePhoto: { currentUrl() { return currentAvatar; } },
    addEventListener(name, callback) { listeners.set(name, callback); }
  };
  window.window = window;
  const context = {
    window,
    document: { readyState: 'loading', addEventListener() {}, getElementById() { return null; }, querySelectorAll() { return []; } },
    localStorage: { getItem() { return null; } },
    location: { origin: 'https://atsrs.com' },
    URL,
    console,
    setTimeout(callback) { timers.push(callback); return timers.length; },
    setInterval() { return 0; },
    clearTimeout() {},
    clearInterval() {}
  };
  vm.runInNewContext(instrumented, context, { filename: sourcePath });
  return {
    api: window.__candidateAvatarSyncTest,
    listeners,
    operations,
    timers,
    setAutomatic(value) { automatic = value; },
    setReady(value) { ready = value; },
    setCurrentAvatar(value) { currentAvatar = value; },
    storedAvatar() { return storedAvatar; }
  };
}

function updates(instance) {
  return instance.operations.filter((operation) => operation.update);
}

(async () => {
  const stableUrl = 'https://hwtjuqyxzivymofamwxl.supabase.co/storage/v1/object/public/atsrs-profile-photos/owner/avatar.webp';

  const upload = harness();
  await upload.api.queue(stableUrl);
  assert.equal(upload.storedAvatar(), stableUrl, 'upload/change must persist the exact stable HTTPS URL');
  assert.equal(JSON.stringify(updates(upload)[0].update), JSON.stringify({ avatar_url: stableUrl }), 'only avatar_url may be written');
  assert.deepEqual(updates(upload)[0].filters, [['user_id', 'owner-user-id']], 'write must be owner-scoped');

  await upload.api.queue(stableUrl);
  assert.equal(updates(upload).length, 1, 'same normalized avatar must not be written twice');

  await upload.api.queue('javascript:alert(1)');
  assert.equal(updates(upload).length, 1, 'an invalid non-HTTPS event must be ignored rather than clearing the avatar');
  assert.equal(upload.storedAvatar(), stableUrl);

  await upload.api.queue('');
  assert.equal(upload.storedAvatar(), null, 'remove must persist NULL');
  assert.equal(JSON.stringify(updates(upload)[1].update), JSON.stringify({ avatar_url: null }));

  const legacy = harness({ currentAvatar: stableUrl, storedAvatar: null });
  await legacy.api.queueResolved();
  assert.equal(legacy.storedAvatar(), stableUrl, 'legacy hydrated photo must self-heal a NULL directory avatar');

  const noPhoto = harness({ currentAvatar: '', storedAvatar: null });
  await noPhoto.api.queueResolved();
  assert.equal(noPhoto.operations.length, 0, 'startup with no resolved photo must not erase or invent an avatar');

  const deferredReady = harness({ ready: false });
  assert.equal(await deferredReady.api.queue(stableUrl), false, 'write must defer before cloud profile readiness');
  assert.equal(JSON.stringify(deferredReady.api.pending()), JSON.stringify({ queued: true, url: stableUrl }));
  assert.equal(deferredReady.operations.length, 0);
  deferredReady.setReady(true);
  await deferredReady.api.flush();
  assert.equal(deferredReady.storedAvatar(), stableUrl, 'deferred write must resume once readiness is established');

  const writesDisabled = harness({ automatic: false });
  await writesDisabled.api.queue(stableUrl);
  assert.equal(writesDisabled.operations.length, 0, 'normalized-read write suppression must be honored');
  writesDisabled.setAutomatic(true);
  await writesDisabled.api.flush();
  assert.equal(writesDisabled.storedAvatar(), stableUrl);

  const corporate = harness({ mode: 'corporate' });
  await corporate.api.queue(stableUrl);
  assert.equal(corporate.operations.length, 0, 'corporate mode must never enter the self-write path');

  const raceGate = deferred();
  const race = harness({ userGate: raceGate, storedAvatar: null });
  const first = race.api.queue(stableUrl);
  const secondUrl = stableUrl.replace('avatar.webp', 'avatar-new.webp');
  race.api.queue(secondUrl);
  raceGate.resolve();
  await first;
  while (race.timers.length) await race.timers.shift()();
  assert.equal(race.storedAvatar(), secondUrl, 'a newer photo event during an in-flight sync must win');
  assert.equal(updates(race).length, 2, 'race coalescing must not loop or duplicate the final value');

  const events = harness({ ready: false, storedAvatar: null });
  events.api.hydrated({ detail: { url: stableUrl } });
  assert.equal(JSON.stringify(events.api.pending()), JSON.stringify({ queued: true, url: stableUrl }), 'hydration event must queue before readiness');
  events.setReady(true);
  await events.api.flush();
  assert.equal(events.storedAvatar(), stableUrl);
  await events.api.changed({ detail: { url: '' } });
  assert.equal(events.storedAvatar(), null, 'authoritative removal event must clear the directory avatar');

  console.log('Candidate avatar self-sync regression tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
