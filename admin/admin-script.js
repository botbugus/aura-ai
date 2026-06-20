let allUsers = {};
let adminEmails = ['admin@admin.com'];

window.addEventListener('authReady', () => {
    if (!window.isAdminUser) {
        window.location.href = '../user/index.html';
        return;
    }
    loadAdminData();
    setupNavigation();
});

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
        return `
            <tr>
                <td>${data.email}</td>
                <td><span class="badge badge-${data.role || 'user'}">${data.role || 'user'}</span></td>
                <td>${Object.keys(data.links || {}).length}</td>
                <td>${date}</td>
                <td>
                    <button class="btn-danger btn-sm" onclick="deleteUser('${uid}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('user-search').addEventListener('input', function(e) {
        renderUsersTable(e.target.value);
    });
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
            <td>${link.title}</td>
            <td><a href="${link.url}" target="_blank" style="color:#7c83ff;">${link.url.substring(0, 40)}...</a></td>
            <td>
                <button class="btn-danger btn-sm" onclick="deleteUserLink('${link.uid}', '${link.linkId}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function deleteUser(uid) {
    if (confirm('Hapus pengguna ini? Semua data akan hilang permanen.')) {
        db.ref('users/' + uid).remove().then(() => loadAdminData());
    }
}

function deleteUserLink(uid, linkId) {
    db.ref('users/' + uid + '/links/' + linkId).remove().then(() => loadAdminData());
}

function addAdminEmail() {
    const email = document.getElementById('new-admin-email').value;
    if (email && !adminEmails.includes(email)) {
        adminEmails.push(email);
        document.getElementById('new-admin-email').value = '';
        showToast('Email admin ditambahkan', 'success');
    }
}

function deleteAllUsers() {
    if (confirm('PERINGATAN: Hapus SEMUA data pengguna? Tindakan ini tidak dapat dibatalkan.')) {
        const secondConfirm = confirm('Ketik YA untuk konfirmasi:');
        if (secondConfirm) {
            db.ref('users').remove().then(() => {
                loadAdminData();
                showToast('Semua data pengguna dihapus', 'success');
            });
        }
    }
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
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
