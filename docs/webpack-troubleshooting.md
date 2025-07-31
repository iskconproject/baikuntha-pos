# Webpack Cache Troubleshooting Guide

This guide helps resolve webpack cache corruption issues that can occur during development.

## Common Symptoms

- `TypeError: Cannot read properties of undefined (reading 'hasStartTime')`
- `[webpack.cache.PackFileCacheStrategy] Restoring pack failed`
- Development server fails to start or crashes unexpectedly
- Hot reload stops working
- Build artifacts become corrupted

## Quick Fixes

### 1. Clear Development Cache
```bash
pnpm clear:cache
```

### 2. Clean Development Start
```bash
pnpm dev:clean
```

### 3. Check Webpack Cache Health
```bash
pnpm webpack:check
```

### 4. Hard Reset (Nuclear Option)
```bash
pnpm reset:hard
```

## Root Causes

### Webpack Cache Corruption
- Occurs when webpack's persistent cache gets corrupted
- Common during rapid development cycles
- Can happen after system crashes or forced shutdowns

### PWA Service Worker Conflicts
- Service workers can interfere with webpack dev server
- Cached assets may conflict with hot reload
- PWA is disabled in development to prevent this

### TypeScript Build Info Issues
- `tsconfig.tsbuildinfo` can become stale
- Causes type checking inconsistencies
- Cleared automatically by our scripts

## Prevention Strategies

### 1. Webpack Cache Disabled in Development
Our `next.config.js` disables webpack cache in development:
```javascript
if (dev || process.env.WEBPACK_CACHE_DISABLED === 'true') {
  config.cache = false;
}
```

### 2. Environment Variable Control
Set `WEBPACK_CACHE_DISABLED=true` in `.env.local` to force disable caching.

### 3. Proper Watch Options
Webpack ignores unnecessary directories:
```javascript
config.watchOptions = {
  ignored: ['**/node_modules/**', '**/.next/**'],
};
```

## Advanced Troubleshooting

### Port Conflicts
If issues persist, try a different port:
```bash
pnpm dev -- -p 3001
```

### Browser Cache Issues
- Open in incognito mode
- Clear browser cache and service workers
- Disable browser extensions

### System-Level Issues
- Check available disk space
- Ensure no other processes are using port 3000
- Restart your development machine if needed

### Package Manager Issues
Clean package cache:
```bash
pnpm store prune
```

## File Structure Impact

### Cached Directories
- `.next/` - Next.js build cache
- `node_modules/.cache/` - Various tool caches
- `tsconfig.tsbuildinfo` - TypeScript incremental build info

### Generated Files
- `public/sw.js` - Service worker (PWA)
- `public/workbox-*.js` - Workbox files
- `public/manifest.json` - PWA manifest

## Monitoring Cache Health

Use our diagnostic tool:
```bash
pnpm webpack:check
```

This checks for:
- Empty cache files
- Corrupted pack files
- Configuration issues
- Recommended fixes

## When to Use Each Command

| Command | Use Case |
|---------|----------|
| `pnpm clear:cache` | Standard cache clearing |
| `pnpm dev:clean` | Clean start development |
| `pnpm webpack:check` | Diagnose cache issues |
| `pnpm reset:hard` | Complete environment reset |

## Prevention Best Practices

1. **Regular Cache Clearing**: Clear cache weekly during active development
2. **Proper Shutdown**: Always stop dev server with Ctrl+C, not force kill
3. **Environment Variables**: Use `.env.local` for consistent configuration
4. **Incognito Testing**: Test in incognito mode to avoid browser cache issues
5. **Port Management**: Use different ports for different projects

## Getting Help

If issues persist after following this guide:

1. Check the console for specific error messages
2. Try the nuclear option: `pnpm reset:hard`
3. Ensure your system has adequate resources (RAM, disk space)
4. Consider updating Node.js and pnpm to latest versions

Remember: Webpack cache issues are common in development and usually resolve with proper cache clearing.