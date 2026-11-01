import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Đăng ký Service Worker để trình duyệt kích hoạt tính năng Cài đặt PWA 1-chạm
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Chỉ kích hoạt trên HTTPS hoặc localhost theo chuẩn W3C
    if (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => {
          console.log('[PWA] Service Worker registered successfully.');
        })
        .catch(err => {
          console.log('[PWA] Service Worker registration failed:', err);
        });
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
