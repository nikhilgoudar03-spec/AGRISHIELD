/**
 * AgriShield IndexedDB Offline Storage and Synchronization Engine
 * Provides secure offline authentication, telemetry caching, and sync queue.
 */

const DB_NAME = 'agrishield_offline_db';
const DB_VERSION = 1;

export interface CachedCredential {
  email: string;
  credentialHash: string; // SHA-256(email + ':' + password)
  user: any;
  role: string;
  token: string;
  lastOnlineLogin: string;
}

export interface CachedTelemetryItem {
  id: string; // e.g. 'latest_telemetry', 'devices', 'reports'
  data: any;
  cachedAt: string;
  offlineNotice: string;
}

export interface PendingSyncAction {
  id?: number;
  actionType: 'ACKNOWLEDGE_ALERT' | 'UPDATE_SETTINGS' | 'CREATE_FARMER_NOTE' | 'PUMP_COMMAND';
  endpoint: string;
  method: string;
  payload: any;
  createdAt: string;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
}

class OfflineStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase;

        // 1. Cached User Credentials for Secure Offline Login
        if (!db.objectStoreNames.contains('cached_credentials')) {
          db.createObjectStore('cached_credentials', { keyPath: 'email' });
        }

        // 2. Cached Telemetry & Reports
        if (!db.objectStoreNames.contains('cached_telemetry')) {
          db.createObjectStore('cached_telemetry', { keyPath: 'id' });
        }

        // 3. Pending Sync Queue (Offline-created actions)
        if (!db.objectStoreNames.contains('pending_sync_queue')) {
          const syncStore = db.createObjectStore('pending_sync_queue', {
            keyPath: 'id',
            autoIncrement: true,
          });
          syncStore.createIndex('status', 'status', { unique: false });
        }
      };

      request.onsuccess = (event: any) => resolve(event.target.result);
      request.onerror = (event: any) => reject(event.target.error);
    });

    return this.dbPromise;
  }

  // --- Cryptographic Hash for Offline Login ---
  private async hashCredentials(email: string, pass: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${email.toLowerCase().trim()}:${pass}:agrishield-offline-salt-2026`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // --- Offline Authentication Cache ---
  async cacheLoginSession(email: string, pass: string, user: any, token: string, role: string): Promise<void> {
    try {
      const db = await this.getDB();
      const credentialHash = await this.hashCredentials(email, pass);
      const record: CachedCredential = {
        email: email.toLowerCase().trim(),
        credentialHash,
        user,
        role,
        token,
        lastOnlineLogin: new Date().toISOString(),
      };

      const tx = db.transaction('cached_credentials', 'readwrite');
      tx.objectStore('cached_credentials').put(record);
      await new Promise((res) => (tx.oncomplete = res));
      console.log(`[AgriShield Offline] Cached credentials for ${email} for offline sign-in.`);
    } catch (e) {
      console.warn('[AgriShield Offline] Failed to cache login session:', e);
    }
  }

  async verifyOfflineLogin(email: string, pass: string): Promise<{ user: any; token: string; role: string } | null> {
    try {
      const db = await this.getDB();
      const cleanEmail = email.toLowerCase().trim();
      const hash = await this.hashCredentials(cleanEmail, pass);

      const tx = db.transaction('cached_credentials', 'readonly');
      const store = tx.objectStore('cached_credentials');
      const request = store.get(cleanEmail);

      const record: CachedCredential | null = await new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });

      if (record && record.credentialHash === hash) {
        console.log(`[AgriShield Offline] Offline authentication successful for ${cleanEmail}.`);
        return {
          user: record.user,
          token: record.token || `offline_token_${Date.now()}`,
          role: record.role,
        };
      }
    } catch (e) {
      console.warn('[AgriShield Offline] Offline login verification failed:', e);
    }
    return null;
  }

  // --- Telemetry & Sensor Caching (No fake data, timestamped offline truth) ---
  async saveTelemetry(id: string, data: any): Promise<void> {
    if (!data) return;
    try {
      const db = await this.getDB();
      const tx = db.transaction('cached_telemetry', 'readwrite');
      const item: CachedTelemetryItem = {
        id,
        data,
        cachedAt: new Date().toISOString(),
        offlineNotice: 'CACHED OFFLINE DATA • Stored during last online telemetry sync',
      };
      tx.objectStore('cached_telemetry').put(item);
      await new Promise((res) => (tx.oncomplete = res));
    } catch (e) {
      console.warn(`[AgriShield Offline] Failed to cache telemetry for ${id}:`, e);
    }
  }

  async getTelemetry(id: string): Promise<CachedTelemetryItem | null> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('cached_telemetry', 'readonly');
      const req = tx.objectStore('cached_telemetry').get(id);
      return await new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }

  // --- Offline Sync Queue ---
  async queueSyncAction(action: Omit<PendingSyncAction, 'id' | 'createdAt' | 'status'>): Promise<number> {
    const db = await this.getDB();
    const tx = db.transaction('pending_sync_queue', 'readwrite');
    const item: PendingSyncAction = {
      ...action,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
    };
    const req = tx.objectStore('pending_sync_queue').add(item);
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => reject(req.error);
    });
  }

  async getPendingSyncCount(): Promise<number> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('pending_sync_queue', 'readonly');
      const req = tx.objectStore('pending_sync_queue').count();
      return await new Promise((res) => {
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(0);
      });
    } catch {
      return 0;
    }
  }

  async getPendingSyncActions(): Promise<PendingSyncAction[]> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('pending_sync_queue', 'readonly');
      const req = tx.objectStore('pending_sync_queue').getAll();
      return await new Promise((res) => {
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => res([]);
      });
    } catch {
      return [];
    }
  }

  async removeSyncAction(id: number): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('pending_sync_queue', 'readwrite');
      tx.objectStore('pending_sync_queue').delete(id);
      await new Promise((res) => (tx.oncomplete = res));
    } catch (e) {
      console.warn('[AgriShield Offline] Failed to delete sync action:', e);
    }
  }
}

export const offlineStorage = new OfflineStorageService();
