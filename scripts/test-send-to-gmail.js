require('dotenv').config(); // Load environment variables
const nodemailer = require('nodemailer');

async function sendTestInvoiceEmail() {
  console.log('📧 Sending Test Invoice Email to drinshd@gmail.com\n');
  console.log('=' .repeat(55));
  
  try {
    // Create transporter with your SMTP settings
    const transporter = nodemailer.createTransport({
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
    });

    // Test connection first
    console.log('🔧 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!');

    // Create a sample invoice email (like what clients would receive)
    const invoiceNumber = 'INV-2025-001';
    const clientName = 'Test Client';
    const total = 1500.00;
    const subtotal = 1260.50;
    const taxAmount = 239.50;
    const taxRate = 19;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Rechnung ${invoiceNumber}</h2>
        <p>Sehr geehrte/r ${clientName},</p>
        <p>anbei erhalten Sie Ihre Rechnung von <strong>Pro Arbeitsschutz</strong>. Wir bitten Sie, den Betrag bis zum Fälligkeitsdatum zu begleichen.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f8f9fa;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Artikel</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Menge</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Einzelpreis</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Gesamt</th>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">Arbeitsschutzausrüstung Set</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">2</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">€ 500,00</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">€ 1.000,00</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">Versand</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">1</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">€ 260,50</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">€ 260,50</td>
          </tr>
        </table>
        
        <div style="text-align: right; margin: 20px 0;">
          <p><strong>Nettobetrag: € ${subtotal.toFixed(2)}</strong></p>
          <p><strong>MwSt. (${taxRate}%): € ${taxAmount.toFixed(2)}</strong></p>
          <p style="font-size: 18px; color: #e74c3c;"><strong>Gesamtbetrag: € ${total.toFixed(2)}</strong></p>
        </div>
        
        <hr style="margin: 30px 0;">
        <div style="font-size: 12px; color: #666;">
          <p><strong>Zahlungsinformationen:</strong></p>
          <p>IBAN: DE90 5065 2124 0008 1426 22<br>
          BIC: HELADEF1SLS<br>
          Verwendungszweck: Rechnung ${invoiceNumber}</p>
          
          <p><strong>Pro Arbeitsschutz</strong><br>
          Dieselstraße 6–8<br>
          63165 Mühlheim am Main<br>
          Tel: +49 6108 9944981<br>
          info@pro-arbeitsschutz.com</p>
        </div>
      </div>
    `;

    console.log('\n📨 Sending test invoice email...');
    console.log(`From: ${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM}>`);
    console.log(`To: drinshd@gmail.com`);
    console.log(`Subject: Rechnung ${invoiceNumber} - Pro Arbeitsschutz`);

    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to: 'drinshd@gmail.com',
      subject: `Rechnung ${invoiceNumber} - Pro Arbeitsschutz`,
      html,
      text: `Rechnung ${invoiceNumber} von Pro Arbeitsschutz. Gesamtbetrag: € ${total.toFixed(2)}. Bitte begleichen Sie den Betrag bis zum Fälligkeitsdatum.`
    });

    console.log('\n✅ Test invoice email sent successfully!');
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log(`📨 Server Response: ${info.response}`);
    console.log('\n📬 Check your Gmail inbox: drinshd@gmail.com');
    console.log('💡 Note: Check spam folder if you don\'t see it in inbox');

    console.log('\n🎯 This is exactly what your clients will receive when you send invoices from the dashboard!');

  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
  }

  console.log('\n' + '='.repeat(55));
  console.log('🏁 Test email sending complete');
}

// Run the test
sendTestInvoiceEmail().catch(console.error);