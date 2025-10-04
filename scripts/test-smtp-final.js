const nodemailer = require('nodemailer');

async function testSMTPConnection() {
  try {
    console.log('🧪 Testing SMTP connection with updated credentials...\n');
    
    const transporter = nodemailer.createTransport({
      host: 'd166.x-mailer.de',
      port: 465,
      secure: true, // SSL
      auth: {
        user: 'info@pro-arbeitsschutz.com',
        pass: 'Felsenfestxyz-42!'
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000
    });

    console.log('Testing connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
    
    console.log('\n📧 Testing email sending...');
    const testResult = await transporter.sendMail({
      from: '"Pro Arbeitsschutz" <info@pro-arbeitsschutz.com>',
      to: 'info@pro-arbeitsschutz.com', // Send to self for testing
      subject: 'SMTP Test - Connection Successful',
      text: 'This is a test email to verify SMTP configuration is working properly.',
      html: '<p>This is a test email to verify SMTP configuration is working properly.</p>'
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', testResult.messageId);
    
  } catch (error) {
    console.error('❌ SMTP Error:', error.message);
    if (error.code) console.error('Error Code:', error.code);
    if (error.command) console.error('Failed Command:', error.command);
  }
}

testSMTPConnection();