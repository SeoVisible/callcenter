const nodemailer = require('nodemailer');

async function testCredentialsVariations() {
  const variations = [
    {
      name: 'Standard Config',
      config: {
        host: 'd166.x-mailer.de',
        port: 465,
        secure: true,
        auth: {
          user: 'info@pro-arbeitsschutz.com',
          pass: 'Felsenfestxyz-42!'
        }
      }
    },
    {
      name: 'Port 587 with STARTTLS',
      config: {
        host: 'd166.x-mailer.de',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: 'info@pro-arbeitsschutz.com',
          pass: 'Felsenfestxyz-42!'
        }
      }
    },
    {
      name: 'Alternative Auth Method',
      config: {
        host: 'd166.x-mailer.de',
        port: 465,
        secure: true,
        authMethod: 'PLAIN',
        auth: {
          user: 'info@pro-arbeitsschutz.com',
          pass: 'Felsenfestxyz-42!'
        }
      }
    }
  ];

  for (const variation of variations) {
    try {
      console.log(`\n🧪 Testing: ${variation.name}`);
      const transporter = nodemailer.createTransport(variation.config);
      
      await transporter.verify();
      console.log(`✅ ${variation.name} - SUCCESS!`);
      
      // If this works, let's try sending a test email
      console.log('Sending test email...');
      const result = await transporter.sendMail({
        from: 'info@pro-arbeitsschutz.com',
        to: 'info@pro-arbeitsschutz.com',
        subject: 'SMTP Test Success',
        text: 'SMTP configuration is working!'
      });
      console.log(`✅ Test email sent! Message ID: ${result.messageId}`);
      break; // Stop if successful
      
    } catch (error) {
      console.log(`❌ ${variation.name} - Failed: ${error.message}`);
    }
  }
}

testCredentialsVariations();