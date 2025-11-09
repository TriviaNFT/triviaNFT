# PWA Setup Documentation

## Overview

TriviaNFT is configured as a Progressive Web App (PWA) to provide an app-like experience on mobile and desktop browsers.

## Features

### Web App Manifest
- **Location**: `public/manifest.json`
- **Display Mode**: Standalone (hides browser UI)
- **Theme Color**: #1a1a2e (dark blue)
- **Icons**: 192x192 and 512x512 PNG icons
- **Shortcuts**: Quick access to Play, Leaderboard, and NFTs

### Service Worker
- **Location**: `public/service-worker.js`
- **Caching Strategy**: Cache-first for static assets, network-first for API calls
- **Offline Support**: Offline shell with cached assets
- **Update Strategy**: Automatic update on new version detection

### Install Prompt
- **Component**: `src/components/InstallPrompt.tsx`
- **Behavior**: Shows install banner on supported browsers
- **Analytics**: Tracks installation events

## Icon Assets

Current icons are SVG placeholders. For production:

1. Replace `public/icon-192.svg` with a 192x192 PNG
2. Replace `public/icon-512.svg` with a 512x512 PNG
3. Update `public/favicon.ico` with branded favicon
4. Consider adding maskable icons for Android

### Icon Requirements

- **192x192**: Minimum size for Android home screen
- **512x512**: Required for splash screens
- **Maskable**: Icons should have safe zone (80% of canvas)
- **Format**: PNG with transparency

## Testing PWA Features

### Desktop (Chrome/Edge)
1. Open DevTools → Application → Manifest
2. Verify manifest loads correctly
3. Check "Add to Home Screen" option in browser menu

### Mobile (Chrome Android)
1. Visit site on mobile Chrome
2. Look for "Add to Home Screen" prompt
3. Install and verify standalone mode

### iOS Safari
1. Visit site on iOS Safari
2. Tap Share → Add to Home Screen
3. Verify icon and splash screen

## Lighthouse PWA Audit

Run Lighthouse audit to verify PWA compliance:

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse https://your-domain.com --view
```

Target scores:
- PWA: 100
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 95+

## Service Worker Debugging

### Chrome DevTools
1. Open DevTools → Application → Service Workers
2. Check registration status
3. Use "Update on reload" during development
4. Clear cache and unregister for testing

### Common Issues

**Service worker not registering:**
- Ensure HTTPS (required for SW)
- Check console for registration errors
- Verify service-worker.js is accessible

**Cache not updating:**
- Increment CACHE_VERSION in service-worker.js
- Clear browser cache
- Use "Skip waiting" in DevTools

**Install prompt not showing:**
- Ensure manifest is valid
- Check installability criteria in DevTools
- Some browsers require user engagement first

## Deployment Considerations

### CloudFront Configuration
- Set proper MIME types for manifest.json
- Configure caching headers for service worker
- Enable HTTPS (required for PWA)

### S3 Bucket
- Upload all public/ files to S3
- Set correct Content-Type headers
- Enable CORS if needed

### Cache Headers
```
service-worker.js: Cache-Control: no-cache
manifest.json: Cache-Control: max-age=3600
icons: Cache-Control: max-age=31536000
```

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Manifest | ✓ | ✓ | ✓ | ✓ |
| Service Worker | ✓ | ✓ | ✓ | ✓ |
| Install Prompt | ✓ | ✗ | ✗ | ✓ |
| Shortcuts | ✓ | ✗ | ✗ | ✓ |

## Future Enhancements

- [ ] Add splash screens for iOS
- [ ] Implement background sync for offline actions
- [ ] Add push notifications for game events
- [ ] Create maskable icons for better Android support
- [ ] Add screenshots to manifest for richer install experience
