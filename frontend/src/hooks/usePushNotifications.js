'use client';

import { useState } from 'react';
import useAuthStore from '@/store/useAuthStore';

async function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * Hook for managing Web Push subscription.
 * Returns { supported, subscribed, subscribe, unsubscribe, loading }
 */
export function usePushNotifications() {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;

  const subscribe = async () => {
    if (!supported || !token) return;
    setLoading(true);
    try {
      // Get VAPID public key
      const { vapidPublicKey } = await fetch('/api/push/vapid-key').then((r) => r.json());
      if (!vapidPublicKey) { console.warn('VAPID key not configured'); return; }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: await urlBase64ToUint8Array(vapidPublicKey),
      });

      const subJson = sub.toJSON();
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(subJson),
      });
      setSubscribed(true);
    } catch (err) {
      console.error('Push subscribe error:', err);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!supported || !token) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ endpoint }),
        });
      }
      setSubscribed(false);
    } catch (err) {
      console.error('Push unsubscribe error:', err);
    } finally {
      setLoading(false);
    }
  };

  return { supported, subscribed, subscribe, unsubscribe, loading };
}
