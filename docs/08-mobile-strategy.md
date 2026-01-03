# Mobile-First Strategy

## Philosophy

BookKeep is built mobile-first because store owners:
- Are always on the move
- Need to record transactions immediately
- Don't have time to sit at a computer
- Often work in areas with poor connectivity

**Design principle**: If it doesn't work great on mobile, it shouldn't ship.

---

## Technology Stack

### Mobile Framework

**React Native + Expo**

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| Framework | React Native | Code sharing with web (React/Next.js), large ecosystem |
| Tooling | Expo | Faster development, OTA updates, easier deployment |
| Navigation | React Navigation | Native feel, stack/tab/drawer support |
| State | TanStack Query + Zustand | Server state + minimal client state |
| Forms | React Hook Form | Performance, validation |
| UI | NativeWind (Tailwind) | Design system consistency with web |

### Alternative Consideration

```
Flutter was considered but rejected because:
- Team expertise is in React/TypeScript
- Code sharing with Next.js web app
- Larger React Native ecosystem
- Better integration with existing tesseract-hub patterns
```

---

## App Architecture

### Project Structure

```
apps/mobile/
├── app/                      # Expo Router (file-based routing)
│   ├── (auth)/              # Auth screens (login, register)
│   ├── (tabs)/              # Main tab navigation
│   │   ├── index.tsx        # Dashboard
│   │   ├── sales.tsx        # Sales tab
│   │   ├── add.tsx          # Quick add (FAB)
│   │   ├── reports.tsx      # Reports tab
│   │   └── more.tsx         # Settings & more
│   ├── invoice/
│   │   ├── [id].tsx         # Invoice detail
│   │   └── create.tsx       # Create invoice
│   ├── customer/
│   │   ├── [id].tsx         # Customer detail
│   │   └── create.tsx       # Add customer
│   └── _layout.tsx          # Root layout
├── components/
│   ├── ui/                  # Base UI components
│   ├── forms/               # Form components
│   ├── cards/               # Card components
│   └── sheets/              # Bottom sheets
├── lib/
│   ├── api/                 # API client
│   ├── storage/             # Local storage
│   ├── sync/                # Offline sync
│   └── utils/               # Utilities
├── hooks/                   # Custom hooks
├── stores/                  # Zustand stores
└── constants/               # App constants
```

### Navigation Structure

```
App
├── Auth Stack (unauthenticated)
│   ├── Welcome
│   ├── Login (Phone/Email)
│   ├── OTP Verification
│   └── Business Setup
│
└── Main Stack (authenticated)
    ├── Tab Navigator
    │   ├── Home (Dashboard)
    │   ├── Sales
    │   ├── Add (FAB - opens sheet)
    │   ├── Reports
    │   └── More (Settings)
    │
    └── Modal Stacks
        ├── Create Invoice
        ├── Create Transaction
        ├── Customer Detail
        ├── Invoice Detail
        ├── Reports Detail
        └── Settings Screens
```

---

## Offline-First Architecture

### Core Principle

Every action works offline. Data syncs when connectivity is available.

### Local Database

**SQLite with DrizzleORM**

```typescript
// Schema definition
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  localId: text('local_id').notNull(),
  serverIdPending: integer('server_id').default(1), // 1 = pending sync

  transactionDate: text('transaction_date').notNull(),
  transactionType: text('transaction_type').notNull(),
  partyId: text('party_id'),
  partyName: text('party_name'),

  amount: real('amount').notNull(),
  paymentMode: text('payment_mode'),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  syncedAt: text('synced_at'),
  syncStatus: text('sync_status').default('pending'),
});

export const syncQueue = sqliteTable('sync_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(), // create, update, delete
  payload: text('payload').notNull(), // JSON
  attempts: integer('attempts').default(0),
  lastAttempt: text('last_attempt'),
  createdAt: text('created_at').notNull(),
});
```

### Sync Strategy

```typescript
// Sync Manager
class SyncManager {
  private isOnline: boolean = false;
  private syncInProgress: boolean = false;

  async initialize() {
    // Monitor network status
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected;
      if (this.isOnline) {
        this.triggerSync();
      }
    });
  }

  async triggerSync() {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;

    try {
      // 1. Push local changes
      await this.pushChanges();

      // 2. Pull server changes
      await this.pullChanges();

      // 3. Resolve conflicts
      await this.resolveConflicts();

    } finally {
      this.syncInProgress = false;
    }
  }

  async pushChanges() {
    const pendingItems = await db.select()
      .from(syncQueue)
      .orderBy(syncQueue.createdAt);

    for (const item of pendingItems) {
      try {
        await this.syncItem(item);
        await db.delete(syncQueue)
          .where(eq(syncQueue.id, item.id));
      } catch (error) {
        await this.handleSyncError(item, error);
      }
    }
  }

  async pullChanges() {
    const lastSync = await this.getLastSyncTime();

    const response = await api.sync.pull({
      since: lastSync,
      entities: ['transactions', 'invoices', 'customers']
    });

    await this.applyServerChanges(response.changes);
    await this.setLastSyncTime(response.syncToken);
  }
}
```

### Conflict Resolution

```typescript
type ConflictResolution = 'server_wins' | 'client_wins' | 'merge' | 'ask_user';

interface ConflictResolver {
  resolve(
    serverVersion: any,
    clientVersion: any,
    entityType: string
  ): Promise<any>;
}

class DefaultConflictResolver implements ConflictResolver {
  async resolve(serverVersion: any, clientVersion: any, entityType: string) {
    // Default: Server wins for financial data
    if (['transactions', 'invoices'].includes(entityType)) {
      // For financial records, server is source of truth
      return serverVersion;
    }

    // For other data: Last write wins
    if (new Date(serverVersion.updatedAt) > new Date(clientVersion.updatedAt)) {
      return serverVersion;
    }
    return clientVersion;
  }
}
```

### Offline Indicators

```typescript
// UI Component
function SyncStatus() {
  const { isOnline, pendingCount, lastSyncTime, isSyncing } = useSync();

  if (!isOnline) {
    return (
      <View style={styles.offlineBanner}>
        <CloudOffIcon />
        <Text>Offline - Changes will sync when connected</Text>
      </View>
    );
  }

  if (isSyncing) {
    return (
      <View style={styles.syncingIndicator}>
        <ActivityIndicator size="small" />
        <Text>Syncing...</Text>
      </View>
    );
  }

  if (pendingCount > 0) {
    return (
      <View style={styles.pendingIndicator}>
        <CloudSyncIcon />
        <Text>{pendingCount} pending</Text>
      </View>
    );
  }

  return (
    <View style={styles.syncedIndicator}>
      <CheckCircleIcon />
      <Text>Synced {formatRelative(lastSyncTime)}</Text>
    </View>
  );
}
```

---

## Performance Optimization

### Image Optimization

```typescript
// Use expo-image for optimized image loading
import { Image } from 'expo-image';

function ProductImage({ uri }) {
  return (
    <Image
      source={{ uri }}
      style={styles.image}
      contentFit="cover"
      transition={200}
      cachePolicy="memory-disk"
      placeholder={blurhash}
    />
  );
}
```

### List Virtualization

```typescript
// Use FlashList for large lists
import { FlashList } from '@shopify/flash-list';

function TransactionList({ transactions }) {
  return (
    <FlashList
      data={transactions}
      renderItem={({ item }) => <TransactionCard transaction={item} />}
      estimatedItemSize={80}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={Divider}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
    />
  );
}
```

### Lazy Loading

```typescript
// Lazy load heavy screens
const Reports = React.lazy(() => import('./screens/Reports'));
const Invoice = React.lazy(() => import('./screens/Invoice'));

// With suspense
<Suspense fallback={<LoadingScreen />}>
  <Reports />
</Suspense>
```

### Memory Management

```typescript
// Cleanup subscriptions
useEffect(() => {
  const subscription = eventEmitter.addListener('sync', handleSync);

  return () => {
    subscription.remove();
  };
}, []);

// Cancel API requests
useEffect(() => {
  const controller = new AbortController();

  fetchData({ signal: controller.signal });

  return () => controller.abort();
}, []);
```

---

## Native Features Integration

### Camera (Receipt Capture)

```typescript
import * as ImagePicker from 'expo-image-picker';

async function captureReceipt() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    alert('Camera permission required');
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsEditing: true,
  });

  if (!result.canceled) {
    await uploadReceipt(result.assets[0].uri);
  }
}
```

### Biometric Authentication

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

async function authenticateWithBiometrics() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (!hasHardware || !isEnrolled) {
    return false;
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Authenticate to access BookKeep',
    fallbackLabel: 'Use PIN',
  });

  return result.success;
}
```

### Push Notifications

```typescript
import * as Notifications from 'expo-notifications';

// Configure
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register
async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: EXPO_PROJECT_ID,
  });

  await api.notifications.registerDevice(token.data);
}

// Handle received notification
useEffect(() => {
  const subscription = Notifications.addNotificationReceivedListener(
    notification => {
      handleNotification(notification);
    }
  );

  return () => subscription.remove();
}, []);
```

### Share & Export

```typescript
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

async function shareInvoice(invoice) {
  // Generate PDF
  const html = generateInvoiceHTML(invoice);
  const { uri } = await Print.printToFileAsync({ html });

  // Share
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Invoice ${invoice.invoiceNumber}`,
    });
  }
}
```

### Haptic Feedback

```typescript
import * as Haptics from 'expo-haptics';

function handleButtonPress() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  // ... action
}

function handleSuccess() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

function handleError() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}
```

---

## App Security

### Secure Storage

```typescript
import * as SecureStore from 'expo-secure-store';

// Store sensitive data
async function storeToken(key: string, value: string) {
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
}

// Retrieve
async function getToken(key: string) {
  return await SecureStore.getItemAsync(key);
}

// Delete
async function deleteToken(key: string) {
  await SecureStore.deleteItemAsync(key);
}
```

### App Lock

```typescript
// Auto-lock after inactivity
const LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

function useAppLock() {
  const [isLocked, setIsLocked] = useState(false);
  const lastActiveRef = useRef(Date.now());

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        const elapsed = Date.now() - lastActiveRef.current;
        if (elapsed > LOCK_TIMEOUT) {
          setIsLocked(true);
        }
      } else if (state === 'background') {
        lastActiveRef.current = Date.now();
      }
    });

    return () => subscription.remove();
  }, []);

  const unlock = async () => {
    const success = await authenticateWithBiometrics();
    if (success) {
      setIsLocked(false);
    }
  };

  return { isLocked, unlock };
}
```

### Certificate Pinning

```typescript
// For production API calls
const secureClient = axios.create({
  baseURL: API_URL,
  // Certificate pinning handled by native module
});
```

---

## Testing Strategy

### Unit Tests

```typescript
// Jest + React Native Testing Library
import { render, fireEvent } from '@testing-library/react-native';

describe('TransactionCard', () => {
  it('displays amount correctly', () => {
    const { getByText } = render(
      <TransactionCard
        transaction={{ amount: 15000, type: 'sale' }}
      />
    );

    expect(getByText('₹15,000.00')).toBeTruthy();
  });

  it('shows green for income', () => {
    const { getByTestId } = render(
      <TransactionCard
        transaction={{ amount: 15000, type: 'sale' }}
      />
    );

    const amount = getByTestId('amount');
    expect(amount.props.style).toContainEqual({ color: '#4CAF50' });
  });
});
```

### E2E Tests

```typescript
// Detox
describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should login with OTP', async () => {
    await element(by.id('phone-input')).typeText('9876543210');
    await element(by.id('request-otp-button')).tap();

    await waitFor(element(by.id('otp-input'))).toBeVisible();

    await element(by.id('otp-input')).typeText('123456');
    await element(by.id('verify-button')).tap();

    await waitFor(element(by.id('dashboard'))).toBeVisible();
  });
});
```

---

## Deployment

### Over-The-Air Updates

```typescript
// Using expo-updates
import * as Updates from 'expo-updates';

async function checkForUpdates() {
  try {
    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch (error) {
    console.error('Update check failed:', error);
  }
}
```

### App Store Deployment

```yaml
# EAS Build Configuration (eas.json)
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "your-app-id"
      },
      "android": {
        "serviceAccountKeyPath": "./service-account.json",
        "track": "production"
      }
    }
  }
}
```

### Release Channels

| Channel | Purpose | Update Type |
|---------|---------|-------------|
| development | Dev testing | Instant OTA |
| preview | Internal testing | Instant OTA |
| staging | QA testing | Instant OTA |
| production | Public release | App store review |

---

## Platform-Specific Considerations

### iOS

- App Tracking Transparency for analytics
- Apple Sign In requirement
- Push notification certificates
- TestFlight for beta testing

### Android

- Material Design 3 guidelines
- Adaptive icons
- In-app updates (Play Core)
- Multi-window support
- Back handler customization

### Cross-Platform Consistency

```typescript
// Platform-specific styling
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
  }),
});
```
