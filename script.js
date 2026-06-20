let currentUser = null;
let userLinks = {};
let userSocial = {};
let userProfile = {};

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadUserData();
    } else {
        window.location.href = 'login.html';
    }
});

function loadUserData() {
    db.ref('users/' + currentUser.uid).once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            if (data) {
                userLinks = data.links || {};
                userSocial = data.social || {};
                userProfile = data.profile || {};
                renderLinks();
                renderSocial();
                loadProfileForm();
            }
        });
}

function saveProfile() {
    const displayName = document.getElementById('display-name').value;
    const bio = document.getElementById('bio').value;
    const photoURL = document.getElementById('photo-url').value;

    db.ref('users/' + currentUser.uid + '/profile').set({
        displayName: displayName,
        bio: bio,
        photoURL: photoURL
    }).then(() => {
        alert('Profil disimpan');
        loadUserData();
    });
}

function loadProfileForm() {
    document.getElementById('display-name').value = userProfile.displayName || '';
    document.getElementById('bio').value = userProfile.bio || '';
    document.getElementById('photo-url').value = userProfile.photoURL || '';
}

function showAddLinkForm() {
    document.getElementById('add-link-form').style.display = 'block';
}

function cancelAddLink() {
    document.getElementById('add-link-form').style.display = 'none';
    document.getElementById('link-title').value = '';
    document.getElementById('link-url').value = '';
    document.getElementById('link-icon').value = '';
}

function addLink() {
    const title = document.getElementById('link-title').value;
    const url = document.getElementById('link-url').value;
    const icon = document.getElementById('link-icon').value;
    
    if (!title || !url) {
        alert('Judul dan URL wajib diisi');
        return;
    }

    const linkId = Date.now().toString();
    userLinks[linkId] = { title, url, icon };
    
    db.ref('users/' + currentUser.uid + '/links').set(userLinks)
        .then(() => {
            cancelAddLink();
            renderLinks();
        });
}

function deleteLink(linkId) {
    delete userLinks[linkId];
    db.ref('users/' + currentUser.uid + '/links').set(userLinks)
        .then(() => renderLinks());
}

function renderLinks() {
    const container = document.getElementById('user-links');
    container.innerHTML = '';
    
    Object.entries(userLinks).forEach(([id, link]) => {
        const div = document.createElement('div');
        div.className = 'link-item';
        div.innerHTML = `
            <span>${link.icon || '🔗'} ${link.title}</span>
            <a href="${link.url}" target="_blank">${link.url}</a>
            <button onclick="deleteLink('${id}')">Hapus</button>
        `;
        container.appendChild(div);
    });
}

function showAddSocialForm() {
    const platform = prompt('Nama platform (contoh: Instagram, Twitter):');
    if (!platform) return;
    const url = prompt('URL platform:');
    if (!url) return;
    
    userSocial[platform.toLowerCase()] = { platform, url };
    db.ref('users/' + currentUser.uid + '/social').set(userSocial)
        .then(() => renderSocial());
}

function deleteSocial(platform) {
    delete userSocial[platform];
    db.ref('users/' + currentUser.uid + '/social').set(userSocial)
        .then(() => renderSocial());
}

function renderSocial() {
    const container = document.getElementById('social-links');
    container.innerHTML = '';
    
    Object.entries(userSocial).forEach(([key, social]) => {
        const div = document.createElement('div');
        div.className = 'social-item';
        div.innerHTML = `
            <span>${social.platform}</span>
            <a href="${social.url}" target="_blank">Buka</a>
            <button onclick="deleteSocial('${key}')">Hapus</button>
        `;
        container.appendChild(div);
    });
}

function toggleBeranda() {
    const beranda = document.getElementById('beranda-section');
    if (beranda.style.display === 'none' || !beranda.style.display) {
        renderPublicPreview();
        beranda.style.display = 'block';
    } else {
        beranda.style.display = 'none';
    }
}

function closeBeranda() {
    document.getElementById('beranda-section').style.display = 'none';
}

function renderPublicPreview() {
    const container = document.getElementById('public-preview');
    container.innerHTML = '';
    
    if (userProfile.photoURL) {
        const img = document.createElement('img');
        img.src = userProfile.photoURL;
        img.className = 'profile-photo-preview';
        container.appendChild(img);
    }
    
    if (userProfile.displayName) {
        const h3 = document.createElement('h3');
        h3.textContent = userProfile.displayName;
        container.appendChild(h3);
    }
    
    if (userProfile.bio) {
        const p = document.createElement('p');
        p.textContent = userProfile.bio;
        container.appendChild(p);
    }
    
    Object.values(userLinks).forEach(link => {
        const a = document.createElement('a');
        a.href = link.url;
        a.target = '_blank';
        a.className = 'public-link';
        a.textContent = `${link.icon || ''} ${link.title}`;
        container.appendChild(a);
    });
    
    const socialDiv = document.createElement('div');
    socialDiv.className = 'public-social';
    Object.values(userSocial).forEach(social => {
        const a = document.createElement('a');
        a.href = social.url;
        a.target = '_blank';
        a.className = 'social-icon';
        a.textContent = social.platform;
        socialDiv.appendChild(a);
    });
    container.appendChild(socialDiv);
}

function logout() {
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    });
}
