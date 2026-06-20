const ADMIN_EMAILS = ['admin@xyz.com'];
const ADMIN_USERNAME_PREFIX = 'admin';

auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    const isAdminByEmail = ADMIN_EMAILS.includes(user.email);
    const isAdminByPrefix = user.email && user.email.split('@')[0].toLowerCase().startsWith(ADMIN_USERNAME_PREFIX);
    const isAdmin = isAdminByEmail || isAdminByPrefix;
    
    const currentPath = window.location.pathname;
    const isAdminPath = currentPath.includes('/admin/');
    const isUserPath = currentPath.includes('/user/');
    const isLoginPath = currentPath.includes('login.html');
    
    if (isLoginPath) return;
    
    if (isAdmin && isUserPath) {
        window.location.href = 'admin/index.html';
    } else if (!isAdmin && isAdminPath) {
        window.location.href = 'user/index.html';
    }
    
    window.currentUser = user;
    window.isAdminUser = isAdmin;
    window.dispatchEvent(new Event('authReady'));
});
