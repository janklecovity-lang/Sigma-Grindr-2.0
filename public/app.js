// ── STATE ──────────────────────────────────────────────
let currentUser = null;

// ── UTILS ──────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `show ${type}`;
  setTimeout(() => { t.className = ''; }, 3000);
}

function fmtDate(str) {
  const d = new Date(str);
  return d.toLocaleDateString('cs-CZ') + ' ' + d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
}

function initials(first, last) {
  return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase();
}

function avatarEl(photo, first, last, size = '') {
  if (photo) {
    return `<img class="avatar" src="/uploads/${photo}" alt="avatar" style="${size}">`;
  }
  return `<div class="avatar-placeholder" style="${size}">${initials(first, last)}</div>`;
}

async function api(method, url, body, isForm = false) {
  const opts = { method, headers: {} };
  if (body) {
    if (isForm) {
      opts.body = body;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Chyba serveru');
  return data;
}

// ── ROUTING ────────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('[data-page]').forEach(a => a.classList.remove('active'));
  document.querySelectorAll(`[data-page="${page}"]`).forEach(a => a.classList.add('active'));
  const el = document.getElementById(`page-${page}`);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);

  if (page === 'wall') loadPosts();
  if (page === 'users') loadUsers();
}

function requireAuth(page) {
  if (!currentUser) { navigate('login'); return false; }
  navigate(page);
  return true;
}

document.addEventListener('click', e => {
  const a = e.target.closest('[data-page]');
  if (!a) return;
  e.preventDefault();
  const page = a.dataset.page;
  if (['wall', 'users'].includes(page) && !currentUser) {
    navigate('login'); return;
  }
  navigate(page);
});

// ── AUTH CHECK ─────────────────────────────────────────
async function checkAuth() {
  try {
    const data = await api('GET', '/api/auth/me');
    if (data.loggedIn) {
      currentUser = { id: data.userId };
      setLoggedIn();
      navigate('wall');
    } else {
      setLoggedOut();
      navigate('login');
    }
  } catch {
    setLoggedOut();
    navigate('login');
  }
}

function setLoggedIn() {
  document.querySelectorAll('.auth-only').forEach(el => el.classList.remove('hidden'));
  document.querySelectorAll('.guest-only').forEach(el => el.classList.add('hidden'));
}
function setLoggedOut() {
  currentUser = null;
  document.querySelectorAll('.auth-only').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.guest-only').forEach(el => el.classList.remove('hidden'));
}

// ── LOGIN ──────────────────────────────────────────────
document.getElementById('login-btn').addEventListener('click', async () => {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');
  err.style.display = 'none';

  if (!username || !password) {
    err.textContent = 'Vyplň jméno a heslo.';
    err.style.display = 'block'; return;
  }
  try {
    const data = await api('POST', '/api/auth/login', { username, password });
    currentUser = { id: data.user.id, first_name: data.user.first_name };
    setLoggedIn();
    navigate('wall');
  } catch (e) {
    err.textContent = e.message;
    err.style.display = 'block';
  }
});

document.getElementById('login-password').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('login-btn').click();
});

// ── REGISTER ───────────────────────────────────────────
document.getElementById('reg-photo').addEventListener('change', e => {
  const f = e.target.files[0];
  document.getElementById('photo-label').textContent = f ? f.name : 'Vyber fotografii...';
});

document.getElementById('register-btn').addEventListener('click', async () => {
  const err = document.getElementById('register-error');
  err.style.display = 'none';

  const first_name = document.getElementById('reg-first_name').value.trim();
  const last_name  = document.getElementById('reg-last_name').value.trim();
  const age        = document.getElementById('reg-age').value;
  const gender     = document.getElementById('reg-gender').value;
  const username   = document.getElementById('reg-username').value.trim();
  const password   = document.getElementById('reg-password').value;
  const photo      = document.getElementById('reg-photo').files[0];

  if (!first_name || !last_name || !age || !gender || !username || !password) {
    err.textContent = 'Vyplň všechna povinná pole.';
    err.style.display = 'block'; return;
  }
  if (parseInt(age) < 13) {
    err.textContent = 'Musíš mít alespoň 13 let.';
    err.style.display = 'block'; return;
  }

  const fd = new FormData();
  fd.append('first_name', first_name);
  fd.append('last_name', last_name);
  fd.append('age', age);
  fd.append('gender', gender);
  fd.append('username', username);
  fd.append('password', password);
  if (photo) fd.append('photo', photo);

  try {
    const data = await api('POST', '/api/auth/register', fd, true);
    currentUser = { id: data.userId };
    setLoggedIn();
    showToast('Účet vytvořen! Vítej 🎉');
    navigate('wall');
  } catch (e) {
    err.textContent = e.message;
    err.style.display = 'block';
  }
});

// ── LOGOUT ─────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', async () => {
  await api('POST', '/api/auth/logout');
  setLoggedOut();
  navigate('login');
  showToast('Odhlášen/a');
});

// ── POSTS ──────────────────────────────────────────────
async function loadPosts() {
  const list = document.getElementById('posts-list');
  list.innerHTML = '<div class="loader">Načítám příspěvky...</div>';
  try {
    const posts = await api('GET', '/api/posts');
    if (posts.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="icon">📭</div><p>Zatím žádné příspěvky. Buď první!</p></div>`;
      return;
    }
    list.innerHTML = posts.map(renderPost).join('');
    attachPostHandlers();
  } catch (e) {
    list.innerHTML = `<div class="loader" style="color:var(--accent2)">${e.message}</div>`;
  }
}

function renderPost(p) {
  return `
  <div class="post" data-post-id="${p.id}">
    <div class="post-header">
      ${avatarEl(p.photo, p.first_name, p.last_name)}
      <div>
        <div class="post-author"><a href="#" data-user-id="${p.user_id}">${p.first_name} ${p.last_name}</a></div>
        <div class="post-date">${fmtDate(p.created_at)}</div>
      </div>
    </div>
    ${p.title ? `<div class="post-title">${escHtml(p.title)}</div>` : ''}
    ${p.body  ? `<div class="post-body">${escHtml(p.body)}</div>` : ''}
    ${p.image ? `<img class="post-image" src="/uploads/${p.image}" alt="post image">` : ''}
    <div class="post-actions">
      <button class="like-btn" data-post-id="${p.id}">
        <span class="heart">♡</span>
        <span class="like-count" data-post-id="${p.id}">${p.like_count}</span>
        <span style="font-size:11px;margin-left:2px">lajků</span>
      </button>
    </div>
    <div class="likes-list" id="likes-${p.id}"></div>
    <div class="comments-section" id="comments-${p.id}">
      <div class="loader" style="padding:10px 0;font-size:12px">Načítám komentáře...</div>
    </div>
    <div class="comment-form" style="padding:0 20px 16px">
      <input type="text" class="comment-input" placeholder="Přidej komentář..." data-post-id="${p.id}">
      <button class="comment-submit" data-post-id="${p.id}">Odeslat</button>
    </div>
  </div>`;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function attachPostHandlers() {
  // Load comments for all posts
  document.querySelectorAll('.post').forEach(post => {
    const pid = post.dataset.postId;
    loadComments(pid);
    loadLikeState(pid);
  });

  // Author links
  document.querySelectorAll('[data-user-id]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      navigateToUser(a.dataset.userId);
    });
  });

  // Like button
  document.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pid = btn.dataset.postId;
      const liked = btn.classList.contains('liked');
      try {
        if (liked) {
          await api('DELETE', '/api/likes', { post_id: parseInt(pid) });
          btn.classList.remove('liked');
          btn.querySelector('.heart').textContent = '♡';
        } else {
          await api('POST', '/api/likes', { post_id: parseInt(pid) });
          btn.classList.add('liked');
          btn.querySelector('.heart').textContent = '♥';
        }
        // refresh count
        const data = await api('GET', `/api/likes?post_id=${pid}`);
        btn.querySelector('.like-count').textContent = data.length;

        // if likes list open, refresh it
        const ll = document.getElementById(`likes-${pid}`);
        if (ll && ll.classList.contains('open')) {
          renderLikesList(pid, data);
        }
      } catch (e) {
        showToast(e.message, 'error');
      }
    });
  });

  // Like count click → toggle list
  document.querySelectorAll('.like-count').forEach(span => {
    span.addEventListener('click', async e => {
      e.stopPropagation();
      const pid = span.dataset.postId;
      const ll = document.getElementById(`likes-${pid}`);
      if (ll.classList.contains('open')) {
        ll.classList.remove('open'); return;
      }
      try {
        const data = await api('GET', `/api/likes?post_id=${pid}`);
        renderLikesList(pid, data);
        ll.classList.add('open');
      } catch {}
    });
  });

  // Comment submit
  document.querySelectorAll('.comment-submit').forEach(btn => {
    btn.addEventListener('click', () => submitComment(btn.dataset.postId));
  });
  document.querySelectorAll('.comment-input').forEach(inp => {
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') submitComment(inp.dataset.postId);
    });
  });
}

function renderLikesList(pid, data) {
  const ll = document.getElementById(`likes-${pid}`);
  if (data.length === 0) {
    ll.innerHTML = '<span style="color:var(--text-muted)">Zatím žádné lajky</span>';
    return;
  }
  ll.innerHTML = data.map(l => `
    <div class="like-item">
      <strong>${escHtml(l.first_name)} ${escHtml(l.last_name)}</strong>
      <span>${fmtDate(l.created_at)}</span>
    </div>
  `).join('');
}

async function loadLikeState(postId) {
  try {
    const data = await api('GET', `/api/likes?post_id=${postId}`);
    const btn = document.querySelector(`.like-btn[data-post-id="${postId}"]`);
    if (!btn) return;
    const liked = data.some(l => l.user_id === currentUser?.id);
    // We check by comparing count since we don't have user_id in response
    // Re-check: likes endpoint returns first_name, last_name – we need a better approach
    // We'll just update the count visually
    btn.querySelector('.like-count').textContent = data.length;
  } catch {}
}

async function loadComments(postId) {
  const container = document.getElementById(`comments-${postId}`);
  if (!container) return;
  try {
    const comments = await api('GET', `/api/comments?post_id=${postId}`);
    if (comments.length === 0) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = comments.map(c => `
      <div class="comment">
        ${avatarEl(c.photo, c.first_name, c.last_name, 'width:30px;height:30px;font-size:11px')}
        <div class="comment-content">
          <div class="comment-author">${escHtml(c.first_name)} ${escHtml(c.last_name)}</div>
          <div class="comment-text">${escHtml(c.body)}</div>
          <div class="comment-date">${fmtDate(c.created_at)}</div>
        </div>
      </div>
    `).join('');
  } catch {
    container.innerHTML = '';
  }
}

async function submitComment(postId) {
  const inp = document.querySelector(`.comment-input[data-post-id="${postId}"]`);
  const body = inp.value.trim();
  if (!body) return;
  try {
    await api('POST', '/api/comments', { post_id: parseInt(postId), body });
    inp.value = '';
    loadComments(postId);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ── NEW POST ───────────────────────────────────────────
document.getElementById('post-image').addEventListener('change', e => {
  const f = e.target.files[0];
  document.getElementById('post-photo-label').textContent = f ? f.name : 'Přidat obrázek...';
});

document.getElementById('submit-post').addEventListener('click', async () => {
  const title = document.getElementById('post-title').value.trim();
  const body  = document.getElementById('post-body').value.trim();
  const image = document.getElementById('post-image').files[0];

  if (!title && !body) {
    showToast('Vyplň alespoň nadpis nebo text.', 'error'); return;
  }
  const fd = new FormData();
  if (title) fd.append('title', title);
  if (body)  fd.append('body', body);
  if (image) fd.append('image', image);

  try {
    await api('POST', '/api/posts', fd, true);
    document.getElementById('post-title').value = '';
    document.getElementById('post-body').value = '';
    document.getElementById('post-image').value = '';
    document.getElementById('post-photo-label').textContent = 'Přidat obrázek...';
    showToast('Příspěvek zveřejněn ✓');
    loadPosts();
  } catch (e) {
    showToast(e.message, 'error');
  }
});

// ── USERS ──────────────────────────────────────────────
async function loadUsers() {
  const list = document.getElementById('users-list');
  list.innerHTML = '<div class="loader">Načítám uživatele...</div>';
  try {
    const users = await api('GET', '/api/users');
    if (users.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="icon">👥</div><p>Žádní uživatelé</p></div>';
      return;
    }
    list.innerHTML = users.map(u => `
      <div class="user-card" data-user-id="${u.id}">
        ${avatarEl(u.photo, u.first_name, u.last_name, 'width:60px;height:60px;font-size:20px')}
        <div class="user-card-name">${escHtml(u.last_name)} ${escHtml(u.first_name)}</div>
        <div class="user-card-meta">${escHtml(u.gender || '')} · ${u.age} let</div>
      </div>
    `).join('');
    document.querySelectorAll('.user-card[data-user-id]').forEach(card => {
      card.addEventListener('click', () => navigateToUser(card.dataset.userId));
    });
  } catch (e) {
    list.innerHTML = `<div class="loader" style="color:var(--accent2)">${e.message}</div>`;
  }
}

// ── USER DETAIL ────────────────────────────────────────
async function navigateToUser(userId) {
  navigate('user');
  const content = document.getElementById('user-detail-content');
  content.innerHTML = '<div class="loader">Načítám profil...</div>';
  try {
    const { user, posts, activity } = await api('GET', `/api/users/${userId}`);
    const genderAge = [user.gender, user.age ? `${user.age} let` : ''].filter(Boolean).join(' · ');
    content.innerHTML = `
      <div class="profile-hero">
        ${avatarEl(user.photo, user.first_name, user.last_name, 'width:80px;height:80px;font-size:28px')}
        <div>
          <div class="profile-name">${escHtml(user.first_name)} ${escHtml(user.last_name)}</div>
          <div class="profile-meta">${escHtml(genderAge)}</div>
        </div>
      </div>
      <div class="tabs">
        <div class="tab active" data-tab="posts">Příspěvky (${posts.length})</div>
        <div class="tab" data-tab="activity">Aktivita (${activity.length})</div>
      </div>
      <div class="tab-content active" id="tab-posts">
        ${posts.length === 0
          ? '<div class="empty-state"><div class="icon">📝</div><p>Žádné příspěvky</p></div>'
          : posts.map(renderPost).join('')}
      </div>
      <div class="tab-content" id="tab-activity">
        ${activity.length === 0
          ? '<div class="empty-state"><div class="icon">💬</div><p>Žádná aktivita na cizích příspěvcích</p></div>'
          : activity.map(renderPost).join('')}
      </div>
    `;
    // Tabs
    content.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        content.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        content.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
      });
    });
    // Attach post interactions
    attachPostHandlers();
  } catch (e) {
    content.innerHTML = `<div class="loader" style="color:var(--accent2)">${e.message}</div>`;
  }
}

// ── INIT ───────────────────────────────────────────────
checkAuth();
