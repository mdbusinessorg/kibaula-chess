'use client';

import { useEffect } from 'react';

/** Regista o service worker para cache offline (apenas http/https — não no Capacitor). */
export default function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (!/^https?:$/.test(window.location.protocol)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}
