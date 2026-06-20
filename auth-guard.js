(function() {
    const ADMIN_USERNAME_PREFIX = 'admin';
    const ADMIN_EMAILS = ['admin@xyz.com'];

    function isAdmin(email) {
        if (!email) return false;
        if (ADMIN_EMAILS.includes(email)) return true;
        const username = email.split('@')[0].toLowerCase();
        return username.startsWith(ADMIN_USERNAME_PREFIX);
    }

    auth.onAuthStateChanged((user) => {
        if (!user) {
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = '../login.html';
            }
            return;
        }

        const adminStatus = isAdmin(user.email);
        const currentPath = window.location.pathname;
        const isLoginPath = currentPath.includes('login.html');
        const isAdminPath = currentPath.includes('/admin/');
        const isUserPath = currentPath.includes('/user/');

        if (isLoginPath) {
            if (adminStatus) {
                window.location.href = 'admin/index.html';
            } else {
                window.location.href = 'user/index.html';
            }
            return;
        }

        if (adminStatus && isUserPath) {
            window.location.href = '../admin/index.html';
        } else if (!adminStatus && isAdminPath) {
            window.location.href = '../user/index.html';
        }

        window.currentUser = user;
        window.isAdminUser = adminStatus;
        window.ADMIN_PREFIX = ADMIN_USERNAME_PREFIX;
        window.ADMIN_EMAILS_LIST = ADMIN_EMAILS;
        window.dispatchEvent(new CustomEvent('authReady', { 
            detail: { user, isAdmin: adminStatus } 
        }));
    });
})();
