(function() {
    const ADMIN_SECRET_CODE = 'admin123';
    const ADMIN_PREFIX = 'admin';

    function checkIsAdmin(email) {
        if (!email) return false;
        if (window.ADMIN_EMAILS_LIST && window.ADMIN_EMAILS_LIST.includes(email)) return true;
        const username = email.split('@')[0].toLowerCase();
        return username.startsWith(ADMIN_PREFIX);
    }

    function showToast(message, type) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 14px 24px; border-radius: 12px;
            color: #fff; font-size: 14px; z-index: 9999; animation: slideIn 0.3s ease;
            background: ${type === 'success' ? 'linear-gradient(135deg, #4caf50, #2e7d32)' : 'linear-gradient(135deg, #f44336, #c62828)'};
            box-shadow: 0 8px 24px rgba(0,0,0,0.4); pointer-events: none;
        `;
        document.body.appendChild(toast);
        setTimeout(() => { toast.remove(); }, 3000);
    }

    function switchForm(formType) {
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        const targetForm = document.getElementById(formType + '-form');
        if (targetForm) targetForm.classList.add('active');
    }

    document.querySelectorAll('.link-switch').forEach(link => {
        link.addEventListener('click', function() {
            switchForm(this.dataset.form);
        });
    });

    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.addEventListener('click', function() {
            const input = document.getElementById(this.dataset.target);
            if (input) {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                this.classList.toggle('fa-eye', !isPassword);
                this.classList.toggle('fa-eye-slash', isPassword);
            }
        });
    });

    document.querySelectorAll('input[name="role"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const adminSection = document.getElementById('admin-code-section');
            adminSection.style.display = this.value === 'admin' ? 'block' : 'none';
        });
    });

    document.getElementById('login-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            showToast('Email dan kata sandi wajib diisi', 'error');
            return;
        }

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const isAdmin = checkIsAdmin(userCredential.user.email);
                window.location.href = isAdmin ? 'admin/index.html' : 'user/index.html';
            })
            .catch((error) => {
                let message = error.message;
                if (error.code === 'auth/user-not-found') message = 'Akun tidak ditemukan';
                if (error.code === 'auth/wrong-password') message = 'Kata sandi salah';
                if (error.code === 'auth/invalid-email') message = 'Format email tidak valid';
                showToast(message, 'error');
            });
    });

    document.getElementById('register-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;
        const role = document.querySelector('input[name="role"]:checked').value;
        const adminCode = document.getElementById('admin-code').value;
        
        if (!email || !password || !confirm) {
            showToast('Semua field wajib diisi', 'error');
            return;
        }
        
        if (password !== confirm) {
            showToast('Kata sandi tidak cocok', 'error');
            return;
        }
        
        if (password.length < 6) {
            showToast('Kata sandi minimal 6 karakter', 'error');
            return;
        }
        
        if (role === 'admin') {
            if (adminCode !== ADMIN_SECRET_CODE) {
                showToast('Kode admin tidak valid', 'error');
                return;
            }
            if (!email.split('@')[0].toLowerCase().startsWith(ADMIN_PREFIX)) {
                showToast('Email admin harus diawali "admin" (contoh: admin@xyz.com)', 'error');
                return;
            }
        }
        
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const uid = userCredential.user.uid;
                const userRole = checkIsAdmin(email) ? 'admin' : 'user';
                
                return db.ref('users/' + uid).set({
                    email: email,
                    role: userRole,
                    links: {},
                    social: {},
                    profile: {
                        displayName: '',
                        bio: '',
                        photoURL: '',
                        theme: 'default'
                    },
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
            })
            .then(() => {
                showToast('Akun berhasil dibuat sebagai ' + (checkIsAdmin(email) ? 'Admin' : 'User'), 'success');
                setTimeout(() => switchForm('login'), 1500);
            })
            .catch((error) => {
                let message = error.message;
                if (error.code === 'auth/email-already-in-use') message = 'Email sudah terdaftar';
                if (error.code === 'auth/invalid-email') message = 'Format email tidak valid';
                showToast(message, 'error');
            });
    });

    document.getElementById('forgot-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('reset-email').value.trim();
        
        if (!email) {
            showToast('Masukkan email Anda', 'error');
            return;
        }
        
        auth.sendPasswordResetEmail(email)
            .then(() => {
                showToast('Link reset telah dikirim ke email Anda', 'success');
                setTimeout(() => switchForm('login'), 2000);
            })
            .catch((error) => {
                let message = error.message;
                if (error.code === 'auth/user-not-found') message = 'Email tidak terdaftar';
                showToast(message, 'error');
            });
    });

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    `;
    document.head.appendChild(style);
})();
