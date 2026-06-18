// ─── AuraAI Application Entry Point ──────────────────────────────────────────
import { ParticleSystem } from './particles.js';
import { ChatManager } from './chat.js';

class AuraAIApp {
  constructor() {
    this.particleSystem = null;
    this.chatManager = null;
  }

  init() {
    console.log('🚀 AuraAI starting...');
    
    // Initialize particle background
    this.particleSystem = new ParticleSystem('particle-canvas');
    
    // Initialize chat manager AFTER DOM is ready
    this.chatManager = new ChatManager();
    
    console.log('%c✅ AuraAI %cready', 'color: #a78bfa; font-size: 14px;', 'color: #888;');
  }
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new AuraAIApp();
    app.init();
  });
} else {
  const app = new AuraAIApp();
  app.init();
}

export default AuraAIApp;
