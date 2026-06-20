let userLinks = {};
let userSocial = {};
let userProfile = {};

window.addEventListener('authReady', () => {
    if (window.isAdminUser) {
        window.location.href = '../admin/index.html';
        return;
    }
    loadUserData();
});

function loadUserData() {
    const uid = window.currentUser.uid;
    db.ref('users/' + uid).once('value').then(snapshot => {
        const data = snapshot.val();
        if (data) {
            userLinks = data.links || {};
            userSocial = data.social || {};
            userProfile = data.profile || {};
            renderAll();
        }
    });
}

function renderAll() {
    document.getElementById('display-name').value = userProfile.displayName || '';
    document.getElementById('bio').value = userProfile.bio || '';
    document.getElementById('display-name-preview').textContent = userProfile.displayName || 'Nama Anda';
    document.getElementById('bio-preview').textContent = userProfile.bio || 'Bio singkat Anda';
    document.getElementById('profile-photo').src = userProfile.photoURL || 
        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%237c83ff"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">U</text></svg>';
    
    renderLinks();
    renderSocial();
}

function renderLinks() {
    const container = document.getElementById('links-list');
    container.innerHTML = Object.entries(userLinks).map(([id, link]) => `
        <div class="link-card">
            <span>${link.icon || '🔗'} ${link.title}</span>
            <a href="${link.url}" target="_blank">${link.url.substring(0, 30)}...</a>
            <button class="delete-btn" onclick="deleteLink('${id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function renderSocial() {
    const container = document.getElementById('social-list');
    const icons = {
        instagram: 'fa-instagram', twitter: 'fa-twitter', facebook: 'fa-facebook',
        youtube: 'fa-youtube', tiktok: 'fa-tiktok', linkedin: 'fa-linkedin',
        github: 'fa-github', discord: 'fa-discord', whatsapp: 'fa-whatsapp',
        telegram: 'fa-telegram'
    };
    
    container.innerHTML = Object.entries(userSocial).map(([key, social]) => `
        <div class="social-card">
            <i class="fab ${icons[key] || 'fa-link'}"></i>
            <span>${social.platform}</span>
            <a href="${social.url}" target="_blank">Buka</a>
            <button class="delete-btn" onclick="deleteSocial('${key}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function saveProfile() {
    const displayName = document.getElementById('display-name').value;
    const bio = document.getElementById('bio').value;
    
    userProfile.displayName = displayName;
    userProfile.bio = bio;
    
    db.ref('users/' + window.currentUser.uid + '/profile').set(userProfile)
        .then(() => {
            renderAll();
            showToast('Profil disimpan', 'success');
        });
}

function showAddLinkModal() {
    document.getElementById('link-modal').classList.add('show');
}

function showAddSocialModal() {
    document.getElementById('social-modal').classList.add('show');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('show');
}

function addLink() {
    const title = document.getElementById('link-title').value;
    const url = document.getElementById('link-url').value;
    const icon = document.getElementById('link-icon').value;
    
    if (!title || !url) return;
    
    const linkId = Date.now().toString();
    userLinks[linkId] = { title, url, icon };
    
    db.ref('users/' + window.currentUser.uid + '/links').set(userLinks)
        .then(() => {
            closeModal('link-modal');
            document.getElementById('link-title').value = '';
            document.getElementById('link-url').value = '';
            document.getElementById('link-icon').value = '';
            renderLinks();
        });
}

function deleteLink(id) {
    delete userLinks[id];
    db.ref('users/' + window.currentUser.uid + '/links').set(userLinks)
        .then(() => renderLinks());
}

function addSocial() {
    const platform = document.getElementById('social-platform').value;
    const url = document.getElementById('social-url').value;
    
    if (!url) return;
    
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
    userSocial[platform] = { platform: platformName, url };
    
    db.ref('users/' + window.currentUser.uid + '/social').set(userSocial)
        .then(() => {
            closeModal('social-modal');
            document.getElementById('social-url').value = '';
            renderSocial();
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
    
    if (panel.classList.contains('show')) {
        renderBerandaPreview();
    }
}

function renderBerandaPreview() {
    const container = document.getElementById('beranda-content');
    let html = '';
    
    if (userProfile.photoURL) {
        html += `<img src="${userProfile.photoURL}" style="width:60px;height:60px;border-radius:50%;margin-bottom:8px;">`;
    }
    html += `<h4 style="color:#fff;">${userProfile.displayName || ''}</h4>`;
    html += `<p style="color:#888;font-size:12px;margin-bottom:16px;">${userProfile.bio || ''}</p>`;
    
    Object.values(userLinks).forEach(link => {
        html += `<a href="${link.url}" target="_blank" class="preview-link">${link.icon || ''} ${link.title}</a>`;
    });
    
    html += '<div style="margin-top:16px;">';
    Object.entries(userSocial).forEach(([key, social]) => {
        html += `<a href="${social.url}" target="_blank" class="preview-social" style="color:#7c83ff;margin:4px 8px;font-size:20px;">
            <i class="fab fa-${key}"></i>
        </a>`;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function logout() {
    auth.signOut().then(() => window.location.href = '../login.html');
}

function showToast(msg, type) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; padding: 14px 24px; border-radius: 12px;
        color: #fff; z-index: 999; animation: slideIn 0.3s ease;
        background: ${type === 'success' ? 'linear-gradient(135deg, #4caf50, #2e7d32)' : 'linear-gradient(135deg, #f44336, #c62828)'};
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Photo upload
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
