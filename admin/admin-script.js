(function() {
    let allUsers = {};
    let adminEmails = ['admin@xyz.com'];
    const ADMIN_PREFIX = 'admin';

    function checkIsAdmin(email) {
        if (!email) return false;
        if (adminEmails.includes(email)) return true;
        const username = email.split('@')[0].toLowerCase();
        return username.startsWith(ADMIN_PREFIX);
    }

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

    function loadAdminEmails() {
        db.ref('adminSettings/adminEmails').once('value').then(snapshot => {
            const saved = snapshot.val();
            if (saved && Array.isArray(saved)) {
                adminEmails = saved;
                if (!adminEmails.includes('admin@xyz.com')) {
                    adminEmails.unshift('admin@xyz.com');
                }
            }
            renderAdminEmailList();
        }).catch(() => {
            adminEmails = ['admin@xyz.com'];
            renderAdminEmailList();
        });
    }

    function saveAdminEmails() {
        db.ref('adminSettings/adminEmails').set(adminEmails);
    }

    function loadAllData() {
        db.ref('users').once('value').then(snapshot => {
            allUsers = snapshot.val() || {};
            updateStats();
            renderUsersTable();
            renderLinksTable();
        });
    }

    function updateStats() {
        const users = Object.values(allUsers);
        document.getElementById('total-users').textContent = users.length;
        
        let totalLinks = 0, totalSocial = 0;
        users.forEach(u => {
            totalLinks += Object.keys(u.links || {}).length;
            totalSocial += Object.keys(u.social || {}).length;
        });
        
        document.getElementById('total-links').textContent = totalLinks;
        document.getElementById('total-social').textContent = totalSocial;
        
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recentUsers = users.filter(u => u.createdAt && u.createdAt > sevenDaysAgo).length;
        document.getElementById('recent-users').textContent = recentUsers;
        
        const preview = document.getElementById('user-list-preview');
        preview.innerHTML = users.slice(0, 10).map(u => `
            <div class="user-preview-item">
                <span>${u.email}</span>
                <span class="badge ${checkIsAdmin(u.email) ? 'badge-admin' : 'badge-user'}">${checkIsAdmin(u.email) ? 'admin' : 'user'}</span>
            </div>
        `).join('') || '<p style="color:#888;">Belum ada pengguna</p>';
    }

    function renderUsersTable(filter = '') {
        const tbody = document.getElementById('users-table-body');
        const users = Object.entries(allUsers)
            .filter(([uid, data]) => data.email && data.email.toLowerCase().includes(filter.toLowerCase()));
        
        tbody.innerHTML = users.map(([uid, data]) => {
            const date = data.createdAt ? new Date(data.createdAt).toLocaleDateString('id-ID') : '-';
            const isUserAdmin = checkIsAdmin(data.email);
            const isSelf = window.currentUser && window.currentUser.email === data.email;
            return `
                <tr>
                    <td>${data.email} ${isUserAdmin ? '<i class="fas fa-crown" style="color:#f59e0b;"></i>' : ''}</td>
                    <td><span class="badge ${isUserAdmin ? 'badge-admin' : 'badge-user'}">${isUserAdmin ? 'admin' : 'user'}</span></td>
                    <td>${Object.keys(data.links || {}).length}</td>
                    <td>${date}</td>
                    <td>${!isSelf ? `<button class="btn-danger btn-sm" onclick="window.deleteUserById('${uid}')"><i class="fas fa-trash"></i></button>` : '<span style="color:#555;">-</span>'}</td>
                </tr>
            `;
        }).join('');
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
                <td><button class="btn-danger btn-sm" onclick="window.deleteLinkById('${link.uid}', '${link.linkId}')"><i class="fas fa-trash"></i></button></td>
            </tr>
        `).join('') || '<tr><td colspan="4" style="text-align:center;color:#888;">Belum ada tautan</td></tr>';
    }

    function renderAdminEmailList() {
        const container = document.getElementById('admin-email-list');
        if (!container) return;
        container.innerHTML = adminEmails.map(email => `
            <div class="admin-email-item">
                <span><i class="fas fa-crown"></i> ${email}</span>
                ${email !== (window.currentUser && window.currentUser.email) ? 
                    `<button class="btn-danger btn-sm" onclick="window.removeAdminByEmail('${email}')"><i class="fas fa-times"></i></button>` : 
                    '<span style="color:#555;font-size:12px;">(Anda)</span>'}
            </div>
        `).join('');
    }

    window.deleteUserById = function(uid) {
        const userData = allUsers[uid];
        if (!userData) return;
        if (checkIsAdmin(userData.email)) {
            showToast('Tidak dapat menghapus akun admin', 'error');
            return;
        }
        if (confirm(`Hapus pengguna ${userData.email}?`)) {
            db.ref('users/' + uid).remove().then(() => {
                loadAllData();
                showToast('Pengguna dihapus', 'success');
            });
        }
    };

    window.deleteLinkById = function(uid, linkId) {
        if (confirm('Hapus tautan ini?')) {
            db.ref('users/' + uid + '/links/' + linkId).remove().then(() => {
                loadAllData();
                showToast('Tautan dihapus', 'success');
            });
        }
    };

    window.addAdminEmail = function() {
        const input = document.getElementById('new-admin-email');
        const email = input.value.trim();
        if (!email) { showToast('Masukkan email', 'error'); return; }
        if (adminEmails.includes(email)) { showToast('Email sudah admin', 'error'); return; }
        if (!email.split('@')[0].toLowerCase().startsWith(ADMIN_PREFIX)) {
            showToast('Email admin harus diawali "admin"', 'error');
            return;
        }
        adminEmails.push(email);
        saveAdminEmails();
        input.value = '';
        renderAdminEmailList();
        loadAllData();
        showToast('Admin ditambahkan', 'success');
    };

    window.removeAdminByEmail = function(email) {
        if (email === (window.currentUser && window.currentUser.email)) {
            showToast('Tidak dapat menghapus diri sendiri', 'error');
            return;
        }
        adminEmails = adminEmails.filter(e => e !== email);
        saveAdminEmails();
        renderAdminEmailList();
        loadAllData();
        showToast('Admin dihapus', 'success');
    };

    window.deleteAllUsers = function() {
        if (confirm('Hapus SEMUA pengguna non-admin? Tindakan ini tidak dapat dibatalkan.')) {
            const promises = [];
            Object.entries(allUsers).forEach(([uid, data]) => {
                if (!checkIsAdmin(data.email)) {
                    promises.push(db.ref('users/' + uid).remove());
                }
            });
            Promise.all(promises).then(() => {
                loadAllData();
                showToast('Semua user dihapus', 'success');
            });
        }
    };

    function setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                this.classList.add('active');
                const tab = this.dataset.tab;
                document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
                const tabElement = document.getElementById(tab + '-tab');
                if (tabElement) tabElement.classList.add('active');
                document.getElementById('tab-title').textContent = this.textContent.trim();
            });
        });

        document.getElementById('user-search').addEventListener('input', function(e) {
            renderUsersTable(e.target.value);
        });
    }

    function logout() {
        auth.signOut().then(() => window.location.href = '../login.html');
    }

    window.addEventListener('authReady', function(e) {
        if (!window.isAdminUser) {
            window.location.href = '../user/index.html';
            return;
        }
        if (window.currentUser) {
            document.getElementById('admin-name').textContent = window.currentUser.email;
        }
        loadAdminEmails();
        loadAllData();
        setupNavigation();
        document.getElementById('logout-btn').addEventListener('click', logout);
    });
})();
