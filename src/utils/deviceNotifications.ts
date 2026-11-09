/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// TAWZOON NEXUS — Mobile & Desktop Push Notification Engine
// Triggers real-time system notifications on the phone's top notification bar (even in background)
// for Account Approval, Order Status, Cash/Wallet Updates, and System Broadcasts.

import { playNotificationSound } from './soundEffects.js';

export interface DevicePushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  data?: any;
}

const PERMISSION_STORAGE_KEY = 'tawzoon_device_push_enabled';

/**
 * Checks if the Notification API is supported by the user's browser/device
 */
export function isDevicePushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Gets the current device notification permission state ('granted' | 'denied' | 'default')
 */
export function getDevicePushPermission(): NotificationPermission {
  if (!isDevicePushSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Checks if user explicitly enabled push notifications in settings and browser allowed it
 */
export function isDevicePushEnabled(): boolean {
  if (!isDevicePushSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  const saved = localStorage.getItem(PERMISSION_STORAGE_KEY);
  return saved !== 'false';
}

/**
 * Requests device push notification permission from browser/OS
 */
export async function requestDevicePushPermission(): Promise<boolean> {
  if (!isDevicePushSupported()) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem(PERMISSION_STORAGE_KEY, 'true');
      
      // Trigger instant welcome push notification to confirm success to user
      triggerDevicePushNotification({
        title: '🔔 তাওজুন নোটিফিকেশন চালু হয়েছে!',
        body: 'এখন থেকে একাউন্ট এক্সেপ্ট, অর্ডার ও ব্যালেন্সের সকল আপডেট আপনার মোবাইলের নোটিফিকেশন বারে সাথে সাথে পাবেন।',
        tag: 'tawzoon-welcome',
        url: '/?portal=reseller&tab=notifications'
      });
      return true;
    } else {
      localStorage.setItem(PERMISSION_STORAGE_KEY, 'false');
      return false;
    }
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
    return false;
  }
}

/**
 * Disables push notification preference
 */
export function disableDevicePushPermission() {
  localStorage.setItem(PERMISSION_STORAGE_KEY, 'false');
}

/**
 * Triggers a real-time device push notification directly on the phone's top notification bar
 */
export async function triggerDevicePushNotification(payload: DevicePushPayload): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // 1. Play crystal clear audio chime tone
  try {
    playNotificationSound();
  } catch {}

  // 2. Check if device push is supported and granted
  if (!isDevicePushSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  if (localStorage.getItem(PERMISSION_STORAGE_KEY) === 'false') return false;

  const title = payload.title || 'TAWZOON NEXUS';
  const options: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    body: payload.body || '',
    icon: payload.icon || '/pwa-192x192.png?v=5',
    badge: payload.badge || '/favicon.png?v=5',
    tag: payload.tag || `tawzoon-notif-${Date.now()}`,
    data: payload.data || { url: payload.url || '/?portal=reseller&tab=notifications' },
    vibrate: [200, 100, 200, 100, 200],
    renotify: true,
  };

  try {
    // Attempt Service Worker registration notification first (works when phone is locked or app in background)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, options);
        return true;
      }
    }
  } catch (e) {
    console.warn('Service worker showNotification fallback:', e);
  }

  // Fallback to standard web Notification constructor
  try {
    const notif = new Notification(title, options);
    notif.onclick = function (e) {
      e.preventDefault();
      window.focus();
      if (payload.url) {
        window.location.href = payload.url;
      }
      notif.close();
    };
    return true;
  } catch (err) {
    console.warn('Standard Notification fallback error:', err);
    return false;
  }
}
