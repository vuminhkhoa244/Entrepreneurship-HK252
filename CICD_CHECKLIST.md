# CI/CD Setup Checklist

## Pre-Setup

- [ ] Repository initialized with Git
- [ ] GitHub repository created
- [ ] Team members added as collaborators
- [ ] Branch protection rules planned

## 1. Local Environment Setup

### Install Global Tools

- [ ] Node.js 20.x installed (`node --version`)
- [ ] npm 10.x or higher (`npm --version`)
- [ ] Git configured (`git config --list`)

### Workspace Setup

- [ ] Clone/pull latest code
- [ ] Install backend dependencies: `cd backend && npm install`
- [ ] Install frontend dependencies: `cd frontend-app && npm install`
- [ ] Copy `.env.example` to `.env` (Backend)

## 2. Code Quality Tools

### Backend

- [ ] `.eslintrc.json` created
- [ ] `.prettierrc.json` created
- [ ] `.eslintignore` created
- [ ] ESLint installed: `npm install --save-dev eslint prettier`
- [ ] Test lint works: `npm run lint`
- [ ] Test format: `npm run format`

### Frontend

- [ ] `.eslintrc.json` created
- [ ] `.prettierrc.json` created
- [ ] `.eslintignore` created
- [ ] ESLint/Prettier installed: `npm install --save-dev eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react`
- [ ] Test lint works: `npm run lint`
- [ ] Test format: `npm run format`

## 3. Pre-commit Hooks

- [ ] Husky installed: `npm install husky --save-dev`
- [ ] Initialize husky: `npx husky install`
- [ ] `.husky/pre-commit` file created
- [ ] Made pre-commit executable: `chmod +x .husky/pre-commit`
- [ ] `.lintstagedrc.json` created
- [ ] Test pre-commit hook: `git add . && git commit -m "test"`

## 4. GitHub Repository Configuration

### Repository Settings

- [ ] Go to Settings → Branches
- [ ] Enable branch protection for `main`
  - [ ] Require pull request reviews (at least 1)
  - [ ] Dismiss stale pull request approvals
  - [ ] Require status checks to pass
  - [ ] Require branches to be up to date
  - [ ] Include administrators

### GitHub Secrets

- [ ] Go to Settings → Secrets and variables → Actions
- [ ] Add `EAS_TOKEN` (from https://expo.dev/account/settings/tokens)
- [ ] Add `SLACK_WEBHOOK` (optional, for notifications)
- [ ] Add deployment secrets if needed:
  - [ ] `DEPLOY_HOST`
  - [ ] `DEPLOY_USER`
  - [ ] `DEPLOY_KEY`
  - [ ] `DEPLOY_PORT`

## 5. GitHub Actions Workflows

### Backend CI

- [ ] `.github/workflows/backend-ci.yml` created
- [ ] Workflow file syntax valid (test on GitHub)
- [ ] Workflow triggers on backend changes
- [ ] All jobs pass on push to `main`

### Frontend CI

- [ ] `.github/workflows/frontend-ci.yml` created
- [ ] Workflow file syntax valid
- [ ] Workflow triggers on frontend changes
- [ ] All jobs pass on push to `main`

### Deployment

- [ ] `.github/workflows/deploy.yml` created
- [ ] Manual trigger tested
- [ ] Secrets properly referenced
- [ ] Notifications configured (if using Slack)

## 6. Documentation

- [ ] `CI_CD_GUIDE.md` created
- [ ] `TESTING_GUIDE.md` created
- [ ] `DEPLOYMENT_GUIDE.md` created
- [ ] `GITHUB_ACTIONS_GUIDE.md` created
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` created
- [ ] `.gitignore` updated

## 7. Testing (Optional but Recommended)

### Backend

- [ ] Jest installed (optional): `npm install --save-dev jest`
- [ ] Test files created (e.g., `__tests__/auth.test.js`)
- [ ] Test script added to `package.json`
- [ ] Tests pass locally

### Frontend

- [ ] Testing library installed (optional): `npm install --save-dev @testing-library/react-native`
- [ ] Test files created
- [ ] Test script added to `package.json`
- [ ] Tests pass locally

## 8. First Deployment

- [ ] All code quality checks pass locally
- [ ] Create feature branch: `git checkout -b feature/initial-setup`
- [ ] Make a test commit
- [ ] Push to GitHub: `git push origin feature/initial-setup`
- [ ] Create Pull Request
- [ ] Verify all CI checks pass
- [ ] Get code review and approval
- [ ] Merge PR to `main`
- [ ] Verify deployment workflow runs (check Actions tab)

## 9. Monitoring & Maintenance

### GitHub Actions

- [ ] Set up workflow notifications
- [ ] Monitor action minutes usage (Settings → Billing)
- [ ] Review workflow logs regularly
- [ ] Update actions to latest versions quarterly

### Code Quality

- [ ] Review linting results
- [ ] Address any security warnings
- [ ] Monitor test coverage (if configured)
- [ ] Ensure all team members understand workflows

### Deployment

- [ ] Verify deployment succeeded
- [ ] Check application health
- [ ] Monitor error logs
- [ ] Prepare rollback if needed

## 10. Team Training

- [ ] Share CI/CD_GUIDE.md with team
- [ ] Explain workflow overview
- [ ] Demo local development workflow
- [ ] Explain how to read GitHub Actions logs
- [ ] Review commit message conventions
- [ ] Document any team-specific customizations

## 11. Post-Setup Optimization (Optional)

- [ ] Add code coverage reports
- [ ] Setup SonarQube or similar (optional)
- [ ] Configure auto-merge for dependabot (optional)
- [ ] Add performance benchmarking
- [ ] Setup database backup automation
- [ ] Configure monitoring/alerts

## 12. Security Review

- [ ] Review `.env` variables
- [ ] Verify no secrets in code/git history
- [ ] Review GitHub Secrets access
- [ ] Enable 2FA on GitHub account
- [ ] Review branch protection rules
- [ ] Setup CODEOWNERS file (optional)
- [ ] Enable dependabot alerts

## 13. Documentation Review

- [ ] Team has access to all guides
- [ ] Guides are in central location (repo README)
- [ ] Update guides as workflows change
- [ ] Create runbook for deployments
- [ ] Document any customizations

## Troubleshooting Checklist

### If workflows not running:

- [ ] Check file paths in `on.paths`
- [ ] Verify branch name matches triggers
- [ ] Check workflow syntax (use yamllint)
- [ ] Ensure file has correct name (\*.yml)
- [ ] Verify `.github/workflows/` directory exists

### If linting fails:

- [ ] Run `npm run lint:fix` locally
- [ ] Check `.eslintrc.json` rules
- [ ] Verify prettier formatting
- [ ] Check line endings (should be LF)
- [ ] Ensure dependencies installed

### If deployment fails:

- [ ] Verify all GitHub Secrets are set
- [ ] Check `.env` variables
- [ ] Review GitHub Actions logs
- [ ] Ensure target server is accessible
- [ ] Verify SSH keys/credentials

### If pre-commit hooks don't run:

- [ ] Verify `.husky/pre-commit` is executable
- [ ] Check husky installation: `npx husky list`
- [ ] Reinstall if needed: `npx husky install`
- [ ] Check `.lintstagedrc.json` syntax

## Completion

- [ ] All items checked
- [ ] Team trained
- [ ] Documentation complete
- [ ] First deployment successful
- [ ] Monitoring in place

**Completion Date:** ******\_\_\_******

**Signed By:** ******\_\_\_******

**Notes:** ************************************\_\_\_************************************
