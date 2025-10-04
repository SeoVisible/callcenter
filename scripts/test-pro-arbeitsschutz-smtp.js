require('dotenv').config(); // Load environment variables from .env file
const nodemailer = require('nodemailer');

async function testProArbeitsschutzSMTP() {
  console.log('🧪 Testing SMTP Configuration for pro-arbeitsschutz.com\n');
  console.log('=' .repeat(60));
  
  // Display current configuration
  console.log('\n📋 Current Environment Configuration:');
  console.log('-'.repeat(40));
  console.log(`SMTP_HOST: ${process.env.SMTP_HOST}`);
  console.log(`SMTP_PORT: ${process.env.SMTP_PORT}`);
  console.log(`SMTP_SECURE: ${process.env.SMTP_SECURE}`);
  console.log(`SMTP_USER: ${process.env.SMTP_USER}`);
  console.log(`SMTP_PASS: ${'*'.repeat(process.env.SMTP_PASS?.length || 0)}`);
  console.log(`SMTP_FROM: ${process.env.SMTP_FROM}`);
  console.log(`SMTP_FROM_NAME: ${process.env.SMTP_FROM_NAME}`);

  // Test configurations with the pro-arbeitsschutz.com email
  const configs = [
    {
      name: 'STARTTLS (587) - pro-arbeitsschutz.com',
      config: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        requireTLS: true,
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3'
        }
      }
    },
    {
      name: 'SSL (465) - pro-arbeitsschutz.com',
      config: {
        host: process.env.SMTP_HOST,
        port: 465,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      }
    }
  ];

  let workingConfig = null;
  
  console.log('\n📡 Testing SMTP Connections:');
  console.log('-'.repeat(40));

  for (const { name, config } of configs) {
    try {
      console.log(`\n🔧 Testing ${name}...`);
      const transporter = nodemailer.createTransport(config);
      
      // Test connection
      await transporter.verify();
      console.log(`✅ ${name} - Connection successful!`);
      
      if (!workingConfig) {
        workingConfig = { name, config };
        console.log(`🎯 Using this configuration for email test`);
      }
      
    } catch (error) {
      console.log(`❌ ${name} - Failed: ${error.message}`);
      if (error.code) {
        console.log(`   Error code: ${error.code}`);
      }
    }
  }

  // Send test email if we have a working configuration
  if (workingConfig) {
    console.log('\n📨 Sending Test Email:');
    console.log('-'.repeat(40));
    
    try {
      const transporter = nodemailer.createTransport(workingConfig.config);
      
      const testResult = await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
        to: process.env.SMTP_FROM, // Send to self for testing
        subject: 'SMTP Test - pro-arbeitsschutz.com Dashboard',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin-bottom: 10px;">🎉 SMTP Test Erfolgreich!</h1>
              <p style="color: #7f8c8d; font-size: 16px;">Dashboard E-Mail-Konfiguration funktioniert</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin-top: 0;">📋 Konfigurationsdetails:</h3>
              <ul style="list-style: none; padding: 0;">
                <li style="padding: 5px 0;"><strong>Konfiguration:</strong> ${workingConfig.name}</li>
                <li style="padding: 5px 0;"><strong>Host:</strong> ${workingConfig.config.host}</li>
                <li style="padding: 5px 0;"><strong>Port:</strong> ${workingConfig.config.port}</li>
                <li style="padding: 5px 0;"><strong>Verschlüsselung:</strong> ${workingConfig.config.secure ? 'SSL' : 'STARTTLS'}</li>
                <li style="padding: 5px 0;"><strong>E-Mail:</strong> ${workingConfig.config.auth.user}</li>
              </ul>
            </div>
            
            <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
              <p style="margin: 0; color: #155724;"><strong>✅ Status:</strong> Ihr Dashboard kann jetzt Rechnungen per E-Mail versenden!</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #7f8c8d; font-size: 14px;">
                Diese Test-E-Mail bestätigt, dass die SMTP-Konfiguration<br>
                für das Dashboard auf <strong>https://pro-arbeitsschutz.com/dashboard</strong><br>
                ordnungsgemäß funktioniert.
              </p>
            </div>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
            
            <div style="text-align: center; color: #6c757d; font-size: 12px;">
              <p><strong>Pro Arbeitsschutz</strong><br>
              Dieselstraße 6–8, 63165 Mühlheim am Main<br>
              Tel: +49 6108 9944981 | info@pro-arbeitsschutz.com</p>
            </div>
          </div>
        `,
        text: `SMTP Test erfolgreich! Das Dashboard kann jetzt E-Mails über ${workingConfig.name} versenden.`
      });

      console.log(`✅ Test-E-Mail erfolgreich versendet!`);
      console.log(`📧 Nachrichten-ID: ${testResult.messageId}`);
      console.log(`📨 Server-Antwort: ${testResult.response}`);
      console.log(`📬 E-Mail gesendet an: ${process.env.SMTP_FROM}`);
      
    } catch (error) {
      console.log(`❌ Fehler beim Versenden der Test-E-Mail: ${error.message}`);
    }
    
  } else {
    console.log('\n⚠️ Keine funktionierende SMTP-Konfiguration gefunden');
    console.log('\nMögliche Problemlösungen:');
    console.log('1. Überprüfen Sie die E-Mail-Anmeldedaten');
    console.log('2. Stellen Sie sicher, dass SMTP für das Konto aktiviert ist');
    console.log('3. Kontaktieren Sie den PrivateEmail-Support');
  }

  console.log('\n🎯 Dashboard-Integration:');
  console.log('-'.repeat(40));
  console.log('Ihre .env-Datei ist bereits konfiguriert für:');
  console.log('- E-Mail-Versand von Rechnungen');
  console.log('- Dashboard unter https://pro-arbeitsschutz.com/dashboard');
  console.log('- Absender: info@pro-arbeitsschutz.com');

  console.log('\n' + '='.repeat(60));
  console.log('🏁 SMTP-Test für pro-arbeitsschutz.com abgeschlossen');
}

// Run the test
testProArbeitsschutzSMTP().catch(console.error);