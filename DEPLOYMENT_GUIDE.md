# Deployment Guide

This guide covers deploying the Ebook Reader application to production.

## Pre-Deployment Checklist

- [ ] All tests pass
- [ ] Code review completed and approved
- [ ] Security audit clean (`npm audit`)
- [ ] No console errors or warnings
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Performance benchmarks acceptable
- [ ] Changelog updated
- [ ] Version number bumped
- [ ] Rollback plan documented

## Infrastructure Requirements

### Backend Server

**Minimum Specs:**

- CPU: 1 vCPU
- RAM: 512 MB
- Storage: 10 GB (adjust for uploads)
- OS: Ubuntu 20.04 LTS

**Recommended:**

- CPU: 2 vCPU
- RAM: 2 GB
- Storage: 50 GB
- Load balancer for high traffic

### Database

**SQLite (Development):**

- Not suitable for production
- Single writer limitation

**PostgreSQL (Production Recommended):**

```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb ebook_reader

# Create user
sudo -u postgres createuser ebook_reader_user
sudo -u postgres psql -c "ALTER USER ebook_reader_user WITH PASSWORD 'strong_password';"
```

### Mobile (Expo)

- Expo Account (free tier minimum)
- Apple Developer Account (for iOS, ~$99/year)
- Google Play Developer Account (for Android, one-time $25)

## Backend Deployment

### Option 1: Direct Server Deployment (SSH)

**Prerequisites:**

- Server with Node.js 20.x
- SSH access
- Git installed
- PM2 for process management

**Setup:**

1. **Install Node.js and PM2**

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2
```

2. **Clone Repository**

```bash
cd /app
git clone https://github.com/yourusername/ebook-reader.git
cd ebook-reader/backend
```

3. **Install Dependencies**

```bash
npm ci --omit=dev
```

4. **Configure Environment**

```bash
cp .env.example .env
# Edit .env with production values
nano .env
```

5. **Start with PM2**

```bash
pm2 start src/server.js --name "ebook-reader-backend"
pm2 save
pm2 startup
```

6. **Setup Auto-updates**

```bash
# Create cron job for git pull and restart
(crontab -l 2>/dev/null; echo "0 2 * * * cd /app/ebook-reader/backend && git pull && npm ci && pm2 restart ebook-reader-backend") | crontab -
```

### Option 2: Docker Deployment

**Prerequisites:**

- Docker installed
- Docker Registry (Docker Hub, ECR, GCR, etc.)

**Create Dockerfile:**

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy application
COPY src ./src
COPY config ./config

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "src/server.js"]
```

**Build and Deploy:**

```bash
# Build image
docker build -t ebook-reader-backend:latest .

# Tag for registry
docker tag ebook-reader-backend:latest myregistry/ebook-reader-backend:latest

# Push to registry
docker push myregistry/ebook-reader-backend:latest

# Run container
docker run -d \
  --name ebook-reader \
  --restart always \
  -p 4000:4000 \
  -e NODE_ENV=production \
  -e JWT_SECRET=$JWT_SECRET \
  -e DATABASE_URL=$DATABASE_URL \
  myregistry/ebook-reader-backend:latest
```

### Option 3: Platform as a Service (PaaS)

**Heroku Example:**

```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set JWT_SECRET=your_secret
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL=postgresql://...

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:standard-0

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

## Frontend Deployment

### Option 1: EAS Build & Submit (Recommended)

**Setup EAS:**

```bash
cd frontend-app

# Login to Expo
eas login

# Configure EAS
eas build:configure

# Update eas.json for production
```

**eas.json Configuration:**

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "buildType": "archive"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccount": "path/to/service-account.json"
      },
      "ios": {
        "appleId": "your-apple-id",
        "appleTeamId": "XXXXXXXXXX",
        "ascAppId": "1234567890"
      }
    }
  }
}
```

**Build & Submit:**

```bash
# Build for both platforms
eas build --platform all --profile production

# Submit to app stores
eas submit --platform all --profile production

# Check build status
eas build:list
```

### Option 2: Manual Build with Android Studio/Xcode

**Android:**

```bash
# Generate release APK/AAB
cd android
./gradlew bundleRelease

# Find signed bundle at:
# android/app/build/outputs/bundle/release/app-release.aab
```

**iOS:**

1. Open Xcode
2. Select "Generic iOS Device" as target
3. Product → Archive
4. Validate and upload to App Store Connect

### Option 3: Google Play & App Store Submission

**Android - Google Play Store:**

1. Create developer account (~$25 one-time)
2. Create app in Google Play Console
3. Upload signed AAB/APK
4. Fill in store listing (description, screenshots, etc.)
5. Set pricing and distribution
6. Submit for review (~2-4 hours)

**iOS - Apple App Store:**

1. Enroll in Apple Developer Program (~$99/year)
2. Create app in App Store Connect
3. Upload build via Xcode or Transporter
4. Fill in app metadata (description, screenshots, etc.)
5. Set pricing and availability
6. Submit for review (~24-48 hours)

## Post-Deployment

### Monitoring

**Backend:**

```bash
# Check application logs
pm2 logs ebook-reader-backend

# Monitor resources
pm2 monit

# Performance metrics
pm2 web  # Access at http://localhost:9615
```

**Mobile:**

- Set up Sentry for crash reporting
- Monitor app analytics
- Track user engagement

### Health Checks

```bash
# Check API health
curl https://yourdomain.com/api/health

# Check database
psql -U user -d database -c "SELECT 1;"
```

### Database Backups

```bash
# PostgreSQL backup
pg_dump -U user -W database > backup.sql

# Restore from backup
psql -U user -W database < backup.sql

# Automated backups with cron
0 2 * * * pg_dump -U user -W database > /backups/db-$(date +\%Y\%m\%d).sql
```

### SSL/HTTPS

**Using Let's Encrypt:**

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

## Rollback Procedure

**If deployment fails:**

```bash
# For git-based deployment
cd /app/ebook-reader
git revert HEAD
git push origin main

# For PM2
pm2 restart ebook-reader-backend

# For Docker
docker pull myregistry/ebook-reader-backend:previous-tag
docker stop ebook-reader
docker run -d ... myregistry/ebook-reader-backend:previous-tag
```

## Performance Optimization

### Caching

```javascript
// Cache API responses
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "public, max-age=3600");
  next();
});
```

### Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_user_books_user ON user_books(user_id);
CREATE INDEX idx_books_created_at ON books(created_at DESC);
```

### Load Balancing

Use Nginx for reverse proxy and load balancing:

```nginx
upstream backend {
  server 127.0.0.1:4000;
  server 127.0.0.1:4001;  # Multiple instances
  server 127.0.0.1:4002;
}

server {
  listen 80;
  server_name yourdomain.com;

  location / {
    proxy_pass http://backend;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Troubleshooting

### Common Issues

**Port already in use:**

```bash
# Find and kill process
lsof -i :4000
kill -9 <PID>
```

**Database connection errors:**

```bash
# Test connection
psql -U user -d database -h host

# Check credentials in .env
cat .env | grep DATABASE
```

**Out of memory:**

```bash
# Increase memory limit
pm2 start src/server.js --name "ebook-reader" --max-memory-restart 512M
```

## Monitoring & Alerts

### Setup Monitoring

1. **Application Monitoring:**
   - New Relic, Datadog, or similar
   - Track response times, errors, throughput

2. **Log Aggregation:**
   - ELK Stack, Splunk, or Datadog
   - Centralize all logs

3. **Uptime Monitoring:**
   - UptimeRobot, Pingdom
   - Alert on downtime

4. **Error Tracking:**
   - Sentry (already integrated in code)
   - PagerDuty for escalation

## Scale Strategy

As traffic grows:

1. **Database:** Migrate from PostgreSQL single instance to replicated setup
2. **Cache:** Implement Redis for session management and caching
3. **CDN:** Use CloudFront or similar for static assets
4. **Multiple servers:** Deploy across multiple instances with load balancing
5. **Microservices:** Break apart as needed (AI service, file processing, etc.)

## Security Hardening

- [ ] Enable HTTPS/TLS everywhere
- [ ] Set up Web Application Firewall (WAF)
- [ ] Enable DDoS protection
- [ ] Implement rate limiting (already configured)
- [ ] Regular security patches
- [ ] Database encryption at rest
- [ ] Backup encryption
- [ ] API key rotation
- [ ] Secrets rotation

## Support & SLA

Define your Service Level Agreement:

- **Uptime:** 99.5% target
- **Response time:** < 500ms p95
- **Error rate:** < 0.1%
- **Incident response:** < 15 minutes
- **Recovery time:** < 1 hour

## Version Management

Track deployments:

```bash
# Tag releases
git tag -a v1.0.0 -m "Production release v1.0.0"
git push origin v1.0.0

# View deployment history
git log --oneline --all --graph
```

## Further Reading

- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-web-server-guide/)
- [PostgreSQL Production Setup](https://www.postgresql.org/docs/current/admin.html)
- [Expo Deployment Guide](https://docs.expo.dev/build-reference/apk/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
