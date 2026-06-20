const ADMIN_EMAILS = ['admin@admin.com'];

auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = '../login.html';
        return;
    }
    
    const isAdmin = ADMIN_EMAILS.includes(user.email);
    const currentPath = window.location.pathname;
    const isAdminPath = currentPath.includes('/admin/');
    const isUserPath = currentPath.includes('/user/');
    
    if (isAdmin && isUserPath) {
        window.location.href = '../admin/index.html';
    } else if (!isAdmin && isAdminPath) {
        window.location.href = '../user/index.html';
    }
    
    window.currentUser = user;
    window.isAdminUser = isAdmin;
    window.dispatchEvent(new Event('authReady'));
});
