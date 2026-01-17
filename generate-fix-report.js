#!/usr/bin/env node

/**
 * ShopSmart Pro - Comprehensive Deployment Fix Generator
 * Generates exact fixes needed for your Render deployment
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('🔧 ShopSmart Pro Deployment Fix Generator');
console.log('=========================================\n');

// Generate fix report
const fixReport = {
  timestamp: new Date().toISOString(),
  issues: [],
  fixes: [],
  environmentVariables: {}
};

console.log('📋 Analyzing Current Configuration...\n');

// Check all environment variables
const envVars = [
  'MONGODB_URI',
  'JWT_SECRET', 
  'SHOPSMART_INTERNAL_API_KEY',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'NODE_ENV'
];

console.log('🔑 Environment Variables Analysis:');
console.log('----------------------------------');

for (const envVar of envVars) {
  const value = process.env[envVar];
  fixReport.environmentVariables[envVar] = value ? 'SET' : 'MISSING';
  
  if (value) {
    console.log(`✅ ${envVar}: ✓ SET`);
    
    // Specific checks
    if (envVar === 'MONGODB_URI') {
      if (value.includes('sanjanathakur302_db_user')) {
        console.log(`⚠️  ${envVar}: Using OLD user credentials`);
        fixReport.issues.push('MongoDB URI uses old user credentials');
        fixReport.fixes.push('Update MONGODB_URI to use shopsmart_user instead of sanjanathakur302_db_user');
      } else if (value.includes('shopsmart_user')) {
        console.log(`✅ ${envVar}: Using correct user credentials`);
      }
    }
    
    if (envVar === 'JWT_SECRET') {
      if (value.includes('secret') || value.length < 32) {
        console.log(`⚠️  ${envVar}: Weak JWT secret detected`);
        fixReport.issues.push('JWT_SECRET is weak or contains "secret"');
        fixReport.fixes.push('Replace JWT_SECRET with a strong random string of at least 32 characters');
      } else {
        console.log(`✅ ${envVar}: Strong JWT secret`);
      }
    }
  } else {
    console.log(`❌ ${envVar}: NOT SET`);
    fixReport.issues.push(`${envVar} is missing`);
    fixReport.fixes.push(`Add ${envVar} to Render environment variables`);
  }
}

// Generate specific fixes
console.log('\n🛠️  Required Fixes:');
console.log('-------------------');

if (fixReport.issues.length > 0) {
  fixReport.issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue}`);
  });
  
  console.log('\n🔧 Exact Fixes Needed:');
  fixReport.fixes.forEach((fix, index) => {
    console.log(`${index + 1}. ${fix}`);
  });
} else {
  console.log('✅ No issues detected in local environment');
}

// Generate Render-ready environment variables
console.log('\n📋 Render Environment Variables Template:');
console.log('----------------------------------------');

const renderEnvTemplate = `
# Copy these exact values to your Render dashboard:

MONGODB_URI=mongodb+srv://shopsmart_user:Loksan%401921@shopsmart.czrmaja.mongodb.net/shopsmart-pro?retryWrites=true&w=majority
JWT_SECRET=shopsmart_pro_very_secure_secret_key_2026_for_sanjanathakur_at_least_32_chars_long_and_strong
SHOPSMART_INTERNAL_API_KEY=internal_api_key_for_shopsmart_app_with_strong_security_as_well_and_unique
RAZORPAY_KEY_ID=rzp_test_S4tm5rDL90hbL2
RAZORPAY_KEY_SECRET=TdNkRJTJzWjbV3VPcdBVrQJ6
NODE_ENV=production
FRONTEND_URL=https://shopsmart-pro-3.onrender.com
API_URL=https://shopsmart-pro-3.onrender.com
`;

console.log(renderEnvTemplate);

// Save report to file
const reportPath = path.join(__dirname, 'DEPLOYMENT_FIX_REPORT.txt');
const reportContent = `
ShopSmart Pro Deployment Fix Report
Generated: ${fixReport.timestamp}

ISSUES DETECTED:
${fixReport.issues.map(issue => `- ${issue}`).join('\n') || 'None'}

REQUIRED FIXES:
${fixReport.fixes.map(fix => `- ${fix}`).join('\n') || 'None'}

ENVIRONMENT VARIABLES STATUS:
${Object.entries(fixReport.environmentVariables).map(([key, value]) => `${key}: ${value}`).join('\n')}

RENDER ENVIRONMENT VARIABLES TEMPLATE:
${renderEnvTemplate}

INSTRUCTIONS:
1. Go to your Render dashboard (https://dashboard.render.com)
2. Navigate to your "shopsmart-pro-3" service
3. Go to the "Environment" tab
4. Update/add the variables listed above
5. Remove any duplicate entries
6. Click "Save, rebuild, and deploy"
7. Wait for deployment to complete
8. Test your login functionality
`;

fs.writeFileSync(reportPath, reportContent.trim());
console.log(`\n📄 Detailed fix report saved to: ${reportPath}`);

console.log('\n🎯 ACTION REQUIRED:');
console.log('==================');
console.log('1. Copy the environment variables from above');
console.log('2. Paste them into your Render dashboard');
console.log('3. Remove any duplicate entries');
console.log('4. Save and redeploy your application');
console.log('\nOnce completed, your login should work properly! 🚀');