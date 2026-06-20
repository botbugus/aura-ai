(function() {
    let userLinks = {}, userSocial = {}, userProfile = {};

    function showToast(msg, type) {
        const old = document.querySelector('.toast'); if (old) old.remove();
        const t = document.createElement('div'); t.textContent = msg;
        t.style.cssText = `position:fixed;top:16px;right:16px;padding:10px 18px;border-radius:10px;color:#fff;font-size:13px;z-index:999;animation:toastIn 0.3s ease;pointer-events:none;background:${type==='success'?'linear-gradient(135deg,#4caf50,#2e7d32)':'linear-gradient(135deg,#f44336,#c62828)'};box-shadow:0 6px 20px rgba(0,0,0,0.4);`;
        document.body.appendChild(t);
        setTimeout(() => { t.style.animation='toastOut 0.3s ease'; setTimeout(()=>t.remove(),300); }, 2500);
    }

    function loadData() {
        if (!window.currentUser) return;
        db.ref('users/'+window.currentUser.uid).once('value').then(s => {
            const d = s.val(); if (d) { userLinks = d.links||{}; userSocial = d.social||{}; userProfile = d.profile||{}; }
            renderAll();
        });
    }

    function renderAll() {
        document.getElementById('display-name').value = userProfile.displayName || '';
        document.getElementById('bio').value = userProfile.bio || '';
        document.getElementById('display-name-preview').textContent = userProfile.displayName || 'Nama Anda';
        document.getElementById('bio-preview').textContent = userProfile.bio || 'Bio singkat Anda';
        document.getElementById('profile-photo').src = userProfile.photoURL || 'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%237c83ff"/><text x="50" y="62" text-anchor="middle" fill="white" font-size="38">U</text></svg>');
        renderLinks(); renderSocial();
    }

    function renderLinks() {
        const c = document.getElementById('links-list');
        const keys = Object.keys(userLinks);
        if (!keys.length) { c.innerHTML = '<p style="color:#666;text-align:center;padding:16px;">Belum ada tautan</p>'; return; }
        c.innerHTML = keys.map(id => {
            const l = userLinks[id];
            return `<div class="link-card"><span>${l.icon||'🔗'} ${l.title}</span><a href="${l.url}" target="_blank" rel="noopener">${l.url.substring(0,30)}...</a><button class="delete-btn" data-id="${id}"><i class="fas fa-trash"></i></button></div>`;
        }).join('');
    }

    function renderSocial() {
        const c = document.getElementById('social-list');
        const icons = { instagram:'fa-instagram', twitter:'fa-twitter', facebook:'fa-facebook', youtube:'fa-youtube', tiktok:'fa-tiktok', linkedin:'fa-linkedin', github:'fa-github', discord:'fa-discord', whatsapp:'fa-whatsapp', telegram:'fa-telegram' };
        const keys = Object.keys(userSocial);
        if (!keys.length) { c.innerHTML = '<p style="color:#666;text-align:center;padding:16px;">Belum ada media sosial</p>'; return; }
        c.innerHTML = keys.map(k => {
            const s = userSocial[k];
            return `<div class="social-card"><i class="fab ${icons[k]||'fa-link'}" style="font-size:18px;"></i><span>${s.platform}</span><a href="${s.url}" target="_blank" rel="noopener">Buka</a><button class="delete-btn" data-key="${k}"><i class="fas fa-trash"></i></button></div>`;
        }).join('');
    }

    function saveProfile() {
        userProfile.displayName = document.getElementById('display-name').value.trim();
        userProfile.bio = document.getElementById('bio').value.trim();
        db.ref('users/'+window.currentUser.uid+'/profile').set(userProfile).then(() => { renderAll(); showToast('Profil disimpan','success'); });
    }

    function addLink() {
        const title = document.getElementById('link-title').value.trim();
        const url = document.getElementById('link-url').value.trim();
        if (!title||!url) { showToast('Judul dan URL wajib diisi','error'); return; }
        userLinks[Date.now().toString()] = { title, url, icon: document.getElementById('link-icon').value.trim() };
        db.ref('users/'+window.currentUser.uid+'/links').set(userLinks).then(() => {
            closeModal('link-modal'); document.getElementById('link-title').value=''; document.getElementById('link-url').value=''; document.getElementById('link-icon').value='';
            renderLinks(); showToast('Tautan ditambahkan','success');
        });
    }

    function addSocial() {
        const p = document.getElementById('social-platform').value;
        const url = document.getElementById('social-url').value.trim();
        if (!url) { showToast('URL wajib diisi','error'); return; }
        userSocial[p] = { platform: p.charAt(0).toUpperCase()+p.slice(1), url };
        db.ref('users/'+window.currentUser.uid+'/social').set(userSocial).then(() => {
            closeModal('social-modal'); document.getElementById('social-url').value='';
            renderSocial(); showToast('Media sosial ditambahkan','success');
        });
    }

    function toggleBeranda() {
        const p = document.getElementById('beranda-panel');
        p.classList.toggle('show');
        if (p.classList.contains('show')) {
            const icons = { instagram:'fa-instagram', twitter:'fa-twitter', facebook:'fa-facebook', youtube:'fa-youtube', tiktok:'fa-tiktok', linkedin:'fa-linkedin', github:'fa-github', discord:'fa-discord', whatsapp:'fa-whatsapp', telegram:'fa-telegram' };
            let h = '';
            if (userProfile.photoURL) h += `<img src="${userProfile.photoURL}" style="width:55px;height:55px;border-radius:50%;margin-bottom:8px;object-fit:cover;">`;
            h += `<h4 style="color:#fff;">${userProfile.displayName||''}</h4><p style="color:#888;font-size:12px;margin-bottom:14px;">${userProfile.bio||''}</p>`;
            Object.values(userLinks).forEach(l => h += `<a href="${l.url}" target="_blank" rel="noopener" class="preview-link">${l.icon||''} ${l.title}</a>`);
            h += '<div style="margin-top:14px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">';
            Object.entries(userSocial).forEach(([k,s]) => h += `<a href="${s.url}" target="_blank" rel="noopener" style="color:#7c83ff;font-size:20px;" title="${s.platform}"><i class="fab ${icons[k]||'fa-link'}"></i></a>`);
            h += '</div>';
            document.getElementById('beranda-content').innerHTML = h || '<p style="color:#666;">Belum ada konten</p>';
        }
    }

    function openModal(id) { document.getElementById(id).classList.add('show'); }
    function closeModal(id) { document.getElementById(id).classList.remove('show'); }

    window.addEventListener('authReady', () => {
        if (window.isAdminUser) { window.location.href = '../admin/index.html'; return; }
        loadData();
        document.getElementById('save-profile-btn').addEventListener('click', saveProfile);
        document.getElementById('add-link-btn').addEventListener('click', () => openModal('link-modal'));
        document.getElementById('add-social-btn').addEventListener('click', () => openModal('social-modal'));
        document.getElementById('save-link-btn').addEventListener('click', addLink);
        document.getElementById('save-social-btn').addEventListener('click', addSocial);
        document.getElementById('cancel-link-btn').addEventListener('click', () => closeModal('link-modal'));
        document.getElementById('cancel-social-btn').addEventListener('click', () => closeModal('social-modal'));
        document.getElementById('beranda-toggle-btn').addEventListener('click', toggleBeranda);
        document.getElementById('close-beranda').addEventListener('click', toggleBeranda);
        document.getElementById('user-logout-btn').addEventListener('click', () => auth.signOut().then(() => window.location.href = '../login.html'));

        document.getElementById('links-list').addEventListener('click', e => {
            const btn = e.target.closest('.delete-btn'); if (!btn) return;
            delete userLinks[btn.dataset.id];
            db.ref('users/'+window.currentUser.uid+'/links').set(userLinks).then(renderLinks);
        });
        document.getElementById('social-list').addEventListener('click', e => {
            const btn = e.target.closest('.delete-btn'); if (!btn) return;
            delete userSocial[btn.dataset.key];
            db.ref('users/'+window.currentUser.uid+'/social').set(userSocial).then(renderSocial);
        });
        document.getElementById('photo-upload').addEventListener('change', function(e) {
            const f = e.target.files[0]; if (!f) return;
            const r = new FileReader();
            r.onload = ev => { userProfile.photoURL = ev.target.result; db.ref('users/'+window.currentUser.uid+'/profile').set(userProfile).then(renderAll); };
            r.readAsDataURL(f);
        });
    });

    const st = document.createElement('style');
    st.textContent = '@keyframes toastIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes toastOut{from{transform:translateX(0);opacity:1}to{transform:translateX(100%);opacity:0}}';
    document.head.appendChild(st);
})();
