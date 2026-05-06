# Testing Strategy

This document outlines the testing approach for the Ebook Reader application.

## Overview

The testing strategy includes:

- **Unit Tests** - Test individual functions and components
- **Integration Tests** - Test module interactions
- **E2E Tests** - Test complete user workflows
- **Security Tests** - Validate security implementations

## Backend Testing

### Setup

Install testing dependencies:

```bash
cd backend
npm install --save-dev jest supertest
```

### Structure

```
backend/
├── src/
│   ├── routes/
│   ├── middleware/
│   └── services/
└── __tests__/
    ├── routes/
    ├── middleware/
    └── services/
```

### Example Tests

**Authentication Tests** (`__tests__/routes/auth.test.js`):

```javascript
import request from "supertest";
import app from "../../src/server.js";

describe("Auth Routes", () => {
  it("should register a new user", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "test@example.com",
      password: "SecurePass123!",
      displayName: "Test User",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("token");
  });

  it("should not register with weak password", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "test@example.com",
      password: "123",
    });

    expect(res.statusCode).toBe(400);
  });
});
```

### Run Tests

```bash
npm test                 # Run all tests
npm test -- --watch     # Watch mode
npm test -- --coverage  # With coverage report
```

## Frontend Testing

### Setup

Install testing dependencies:

```bash
cd frontend-app
npm install --save-dev jest @testing-library/react @testing-library/react-native jest-mock-extended
```

### Structure

```
frontend-app/
├── src/
│   ├── screens/
│   ├── components/
│   └── services/
└── __tests__/
    ├── screens/
    ├── components/
    └── services/
```

### Example Tests

**Component Test** (`__tests__/components/BookCard.test.tsx`):

```typescript
import { render, screen } from '@testing-library/react-native';
import BookCard from '../../src/components/BookCard';

describe('BookCard Component', () => {
  it('should render book title', () => {
    const mockBook = {
      id: '1',
      title: 'Test Book',
      author: 'Test Author'
    };

    render(<BookCard book={mockBook} />);

    expect(screen.getByText('Test Book')).toBeTruthy();
  });
});
```

### Run Tests

```bash
npm test                 # Run all tests
npm test -- --watch     # Watch mode
npm test -- --coverage  # With coverage report
```

## Integration Tests

### Database Integration

Test database operations:

```javascript
describe('Library Database', () => {
  it('should store and retrieve books', () => {
    const db = getDb();
    const bookId = 'test-123';

    // Insert
    db.prepare('INSERT INTO books (id, ...) VALUES (...)').run(bookId, ...);

    // Query
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);

    expect(book).toBeDefined();
  });
});
```

### API Integration

Test full API flows:

```javascript
describe("API Integration", () => {
  it("should complete full reading flow", async () => {
    // Register
    const register = await request(app)
      .post("/api/auth/register")
      .send({ email: "user@test.com", password: "Pass123!" });

    const token = register.body.token;

    // Upload book
    const upload = await request(app)
      .post("/api/library/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", "test.epub");

    // Read book
    const book = upload.body;
    expect(book.id).toBeDefined();
  });
});
```

## Security Testing

### Input Validation

Test all inputs are properly validated:

```javascript
describe("Input Validation", () => {
  it("should reject invalid email", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "not-an-email",
      password: "SecurePass123!",
    });

    expect(res.statusCode).toBe(400);
  });

  it("should reject SQL injection attempts", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "' OR '1'='1",
      password: "anything",
    });

    expect(res.statusCode).toBe(400);
  });
});
```

### Rate Limiting

Test rate limit enforcement:

```javascript
describe("Rate Limiting", () => {
  it("should enforce auth rate limits", async () => {
    let lastResponse;

    // Make requests until hitting limit
    for (let i = 0; i < 10; i++) {
      lastResponse = await request(app)
        .post("/api/auth/login")
        .send({ email: "test@test.com", password: "pass" });
    }

    expect(lastResponse.statusCode).toBe(429);
  });
});
```

## E2E Testing (Expo)

### Setup

```bash
npm install --save-dev detox detox-cli detox-test-runner
```

### Configuration

Create `e2e/config.e2e.js`:

```javascript
module.exports = {
  testRunner: "jest",
  apps: {
    ios: {
      type: "ios.app",
      binaryPath: "artifacts/build/Release-iphonesimulator/ebook-reader.app",
      build:
        "xcodebuild -workspace ios/ebook-reader.xcworkspace -scheme ebook-reader -configuration Release -sdk iphonesimulator -derivedDataPath ios/build",
    },
  },
};
```

### Example E2E Test

Create `e2e/firstTest.e2e.js`:

```javascript
describe("Login Flow", () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it("should login successfully", async () => {
    await element(by.id("email-input")).typeText("test@example.com");
    await element(by.id("password-input")).typeText("Password123!");
    await element(by.text("Login")).tap();

    await expect(element(by.text("Library"))).toBeVisible();
  });
});
```

## Coverage Requirements

Target coverage metrics:

- **Statements:** 70%+
- **Branches:** 65%+
- **Functions:** 70%+
- **Lines:** 70%+

View coverage:

```bash
npm test -- --coverage
npm test -- --coverage --collectCoverageFrom='src/**/*.js'
```

## Performance Testing

### Backend Performance

```bash
npm install --save-dev artillery
```

Create `load-test.yml`:

```yaml
config:
  target: "http://localhost:4000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"

scenarios:
  - name: "Upload and read book"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@test.com"
            password: "pass"
      - post:
          url: "/api/library/upload"
          headers:
            Authorization: "Bearer {{ token }}"
```

Run test:

```bash
artillery run load-test.yml
```

### Mobile Performance

Test app startup time, memory usage, and frame rates:

- Android: Use Android Profiler
- iOS: Use Xcode Instruments

## Continuous Testing

Tests run automatically on:

- Every push/PR (GitHub Actions)
- Before commits (pre-commit hook)
- Before deployment (CI pipeline)

## Test Data Management

### Database Seeding

Create seed data for tests:

```javascript
export function seedTestData(db) {
  const userId = uuidv4();

  db.prepare(
    `
    INSERT INTO users (id, email, password_hash, display_name)
    VALUES (?, ?, ?, ?)
  `,
  ).run(userId, "test@test.com", "hashedpass", "Test User");

  return userId;
}
```

### Cleanup

Always cleanup after tests:

```javascript
afterEach(() => {
  db.prepare("DELETE FROM users WHERE email = ?").run("test@test.com");
});
```

## Troubleshooting

### Common Issues

**Tests timeout:**

- Increase Jest timeout: `jest.setTimeout(10000)`
- Check async/await handling

**Database locked:**

- Ensure proper cleanup in afterEach
- Check for concurrent test execution

**Flaky tests:**

- Avoid sleep/delays, use proper waits
- Mock external dependencies
- Test isolation issues

## CI/CD Integration

Tests are configured in `.github/workflows/`:

- Backend tests run on Node 18.x and 20.x
- Frontend tests validate TypeScript and dependencies
- Coverage reports generated (if configured)

See [CI_CD_GUIDE.md](./CI_CD_GUIDE.md) for more details.
