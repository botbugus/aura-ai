(function() {
    let userLinks = {};
    let userSocial = {};
    let userProfile = {};

    function showToast(message, type) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 14px 24px; border-radius: 12px;
            color: #fff; font-size: 14px; z-index: 9999; animation: fadeIn 0.3s ease; pointer-events: none;
            background: ${type === 'success' ? 'linear-gradient(135deg, #4caf50, #2e7d32)' : 'linear-gradient(135deg, #f44336, #c62828)'};
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function loadUserData() {
        if (!window.currentUser) return;
        db.ref('users/' + window.currentUser.uid).once('value').then(snapshot => {
            const data = snapshot.val();
            if (data) {
                userLinks = data.links || {};
                userSocial = data.social || {};
                userProfile = data.profile || {};
            }
            renderAll();
        }).catch(() => {
            renderAll();
        });
    }

    function renderAll() {
        document.getElementById('display-name').value = userProfile.displayName || '';
        document.getElementById('bio').value = userProfile.bio || '';
        document.getElementById('display-name-preview').textContent = userProfile.displayName || 'Nama Anda';
        document.getElementById('bio-preview').textContent = userProfile.bio || 'Bio singkat Anda';
        
        const defaultAvatar = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%237c83ff"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">U</text></svg>');
        document.getElementById('profile-photo').src = userProfile.photoURL || defaultAvatar;
        
        renderLinks();
        renderSocial();
    }

    function renderLinks() {
        const container = document.getElementById('links-list');
        if (Object.keys(userLinks).length === 0) {
            container.innerHTML = '<p style="color:#888;text-align:center;padding:20px;">Belum ada tautan</p>';
            return;
        }
        container.innerHTML = Object.entries(userLinks).map(([id, link]) => `
            <div class="link-card">
                <span>${link.icon || '🔗'} ${link.title}</span>
                <a href="${link.url}" target="_blank" rel="noopener">${link.url.substring(0, 30)}...</a>
                <button class="delete-btn" data-link-id="${id}"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');
    }

    function renderSocial() {
        const container = document.getElementById('social-list');
        const icons = {
            instagram: 'fa-instagram', twitter: 'fa-twitter', facebook: 'fa-facebook',
            youtube: 'fa-youtube', tiktok: 'fa-tiktok', linkedin: 'fa-linkedin',
            github: 'fa-github', discord: 'fa-discord', whatsapp: 'fa-whatsapp', telegram: 'fa-telegram'
        };
        if (Object.keys(userSocial).length === 0) {
            container.innerHTML = '<p style="color:#888;text-align:center;padding:20px;">Belum ada media sosial</p>';
            return;
        }
        container.innerHTML = Object.entries(userSocial).map(([key, social]) => `
            <div class="social-card">
                <i class="fab ${icons[key] || 'fa-link'}" style="font-size:20px;"></i>
                <span>${social.platform}</span>
                <a href="${social.url}" target="_blank" rel="noopener">Buka</a>
                <button class="delete-btn" data-social-key="${key}"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');
    }

    function saveProfile() {
        const displayName = document.getElementById('display-name').value.trim();
        const bio = document.getElementById('bio').value.trim();
        userProfile.displayName = displayName;
        userProfile.bio = bio;
        
        db.ref('users/' + window.currentUser.uid + '/profile').set(userProfile)
            .then(() => { renderAll(); showToast('Profil disimpan', 'success'); })
            .catch(() => showToast('Gagal menyimpan', 'error'));
    }

    function addLink() {
        const title = document.getElementById('link-title').value.trim();
        const url = document.getElementById('link-url').value.trim();
        const icon = document.getElementById('link-icon').value.trim();
        if (!title || !url) { showToast('Judul dan URL wajib diisi', 'error'); return; }
        
        const linkId = Date.now().toString();
        userLinks[linkId] = { title, url, icon };
        
        db.ref('users/' + window.currentUser.uid + '/links').set(userLinks)
            .then(() => {
                closeModal('link-modal');
                document.getElementById('link-title').value = '';
                document.getElementById('link-url').value = '';
                document.getElementById('link-icon').value = '';
                renderLinks();
                showToast('Tautan ditambahkan', 'success');
            });
    }

    function deleteLink(id) {
        delete userLinks[id];
        db.ref('users/' + window.currentUser.uid + '/links').set(userLinks)
            .then(() => renderLinks());
    }

    function addSocial() {
        const platform = document.getElementById('social-platform').value;
        const url = document.getElementById('social-url').value.trim();
        if (!url) { showToast('URL wajib diisi', 'error'); return; }
        
        const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
        userSocial[platform] = { platform: platformName, url };
        
        db.ref('users/' + window.currentUser.uid + '/social').set(userSocial)
            .then(() => {
                closeModal('social-modal');
                document.getElementById('social-url').value = '';
                renderSocial();
                showToast('Media sosial ditambahkan', 'success');
            });
    }

    function deleteSocial(key) {
        delete userSocial[key];
        db.ref('users/' + window.currentUser.uid + '/social').set(userSocial)
            .then(() => renderSocial());
    }

    function toggleBeranda() {
        const panel = document.getElementById('beranda-panel');
        panel.classList.toggle('show');
        if (panel.classList.contains('show')) renderBerandaPreview();
    }

    function renderBerandaPreview() {
        const container = document.getElementById('beranda-content');
        const icons = {
            instagram: 'fa-instagram', twitter: 'fa-twitter', facebook: 'fa-facebook',
            youtube: 'fa-youtube', tiktok: 'fa-tiktok', linkedin: 'fa-linkedin',
            github: 'fa-github', discord: 'fa-discord', whatsapp: 'fa-whatsapp', telegram: 'fa-telegram'
        };
        let html = '';
        if (userProfile.photoURL) {
            html += `<img src="${userProfile.photoURL}" style="width:60px;height:60px;border-radius:50%;margin-bottom:8px;object-fit:cover;">`;
        }
        html += `<h4 style="color:#fff;">${userProfile.displayName || ''}</h4>`;
        html += `<p style="color:#888;font-size:12px;margin-bottom:16px;">${userProfile.bio || ''}</p>`;
        Object.values(userLinks).forEach(link => {
            html += `<a href="${link.url}" target="_blank" rel="noopener" class="preview-link">${link.icon || ''} ${link.title}</a>`;
        });
        html += '<div class="preview-social-icons" style="margin-top:16px;">';
        Object.entries(userSocial).forEach(([key, social]) => {
            html += `<a href="${social.url}" target="_blank" rel="noopener" style="color:#7c83ff;font-size:22px;" title="${social.platform}"><i class="fab ${icons[key] || 'fa-link'}"></i></a>`;
        });
        html += '</div>';
        container.innerHTML = html || '<p style="color:#888;">Belum ada konten</p>';
    }

    function openModal(id) { document.getElementById(id).classList.add('show'); }
    function closeModal(id) { document.getElementById(id).classList.remove('show'); }

    function logout() {
        auth.signOut().then(() => window.location.href = '../login.html');
    }

    window.addEventListener('authReady', function(e) {
        if (window.isAdminUser) {
            window.location.href = '../admin/index.html';
            return;
        }
        loadUserData();

        document.getElementById('save-profile-btn').addEventListener('click', saveProfile);
        document.getElementById('add-link-btn').addEventListener('click', () => openModal('link-modal'));
        document.getElementById('add-social-btn').addEventListener('click', () => openModal('social-modal'));
        document.getElementById('save-link-btn').addEventListener('click', addLink);
        document.getElementById('save-social-btn').addEventListener('click', addSocial);
        document.getElementById('cancel-link-btn').addEventListener('click', () => closeModal('link-modal'));
        document.getElementById('cancel-social-btn').addEventListener('click', () => closeModal('social-modal'));
        document.getElementById('beranda-toggle-btn').addEventListener('click', toggleBeranda);
        document.getElementById('close-beranda').addEventListener('click', toggleBeranda);
        document.getElementById('user-logout-btn').addEventListener('click', logout);

        document.getElementById('links-list').addEventListener('click', function(e) {
            if (e.target.closest('.delete-btn')) {
                const id = e.target.closest('.delete-btn').dataset.linkId;
                if (id) deleteLink(id);
            }
        });

        document.getElementById('social-list').addEventListener('click', function(e) {
            if (e.target.closest('.delete-btn')) {
                const key = e.target.closest('.delete-btn').dataset.socialKey;
                if (key) deleteSocial(key);
            }
        });

        document.getElementById('photo-upload').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(event) {
                userProfile.photoURL = event.target.result;
                db.ref('users/' + window.currentUser.uid + '/profile').set(userProfile)
                    .then(() => renderAll());
            };
            reader.readAsDataURL(file);
        });
    });
})();
