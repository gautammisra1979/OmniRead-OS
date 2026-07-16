/**
 * Flight Recorder — Append-Only State Rebuild Engine
 *
 * Event-sourcing pattern for crash recovery and state replay.
 * Every critical mutation (catalog, cart, wallet, challenge progress)
 * appends a transactional entry. Every 50 entries, a consolidated
 * baseline snapshot is written and the delta log is purged.
 */

export type ActionType =
  | 'CATALOG_MUTATION'
  | 'CART_UPDATE'
  | 'CREDIT_WALLET_CHANGE'
  | 'CHALLENGE_PROGRESS_SAVE';

export interface TransactionEntry {
  id: string;
  timestamp: string;
  actionType: ActionType;
  payload: unknown;
}

export interface StateSnapshot {
  capturedAt: string;
  catalog: unknown;
  cart: unknown;
  wallet: unknown;
  loyalty: unknown;
  challengeProgress: unknown;
}

const LOG_KEY = 'omnimedia_transaction_log';
const SNAPSHOT_KEY = 'omnimedia_state_snapshot';
const MILESTONE = 50;

/* ─── ID generation ─── */

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `txn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ─── Log read/write ─── */

function getLog(): TransactionEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? (JSON.parse(raw) as TransactionEntry[]) : [];
  } catch {
    return [];
  }
}

function saveLog(entries: TransactionEntry[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOG_KEY, JSON.stringify(entries));
  }
}

/* ─── Snapshot read/write ─── */

export function getStateSnapshot(): StateSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as StateSnapshot) : null;
  } catch {
    return null;
  }
}

function saveStateSnapshot(snapshot: StateSnapshot): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  }
}

/* ─── Collect current application state for snapshot ─── */

function collectStateSnapshot(): StateSnapshot {
  let catalog = null;
  let cart = null;
  let wallet = null;
  let loyalty = null;
  let challengeProgress = null;

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('omnimedos_catalog');
      if (raw) catalog = JSON.parse(raw);
    } catch { /* ignore */ }

    try {
      const raw = localStorage.getItem('omnimedia_cart');
      if (raw) cart = JSON.parse(raw);
    } catch { /* ignore */ }

    try {
      const raw = localStorage.getItem('omnimedia_wallet');
      if (raw) wallet = JSON.parse(raw);
    } catch { /* ignore */ }

    try {
      const raw = localStorage.getItem('omnimedia_loyalty_ledger');
      if (raw) loyalty = JSON.parse(raw);
    } catch { /* ignore */ }

    try {
      const raw = localStorage.getItem('omnimedos_progress');
      if (raw) challengeProgress = JSON.parse(raw);
    } catch { /* ignore */ }
  }

  return {
    capturedAt: new Date().toISOString(),
    catalog,
    cart,
    wallet,
    loyalty,
    challengeProgress,
  };
}

/* ─── Milestone check: every 50 entries, snapshot + purge ─── */

function checkMilestone(log: TransactionEntry[]): void {
  if (log.length >= MILESTONE) {
    const snapshot = collectStateSnapshot();
    saveStateSnapshot(snapshot);
    // Purge delta log, keep only the last entry as a sentinel
    saveLog([]);
  }
}

/* ─── Public API ─── */

/**
 * Append a transaction entry to the flight log.
 * Call this from every critical mutation in the app.
 */
export function appendTransaction(
  actionType: ActionType,
  payload: unknown,
): void {
  const entry: TransactionEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    actionType,
    payload,
  };
  const log = getLog();
  log.push(entry);
  saveLog(log);
  checkMilestone(log);
}

/**
 * Replay all pending transactions on top of the last snapshot.
 * Returns the count of replayed entries, or 0 if nothing to replay.
 */
export function replayTransactions(): number {
  const snapshot = getStateSnapshot();
  const log = getLog();

  if (log.length === 0) return 0;

  // Restore snapshot state first
  if (snapshot) {
    if (snapshot.catalog !== null && typeof window !== 'undefined') {
      localStorage.setItem('omnimedos_catalog', JSON.stringify(snapshot.catalog));
    }
    if (snapshot.cart !== null && typeof window !== 'undefined') {
      localStorage.setItem('omnimedia_cart', JSON.stringify(snapshot.cart));
    }
    if (snapshot.wallet !== null && typeof window !== 'undefined') {
      localStorage.setItem('omnimedia_wallet', JSON.stringify(snapshot.wallet));
    }
    if (snapshot.loyalty !== null && typeof window !== 'undefined') {
      localStorage.setItem('omnimedia_loyalty_ledger', JSON.stringify(snapshot.loyalty));
    }
    if (snapshot.challengeProgress !== null && typeof window !== 'undefined') {
      localStorage.setItem('omnimedos_progress', JSON.stringify(snapshot.challengeProgress));
    }
  }

  // Replay each transaction in order
  for (const entry of log) {
    replaySingleTransaction(entry);
  }

  // After replay, take a fresh snapshot and clear the log
  const freshSnapshot = collectStateSnapshot();
  saveStateSnapshot(freshSnapshot);
  saveLog([]);

  return log.length;
}

/**
 * Replay a single transaction entry against localStorage.
 */
function replaySingleTransaction(entry: TransactionEntry): void {
  if (typeof window === 'undefined') return;

  switch (entry.actionType) {
    case 'CATALOG_MUTATION': {
      // payload is the full catalog array after mutation
      if (entry.payload && Array.isArray(entry.payload)) {
        localStorage.setItem('omnimedos_catalog', JSON.stringify(entry.payload));
      }
      break;
    }
    case 'CART_UPDATE': {
      // payload is the full cart state after mutation
      if (entry.payload && typeof entry.payload === 'object') {
        localStorage.setItem('omnimedia_cart', JSON.stringify(entry.payload));
      }
      break;
    }
    case 'CREDIT_WALLET_CHANGE': {
      // payload could be wallet state or loyalty ledger
      if (entry.payload && typeof entry.payload === 'object') {
        if ('credits' in (entry.payload as Record<string, unknown>)) {
          localStorage.setItem('omnimedia_wallet', JSON.stringify(entry.payload));
        }
        if ('transaction_id' in (entry.payload as Record<string, unknown>) || Array.isArray(entry.payload)) {
          localStorage.setItem('omnimedia_loyalty_ledger', JSON.stringify(entry.payload));
        }
      }
      break;
    }
    case 'CHALLENGE_PROGRESS_SAVE': {
      // payload is the full progress entries array
      if (entry.payload && Array.isArray(entry.payload)) {
        localStorage.setItem('omnimedos_progress', JSON.stringify(entry.payload));
      }
      break;
    }
  }
}

/**
 * Boot-time crash recovery check.
 * Returns true if recovery was performed, false otherwise.
 */
export function checkAndRecover(): { recovered: boolean; count: number } {
  if (typeof window === 'undefined') return { recovered: false, count: 0 };

  // Set crash flag — will be set to 'true' on clean unload
  sessionStorage.setItem('omnimedia_clean_exit', 'false');

  const cleanExit = sessionStorage.getItem('omnimedia_clean_exit_previous');
  const hadCrash = cleanExit === 'false';

  if (hadCrash) {
    const count = replayTransactions();
    return { recovered: count > 0, count };
  }

  return { recovered: false, count: 0 };
}

/**
 * Mark clean exit on beforeunload.
 * Call this during app boot to set up the listener.
 */
export function setupCleanExitHandler(): void {
  if (typeof window === 'undefined') return;

  // Read previous value before overwriting
  sessionStorage.setItem(
    'omnimedia_clean_exit_previous',
    sessionStorage.getItem('omnimedia_clean_exit') ?? 'true',
  );

  window.addEventListener('beforeunload', () => {
    sessionStorage.setItem('omnimedia_clean_exit', 'true');
  });
}
