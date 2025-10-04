const nodemailer = require('nodemailer');

async function testAdvancedSMTPMethods() {
  console.log('🔧 Testing advanced SMTP authentication methods...\n');
  
  const methods = [
    {
      name: 'CRAM-MD5 Authentication',
      config: {
        host: 'd166.x-mailer.de',
        port: 465,
        secure: true,
        authMethod: 'CRAM-MD5',
        auth: {
          user: 'info@pro-arbeitsschutz.com',
          pass: 'Felsenfestxyz-42!'
        }
      }
    },
    {
      name: 'DIGEST-MD5 Authentication',
      config: {
        host: 'd166.x-mailer.de',
        port: 465,
        secure: true,
        authMethod: 'DIGEST-MD5',
        auth: {
          user: 'info@pro-arbeitsschutz.com',
          pass: 'Felsenfestxyz-42!'
        }
      }
    },
    {
      name: 'LOGIN Authentication',
      config: {
        host: 'd166.x-mailer.de',
        port: 465,
        secure: true,
        authMethod: 'LOGIN',
        auth: {
          user: 'info@pro-arbeitsschutz.com',
          pass: 'Felsenfestxyz-42!'
        }
      }
    },
    {
      name: 'Username without domain',
      config: {
        host: 'd166.x-mailer.de',
        port: 465,
        secure: true,
        auth: {
          user: 'info',  // Try without @domain
          pass: 'Felsenfestxyz-42!'
        }
      }
    },
    {
      name: 'Alternative Port 25',
      config: {
        host: 'd166.x-mailer.de',
        port: 25,
        secure: false,
        requireTLS: true,
        auth: {
          user: 'info@pro-arbeitsschutz.com',
          pass: 'Felsenfestxyz-42!'
        }
      }
    }
  ];

  for (const method of methods) {
    try {
      console.log(`🧪 Testing: ${method.name}`);
      const transporter = nodemailer.createTransport(method.config);
      
      // Test connection
      await transporter.verify();
      console.log(`✅ ${method.name} - SUCCESS!`);
      return; // Stop on first success
      
    } catch (error) {
      console.log(`❌ ${method.name} - Failed: ${error.message}`);
      if (error.code) console.log(`   Error Code: ${error.code}`);
    }
  }
  
  console.log('\n💡 All methods failed. This suggests:');
  console.log('1. Password might be incorrect');  
  console.log('2. SMTP authentication not enabled on server');
  console.log('3. Account might need additional setup');
  console.log('4. IP address might be blocked');
}

testAdvancedSMTPMethods();