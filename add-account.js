import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// CONFIGURATION - Edit these variables
// ============================================
const ACCOUNT_NUMBER = '838997';  // 👈 Change this to your account number
const SERVER_NAME = 'PUPrime-Demo';    // 👈 Change this to your server name
const LICENSE_KEY = '';  // 👈 Change this to your license key

// API Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
// ============================================

// Main function to add account
const addAccount = async () => {
  try {
    // Get license key from environment variable or use the constant
    const licenseKey = LICENSE_KEY || process.env.LICENSE_KEY;
    
    if (!licenseKey || licenseKey.trim() === '') {
      console.error('❌ License key is required!');
      console.error('   Set LICENSE_KEY in the script or in your .env file');
      process.exit(1);
    }

    if (!ACCOUNT_NUMBER || ACCOUNT_NUMBER.trim() === '') {
      console.error('❌ Account number is required!');
      process.exit(1);
    }

    if (!SERVER_NAME || SERVER_NAME.trim() === '') {
      console.error('❌ Server name is required!');
      process.exit(1);
    }

    console.log('\n🚀 Adding Trading Account...\n');
    console.log(`Account Number: ${ACCOUNT_NUMBER}`);
    console.log(`Server Name: ${SERVER_NAME}`);
    console.log(`License Key: ${licenseKey.substring(0, 10)}...\n`);

    // Add account via /add-user-from-bot route
    const response = await axios.post(
      `${API_BASE_URL}/api/add-user-from-bot`,
      {
        licenseKey: licenseKey.trim(),
        accountNumber: ACCOUNT_NUMBER.trim(),
        serverName: SERVER_NAME.trim(),
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.success) {
      console.log('✅ Account added successfully!\n');
      console.log('Account Details:');
      console.log(`  - Account ID: ${response.data.data._id}`);
      console.log(`  - Account Number: ${response.data.data.accountNumber}`);
      console.log(`  - Server: ${response.data.data.serverName}`);
      console.log(`  - Platform: ${response.data.data.platform}`);
      console.log(`  - Status: ${response.data.data.connectionStatus}\n`);
    } else {
      console.error('❌ Failed to add account:', response.data.message || response.data.error);
    }
  } catch (error) {
    if (error.response) {
      // API returned an error response
      console.error('\n❌ Error:', error.response.data.message || error.response.data.error || 'Failed to add account');
      if (error.response.data.error) {
        console.error('   Details:', error.response.data.error);
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('\n❌ No response from server. Is the backend running?');
      console.error('   Check if the API is accessible at:', API_BASE_URL);
    } else {
      // Error setting up the request
      console.error('\n❌ Error:', error.message);
    }
  }
};

// Run the script
addAccount();

