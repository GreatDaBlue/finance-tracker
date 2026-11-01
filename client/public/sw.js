// Service Worker for Tiền Đâu Rồi (PWA)
const CACHE_NAME = 'tiendauroi-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Chỉ xử lý các yêu cầu GET của ứng dụng
  if (event.request.method !== 'GET') return;

  // Bỏ qua các API endpoint backend để dữ liệu luôn mới nhất
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
