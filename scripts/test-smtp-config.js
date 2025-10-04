const nodemailer = require('nodemailer');

async function testPrivateEmailSMTP() {
  console.log('🧪 Testing PrivateEmail SMTP connection...\n');
  
  const configs = [
    {
      name: 'STARTTLS (587) - Recommended',
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
    }
  ];

  for (const { name, config } of configs) {
    try {
      console.log(`\n📡 Testing ${name}...`);
      const transporter = nodemailer.createTransport(config);

      console.log('Testing connection...');
      await transporter.verify();
      console.log(`✅ ${name} connection successful!`);

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
      
      if (config.port === 465) {
        console.log('\n📝 Recommended .env settings:');
        console.log('SMTP_PORT=465');
        console.log('SMTP_SECURE=true');
      } else {
        console.log('\n📝 Recommended .env settings:');
        console.log('SMTP_PORT=587');
        console.log('SMTP_SECURE=false');
      }
      
      return;

    } catch (error) {
      console.error(`❌ ${name} failed:`);
      console.error(error.message);
      if (error.code) {
        console.error(`Error code: ${error.code}`);
      }
    }
  }
  
  console.log('\n❌ All configurations failed. Please check credentials.');
}

testPrivateEmailSMTP();