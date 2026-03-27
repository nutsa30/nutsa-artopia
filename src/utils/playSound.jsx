// utils/playSound.js
export function playSound(src, volume = 0.5) {
  const audio = new Audio(src);
  audio.volume = volume;
  audio.play().catch(() => {}); // iOS-ზე უსაფრთხოდ
}
