# CI/CD Pipeline Documentation

This document describes the continuous integration and continuous deployment (CI/CD) pipeline for the Ebook Reader project.

## Overview

The pipeline automates testing, linting, building, and deployment of both backend and frontend components.

### Workflows

#### 1. Backend CI (`backend-ci.yml`)

**Triggers:** Push or PR to `main`/`develop` with changes in `backend/`

**Jobs:**

- **Lint and Test**
  - Runs on Node.js 18.x and 20.x
  - ESLint validation
  - Code formatting check (Prettier)
  - Unit tests (if configured)
  - Dependency security audit
  - Build validation

- **Security Scan**
  - Trivy vulnerability scanner
  - SARIF report upload

#### 2. Frontend CI (`frontend-ci.yml`)

**Triggers:** Push or PR to `main`/`develop` with changes in `frontend-app/`

**Jobs:**

- **Lint and Build**
  - Runs on Node.js 18.x and 20.x
  - TypeScript compilation check
  - ESLint validation
  - Code formatting check
  - Unit tests (if configured)
  - Security audit

- **Expo Build**
  - Validates EAS configuration
  - Checks app.json validity
  - Diagnoses Expo setup issues

#### 3. Deploy (`deploy.yml`)

**Triggers:** Manual workflow dispatch or push to `main`

**Jobs:**

- **Deploy Backend**
  - Full test suite
  - Artifact creation
  - Optional: SSH deployment, Docker build/push

- **Deploy Frontend**
  - Expo build for Android (and iOS if configured)
  - Optional: App store submission

- **Notification**
  - Slack notification with deployment status

## Setup Instructions

### 1. Install Dependencies

**Backend:**

```bash
cd backend
npm install
npm install --save-dev eslint prettier
```

**Frontend:**

```bash
cd frontend-app
npm install
npm install --save-dev eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react
```

### 2. Install Pre-commit Hooks

```bash
npm install husky lint-staged --save-dev
npx husky install
chmod +x .husky/pre-commit
```

This will automatically lint and format staged files before each commit.

### 3. GitHub Secrets Configuration

Add the following secrets to your GitHub repository (Settings → Secrets):

**For Deployment:**

- `DEPLOY_HOST` - Server hostname
- `DEPLOY_USER` - SSH user
- `DEPLOY_KEY` - SSH private key
- `DEPLOY_PORT` - SSH port

**For Docker Registry:**

- `DOCKER_REGISTRY` - Registry URL
- `DOCKER_USERNAME` - Registry username
- `DOCKER_PASSWORD` - Registry password

**For Mobile Builds:**

- `EAS_TOKEN` - Expo Account token (get from https://expo.dev/account/settings/tokens)

**For Notifications:**

- `SLACK_WEBHOOK` - Slack webhook URL for notifications

### 4. Configure Linting Rules

Edit these files to customize rules:

- `backend/.eslintrc.json` - Backend linting rules
- `frontend-app/.eslintrc.json` - Frontend linting rules
- `backend/.prettierrc.json` - Backend code formatting
- `frontend-app/.prettierrc.json` - Frontend code formatting

## Local Development

### Linting

**Backend:**

```bash
cd backend
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
npm run format:check  # Check formatting
npm run format        # Auto-format code
```

**Frontend:**

```bash
cd frontend-app
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
npm run format:check  # Check formatting
npm run format        # Auto-format code
```

### Pre-commit Hooks

Files will be automatically linted and formatted before commit:

```bash
git add .
git commit -m "Your message"  # Hooks run automatically
```

To bypass hooks (not recommended):

```bash
git commit --no-verify
```

### Security Audit

```bash
# Backend
cd backend && npm audit --audit-level=moderate

# Frontend
cd frontend-app && npm audit --audit-level=moderate
```

## Deployment Process

### Automatic Deployment

Pushing to `main` triggers:

1. All tests and linting
2. Build verification
3. Artifact creation
4. Deployment to production (if configured)

### Manual Deployment

Trigger via GitHub Actions UI:

1. Go to Actions → Deploy to Production
2. Click "Run workflow"
3. Select environment (staging/production)
4. Deployment starts automatically

### Deployment Checklist

Before deploying to production:

- [ ] All tests pass
- [ ] Code review approved
- [ ] Security audit clean
- [ ] Performance benchmarks acceptable
- [ ] Changelog updated
- [ ] Version bumped (if applicable)

## Troubleshooting

### Workflow Failures

**Linting errors:**

```bash
npm run lint:fix
npm run format
git add .
git commit -m "Fix linting"
```

**Dependency issues:**

```bash
npm ci  # Use clean install
npm audit fix
```

**Build failures:**

- Check Node.js version (18.x or 20.x required)
- Ensure all dependencies are installed
- Check for environment variable requirements

### Debugging Workflows

1. View workflow logs:
   - GitHub → Actions → Select workflow → Click run
2. Check specific job:
   - Click job name to see detailed logs
3. Common issues:
   - Missing secrets (check Settings → Secrets)
   - Outdated dependencies (run `npm ci`)
   - Cache issues (clear GitHub Actions cache if needed)

## Best Practices

### Code Review

- Use descriptive PR titles and descriptions
- Reference related issues
- Request reviews before merging
- Address all review comments

### Commit Messages

```
feat(backend): add rate limiting middleware
fix(frontend): correct auth token refresh
docs: update CI/CD documentation
style: format code according to prettier rules
test: add unit tests for validation middleware
```

### Branching Strategy

- `main` - Production code (protected branch)
- `develop` - Integration branch
- `feature/*` - Feature branches (PR required)
- `hotfix/*` - Production hotfixes

### Security

- Never commit secrets
- Use GitHub Secrets for sensitive data
- Enable branch protection rules
- Require status checks before merge
- Require code review approvals

## Monitoring

### GitHub Actions

- Monitor workflow runs: Actions tab
- Check job logs: Click workflow run
- View artifacts: In job summary

### Deployment Status

- Slack notifications (if configured)
- Check deployment logs
- Monitor application health

## Advanced Configuration

### Custom Deployment Target

Edit `deploy.yml` and uncomment deployment step:

```yaml
- name: Deploy to server
  uses: appleboy/ssh-action@master
  with:
    host: ${{ secrets.DEPLOY_HOST }}
    username: ${{ secrets.DEPLOY_USER }}
    key: ${{ secrets.DEPLOY_KEY }}
    port: ${{ secrets.DEPLOY_PORT }}
```

### Docker Deployment

Edit `deploy.yml` and uncomment Docker build:

```yaml
- name: Build Docker image
  uses: docker/build-push-action@v4
  with:
    context: ./backend
    push: true
    tags: |
      ${{ secrets.DOCKER_REGISTRY }}/ebook-reader-backend:latest
      ${{ secrets.DOCKER_REGISTRY }}/ebook-reader-backend:${{ github.sha }}
```

### Custom Test Commands

Add to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch"
  }
}
```

Then update workflow to use: `npm run test:coverage`

## Support

For issues with CI/CD:

1. Check workflow logs in GitHub Actions
2. Review this documentation
3. Check for common issues in troubleshooting section
4. Create an issue with workflow logs attached
