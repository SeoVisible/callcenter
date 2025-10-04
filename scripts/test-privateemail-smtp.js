const nodemailer = require('nodemailer');

async function testPrivateEmailSMTP() {
  console.log('🧪 Testing PrivateEmail SMTP connection with multiple configurations...\n');
  
  const configs = [
    {
      name: 'STARTTLS (587) - Standard',
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
          rejectUnauthorized: false
        }
      }
    },
    {
      name: 'SSL (465) - Secure',
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
      name: 'STARTTLS (587) - Alternative TLS',
      config: {
        host: 'mail.privateemail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'info@arbeitsschutz.com',
          pass: 'Ademjashari_1',
        },
        tls: {
          ciphers: 'SSLv3',
          rejectUnauthorized: false
        }
      }
    }
  ];

  for (const { name, config } of configs) {
    try {
      console.log(`\n📡 Testing ${name}...`);
      const transporter = nodemailer.createTransport(config);

      // Test connection
      console.log('Testing connection...');
      await transporter.verify();
      console.log(`✅ ${name} connection successful!`);

      // Send test email
      console.log('📧 Sending test email...');
      const testResult = await transporter.sendMail({
        from: 'info@arbeitsschutz.com',
        to: 'info@arbeitsschutz.com',
        subject: `SMTP Test - ${name}`,
        text: `Test email sent successfully using ${name} configuration.`,
        html: `<p>Test email sent successfully using <strong>${name}</strong> configuration.</p>`
      });

      console.log(`✅ Test email sent successfully!`);
      console.log(`Message ID: ${testResult.messageId}`);
      console.log(`\n🎉 ${name} configuration is working perfectly!`);
      
      // Update .env recommendation
      if (config.port === 465) {
        console.log('\n📝 Recommended .env settings for this configuration:');
        console.log('SMTP_PORT=465');
        console.log('SMTP_SECURE=true');
      } else {
        console.log('\n📝 Recommended .env settings for this configuration:');
        console.log('SMTP_PORT=587');
        console.log('SMTP_SECURE=false');
      }
      
      // If we get here, this configuration works - no need to test others
      return;

    } catch (error) {
      console.error(`❌ ${name} failed:`);
      console.error(error.message);
      if (error.code) {
        console.error(`Error code: ${error.code}`);
      }
    }
  }
  
  console.log('\n❌ All SMTP configurations failed. Please check credentials and server settings.');
}

    // Test connection
    console.log('Testing connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!');

    // Send test email
    console.log('\n📧 Sending test email...');
    const testResult = await transporter.sendMail({
      from: 'info@arbeitsschutz.com',
      to: 'info@arbeitsschutz.com', // Send to same address for testing
      subject: 'SMTP Test - PrivateEmail Configuration',
      text: 'This is a test email to verify the PrivateEmail SMTP configuration is working correctly.',
      html: '<p>This is a test email to verify the <strong>PrivateEmail SMTP configuration</strong> is working correctly.</p>'
    });

    console.log(`✅ Test email sent successfully!`);
    console.log(`Message ID: ${testResult.messageId}`);
    console.log(`Response: ${testResult.response}`);

    console.log('\n🎉 SMTP configuration is working perfectly!');

  } catch (error) {
    console.error('❌ SMTP test failed:');
    console.error(error.message);
    
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    
    // Try SSL configuration as alternative
    console.log('\n🔄 Trying SSL configuration (port 465)...');
    
    try {
      const sslTransporter = nodemailer.createTransport({
        host: 'mail.privateemail.com',
        port: 465,
        secure: true, // Use SSL
        auth: {
          user: 'info@arbeitsschutz.com',
          pass: 'Ademjashari_1',
        }
      });

      await sslTransporter.verify();
      console.log('✅ SSL connection successful!');
      
      const sslResult = await sslTransporter.sendMail({
        from: 'info@arbeitsschutz.com',
        to: 'info@arbeitsschutz.com',
        subject: 'SMTP Test - SSL Configuration',
        text: 'SSL configuration test successful!',
      });
      
      console.log(`✅ SSL test email sent! Message ID: ${sslResult.messageId}`);
      console.log('\n📝 Note: Update .env to use port 465 and SMTP_SECURE=true for SSL');
      
    } catch (sslError) {
      console.error('❌ SSL configuration also failed:');
      console.error(sslError.message);
    }
  }
}

testPrivateEmailSMTP();