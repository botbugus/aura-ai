(function() {
    function showToast(message, type) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
        toast.style.cssText = `
            position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:10px;
            color:#fff;font-size:14px;z-index:9999;animation:slideIn 0.3s ease;pointer-events:none;
            background:${type==='success'?'linear-gradient(135deg,#4caf50,#2e7d32)':'linear-gradient(135deg,#f44336,#c62828)'};
            box-shadow:0 6px 20px rgba(0,0,0,0.4);display:flex;align-items:center;gap:8px;
        `;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.animation = 'slideOut 0.3s ease'; setTimeout(() => toast.remove(), 300); }, 3000);
    }

    function switchForm(type) {
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        const target = document.getElementById(type + '-form');
        if (target) target.classList.add('active');
    }

    document.querySelectorAll('.link-switch').forEach(el => {
        el.addEventListener('click', () => switchForm(el.dataset.form));
    });

    document.querySelectorAll('.toggle-password').forEach(el => {
        el.addEventListener('click', function() {
            const inp = document.getElementById(this.dataset.target);
            if (!inp) return;
            const isPass = inp.type === 'password';
            inp.type = isPass ? 'text' : 'password';
            this.classList.toggle('fa-eye', !isPass);
            this.classList.toggle('fa-eye-slash', isPass);
        });
    });

    document.getElementById('login-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        if (!email || !password) { showToast('Email dan kata sandi wajib diisi', 'error'); return; }

        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                const adminStatus = window.location.pathname.includes('admin') || 
                    email.split('@')[0].toLowerCase().startsWith('admin');
                window.location.href = adminStatus ? 'admin/index.html' : 'user/index.html';
            })
            .catch(err => {
                const msg = { 'auth/user-not-found':'Akun tidak ditemukan', 'auth/wrong-password':'Kata sandi salah', 'auth/invalid-email':'Format email tidak valid' }[err.code] || err.message;
                showToast(msg, 'error');
            });
    });

    document.getElementById('register-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;

        if (!email || !password || !confirm) { showToast('Semua field wajib diisi', 'error'); return; }
        if (password !== confirm) { showToast('Kata sandi tidak cocok', 'error'); return; }
        if (password.length < 6) { showToast('Kata sandi minimal 6 karakter', 'error'); return; }

        const username = email.split('@')[0].toLowerCase();
        const role = username.startsWith('admin') ? 'admin' : 'user';

        auth.createUserWithEmailAndPassword(email, password)
            .then(uc => db.ref('users/' + uc.user.uid).set({
                email, role,
                links: {}, social: {},
                profile: { displayName: '', bio: '', photoURL: '', theme: 'default' },
                createdAt: firebase.database.ServerValue.TIMESTAMP
            }))
            .then(() => {
                showToast('Akun berhasil dibuat', 'success');
                setTimeout(() => switchForm('login'), 1500);
            })
            .catch(err => {
                const msg = { 'auth/email-already-in-use':'Email sudah terdaftar', 'auth/invalid-email':'Format email tidak valid' }[err.code] || err.message;
                showToast(msg, 'error');
            });
    });

    document.getElementById('forgot-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('reset-email').value.trim();
        if (!email) { showToast('Masukkan email Anda', 'error'); return; }
        auth.sendPasswordResetEmail(email)
            .then(() => { showToast('Link reset dikirim ke email', 'success'); setTimeout(() => switchForm('login'), 2000); })
            .catch(() => showToast('Email tidak terdaftar', 'error'));
    });

    const s = document.createElement('style');
    s.textContent = '@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes slideOut{from{transform:translateX(0);opacity:1}to{transform:translateX(100%);opacity:0}}';
    document.head.appendChild(s);
})();
