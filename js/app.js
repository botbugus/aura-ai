import { ParticleSystem } from './particles.js';
import { ChatManager } from './chat.js';

class AuraAIApp {
  constructor() {
    this.particleSystem = null;
    this.chatManager = null;
  }

  async init() {
    this.particleSystem = new ParticleSystem('particle-canvas');
    this.chatManager = new ChatManager();
    
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    mediaQuery.addEventListener('change', (e) => {
      if (!e.matches) {
        document.getElementById('sidebar')?.classList.remove('open');
        document.getElementById('sidebar-overlay')?.classList.remove('show');
      }
    });
    
    console.log('%c🌟 AuraAI %cinitialized', 'color: #a78bfa; font-size: 16px;', 'color: #888;');
  }
}

document.addEventListener('DOMContentLoaded', () => new AuraAIApp().init());

export default AuraAIApp;
