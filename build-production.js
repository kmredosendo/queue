const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Production Build Script for Queue Management System
 * Creates a minimal, production-ready package with essential files only
 */

console.log('🚀 Building production package...\n');

// Define source and destination directories
const sourceDir = __dirname;
const productionDir = path.join(sourceDir, 'production');

// Step 1: Build the Next.js application
console.log('🔨 Building Next.js application...');
try {
  execSync('npm run build', { stdio: 'inherit', cwd: sourceDir });
  console.log('   ✅ Next.js build completed\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Files and directories to copy to production
const essentialItems = [
  'src',
  'prisma',
  'public',
  '.next',  // Include the built Next.js application
  'package.json',
  'package-lock.json',
  'next.config.ts',
  'next-env.d.ts',
  'tsconfig.json',
  'postcss.config.mjs',
  'components.json',
  'eslint.config.mjs'
];

// Ensure completely clean production build by removing existing folder
console.log('🧹 Ensuring completely clean production build...');
if (fs.existsSync(productionDir)) {
  console.log('📁 Completely removing existing production directory...');
  try {
    fs.rmSync(productionDir, { recursive: true, force: true });
    console.log('   ✅ Existing production directory removed successfully');
  } catch (error) {
    console.error('   ❌ Error removing production directory:', error.message);
    console.log('   ⚠️  Please manually delete the production folder and try again');
    process.exit(1);
  }
} else {
  console.log('   ✅ No existing production directory found');
}

console.log('📁 Creating fresh production directory...');
fs.mkdirSync(productionDir, { recursive: true });
console.log('   ✅ Fresh, clean production directory created');

// Verify the directory is empty and ready
const dirContents = fs.readdirSync(productionDir);
if (dirContents.length === 0) {
  console.log('   ✅ Production directory verified clean and ready');
} else {
  console.log('   ⚠️  Warning: Production directory not empty:', dirContents);
}

// Copy essential files and directories
console.log('📋 Copying essential files...');
essentialItems.forEach(item => {
  const sourcePath = path.join(sourceDir, item);
  const destPath = path.join(productionDir, item);
  
  if (fs.existsSync(sourcePath)) {
    if (fs.statSync(sourcePath).isDirectory()) {
      copyDirectory(sourcePath, destPath);
      console.log(`   ✅ ${item}/ (directory)`);
    } else {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`   ✅ ${item} (file)`);
    }
  } else {
    console.log(`   ⚠️  ${item} (not found, skipping)`);
  }
});

// Create .env.example template
console.log('🔧 Creating environment template...');
const envExample = `# Database Configuration
DATABASE_URL="mysql://username:password@localhost:3306/queue"

# JWT Secret for authentication (CHANGE IN PRODUCTION)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Next.js Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-change-in-production"

# Application Settings
NODE_ENV="production"
PORT=3000
`;

fs.writeFileSync(path.join(productionDir, '.env.example'), envExample);
console.log('   ✅ .env.example created');

// Create PM2 ecosystem configuration
console.log('🔧 Creating PM2 configuration...');
const ecosystemConfig = `// PM2 Configuration for Windows 11 Production
module.exports = {
  apps: [{
    name: 'queue',
    script: 'start-app-fixed.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
`;

fs.writeFileSync(path.join(productionDir, 'ecosystem.config.js'), ecosystemConfig);
console.log('   ✅ ecosystem.config.js created');

// Create Node.js wrapper for PM2/Windows compatibility
console.log('🔧 Creating Node.js wrapper for PM2...');
const startAppWrapper = `#!/usr/bin/env node

/**
 * Node.js wrapper for starting Next.js with PM2 on Windows
 * Handles shell compatibility and proper process management
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

console.log('Starting Queue Management System...');
console.log('Platform:', os.platform());
console.log('Architecture:', os.arch());
console.log('Node version:', process.version);
console.log('Working directory:', process.cwd());

// Determine the correct npm command for Windows
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

console.log('Using npm command:', npmCommand);

// Spawn npm start with proper options for Windows
const child = spawn(npmCommand, ['start'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: isWindows,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: process.env.PORT || '3000'
  },
  cwd: process.cwd()
});

// Forward stdout
child.stdout.on('data', (data) => {
  process.stdout.write(data);
});

// Forward stderr
child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

// Handle child process exit
child.on('exit', (code, signal) => {
  console.log(\`Child process exited with code \${code} and signal \${signal}\`);
  process.exit(code || 0);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, terminating child process...');
  child.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, terminating child process...');
  child.kill('SIGINT');
});

console.log('Next.js application starting...');
`;

fs.writeFileSync(path.join(productionDir, 'start-app-fixed.js'), startAppWrapper);
console.log('   ✅ start-app-fixed.js created');

// Create deployment script
console.log('🔧 Creating deployment script...');
const deployScript = `@echo off
echo ====================================
echo Queue Management System Deployment
echo ====================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator
    echo Please right-click Command Prompt and select "Run as administrator"
    pause
    exit /b 1
)

echo [1/7] Checking directory and cleaning previous deployment...
if not exist "package.json" (
    echo ERROR: package.json not found. Are you in the correct directory?
    pause
    exit /b 1
)

echo Checking for existing PM2 processes...
call pm2 list >nul 2>&1
if %errorLevel% equ 0 (
    echo Found existing PM2 processes. Stopping them...
    call pm2 stop all >nul 2>&1
    call pm2 delete all >nul 2>&1
    echo Previous PM2 processes cleaned.
) else (
    echo No existing PM2 processes found.
)

echo [2/7] Installing Node.js dependencies...
call npm install
if %errorLevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo [3/7] Installing PM2 globally...
call npm install -g pm2
if %errorLevel% neq 0 (
    echo ERROR: Failed to install PM2
    pause
    exit /b 1
)

echo [4/7] Installing PM2 Windows service...
call npm install -g pm2-windows-service
if %errorLevel% neq 0 (
    echo ERROR: Failed to install PM2 Windows service
    pause
    exit /b 1
)

echo [5/7] Setting up environment...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env"
        echo Environment file created from template.
        echo IMPORTANT: Edit .env file with your database credentials before continuing.
        echo.
        pause
    ) else (
        echo ERROR: No .env.example found
        pause
        exit /b 1
    )
)

echo [6/7] Setting up database...
call npx prisma generate
call npx prisma db push

echo.
echo ====================================
echo Database Seeding Options
echo ====================================
echo 1. Reset database and reseed (removes ALL existing data)
echo 2. Seed database (may create duplicates if data exists)
echo 3. Skip seeding and continue
echo.
echo NOTE: Press Ctrl+C to terminate deployment entirely
echo.
set /p choice="Enter your choice (1, 2, or 3): "

if "%%choice%%"=="1" (
    echo Resetting database and reseeding...
    call npx prisma migrate reset --force
    if %%errorLevel%% neq 0 (
        echo ERROR: Database reset failed
        pause
        exit /b 1
    )
    echo Database reset and seeding completed.
) else if "%%choice%%"=="2" (
    echo Seeding database...
    call npx prisma db seed
    if %%errorLevel%% neq 0 (
        echo WARNING: Database seeding may have failed. This is normal if data already exists.
    ) else (
        echo Database seeding completed.
    )
) else if "%%choice%%"=="3" (
    echo Skipping database seeding...
) else (
    echo Invalid choice. Skipping database seeding...
)

echo [7/7] Starting application with PM2...
echo Starting application with PM2...
call pm2 start ecosystem.config.js
if %errorLevel% neq 0 (
    echo ERROR: Failed to start application with PM2
    echo Please check the configuration and try manually: pm2 start ecosystem.config.js
    pause
    exit /b 1
)

call pm2 save
if %errorLevel% neq 0 (
    echo WARNING: Failed to save PM2 configuration
)

echo.
echo Installing PM2 as Windows service...
echo Checking if PM2 service already exists...
sc query PM2 >nul 2>&1
if %errorLevel% equ 0 (
    echo PM2 service already exists. Skipping installation.
    echo Ensuring service is running...
    net start PM2 >nul 2>&1
    if %errorLevel% equ 0 (
        echo PM2 service started successfully.
    ) else (
        echo PM2 service is already running.
    )
) else (
    echo PM2 service not found. Installing...
    call pm2-service-install
    if %errorLevel% neq 0 (
        echo WARNING: PM2 service installation failed. You may need to install manually.
        echo Run: pm2-service-install
    ) else (
        echo PM2 service installed successfully.
    )
)

echo.
echo ====================================
echo Deployment completed successfully!
echo ====================================
echo.
echo Application is running at: http://localhost:3000
echo.
echo Default login credentials:
echo   Admin - Username: admin, Password: admin123
echo   Cashier - Username: cashier, Password: cashier123
echo.
echo Service management commands:
echo   pm2 status          - View application status
echo   pm2 logs            - View application logs
echo   pm2 restart all     - Restart application
echo   pm2 stop all        - Stop application
echo.
echo Windows service:
echo   net start PM2       - Start PM2 service
echo   net stop PM2        - Stop PM2 service
echo.
pause
`;

fs.writeFileSync(path.join(productionDir, 'deploy.bat'), deployScript);
console.log('   ✅ deploy.bat created');

// Create logs directory
console.log('📁 Creating logs directory...');
const logsDir = path.join(productionDir, 'logs');
fs.mkdirSync(logsDir, { recursive: true });
fs.writeFileSync(path.join(logsDir, '.gitkeep'), '');
console.log('   ✅ logs/ directory created');

console.log('\n🎉 Production package created successfully!');
console.log(`📦 Location: ${productionDir}`);
console.log('\nNext steps:');
console.log('1. Copy the production/ folder to your target server');
console.log('2. Run deploy.bat as Administrator on the target server');
console.log('3. Follow the prompts to complete the setup');

/**
 * Recursively copy directory
 */
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
