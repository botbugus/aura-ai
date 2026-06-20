const ADMIN_SECRET_CODE = 'admin123';
const ADMIN_EMAILS = ['admin@xyz.com'];
const ADMIN_USERNAME_PREFIX = 'admin';

document.querySelectorAll('.auth-form').forEach(form => {
    form.addEventListener('submit', (e) => e.preventDefault());
});

document.querySelectorAll('input[name="role"]').forEach(radio => {
    radio.addEventListener('change', function() {
        const adminSection = document.getElementById('admin-code-section');
        adminSection.style.display = this.value === 'admin' ? 'block' : 'none';
        if (this.value === 'admin') {
            setTimeout(() => adminSection.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    });
});

function switchForm(formType) {
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById(formType + '-form').classList.add('active');
}

function togglePassword(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const isAdmin = checkIsAdmin(userCredential.user.email);
            window.location.href = isAdmin ? 'admin/index.html' : 'user/index.html';
        })
        .catch((error) => {
            showToast(error.message, 'error');
        });
});

document.getElementById('register-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    const role = document.querySelector('input[name="role"]:checked').value;
    const adminCode = document.getElementById('admin-code').value;
    
    if (password !== confirm) {
        showToast('Kata sandi tidak cocok', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Kata sandi minimal 6 karakter', 'error');
        return;
    }
    
    if (role === 'admin' && adminCode !== ADMIN_SECRET_CODE) {
        showToast('Kode admin tidak valid. Gunakan kode: ' + ADMIN_SECRET_CODE, 'error');
        return;
    }
    
    if (role === 'admin' && !email.split('@')[0].toLowerCase().startsWith(ADMIN_USERNAME_PREFIX)) {
        showToast('Username admin harus diawali dengan "admin" (contoh: admin@xyz.com, admin123@xyz.com)', 'error');
        return;
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
            showToast(error.message, 'error');
        });
});

document.getElementById('forgot-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('reset-email').value.trim();
    
    auth.sendPasswordResetEmail(email)
        .then(() => {
            showToast('Link reset telah dikirim ke email Anda', 'success');
            setTimeout(() => switchForm('login'), 2000);
        })
        .catch((error) => {
            showToast(error.message, 'error');
        });
});

function checkIsAdmin(email) {
    if (!email) return false;
    if (ADMIN_EMAILS.includes(email)) return true;
    const username = email.split('@')[0].toLowerCase();
    return username.startsWith(ADMIN_USERNAME_PREFIX);
}

function showToast(message, type) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 14px 24px;
        border-radius: 12px;
        color: #fff;
        font-size: 14px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        background: ${type === 'success' ? 'linear-gradient(135deg, #4caf50, #2e7d32)' : 'linear-gradient(135deg, #f44336, #c62828)'};
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
`;
document.head.appendChild(style);
