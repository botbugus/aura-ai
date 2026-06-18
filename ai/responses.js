export const QUICK_REPLIES = {
  GREETING: [
    'Halo! Ada yang bisa saya bantu?',
    'Hai! Senang bertemu dengan Anda.',
    'Selamat datang! Saya siap membantu Anda.',
    'Hello! Apa kabar? Ada yang bisa saya bantu?'
  ],
  FAREWELL: [
    'Sampai jumpa! Jangan ragu untuk kembali. 😊',
    'Senang bisa membantu! Semoga hari Anda menyenangkan. ✨',
    'Terima kasih sudah menggunakan AuraAI. Sampai nanti! 👋'
  ],
  ENCOURAGEMENT: [
    'Pertanyaan yang bagus! Mari saya bantu.',
    'Saya mengerti. Berikut penjelasannya:',
    'Tentu, saya akan bantu dengan senang hati!',
    'Menarik! Mari kita bahas lebih detail.'
  ]
};

export function getRandomReply(category) {
  const replies = QUICK_REPLIES[category];
  if (!replies) return '';
  return replies[Math.floor(Math.random() * replies.length)];
}
