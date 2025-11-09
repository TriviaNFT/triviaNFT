# Error Handling & User Feedback - Quick Reference

## Toast Notifications

### Basic Usage
```tsx
import { useToast } from '../contexts/ToastContext';

const MyComponent = () => {
  const toast = useToast();
  
  // Simple toasts
  toast.success('Success message');
  toast.error('Error message');
  toast.warning('Warning message');
  toast.info('Info message');
  
  // With custom duration (ms)
  toast.error('Error message', 7000);
  
  // With action button
  toast.showToast({
    type: 'warning',
    message: 'Unsaved changes',
    action: {
      label: 'Save',
      onPress: () => handleSave(),
    },
  });
};
```

### Game-Specific Toasts
```tsx
import { useGameToasts } from '../hooks/useGameToasts';

const MyComponent = () => {
  const gameToasts = useGameToasts();
  
  // Session toasts
  gameToasts.sessionStarted();
  gameToasts.sessionTimeout();
  gameToasts.sessionCompleted(8, false);
  gameToasts.dailyLimitReached('12:00 AM ET');
  gameToasts.cooldownActive(45);
  
  // Mint toasts
  gameToasts.mintEligibilityEarned('Science', false);
  gameToasts.mintStarted();
  gameToasts.mintSuccess('Science NFT #42');
  gameToasts.mintFailed('Transaction failed');
  
  // Forge toasts
  gameToasts.forgeStarted('Category Ultimate');
  gameToasts.forgeSuccess('Science Ultimate NFT');
  gameToasts.forgeFailed();
  
  // Network/API toasts
  gameToasts.networkError();
  gameToasts.apiError(error);
  
  // Wallet toasts
  gameToasts.walletConnected('Eternl');
  gameToasts.walletDisconnected();
};
```

## Loading States

### Loading Spinner
```tsx
import { LoadingSpinner } from '../components/ui';

<LoadingSpinner size="small" />
<LoadingSpinner size="medium" color="#6366f1" />
<LoadingSpinner size="large" />
```

### Skeleton Loaders
```tsx
import { Skeleton, SkeletonText, SkeletonCard, SkeletonList } from '../components/ui';

// Basic skeleton
<Skeleton width="100%" height={40} borderRadius={8} />

// Text skeleton
<SkeletonText lines={3} lineHeight={16} gap={8} lastLineWidth="70%" />

// Card skeleton
<SkeletonCard />

// List skeleton
<SkeletonList count={5} itemHeight={80} gap={12} />
```

### Progress Indicators
```tsx
import { ProgressIndicator, LinearProgress } from '../components/ui';

// Step progress
<ProgressIndicator
  steps={[
    { label: 'Validating', status: 'completed' },
    { label: 'Processing', status: 'active' },
    { label: 'Finalizing', status: 'pending' },
  ]}
/>

// Linear progress
<LinearProgress
  progress={75}
  label="Uploading..."
  showPercentage={true}
  color="#6366f1"
/>
```

### Loading Overlays
```tsx
import { LoadingOverlay, InlineLoading } from '../components/ui';

// Full-screen overlay
<LoadingOverlay
  visible={isLoading}
  message="Processing your request..."
  transparent={false}
/>

// Inline loading
<InlineLoading
  message="Loading data..."
  size="medium"
/>
```

## Error Boundary

### Basic Usage
```tsx
import { ErrorBoundary } from '../components/ErrorBoundary';

// Wrap your component
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### Custom Fallback
```tsx
<ErrorBoundary
  fallback={(error, resetError) => (
    <View>
      <Text>Error: {error.message}</Text>
      <Button onPress={resetError}>Try Again</Button>
    </View>
  )}
  onError={(error, errorInfo) => {
    console.error('Error caught:', error, errorInfo);
  }}
>
  <YourComponent />
</ErrorBoundary>
```

## Common Patterns

### API Call with Error Handling
```tsx
const handleApiCall = async () => {
  const gameToasts = useGameToasts();
  
  try {
    setLoading(true);
    const result = await apiRequest('/endpoint');
    gameToasts.success('Operation successful!');
    return result;
  } catch (error) {
    gameToasts.apiError(error);
  } finally {
    setLoading(false);
  }
};
```

### Long Operation with Progress
```tsx
const [progress, setProgress] = useState(0);
const [steps, setSteps] = useState([
  { label: 'Step 1', status: 'pending' },
  { label: 'Step 2', status: 'pending' },
  { label: 'Step 3', status: 'pending' },
]);

const handleLongOperation = async () => {
  // Update step 1
  setSteps(prev => [
    { ...prev[0], status: 'active' },
    ...prev.slice(1),
  ]);
  
  await step1();
  
  setSteps(prev => [
    { ...prev[0], status: 'completed' },
    { ...prev[1], status: 'active' },
    ...prev.slice(2),
  ]);
  
  // Continue for other steps...
};

return <ProgressIndicator steps={steps} />;
```

### Data Loading with Skeleton
```tsx
const MyComponent = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchData().then(setData).finally(() => setLoading(false));
  }, []);
  
  if (loading) {
    return <SkeletonList count={5} itemHeight={80} />;
  }
  
  return <DataList data={data} />;
};
```

## Toast Duration Guidelines

- **Success**: 3000ms (3 seconds)
- **Error**: 7000ms (7 seconds)
- **Warning**: 5000ms (5 seconds)
- **Info**: 3000ms (3 seconds)
- **Critical/Persistent**: 0 (manual dismiss)

## When to Use What

| Scenario | Component | Example |
|----------|-----------|---------|
| API call in progress | LoadingSpinner | Button loading state |
| Initial page load | Skeleton | Loading user profile |
| Long operation (>3s) | ProgressIndicator | Minting NFT |
| Blocking operation | LoadingOverlay | Processing payment |
| Success feedback | Toast (success) | "NFT minted!" |
| Error feedback | Toast (error) | "Network error" |
| Warning message | Toast (warning) | "Eligibility expiring" |
| Info message | Toast (info) | "Session started" |
| React error | ErrorBoundary | Component crash |

## Accessibility Notes

- All loading states should have appropriate ARIA labels
- Toast notifications should be announced to screen readers
- Error messages should be clear and actionable
- Loading overlays should prevent interaction during operations
- Progress indicators should show clear status updates
