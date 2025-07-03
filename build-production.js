const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('🚀 Building production package...')

// Build the project first
console.log('📦 Building Next.js application...')
execSync('npm run build', { stdio: 'inherit' })

// Create production directory
const prodDir = path.join(__dirname, 'production')
if (fs.existsSync(prodDir)) {
  console.log('🧹 Cleaning existing production directory...')
  fs.rmSync(prodDir, { recursive: true, force: true })
}
fs.mkdirSync(prodDir)

// Create logs directory for PM2
const logsDir = path.join(prodDir, 'logs')
fs.mkdirSync(logsDir)

// Files and folders to copy
const itemsToCopy = [
  'package.json',
  'package-lock.json',
  'next.config.ts',
  'tsconfig.json',
  'components.json',
  'postcss.config.mjs',
  'eslint.config.mjs',
  'ecosystem.config.js',
  'install-and-start.bat',
  'quick-start.bat',
  'stop-production.bat',
  'install-service.bat',
  'PRODUCTION-DEPLOYMENT.md',
  '.next',
  'public',
  'prisma',
  'scripts',
  'src'
]

// Copy function
function copyRecursive(src, dest) {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true })
    }
    const files = fs.readdirSync(src)
    files.forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file))
    })
  } else {
    fs.copyFileSync(src, dest)
  }
}

// Copy each item
itemsToCopy.forEach(item => {
  const srcPath = path.join(__dirname, item)
  const destPath = path.join(prodDir, item)
  
  if (fs.existsSync(srcPath)) {
    console.log(`📁 Copying ${item}...`)
    copyRecursive(srcPath, destPath)
  } else {
    console.log(`⚠️  Warning: ${item} not found, skipping...`)
  }
})

// Create production .env template
const envTemplate = `# Production Environment Variables
DATABASE_URL="mysql://username:password@localhost:3306/queue_production"
JWT_SECRET="your-super-secure-jwt-secret-change-this-in-production"
NODE_ENV="production"
PORT=3000
`

fs.writeFileSync(path.join(prodDir, '.env.example'), envTemplate)

// Create production README
const productionReadme = `# Queue System - Production Deployment

## Quick Setup (Windows):

### Option 1: Automated Installation
1. **Run the installer:** Double-click \`install-and-start.bat\`
   - This will check dependencies, install if needed, and start the system

### Option 2: Manual Setup
1. **Configure Environment:**
   - Copy \`.env.example\` to \`.env\`
   - Update database connection and JWT secret

2. **Install Dependencies:**
   \`\`\`bash
   npm ci
   \`\`\`

3. **Setup Database:**
   \`\`\`bash
   npx prisma generate
   npx prisma migrate deploy
   npm run seed
   \`\`\`

4. **Start Production Server:**
   \`\`\`bash
   npm start
   \`\`\`

## Windows Scripts:

- \`install-and-start.bat\` - Complete setup and start (first time)
- \`quick-start.bat\` - Quick start (for configured systems)
- \`stop-production.bat\` - Stop the server
- \`install-service.bat\` - Install as Windows service (requires admin)

## Windows Service (Auto-start on boot):

1. **Run as Administrator:** Right-click \`install-service.bat\` → "Run as administrator"
2. **Follow prompts** - The service will be installed and start automatically

The system will now start automatically when Windows boots!

## Manual PM2 Setup:

1. **Install PM2 globally:**
   \`\`\`bash
   npm install -g pm2 pm2-windows-service
   \`\`\`

2. **Start with PM2:**
   \`\`\`bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   \`\`\`

3. **Install Windows Service:**
   \`\`\`bash
   pm2-service-install
   pm2-service-start
   \`\`\`

## Management Commands:

- \`pm2 status\` - Check application status
- \`pm2 logs queue-system\` - View application logs
- \`pm2 restart queue-system\` - Restart application
- \`pm2 stop queue-system\` - Stop application

## Access:
- **Application:** http://localhost:3000
- **Admin Dashboard:** http://localhost:3000/admin
- **User Interface:** http://localhost:3000/user
- **Display Screen:** http://localhost:3000/display
- **Reservation:** http://localhost:3000/reservation

## Default Accounts:
- **Admin:** admin / admin123
- **Cashier 1:** cashier1 / cashier123
- **Cashier 2:** cashier2 / cashier123

## Troubleshooting:

- **Port 3000 in use:** Change PORT in .env or ecosystem.config.js
- **Database errors:** Check DATABASE_URL in .env
- **Permission errors:** Run install-service.bat as Administrator
- **Service won't start:** Check Windows Event Viewer for details

## Environment Variables (.env):

\`\`\`
DATABASE_URL="mysql://username:password@localhost:3306/queue_production"
JWT_SECRET="your-super-secure-jwt-secret-change-this-in-production"
NODE_ENV="production"
PORT=3000
\`\`\`
`

fs.writeFileSync(path.join(prodDir, 'README.md'), productionReadme)

console.log('✅ Production package created successfully!')
console.log(`📂 Location: ${prodDir}`)
console.log('🚀 Ready for deployment!')
