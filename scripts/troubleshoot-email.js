require('dotenv').config();
const nodemailer = require('nodemailer');

async function troubleshootEmailDelivery() {
  console.log('🔍 Troubleshooting Email Delivery Issues\n');
  console.log('=' .repeat(50));
  
  console.log('\n1️⃣ Checking Environment Configuration:');
  console.log('-'.repeat(30));
  console.log(`SMTP_HOST: ${process.env.SMTP_HOST}`);
  console.log(`SMTP_PORT: ${process.env.SMTP_PORT}`);
  console.log(`SMTP_USER: ${process.env.SMTP_USER}`);
  console.log(`SMTP_FROM: ${process.env.SMTP_FROM}`);
  
  // Test 1: Simple direct connection test
  console.log('\n2️⃣ Testing Direct SMTP Connection:');
  console.log('-'.repeat(30));
  
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false, // STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      debug: true, // Enable debug output
      logger: true, // Log to console
      requireTLS: true,
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log('Testing connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
    
    // Test 2: Send to multiple addresses to test delivery
    console.log('\n3️⃣ Testing Email Delivery:');
    console.log('-'.repeat(30));
    
    const testAddresses = [
      'drinshd@gmail.com',
      process.env.SMTP_FROM // Also send to self as backup
    ];
    
    for (const testEmail of testAddresses) {
      try {
        console.log(`\n📧 Sending test to: ${testEmail}`);
        
        const result = await transporter.sendMail({
          from: `"Pro Arbeitsschutz Test" <${process.env.SMTP_FROM}>`,
          to: testEmail,
          subject: `Email Delivery Test - ${new Date().toLocaleTimeString()}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2c3e50;">🧪 Email Delivery Test</h2>
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p><strong>Test Details:</strong></p>
                <ul>
                  <li>Sent from: ${process.env.SMTP_FROM}</li>
                  <li>SMTP Host: ${process.env.SMTP_HOST}</li>
                  <li>Time: ${new Date().toLocaleString()}</li>
                  <li>Test ID: ${Math.random().toString(36).substr(2, 9)}</li>
                </ul>
              </div>
              <p>If you receive this email, the SMTP configuration is working correctly!</p>
              <div style="background-color: #d4edda; padding: 10px; border-radius: 5px; margin: 15px 0;">
                <p style="margin: 0; color: #155724;"><strong>✅ Success:</strong> SMTP email delivery is functional</p>
              </div>
              <hr style="margin: 20px 0;">
              <p style="font-size: 12px; color: #666; text-align: center;">
                Pro Arbeitsschutz - Email System Test<br>
                Dieselstraße 6–8, 63165 Mühlheim am Main
              </p>
            </div>
          `,
          text: `Email Delivery Test - If you receive this, SMTP is working. Test sent at ${new Date().toLocaleString()}`
        });

        console.log(`✅ Email queued successfully to ${testEmail}`);
        console.log(`📧 Message ID: ${result.messageId}`);
        console.log(`📨 Server Response: ${result.response}`);
        
      } catch (emailError) {
        console.log(`❌ Failed to send to ${testEmail}: ${emailError.message}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ SMTP Connection failed: ${error.message}`);
    if (error.code) {
      console.log(`Error code: ${error.code}`);
    }
  }

  // Test 3: Alternative configuration
  console.log('\n4️⃣ Testing Alternative SMTP Configuration (SSL):');
  console.log('-'.repeat(30));
  
  try {
    const sslTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 465, // SSL port
      secure: true, // SSL
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      debug: true,
      logger: true,
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log('Testing SSL connection...');
    await sslTransporter.verify();
    console.log('✅ SSL connection verified successfully');
    
    console.log('\n📧 Sending via SSL to drinshd@gmail.com...');
    const sslResult = await sslTransporter.sendMail({
      from: `"Pro Arbeitsschutz SSL Test" <${process.env.SMTP_FROM}>`,
      to: 'drinshd@gmail.com',
      subject: `SSL Email Test - ${new Date().toLocaleTimeString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #e74c3c;">🔒 SSL Email Test</h2>
          <p>This email was sent using SSL (port 465) configuration.</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Configuration:</strong> SSL/TLS on port 465</p>
          <p>If you receive this, the SSL SMTP configuration works!</p>
        </div>
      `,
      text: `SSL Email Test sent at ${new Date().toLocaleString()}`
    });

    console.log(`✅ SSL email sent successfully!`);
    console.log(`📧 Message ID: ${sslResult.messageId}`);
    console.log(`📨 Server Response: ${sslResult.response}`);
    
  } catch (sslError) {
    console.log(`❌ SSL configuration failed: ${sslError.message}`);
  }

  console.log('\n5️⃣ Troubleshooting Recommendations:');
  console.log('-'.repeat(30));
  console.log('If you still don\'t receive emails, check:');
  console.log('1. Gmail spam/junk folder');
  console.log('2. Gmail "All Mail" folder');
  console.log('3. Email might be delayed (wait 5-10 minutes)');
  console.log('4. Check if PrivateEmail account is properly configured');
  console.log('5. Verify domain DNS settings (SPF, DKIM records)');
  console.log('6. Contact PrivateEmail support for delivery issues');

  console.log('\n' + '='.repeat(50));
  console.log('🏁 Email Delivery Troubleshooting Complete');
  console.log('Check your Gmail inbox, spam folder, and All Mail folder');
}

troubleshootEmailDelivery().catch(console.error);