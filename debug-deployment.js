#!/usr/bin/env node

/**
 * ShopSmart Pro - Deployment Diagnostic Tool
 * Helps identify deployment issues by checking environment and connections
 */

require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

console.log('🔍 ShopSmart Pro Deployment Diagnostic Tool');
console.log('==========================================\n');

// Check environment variables
console.log('📋 Environment Variables Check:');
console.log('-------------------------------');

const requiredVars = [
  'MONGODB_URI',
  'JWT_SECRET', 
  'SHOPSMART_INTERNAL_API_KEY',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET'
];

let allGood = true;

for (const envVar of requiredVars) {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar}: SET`);
    
    // Check for weak JWT_SECRET
    if (envVar === 'JWT_SECRET') {
      if (process.env.JWT_SECRET.includes('secret') || process.env.JWT_SECRET.length < 10) {
        console.log(`⚠️  ${envVar}: Weak value detected (should be at least 32 characters)`);
      } else {
        console.log(`✅ ${envVar}: Strong value`);
      }
    }
  } else {
    console.log(`❌ ${envVar}: NOT SET`);
    allGood = false;
  }
}

console.log('\n🌐 MongoDB Connection Test:');
console.log('---------------------------');

if (process.env.MONGODB_URI) {
  console.log('Testing MongoDB connection...');
  
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).then(() => {
    console.log('✅ MongoDB Connection: SUCCESS');
    console.log(`✅ Connected to: ${mongoose.connection.host}`);
    
    // Test JWT signing
    console.log('\n🔐 JWT Token Generation Test:');
    console.log('------------------------------');
    try {
      const testToken = jwt.sign({ id: 'test-user-id' }, process.env.JWT_SECRET, {
        expiresIn: '1h'
      });
      console.log('✅ JWT Token Generation: SUCCESS');
      console.log(`✅ Token length: ${testToken.length} characters`);
      
      // Test token verification
      const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
      console.log('✅ JWT Token Verification: SUCCESS');
      console.log(`✅ Decoded user ID: ${decoded.id}`);
      
      console.log('\n🎉 All systems working correctly!');
      console.log('Your deployment should be functioning properly.');
      
    } catch (jwtError) {
      console.log('❌ JWT Token Generation FAILED');
      console.log(`❌ Error: ${jwtError.message}`);
      allGood = false;
    }
    
    mongoose.connection.close();
  }).catch((mongoError) => {
    console.log('❌ MongoDB Connection: FAILED');
    console.log(`❌ Error: ${mongoError.message}`);
    allGood = false;
  });
} else {
  console.log('❌ MONGODB_URI not set - cannot test connection');
  allGood = false;
}

// Summary
setTimeout(() => {
  console.log('\n📊 DIAGNOSTIC SUMMARY:');
  console.log('=====================');
  
  if (allGood) {
    console.log('✅ All critical systems are functioning');
    console.log('✅ Environment variables are properly set');
    console.log('✅ Database connection is working');
    console.log('✅ JWT authentication is working');
    console.log('\n🚀 Your ShopSmart Pro deployment should be working correctly!');
  } else {
    console.log('❌ Issues detected in deployment');
    console.log('❌ Please check the errors above');
    console.log('❌ Common fixes:');
    console.log('   - Ensure all environment variables are set in Render dashboard');
    console.log('   - Check MongoDB connection string and user permissions');
    console.log('   - Verify JWT_SECRET is a strong, random string');
  }
}, 3000);