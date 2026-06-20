let allUsers = {};
let adminEmails = ['admin@xyz.com'];
const ADMIN_USERNAME_PREFIX = 'admin';

window.addEventListener('authReady', () => {
    if (!window.isAdminUser) {
        window.location.href = '../user/index.html';
        return;
    }
    loadAdminEmails();
    loadAdminData();
    setupNavigation();
});

function loadAdminEmails() {
    db.ref('adminSettings/adminEmails').once('value').then(snapshot => {
        const saved = snapshot.val();
        if (saved) {
            adminEmails = saved;
        }
    });
}

function saveAdminEmails() {
    db.ref('adminSettings/adminEmails').set(adminEmails);
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            this.classList.add('active');
            const tab = this.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById(tab + '-tab').classList.add('active');
            document.getElementById('tab-title').textContent = this.textContent.trim();
        });
    });
}

function loadAdminData() {
    db.ref('users').once('value').then(snapshot => {
        allUsers = snapshot.val() || {};
        updateStats();
        renderUsersTable();
        renderLinksTable();
        renderAdminEmailList();
    });
    
    if (window.currentUser) {
        document.getElementById('admin-name').textContent = window.currentUser.email;
        document.getElementById('admin-avatar').src = 
            window.currentUser.photoURL || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23f59e0b"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">A</text></svg>';
    }
}

function updateStats() {
    const users = Object.values(allUsers);
    document.getElementById('total-users').textContent = users.length;
    
    let totalLinks = 0;
    let totalSocial = 0;
    users.forEach(u => {
        totalLinks += Object.keys(u.links || {}).length;
        totalSocial += Object.keys(u.social || {}).length;
    });
    
    document.getElementById('total-links').textContent = totalLinks;
    document.getElementById('total-social').textContent = totalSocial;
    
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentUsers = users.filter(u => u.createdAt > sevenDaysAgo).length;
    document.getElementById('recent-users').textContent = recentUsers;
    
    const preview = document.getElementById('user-list-preview');
    preview.innerHTML = users.slice(0, 10).map(u => `
        <div class="user-preview-item">
            <span>${u.email}</span>
            <span class="badge badge-${u.role || 'user'}">${u.role || 'user'}</span>
        </div>
    `).join('');
}

function renderUsersTable(filter = '') {
    const tbody = document.getElementById('users-table-body');
    const users = Object.entries(allUsers).filter(([uid, data]) => 
        data.email.toLowerCase().includes(filter.toLowerCase())
    );
    
    tbody.innerHTML = users.map(([uid, data]) => {
        const date = data.createdAt ? new Date(data.createdAt).toLocaleDateString('id-ID') : '-';
        const isAdmin = checkIsAdmin(data.email);
        return `
            <tr>
                <td>${data.email} ${isAdmin ? '<i class="fas fa-crown" style="color:#f59e0b;"></i>' : ''}</td>
                <td><span class="badge badge-${data.role || 'user'}">${data.role || 'user'}</span></td>
                <td>${Object.keys(data.links || {}).length}</td>
                <td>${date}</td>
                <td>
                    ${!isAdmin || data.email !== window.currentUser.email ? `
                    <button class="btn-danger btn-sm" onclick="deleteUser('${uid}', '${data.email}')">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('user-search').oninput = function(e) {
        renderUsersTable(e.target.value);
    };
}

function renderLinksTable() {
    const tbody = document.getElementById('links-table-body');
    let allLinks = [];
    
    Object.entries(allUsers).forEach(([uid, data]) => {
        Object.entries(data.links || {}).forEach(([linkId, link]) => {
            allLinks.push({ uid, email: data.email, linkId, ...link });
        });
    });
    
    tbody.innerHTML = allLinks.map(link => `
        <tr>
            <td>${link.email}</td>
            <td>${link.icon || '🔗'} ${link.title}</td>
            <td><a href="${link.url}" target="_blank" style="color:#7c83ff;">${link.url.substring(0, 40)}...</a></td>
            <td>
                <button class="btn-danger btn-sm" onclick="deleteUserLink('${link.uid}', '${link.linkId}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderAdminEmailList() {
    const existingList = document.getElementById('admin-email-list');
    if (!existingList) return;
    
    existingList.innerHTML = adminEmails.map(email => `
        <div class="admin-email-item">
            <span>${email}</span>
            <button class="btn-danger btn-sm" onclick="removeAdminEmail('${email}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function deleteUser(uid, email) {
    if (checkIsAdmin(email)) {
        showToast('Tidak dapat menghapus akun admin lain', 'error');
        return;
    }
    
    if (confirm(`Hapus pengguna ${email}? Semua data akan hilang permanen.`)) {
        db.ref('users/' + uid).remove().then(() => {
            loadAdminData();
            showToast('Pengguna dihapus', 'success');
        });
    }
}

function deleteUserLink(uid, linkId) {
    if (confirm('Hapus tautan ini?')) {
        db.ref('users/' + uid + '/links/' + linkId).remove().then(() => {
            loadAdminData();
            showToast('Tautan dihapus', 'success');
        });
    }
}

function addAdminEmail() {
    const emailInput = document.getElementById('new-admin-email');
    const email = emailInput.value.trim();
    
    if (!email) {
        showToast('Masukkan email yang valid', 'error');
        return;
    }
    
    if (adminEmails.includes(email)) {
        showToast('Email sudah terdaftar sebagai admin', 'error');
        return;
    }
    
    const username = email.split('@')[0].toLowerCase();
    if (!username.startsWith(ADMIN_USERNAME_PREFIX)) {
        showToast('Email admin harus diawali dengan "admin" (contoh: admin@xyz.com)', 'error');
        return;
    }
    
    adminEmails.push(email);
    saveAdminEmails();
    emailInput.value = '';
    renderAdminEmailList();
    loadAdminData();
    showToast('Email admin ditambahkan', 'success');
}

function removeAdminEmail(email) {
    if (email === window.currentUser.email) {
        showToast('Tidak dapat menghapus diri sendiri', 'error');
        return;
    }
    
    adminEmails = adminEmails.filter(e => e !== email);
    saveAdminEmails();
    renderAdminEmailList();
    loadAdminData();
    showToast('Email admin dihapus', 'success');
}

function deleteAllUsers() {
    if (confirm('PERINGATAN: Ini akan menghapus SEMUA data pengguna non-admin. Lanjutkan?')) {
        const promises = [];
        Object.entries(allUsers).forEach(([uid, data]) => {
            if (!checkIsAdmin(data.email)) {
                promises.push(db.ref('users/' + uid).remove());
            }
        });
        
        Promise.all(promises).then(() => {
            loadAdminData();
            showToast('Semua pengguna non-admin dihapus', 'success');
        });
    }
}

function checkIsAdmin(email) {
    if (!email) return false;
    if (adminEmails.includes(email)) return true;
    const username = email.split('@')[0].toLowerCase();
    return username.startsWith(ADMIN_USERNAME_PREFIX);
}

function logout() {
    auth.signOut().then(() => window.location.href = '../login.html');
}

function showToast(msg, type) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; padding: 14px 24px; border-radius: 12px;
        color: #fff; z-index: 9999; animation: slideIn 0.3s ease;
        background: ${type === 'success' ? 'linear-gradient(135deg, #4caf50, #2e7d32)' : 'linear-gradient(135deg, #f44336, #c62828)'};
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
        }
