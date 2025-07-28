# Development Guide

## Environment Configuration

### Setting up Environment Variables

1. **Copy the example file**:
   ```bash
   cp .env.local.example .env.local
   ```

2. **Update the values** in `.env.local` with your actual configuration:
   - Replace `your-app-secret-key-for-jwt-signing` with a secure random string
   - Update database URLs and tokens as needed
   - Adjust timeout and hash round values if necessary

3. **Never commit `.env.local`**:
   - The `.env.local` file contains sensitive information and should never be committed
   - It's already included in `.gitignore` to prevent accidental commits
   - Use `.env.local.example` as a template for other developers

### Environment Variables Explained

#### Database Configuration
- `DATABASE_URL`: Local SQLite database file path
- `TURSO_DATABASE_URL`: Turso cloud database URL for sync
- `TURSO_AUTH_TOKEN`: Authentication token for Turso database

#### Application Configuration
- `APP_SECRET`: Secret key used for JWT token signing (keep this secure!)
- `APP_URL`: Base URL of the application

#### Authentication Configuration
- `PIN_HASH_ROUNDS`: Number of bcrypt hash rounds (12 is recommended)
- `SESSION_TIMEOUT_MINUTES`: Session timeout in minutes (30 is default)

#### PWA Configuration
- `PWA_ENABLED`: Enable/disable PWA features

#### Development Configuration
- `NODE_ENV`: Environment mode (development/production)
- `ANALYZE`: Enable bundle analysis

## Security Notes

- **Never share your `.env.local` file** or commit it to version control
- **Use strong, unique values** for `APP_SECRET` and database tokens
- **Rotate secrets regularly** in production environments
- **Use different secrets** for different environments (dev/staging/prod)

## Common Issues

### `.env.local` showing in git status
If `.env.local` appears in `git status`, it means it was previously committed. Remove it from tracking:

```bash
git rm --cached .env.local
git commit -m "Remove .env.local from tracking"
```

The file will remain locally but won't be tracked by git anymore.