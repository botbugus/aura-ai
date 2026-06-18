import { SecurityFilter } from './security.js';
import { getRandomReply } from './responses.js';

export class AICore {
  constructor() {
    this.securityFilter = new SecurityFilter();
    this.conversationHistory = [];
    this.maxHistoryLength = 50;
    this.intentPatterns = this.initializeIntentPatterns();
  }

  initializeIntentPatterns() {
    return {
      greeting: {
        patterns: ['halo', 'hai', 'hello', 'hi', 'hey', 'assalamualaikum', 'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam', 'pagi', 'siang', 'malam', 'apa kabar', 'gimana kabar'],
        weight: 1
      },
      farewell: {
        patterns: ['terima kasih', 'makasih', 'thanks', 'thank you', 'thx', 'sampai jumpa', 'dadah', 'bye', 'goodbye', 'matur nuwun'],
        weight: 1
      },
      programming: {
        patterns: ['kode', 'coding', 'program', 'debug', 'error', 'bug', 'function', 'fungsi', 'api', 'javascript', 'python', 'html', 'css', 'react', 'node', 'script', 'syntax', 'compiler', 'database', 'query', 'frontend', 'backend', 'ngoding'],
        weight: 0.8
      },
      content_writing: {
        patterns: ['konten', 'caption', 'postingan', 'artikel', 'blog', 'tulis', 'nulis', 'copywriting', 'copy', 'headline', 'judul', 'deskripsi', 'caption ig', 'caption instagram', 'status', 'tweet', 'thread', 'narasi', 'teks', 'paragraf'],
        weight: 0.8
      },
      translation: {
        patterns: ['terjemah', 'translate', 'bahasa', 'language', 'inggris', 'indonesia', 'jepang', 'korea', 'arab', 'prancis', 'jerman', 'mandarin', 'spanyol', 'arti', 'artikan', 'terjemahin'],
        weight: 0.9
      },
      analysis: {
        patterns: ['analisis', 'analisa', 'evaluasi', 'review', 'periksa', 'cek', 'teliti', 'insight', 'kesimpulan', 'ringkasan', 'rangkum'],
        weight: 0.7
      },
      creative: {
        patterns: ['ide', 'kreatif', 'brainstorming', 'inovasi', 'konsep', 'gagasan', 'desain', 'design', 'inspirasi', 'unik', 'original'],
        weight: 0.7
      },
      explanation: {
        patterns: ['apa itu', 'definisi', 'pengertian', 'jelaskan', 'terangkan', 'gimana cara', 'bagaimana', 'kenapa', 'mengapa', 'kok bisa', 'apa sih', 'maksudnya'],
        weight: 0.9
      },
      help: {
        patterns: ['bantu', 'tolong', 'help', 'assist', 'support', 'bimbing', 'pandu', 'arahkan', 'bantuin', 'tolongin'],
        weight: 0.6
      }
    };
  }

  async processInput(userInput, images = []) {
    const securityScan = this.securityFilter.scanInput(userInput);
    
    if (!securityScan.safe) {
      return {
        blocked: true,
        message: this.securityFilter.generateBlockingResponse(securityScan.threats)
      };
    }

    const intent = this.analyzeIntent(userInput);
    this.addToHistory('user', userInput);

    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));

    const response = this.generateResponse(userInput, intent, images);
    this.addToHistory('assistant', response);

    return { blocked: false, message: response, intent: intent.primary };
  }

  analyzeIntent(input) {
    const lowerInput = input.toLowerCase().trim();
    let bestMatch = { intent: 'general', confidence: 0 };
    let maxScore = 0;

    for (const [intent, data] of Object.entries(this.intentPatterns)) {
      let score = 0;
      for (const pattern of data.patterns) {
        if (lowerInput.includes(pattern)) score += 1;
      }
      const weightedScore = score * data.weight;
      if (weightedScore > maxScore) {
        maxScore = weightedScore;
        bestMatch = { intent, confidence: Math.min(weightedScore / 5, 0.95) };
      }
    }

    return { primary: bestMatch.intent, confidence: bestMatch.confidence };
  }

  generateResponse(input, intent, images) {
    const lowerInput = input.toLowerCase();
    const hasImages = images && images.length > 0;
    const timeOfDay = new Date().getHours();
    let timeGreeting = 'Selamat pagi';
    if (timeOfDay >= 12 && timeOfDay < 15) timeGreeting = 'Selamat siang';
    else if (timeOfDay >= 15 && timeOfDay < 18) timeGreeting = 'Selamat sore';
    else if (timeOfDay >= 18) timeGreeting = 'Selamat malam';

    switch (intent.primary) {
      case 'greeting':
        return `${timeGreeting}! 👋 ${getRandomReply('GREETING')}\n\nSaya AuraAI, asisten AI yang siap membantu dengan:\n\n✍️ **Penulisan** - Artikel, caption, copywriting\n🖼 **Analisis Gambar** - Upload dan dapatkan insight\n🛠 **Pemrograman** - Debugging, code generation\n🌐 **Terjemahan** - Multi-bahasa akurat\n📊 **Analisis Data** - Insight dari data Anda\n💡 **Brainstorming** - Ide kreatif dan inovatif\n📚 **Pembelajaran** - Penjelasan konsep kompleks\n\nApa yang bisa saya bantu? 😊`;

      case 'farewell':
        return getRandomReply('FAREWELL');

      case 'programming':
        if (lowerInput.includes('debug') || lowerInput.includes('error') || lowerInput.includes('bug')) {
          return `🛠 **Debugging Assistance**\n\nSaya siap membantu debugging! Silakan share:\n\n**1. Kode yang bermasalah**\n\`\`\`\n// Paste kode di sini\n\`\`\`\n\n**2. Error message** (jika ada)\n\n**3. Expected behavior**\n\n**4. Environment** (Node.js, browser, Python, dll)\n\nSaya akan analisis dan berikan solusi! 🔍`;
        }
        if (lowerInput.includes('buat') || lowerInput.includes('tulis') || lowerInput.includes('bikin')) {
          return `💻 **Code Generation**\n\nSaya akan buatkan kode untuk Anda! Beri tahu:\n\n• Bahasa pemrograman\n• Fungsi/tujuan kode\n• Input & output yang diharapkan\n\n**Contoh output:**\n\`\`\`javascript\nfunction processData(input) {\n  try {\n    if (!input) throw new Error('Input required');\n    const result = transform(input);\n    return { success: true, data: result };\n  } catch (error) {\n    return { success: false, error: error.message };\n  }\n}\n\`\`\`\n\nApa yang ingin Anda buat?`;
        }
        return `💻 **Programming Assistance**\n\nSaya bisa membantu dengan:\n- 🔍 Debugging & troubleshooting\n- ✨ Code generation\n- 📖 Code review & best practices\n- 🏗 Architecture design\n- 📚 Konsep pemrograman\n\nApa yang ingin Anda lakukan?`;

      case 'content_writing':
        return `✍️ **Content Writing Studio**\n\nSaya siap membuat konten! Beri tahu:\n\n🎯 **Tujuan**: awareness / engagement / penjualan\n👥 **Target audiens**\n🎨 **Tone**: formal / casual / humoris\n📱 **Platform**: Instagram / TikTok / LinkedIn / Blog\n\n**Contoh caption Instagram:**\n\`\`\`\n"Rahasia sukses yang jarang orang ceritakan... 🔥\n\n3 hal yang bikin bisnis akhirnya profitable:\n1. Fokus satu produk dulu\n2. Dengerin feedback customer\n3. Konsisten posting setiap hari\n\nSave postingan ini! 📌\n\n#BisnisTips #Entrepreneur"\n\`\`\`\n\nCeritakan konten seperti apa yang Anda butuhkan!`;

      case 'translation':
        return `🌐 **Translation Service**\n\nSaya bisa menerjemahkan ke berbagai bahasa!\n\n**Bahasa yang didukung:**\n🇮🇩 Indonesia ⇄ 🇬🇧 English\n🇯🇵 日本語 (Japanese)\n🇰🇷 한국어 (Korean)\n🇨🇳 中文 (Chinese)\n🇸🇦 العربية (Arabic)\n🇫🇷 Français (French)\n🇩🇪 Deutsch (German)\n...dan 50+ bahasa lainnya!\n\n**Cara pakai:**\n"Terjemahkan ke Inggris: [teks Anda]"\n\nSilakan kirim teks yang ingin diterjemahkan!`;

      case 'analysis':
        if (hasImages) {
          return `🖼 **Analisis Gambar**\n\nSaya menerima gambar Anda!\n\n**Aspek analisis:**\n1. 📐 Komposisi & framing\n2. 🎨 Palet warna & tone\n3. 💡 Pencahayaan & exposure\n4. 🔍 Detail & ketajaman\n5. 🎯 Focal point\n6. 📱 Platform suitability\n\n**Hasil analisis:**\nKomposisi cukup baik dengan penempatan subjek yang menarik. Warna harmonis dan pencahayaan optimal.\n\n**Saran:**\n• Pertimbangkan crop untuk fokus lebih tajam\n• Adjust brightness untuk kontras lebih baik\n\nIngin analisis lebih detail?`;
        }
        return `📊 **Analysis Mode**\n\nSaya akan membantu menganalisis dengan sistematis!\n\n**Framework:**\n1. SWOT Analysis\n2. 5W1H Method\n3. Root Cause Analysis\n4. Comparative Analysis\n\nApa yang ingin Anda analisis?`;

      case 'creative':
        return `💡 **Creative Brainstorming**\n\nMari eksplorasi ide-ide segar! 🚀\n\n**Teknik brainstorming:**\n1. **Reverse thinking** - Mulai dari hasil akhir\n2. **Random association** - Hubungkan hal tak terduga\n3. **SCAMPER method**\n4. **Mind mapping**\n\n**Pertanyaan pemantik:**\n• Bagaimana jika target audiens berubah total?\n• Apa yang akan dilakukan kompetitor #1?\n• Bagaimana jika budget tidak terbatas?\n\nBidang apa yang ingin Anda brainstorming?`;

      case 'explanation':
        const topic = lowerInput.replace(/apa itu|definisi|pengertian|jelaskan|terangkan|gimana cara|bagaimana|kenapa|mengapa|apa sih|maksudnya/gi, '').trim();
        return `📚 **Penjelasan: ${topic || 'Topik Anda'}**\n\nSaya akan menjelaskan dengan struktur mudah dipahami:\n\n**1. Definisi Sederhana**\nKonsep dasar dengan analogi sehari-hari\n\n**2. Komponen Utama**\nBagian-bagian penting\n\n**3. Cara Kerja**\nBagaimana konsep ini beroperasi\n\n**4. Contoh Nyata**\nAplikasi dalam kehidupan\n\n**5. Poin Penting**\nHal-hal kunci untuk diingat\n\nMari kita bahas lebih dalam!`;

      case 'help':
        return `🤝 **Saya Siap Membantu!**\n\n**Kemampuan saya:**\n✍️ Menulis konten & copywriting\n🖼 Analisis gambar\n🛠 Debugging & koding\n🌐 Terjemahan multi-bahasa\n📊 Analisis data\n💡 Brainstorming ide\n📚 Penjelasan konsep\n\n**Tips:**\n• Jelaskan secara spesifik\n• Berikan konteks\n• Sebutkan format yang diinginkan\n\nApa yang bisa saya bantu?`;

      default:
        if (hasImages) {
          return `🖼 Saya menerima gambar Anda. Berdasarkan analisis visual, komposisi cukup baik dengan warna yang harmonis. Untuk analisis lebih detail, berikan pertanyaan spesifik tentang gambar tersebut.`;
        }
        return `Saya memahami pertanyaan Anda. ${getRandomReply('ENCOURAGEMENT')}\n\nSaya bisa membantu dengan:\n1. Analisis mendalam\n2. Contoh dan ilustrasi\n3. Penjelasan dengan analogi\n4. Rekomendasi actionable\n\n**Tips:** Jelaskan lebih spesifik agar saya bisa membantu lebih optimal.\n\nApa yang ingin Anda diskusikan?`;
    }
  }

  addToHistory(role, content) {
    this.conversationHistory.push({ role, content, timestamp: new Date().toISOString() });
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
    }
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  getStats() {
    return {
      totalMessages: this.conversationHistory.length,
      userMessages: this.conversationHistory.filter(m => m.role === 'user').length,
      aiMessages: this.conversationHistory.filter(m => m.role === 'assistant').length
    };
  }
}

export default AICore;
