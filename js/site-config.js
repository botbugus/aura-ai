// site-config.js - Dynamic site name and logo loader
// Include this script on all pages to load site configuration from Firebase

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Firebase configuration (same as main.js)
const firebaseConfig = {
  apiKey: "AIzaSyBd0EP4-q2xAudz8bSVQBgqx6NrpYW5nio",
  authDomain: "lotg-8c061.firebaseapp.com",
  projectId: "lotg-8c061",
  storageBucket: "lotg-8c061.firebasestorage.app",
  messagingSenderId: "929582718987",
  appId: "1:929582718987:web:e2e10e0983da75b815670e",
  measurementId: "G-YKZQC2E3XK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Load and apply site configuration
function applySiteConfig() {
    const siteConfigRef = ref(db, 'site_config');

    onValue(siteConfigRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Update site name in all elements with class 'site-name'
            if (data.siteName) {
                document.querySelectorAll('.site-name').forEach(el => {
                    el.textContent = data.siteName;
                });
                // Update page title
                const titleParts = document.title.split(' - ');
                if (titleParts.length > 1) {
                    document.title = `${data.siteName} - ${titleParts.slice(1).join(' - ')}`;
                } else {
                    document.title = data.siteName;
                }
            }

            // Update logo in all elements with class 'site-logo'
            if (data.logoUrl) {
                document.querySelectorAll('.site-logo').forEach(el => {
                    if (el.tagName === 'IMG') {
                        el.src = data.logoUrl;
                    }
                });
            }
        }
    });
}

// Run when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySiteConfig);
} else {
    applySiteConfig();
}
