(function() {
    let allUsers = {};
    let adminEmails = ['admin@xyz.com'];
    const ADMIN_PREFIX = 'admin';

    function checkIsAdmin(email) {
        if (!email) return false;
        if (adminEmails.includes(email)) return true;
        return email.split('@')[0].toLowerCase().startsWith(ADMIN_PREFIX);
    }

    function showToast(msg, type) {
        const old = document.querySelector('.toast'); if (old) old.remove();
        const t = document.createElement('div'); t.textContent = msg;
        t.style.cssText = `position:fixed;top:16px;right:16px;padding:12px 20px;border-radius:10px;color:#fff;font-size:13px;z-index:9999;animation:toastIn 0.3s ease;pointer-events:none;background:${type==='success'?'linear-gradient(135deg,#4caf50,#2e7d32)':'linear-gradient(135deg,#f44336,#c62828)'};box-shadow:0 6px 20px rgba(0,0,0,0.4);`;
        document.body.appendChild(t);
        setTimeout(() => { t.style.animation = 'toastOut 0.3s ease'; setTimeout(() => t.remove(), 300); }, 3000);
    }

    function loadAdminEmails() {
        db.ref('adminSettings/adminEmails').once('value').then(s => {
            const d = s.val();
            if (d && Array.isArray(d)) { adminEmails = d; if (!adminEmails.includes('admin@xyz.com')) adminEmails.unshift('admin@xyz.com'); }
            renderAdminEmailList();
        }).catch(() => { adminEmails = ['admin@xyz.com']; renderAdminEmailList(); });
    }

    function saveAdminEmails() { db.ref('adminSettings/adminEmails').set(adminEmails); }

    function loadAllData() {
        db.ref('users').once('value').then(s => {
            allUsers = s.val() || {};
            updateStats(); renderUsersTable(); renderLinksTable();
        });
    }

    function updateStats() {
        const users = Object.values(allUsers);
        document.getElementById('total-users').textContent = users.length;
        let tl = 0, ts = 0;
        users.forEach(u => { tl += Object.keys(u.links||{}).length; ts += Object.keys(u.social||{}).length; });
        document.getElementById('total-links').textContent = tl;
        document.getElementById('total-social').textContent = ts;
        const weekAgo = Date.now() - 7*24*60*60*1000;
        document.getElementById('recent-users').textContent = users.filter(u => u.createdAt > weekAgo).length;
        document.getElementById('user-list-preview').innerHTML = users.slice(0, 10).map(u =>
            `<div class="user-preview-item"><span>${u.email}</span><span class="badge ${checkIsAdmin(u.email)?'badge-admin':'badge-user'}">${checkIsAdmin(u.email)?'admin':'user'}</span></div>`
        ).join('') || '<p style="color:#666;">Belum ada pengguna</p>';
    }

    function renderUsersTable(f = '') {
        const tb = document.getElementById('users-table-body');
        const list = Object.entries(allUsers).filter(([id,d]) => d.email && d.email.toLowerCase().includes(f.toLowerCase()));
        tb.innerHTML = list.map(([uid,d]) => {
            const dt = d.createdAt ? new Date(d.createdAt).toLocaleDateString('id-ID') : '-';
            const isAdm = checkIsAdmin(d.email);
            const isSelf = window.currentUser && window.currentUser.email === d.email;
            return `<tr><td>${d.email}${isAdm?' <i class="fas fa-crown" style="color:#f59e0b;"></i>':''}</td><td><span class="badge ${isAdm?'badge-admin':'badge-user'}">${isAdm?'admin':'user'}</span></td><td>${Object.keys(d.links||{}).length}</td><td>${dt}</td><td>${!isSelf?`<button class="btn-danger btn-sm" onclick="window.delUser('${uid}')"><i class="fas fa-trash"></i></button>`:'<span style="color:#555;">-</span>'}</td></tr>`;
        }).join('') || '<tr><td colspan="5" style="text-align:center;color:#666;padding:20px;">Tidak ada data</td></tr>';
    }

    function renderLinksTable() {
        const tb = document.getElementById('links-table-body');
        let all = [];
        Object.entries(allUsers).forEach(([uid,d]) => {
            Object.entries(d.links||{}).forEach(([lid,l]) => all.push({uid,email:d.email,lid,...l}));
        });
        tb.innerHTML = all.map(l =>
            `<tr><td>${l.email}</td><td>${l.icon||'🔗'} ${l.title}</td><td><a href="${l.url}" target="_blank" rel="noopener" style="color:#7c83ff;word-break:break-all;">${l.url.substring(0,35)}...</a></td><td><button class="btn-danger btn-sm" onclick="window.delLink('${l.uid}','${l.lid}')"><i class="fas fa-trash"></i></button></td></tr>`
        ).join('') || '<tr><td colspan="4" style="text-align:center;color:#666;padding:20px;">Belum ada tautan</td></tr>';
    }

    function renderAdminEmailList() {
        const c = document.getElementById('admin-email-list');
        if (!c) return;
        c.innerHTML = adminEmails.map(e =>
            `<div class="admin-email-item"><span><i class="fas fa-crown"></i> ${e}</span>${e!==(window.currentUser&&window.currentUser.email)?`<button class="btn-danger btn-sm" onclick="window.remAdmin('${e}')"><i class="fas fa-times"></i></button>`:'<span style="color:#555;font-size:11px;">Anda</span>'}</div>`
        ).join('');
    }

    window.delUser = function(uid) {
        const d = allUsers[uid]; if (!d) return;
        if (checkIsAdmin(d.email)) { showToast('Tidak dapat menghapus admin', 'error'); return; }
        if (confirm(`Hapus ${d.email}?`)) db.ref('users/'+uid).remove().then(() => { loadAllData(); showToast('Dihapus','success'); });
    };
    window.delLink = function(uid, lid) {
        if (confirm('Hapus tautan?')) db.ref('users/'+uid+'/links/'+lid).remove().then(() => { loadAllData(); showToast('Dihapus','success'); });
    };
    window.addAdminEmail = function() {
        const inp = document.getElementById('new-admin-email'); const e = inp.value.trim();
        if (!e) { showToast('Masukkan email','error'); return; }
        if (adminEmails.includes(e)) { showToast('Sudah admin','error'); return; }
        if (!e.split('@')[0].toLowerCase().startsWith(ADMIN_PREFIX)) { showToast('Harus diawali admin','error'); return; }
        adminEmails.push(e); saveAdminEmails(); inp.value = ''; renderAdminEmailList(); loadAllData(); showToast('Ditambahkan','success');
    };
    window.remAdmin = function(e) {
        if (e === (window.currentUser&&window.currentUser.email)) { showToast('Tidak bisa hapus sendiri','error'); return; }
        adminEmails = adminEmails.filter(x => x !== e); saveAdminEmails(); renderAdminEmailList(); loadAllData(); showToast('Dihapus','success');
    };
    window.deleteAllUsers = function() {
        if (confirm('Hapus semua user non-admin?')) {
            const ps = [];
            Object.entries(allUsers).forEach(([uid,d]) => { if (!checkIsAdmin(d.email)) ps.push(db.ref('users/'+uid).remove()); });
            Promise.all(ps).then(() => { loadAllData(); showToast('Semua user dihapus','success'); });
        }
    };

    function setupNav() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                this.classList.add('active');
                document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
                const el = document.getElementById(this.dataset.tab + '-tab');
                if (el) el.classList.add('active');
                document.getElementById('tab-title').textContent = this.textContent.trim();
                if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
            });
        });
        document.getElementById('user-search').addEventListener('input', e => renderUsersTable(e.target.value));
        document.getElementById('sidebar-toggle').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
        document.getElementById('logout-btn').addEventListener('click', () => auth.signOut().then(() => window.location.href = '../login.html'));
    }

    window.addEventListener('authReady', () => {
        if (!window.isAdminUser) { window.location.href = '../user/index.html'; return; }
        if (window.currentUser) document.getElementById('admin-name').textContent = window.currentUser.email;
        loadAdminEmails(); loadAllData(); setupNav();
    });

    const st = document.createElement('style');
    st.textContent = '@keyframes toastIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes toastOut{from{transform:translateX(0);opacity:1}to{transform:translateX(100%);opacity:0}}';
    document.head.appendChild(st);
})();
