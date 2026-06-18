export class SecurityFilter {
  constructor() {
    this.blockedPatterns = this.initializeBlockedPatterns();
  }

  initializeBlockedPatterns() {
    return [
      {
        pattern: /\b(exploit|payload|backdoor|shellcode|shell\s*code|buffer\s*overflow|zero\s*day|0day|rce|remote\s*code\s*execution)\b/i,
        category: 'exploit_creation', severity: 'critical'
      },
      {
        pattern: /\b(sql\s*inject|sql\s*injection|xss|csrf|cross\s*site|cross-site|command\s*inject|path\s*traversal|directory\s*traversal)\b/i,
        category: 'web_attack', severity: 'critical'
      },
      {
        pattern: /\b(malware|ransomware|trojan|worm|rootkit|spyware|adware|keylogger|botnet|virus)\s+(buat|create|generate|develop|tulis|write|script|code|program|bikin|bangun)\b/i,
        category: 'malware_creation', severity: 'critical'
      },
      {
        pattern: /\b(buat|create|generate|tulis|write|bikin)\s+(virus|malware|ransomware|trojan|worm|spyware)\b/i,
        category: 'malware_creation', severity: 'critical'
      },
      {
        pattern: /\b(hack|hacking|retas|meretas|bobol|membobol|nyusup|menyusup|terobos|menerobos)\s+(password|sandi|akun|account|sistem|system|jaringan|network|server|database|website|web|aplikasi|app)\b/i,
        category: 'unauthorized_access', severity: 'high'
      },
      {
        pattern: /\b(brute\s*force|dictionary\s*attack|credential\s*stuff|password\s*crack|password\s*guess|password\s*list)\b/i,
        category: 'credential_attack', severity: 'high'
      },
      {
        pattern: /\b(cara|how\s*to|tutorial|panduan|guide|langkah|step)\s+(hack|hacking|retas|meretas|bobol|membobol|nyusup|menyusup)\b/i,
        category: 'hacking_tutorial', severity: 'high'
      },
      {
        pattern: /\b(phish|phishing|scam|penipuan|social\s*engineer|pretext|baiting|fake\s*login|fake\s*page|clone\s*page)\b/i,
        category: 'social_engineering', severity: 'high'
      },
      {
        pattern: /\b(curi|steal|scrape|harvest|ambil|collect|kumpulkan)\s+(data|password|kredensial|credential|personal|pribadi|identity|identitas|informasi|information)\b/i,
        category: 'data_theft', severity: 'high'
      },
      {
        pattern: /\b(ddos|denial\s*of\s*service|dos\s*attack|flood\s*attack|network\s*attack|packet\s*storm|traffic\s*flood)\b/i,
        category: 'ddos_attack', severity: 'critical'
      },
      {
        pattern: /\b(bypass|circumvent|kelabui|lewati|skip|abaikan)\s+(security|keamanan|firewall|filter|block|blokir|protection|perlindungan|authentication|otentikasi|verification|verifikasi)\b/i,
        category: 'security_bypass', severity: 'high'
      },
      {
        pattern: /\b(dark\s*web|darknet|black\s*market|pasar\s*gelap|illegal\s*service|underground\s*forum|carding|cvv|fullz)\b/i,
        category: 'illegal_services', severity: 'high'
      }
    ];
  }

  scanInput(input) {
    if (!input || typeof input !== 'string') return { safe: true, threats: [] };

    const threats = [];
    const lowerInput = input.toLowerCase();
    
    for (const rule of this.blockedPatterns) {
      if (rule.pattern.test(lowerInput)) {
        const matched = lowerInput.match(rule.pattern);
        threats.push({
          category: rule.category,
          severity: rule.severity,
          matchedText: matched ? matched[0] : ''
        });
      }
    }

    return {
      safe: threats.length === 0,
      threats,
      hasCritical: threats.some(t => t.severity === 'critical')
    };
  }

  generateBlockingResponse(threats) {
    const criticalThreats = threats.filter(t => t.severity === 'critical');
    
    if (criticalThreats.length > 0) {
      return `🚫 **PERMINTAAN DITOLAK - PELANGGARAN KEAMANAN SERIUS**

Saya mendeteksi permintaan Anda mengandung upaya eksploitasi atau aktivitas berbahaya.

**Saya AuraAI dirancang untuk:**
✅ Membantu tugas produktif dan kreatif
✅ Memberikan edukasi dan pembelajaran positif
✅ Mendukung pengembangan perangkat lunak etis
✅ Menganalisis data secara legal dan aman

**Saya TIDAK AKAN PERNAH membantu:**
❌ Membuat exploit, malware, atau virus
❌ Meretas sistem atau mencuri data
❌ Membantu aktivitas ilegal
❌ Mengeksploitasi kerentanan keamanan
❌ Social engineering atau phishing

Silakan ajukan pertanyaan yang bersifat etis dan produktif.`;
    }

    return `⚠️ **PERMINTAAN TIDAK DAPAT DIPROSES**

Permintaan Anda mengandung elemen yang melanggar kebijakan keamanan AuraAI.

Silakan ajukan pertanyaan lain yang dapat saya bantu dengan senang hati.`;
  }
}

export default SecurityFilter;
