import { useEffect, useState } from 'react';
import { SyncProvider } from '@coreknot/sync-client/react';
import { registerSW } from 'virtual:pwa-register';
import SwUpdatePrompt from './SwUpdatePrompt';
import OfflineSyncIndicator from './OfflineSyncIndicator';
import { bootstrapLocalFirst, connectSyncEngine } from '../../lib/localFirstBootstrap';
import { markChunkRecoveryComplete } from '../../utils/chunkRecovery';

export default function LocalFirstRoot({ children }) {
  const [needRefresh, setNeedRefresh] = useState(null);
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    bootstrapLocalFirst().catch((err) => {
      if (import.meta.env.DEV) console.warn('[local-first] bootstrap failed', err);
    });
  }, []);

  useEffect(() => {
    const scheduleRegister = () => {
      const updateSW = registerSW({
        immediate: false,
        onNeedRefresh() {
          setNeedRefresh(() => updateSW);
        },
        onOfflineReady() {
          setOfflineReady(true);
          markChunkRecoveryComplete();
        },
        onRegisteredSW(_swUrl, registration) {
          markChunkRecoveryComplete();
          registration?.active?.addEventListener?.('error', (event) => {
            console.error('[sw] runtime error', event?.message);
          });
        },
      });
    };

    let idleId;
    let timeoutId;
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(scheduleRegister, { timeout: 4000 });
    } else {
      timeoutId = window.setTimeout(scheduleRegister, 1500);
    }
    return () => {
      if (idleId != null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, []);

  const connect = async () => connectSyncEngine();

  return (
    <SyncProvider connect={connect}>
      {children}
      <OfflineSyncIndicator />
      <SwUpdatePrompt
        onNeedRefresh={needRefresh}
        offlineReady={offlineReady}
      />
    </SyncProvider>
  );
}
