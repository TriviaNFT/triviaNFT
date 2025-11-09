# PWA Quick Start Guide

## What's Been Implemented

TriviaNFT now has full Progressive Web App (PWA) support:

✅ **Web App Manifest** - App can be installed on devices  
✅ **Service Worker** - Offline support and caching  
✅ **Install Prompt** - Native install experience  
✅ **Update Notifications** - Automatic update detection  
✅ **Connection Status** - Offline/online indicators  
✅ **Analytics Tracking** - PWA event monitoring  

## Quick Test

### Desktop (Chrome/Edge)

1. Start the dev server:
   ```bash
   cd apps/web
   npm start
   ```

2. Open Chrome DevTools → Application tab
3. Check:
   - **Manifest**: Should show TriviaNFT details
   - **Service Workers**: Should show registered worker
   - **Cache Storage**: Should show cached assets

4. Look for install button in address bar (⊕ icon)

### Mobile (Chrome Android)

1. Visit the site on mobile Chrome
2. After 30 seconds, install banner should appear
3. Tap "Install" to add to home screen
4. Open from home screen - runs in standalone mode

### iOS Safari

1. Visit the site on iOS Safari
2. After 30 seconds, instructions banner appears
3. Follow steps: Share → Add to Home Screen
4. Open from home screen

## Key Components

### InstallPrompt
Shows install banner after 30 seconds:
```tsx
<InstallPrompt delay={30000} oncePerSession={true} />
```

### ServiceWorkerUpdate
Shows update notification when new version available:
```tsx
<ServiceWorkerUpdate />
```

### PWAStatus
Shows offline indicator:
```tsx
<PWAStatus showOnlyWhenOffline={true} />
```

### InstallButton
Compact install button for navbar:
```tsx
<InstallButton />
```

## Utilities

### Service Worker
```typescript
import { 
  registerServiceWorker,
  isServiceWorkerRegistered,
  clearServiceWorkerCache 
} from '@/utils/serviceWorker';

// Register
await registerServiceWorker({
  onSuccess: (reg) => console.log('Registered'),
  onUpdate: (reg) => console.log('Update available')
});

// Check status
const isRegistered = await isServiceWorkerRegistered();

// Clear cache
clearServiceWorkerCache();
```

### Install Prompt
```typescript
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

const { isInstallable, promptInstall } = useInstallPrompt();

if (isInstallable) {
  const accepted = await promptInstall();
}
```

### Analytics
```typescript
import { 
  trackPWAEvent,
  getPWAStatistics 
} from '@/utils/pwaAnalytics';

// Track event
trackPWAEvent('custom_event', { data: 'value' });

// Get stats
const stats = getPWAStatistics();
console.log(stats.appInstalled); // Number of installs
```

## Files Overview

```
apps/web/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── service-worker.js      # Service worker
│   └── index.html             # HTML with PWA meta tags
├── src/
│   ├── components/
│   │   ├── InstallPrompt.tsx  # Install UI
│   │   ├── PWAStatus.tsx      # Status indicators
│   │   └── ServiceWorkerUpdate.tsx  # Update UI
│   ├── hooks/
│   │   └── useInstallPrompt.ts  # Install hook
│   └── utils/
│       ├── serviceWorker.ts   # SW utilities
│       └── pwaAnalytics.ts    # Analytics
└── app/
    └── _layout.tsx            # PWA components added here
```

## Common Tasks

### Update Cache Version
Edit `public/service-worker.js`:
```javascript
const CACHE_VERSION = 'v1.0.1'; // Increment version
```

### Add URLs to Cache
```typescript
import { cacheUrls } from '@/utils/serviceWorker';

cacheUrls(['/new-page', '/assets/image.png']);
```

### Customize Install Delay
```tsx
<InstallPrompt delay={60000} /> // 60 seconds
```

### Disable Session Memory
```tsx
<InstallPrompt oncePerSession={false} />
```

## Testing Offline Mode

1. Open DevTools → Network tab
2. Select "Offline" from throttling dropdown
3. Reload page - should still work
4. Try navigating - cached pages load
5. API calls show stale data or error

## Debugging

### Service Worker Not Registering
- Check HTTPS (required in production)
- Check console for errors
- Verify `/service-worker.js` is accessible
- Try unregister and re-register

### Install Prompt Not Showing
- Wait 30 seconds after page load
- Check browser supports install prompt
- Verify manifest is valid
- Check DevTools → Application → Manifest

### Cache Not Updating
- Increment `CACHE_VERSION`
- Clear browser cache
- Use "Update on reload" in DevTools
- Check service worker is activated

## Production Checklist

- [ ] Replace placeholder icons with branded assets
- [ ] Test on multiple browsers and devices
- [ ] Run Lighthouse audit (target: PWA score 100)
- [ ] Configure CloudFront cache headers
- [ ] Enable HTTPS
- [ ] Test offline functionality
- [ ] Verify install prompt works
- [ ] Test update flow

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Install | ✓ | ✗ | Manual | ✓ |
| Offline | ✓ | ✓ | ✓ | ✓ |
| Updates | ✓ | ✓ | ✓ | ✓ |

## Resources

- [PWA_SETUP.md](./PWA_SETUP.md) - Detailed setup guide
- [PWA_IMPLEMENTATION.md](./PWA_IMPLEMENTATION.md) - Implementation details
- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [web.dev PWA](https://web.dev/progressive-web-apps/)

## Need Help?

1. Check DevTools → Application tab
2. Review service worker logs
3. Check PWA statistics: `getPWAStatistics()`
4. Clear cache and test fresh install
