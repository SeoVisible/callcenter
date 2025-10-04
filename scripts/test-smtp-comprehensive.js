const nodemailer = require('nodemailer');

async function testSMTPSetup() {
  console.log('🧪 Comprehensive SMTP Configuration Test\n');
  console.log('=' .repeat(50));
  
  // Test 1: Direct SMTP Connection Test
  console.log('\n📡 Test 1: Direct SMTP Connection');
  console.log('-'.repeat(30));
  
  const configs = [
    {
      name: 'PrivateEmail STARTTLS (587)',
      config: {
        host: 'mail.privateemail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'info@arbeitsschutz.com',
          pass: 'Ademjashari_1',
        },
        requireTLS: true,
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3'
        }
      }
    },
    {
      name: 'PrivateEmail SSL (465)',
      config: {
        host: 'mail.privateemail.com',
        port: 465,
        secure: true,
        auth: {
          user: 'info@arbeitsschutz.com',
          pass: 'Ademjashari_1',
        },
        tls: {
          rejectUnauthorized: false
        }
      }
    },
    {
      name: 'Gmail Fallback (for comparison)',
      config: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@gmail.com', // This will fail but shows the difference
          pass: 'dummy',
        }
      }
    }
  ];

  let workingConfig = null;
  
  for (const { name, config } of configs) {
    try {
      console.log(`\n📧 Testing ${name}...`);
      const transporter = nodemailer.createTransport(config);
      
      // Just test connection, don't send email yet
      await transporter.verify();
      console.log(`✅ ${name} - Connection successful!`);
      
      if (!workingConfig && name.includes('PrivateEmail')) {
        workingConfig = { name, config };
        console.log(`🎯 Found working configuration: ${name}`);
      }
      
    } catch (error) {
      console.log(`❌ ${name} - Failed: ${error.message}`);
      if (error.code) {
        console.log(`   Error code: ${error.code}`);
      }
    }
  }

  // Test 2: Send Test Email with Working Configuration
  if (workingConfig) {
    console.log('\n📨 Test 2: Sending Test Email');
    console.log('-'.repeat(30));
    
    try {
      const transporter = nodemailer.createTransport(workingConfig.config);
      
      const testResult = await transporter.sendMail({
        from: '"Pro Arbeitsschutz" <info@arbeitsschutz.com>',
        to: 'info@arbeitsschutz.com', // Send to self for testing
        subject: 'SMTP Configuration Test - ' + new Date().toLocaleString(),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">🎉 SMTP Test Successful!</h2>
            <p>This email confirms that your SMTP configuration is working correctly.</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h3>Configuration Details:</h3>
              <ul>
                <li><strong>Provider:</strong> ${workingConfig.name}</li>
                <li><strong>Host:</strong> ${workingConfig.config.host}</li>
                <li><strong>Port:</strong> ${workingConfig.config.port}</li>
                <li><strong>Secure:</strong> ${workingConfig.config.secure}</li>
                <li><strong>User:</strong> ${workingConfig.config.auth.user}</li>
              </ul>
            </div>
            <p>Your website can now send emails through this SMTP configuration.</p>
            <hr>
            <p style="font-size: 12px; color: #666;">
              <strong>Pro Arbeitsschutz</strong><br>
              Dieselstraße 6–8, 63165 Mühlheim am Main<br>
              Tel: +49 6108 9944981 | info@arbeitsschutz.com
            </p>
          </div>
        `,
        text: `SMTP Test Successful! Configuration: ${workingConfig.name} is working.`
      });

      console.log(`✅ Test email sent successfully!`);
      console.log(`📧 Message ID: ${testResult.messageId}`);
      console.log(`📨 Response: ${testResult.response}`);
      
    } catch (error) {
      console.log(`❌ Failed to send test email: ${error.message}`);
    }
  }

  // Test 3: Environment Configuration Check
  console.log('\n⚙️ Test 3: Environment Configuration');
  console.log('-'.repeat(30));
  
  const envVars = [
    'SMTP_HOST',
    'SMTP_PORT', 
    'SMTP_SECURE',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
    'SMTP_FROM_NAME'
  ];

  console.log('Current .env configuration:');
  envVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      if (varName === 'SMTP_PASS') {
        console.log(`✅ ${varName}=****** (hidden)`);
      } else {
        console.log(`✅ ${varName}=${value}`);
      }
    } else {
      console.log(`❌ ${varName}=<not set>`);
    }
  });

  // Test 4: Recommendations
  console.log('\n📋 Test 4: Recommendations');
  console.log('-'.repeat(30));
  
  if (workingConfig) {
    console.log('🎯 SMTP configuration is working! Recommendations:');
    console.log('');
    console.log('1. Update your .env file with these settings:');
    console.log(`   SMTP_HOST=mail.privateemail.com`);
    console.log(`   SMTP_PORT=${workingConfig.config.port}`);
    console.log(`   SMTP_SECURE=${workingConfig.config.secure}`);
    console.log(`   SMTP_USER=info@arbeitsschutz.com`);
    console.log(`   SMTP_PASS=Ademjashari_1`);
    console.log(`   SMTP_FROM=info@arbeitsschutz.com`);
    console.log(`   SMTP_FROM_NAME=Pro Arbeitsschutz`);
    console.log('');
    console.log('2. Test sending emails through your application dashboard');
    console.log('3. Monitor email delivery and check spam folders initially');
    console.log('4. Consider setting up SPF, DKIM, and DMARC records for better deliverability');
    
  } else {
    console.log('⚠️ No working SMTP configuration found. Troubleshooting steps:');
    console.log('');
    console.log('1. Verify email account credentials');
    console.log('2. Check if the email account allows SMTP access');
    console.log('3. Contact PrivateEmail support for SMTP settings');
    console.log('4. Consider using Gmail or other provider as alternative');
  }

  console.log('\n' + '='.repeat(50));
  console.log('🏁 SMTP Configuration Test Complete');
}

// Run the test
testSMTPSetup().catch(console.error);