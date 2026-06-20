(function() {
    const ADMIN_PREFIX = 'admin';

    function isAdmin(email) {
        if (!email) return false;
        const username = email.split('@')[0].toLowerCase();
        return username.startsWith(ADMIN_PREFIX);
    }

    auth.onAuthStateChanged((user) => {
        if (!user) {
            const isLoginPage = window.location.pathname.includes('login.html');
            if (!isLoginPage) window.location.href = 'login.html';
            return;
        }

        const adminStatus = isAdmin(user.email);
        const path = window.location.pathname;
        const isLoginPage = path.includes('login.html');
        const isAdminPath = path.includes('/admin/');
        const isUserPath = path.includes('/user/');

        if (isLoginPage) {
            window.location.href = adminStatus ? 'admin/index.html' : 'user/index.html';
            return;
        }

        if (adminStatus && isUserPath) {
            window.location.href = 'admin/index.html';
            return;
        }
        if (!adminStatus && isAdminPath) {
            window.location.href = 'user/index.html';
            return;
        }

        window.currentUser = user;
        window.isAdminUser = adminStatus;
        window.dispatchEvent(new CustomEvent('authReady', { 
            detail: { user: user, isAdmin: adminStatus } 
        }));
    });
})();
