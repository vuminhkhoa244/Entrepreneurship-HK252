# GitHub Actions Configuration Guide

This guide explains how to customize and extend the CI/CD workflows for your specific needs.

## Workflow Structure

Each workflow file has this basic structure:

```yaml
name: Workflow Name

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  job-name:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - name: Step name
        run: command
```

## Key Concepts

### Triggers (`on`)

**Push-based:**

```yaml
on:
  push:
    branches: [main, develop]
    paths:
      - "backend/**"
      - ".github/workflows/backend-ci.yml"
```

**Pull Request:**

```yaml
on:
  pull_request:
    branches: [main, develop]
```

**Scheduled:**

```yaml
on:
  schedule:
    - cron: "0 2 * * *" # 2 AM daily
```

**Manual Dispatch:**

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: "Environment"
        required: true
        type: choice
        options:
          - staging
          - production
```

### Matrix Strategy

Run jobs with different configurations:

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x]
    os: [ubuntu-latest, macos-latest, windows-latest]

steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}
```

### Conditions

Run steps conditionally:

```yaml
- name: Step name
  if: github.event_name == 'pull_request'
  run: npm test

- name: Deploy
  if: github.ref == 'refs/heads/main'
  run: npm run deploy
```

### Continue on Error

Don't fail the workflow if a step fails:

```yaml
- name: Optional step
  run: npm audit fix
  continue-on-error: true
```

## Customization Examples

### Add Test Coverage

```yaml
- name: Run tests with coverage
  run: npm test -- --coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/coverage-final.json
    flags: unittests
    name: codecov-umbrella
```

### Add Email Notifications

```yaml
- name: Send email on failure
  if: failure()
  uses: davisben/action-send-email@master
  with:
    server_address: ${{ secrets.EMAIL_SERVER }}
    server_port: ${{ secrets.EMAIL_PORT }}
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: Build failed for ${{ github.repository }}
    body: |
      Build #${{ github.run_number }} failed
      See logs: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
```

### Deploy to Vercel

```yaml
- name: Deploy Frontend to Vercel
  uses: amondnet/vercel-action@v25
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
    vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
    working-directory: ./frontend-app
```

### Deploy to AWS

```yaml
- name: Deploy to AWS
  uses: aws-actions/configure-aws-credentials@v2
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: us-east-1

- name: Deploy to S3
  run: |
    aws s3 sync ./frontend-app/build s3://${{ secrets.AWS_S3_BUCKET }} --delete
    aws cloudfront create-invalidation --distribution-id ${{ secrets.AWS_DISTRIBUTION_ID }} --paths "/*"
```

### Add SonarQube Code Quality

```yaml
- name: SonarQube Scan
  uses: SonarSource/sonarcloud-github-action@master
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

### Cache Dependencies

```yaml
- name: Cache npm dependencies
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### Build Docker Image

```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v4
  with:
    context: ./backend
    push: ${{ github.ref == 'refs/heads/main' }}
    tags: |
      ${{ secrets.DOCKER_REGISTRY }}/ebook-reader-backend:latest
      ${{ secrets.DOCKER_REGISTRY }}/ebook-reader-backend:${{ github.sha }}
    labels: |
      org.opencontainers.image.revision=${{ github.sha }}
      org.opencontainers.image.created=${{ github.event.repository.updated_at }}
```

### Run Integration Tests

```yaml
- name: Start PostgreSQL
  uses: ankane/setup-postgres@v1
  with:
    postgres-version: 14

- name: Run integration tests
  run: npm run test:integration
  env:
    DATABASE_URL: postgres://postgres@localhost/test_db
```

### Create GitHub Release

```yaml
- name: Create Release
  uses: actions/create-release@v1
  if: startsWith(github.ref, 'refs/tags/')
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    tag_name: ${{ github.ref }}
    release_name: Release ${{ github.ref }}
    draft: false
    prerelease: false
```

### Comment on Pull Request

```yaml
- name: Comment on PR
  if: github.event_name == 'pull_request'
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: '✅ All checks passed!'
      })
```

## Advanced Patterns

### Conditional Deployment Based on Commit Message

```yaml
- name: Check if deployment commit
  id: check
  run: |
    if [[ "${{ github.event.head_commit.message }}" == *"[deploy]"* ]]; then
      echo "should_deploy=true" >> $GITHUB_OUTPUT
    else
      echo "should_deploy=false" >> $GITHUB_OUTPUT
    fi

- name: Deploy
  if: steps.check.outputs.should_deploy == 'true'
  run: npm run deploy
```

### Artifact Management

```yaml
- name: Upload artifacts
  uses: actions/upload-artifact@v3
  with:
    name: build-artifacts
    path: |
      backend/dist/
      frontend-app/build/
    retention-days: 30

- name: Download artifacts
  uses: actions/download-artifact@v3
  with:
    name: build-artifacts
    path: ./artifacts
```

### Matrix with Dynamic Values

```yaml
strategy:
  matrix:
    include:
      - node-version: 18.x
        npm-version: 9.x
      - node-version: 20.x
        npm-version: 10.x

steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}
```

### Dependent Jobs

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      build-id: ${{ steps.build.outputs.id }}
    steps:
      - id: build
        run: echo "id=$(uuidgen)" >> $GITHUB_OUTPUT

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: echo "Testing build ${{ needs.build.outputs.build-id }}"

  deploy:
    needs: [build, test]
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying"
```

## Environment Variables

### Using Secrets

```yaml
env:
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
  DATABASE_URL: ${{ secrets.DATABASE_URL }}

steps:
  - run: npm start
```

### Using Context Variables

```yaml
env:
  COMMIT_SHA: ${{ github.sha }}
  BRANCH_NAME: ${{ github.ref_name }}
  RUN_NUMBER: ${{ github.run_number }}
  ACTOR: ${{ github.actor }}
```

### Setting Step Outputs

```yaml
- name: Get version
  id: version
  run: echo "number=$(cat package.json | jq -r '.version')" >> $GITHUB_OUTPUT

- name: Use version
  run: echo "Building version ${{ steps.version.outputs.number }}"
```

## Common Integrations

### Branch Protection

Go to Settings → Branches → Add Rule:

- Require status checks to pass
- Require code reviews
- Require branches to be up to date

### Auto-merge

```yaml
- name: Auto-merge PR
  uses: fastify/github-action-merge-dependabot@v3.8.1
  if: github.event_name == 'pull_request' && github.actor == 'dependabot[bot]'
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Dependency Updates (Dependabot)

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /backend
    schedule:
      interval: daily
    allow:
      - dependency-type: production

  - package-ecosystem: npm
    directory: /frontend-app
    schedule:
      interval: daily
```

## Debugging

### Enable Debug Logging

```yaml
- name: Enable debug
  run: |
    echo "::debug::This is a debug message"
    echo "::warning::This is a warning"
    echo "::error::This is an error"
```

### Print Context

```yaml
- name: Print context
  run: |
    echo "Event: ${{ github.event_name }}"
    echo "Branch: ${{ github.ref }}"
    echo "Commit: ${{ github.sha }}"
    echo "Actor: ${{ github.actor }}"
```

### View Logs

1. Go to Actions tab
2. Click workflow run
3. Click job name
4. View logs for each step

## Performance Optimization

### Parallel Jobs

Jobs run in parallel by default:

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest

  test:
    runs-on: ubuntu-latest

  security:
    runs-on: ubuntu-latest
```

### Caching Dependencies

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: "20"
    cache: "npm"
    cache-dependency-path: backend/package-lock.json
```

### Use Smaller Runners

For simple tasks, use smaller/cheaper runners (if available).

## Cost Optimization

- GitHub Actions: 2000 free minutes/month
- Use `if:` conditions to skip unnecessary jobs
- Cache dependencies to reduce install time
- Use matrix for multiple versions efficiently
- Clean up old artifacts regularly

## Further Reading

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Actions Best Practices](https://docs.github.com/en/actions/guides)
- [Awesome GitHub Actions](https://github.com/sdras/awesome-actions)
- [Actions Marketplace](https://github.com/marketplace?type=actions)
