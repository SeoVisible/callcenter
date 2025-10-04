require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

// This mimics exactly what the API route does
async function simulateAPIRoute(invoiceId) {
  console.log('🔄 Simulating API Route Logic\n');
  console.log('=' .repeat(50));

  try {
    console.log(`📋 Fetching invoice: ${invoiceId}`);
    
    // Fetch invoice and client info (same as API route)
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true, lineItems: true }
    });

    if (!invoice || !invoice.client?.email) {
      console.log("❌ Invoice or client email not found");
      return { error: "Invoice or client email not found" };
    }

    console.log(`✅ Invoice found: ${invoice.invoiceNumber || invoice.id}`);
    console.log(`👤 Client: ${invoice.client.name}`);
    console.log(`📧 Email: ${invoice.client.email}`);
    console.log(`📊 Status: ${invoice.status}`);
    console.log(`🧾 Line items: ${invoice.lineItems.length}`);

    // Create SMTP transport (same as API route)
    let transporter;
    
    if (process.env.SMTP_USER && process.env.SMTP_PASS && !process.env.SMTP_USER.includes('your-gmail')) {
      console.log('🔧 Using configured SMTP...');
      
      const smtpConfigs = [
        {
          name: 'STARTTLS',
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
        }
      ];

      let smtpWorking = false;
      for (const { name, config } of smtpConfigs) {
        try {
          transporter = nodemailer.createTransport(config);
          await transporter.verify();
          console.log(`✅ SMTP ${name} configuration verified`);
          smtpWorking = true;
          break;
        } catch (error) {
          console.log(`❌ SMTP ${name} failed:`, error.message);
        }
      }

      if (!smtpWorking) {
        throw new Error('SMTP configuration failed');
      }
    }

    // Compute totals (same as API route)
    const subtotal = invoice.lineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const taxAmount = subtotal * (Number(invoice.taxRate) / 100);
    const total = subtotal + taxAmount;

    console.log(`💰 Subtotal: €${subtotal.toFixed(2)}`);
    console.log(`📊 Tax (${invoice.taxRate}%): €${taxAmount.toFixed(2)}`);
    console.log(`💳 Total: €${total.toFixed(2)}`);

    // Compose email (same as API route)
    const invoiceNumber = invoice.invoiceNumber ? `#${invoice.invoiceNumber}` : `#${invoice.id.slice(-6)}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Rechnung ${invoiceNumber}</h2>
        <p>Sehr geehrte/r ${invoice.client.name},</p>
        <p>anbei erhalten Sie Ihre Rechnung von <strong>Pro Arbeitsschutz</strong>. Wir bitten Sie, den Betrag bis zum Fälligkeitsdatum zu begleichen.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f8f9fa;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Artikel</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Menge</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Einzelpreis</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Gesamt</th>
          </tr>
          ${invoice.lineItems.map(item => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${item.productName}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.quantity}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">€ ${item.unitPrice.toFixed(2)}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">€ ${(item.unitPrice * item.quantity).toFixed(2)}</td>
            </tr>
          `).join("")}
        </table>
        
        <div style="text-align: right; margin: 20px 0;">
          <p><strong>Nettobetrag: €${subtotal.toFixed(2)}</strong></p>
          <p><strong>MwSt. (${invoice.taxRate}%): €${taxAmount.toFixed(2)}</strong></p>
          <p style="font-size: 18px; color: #e74c3c;"><strong>Gesamtbetrag: €${total.toFixed(2)}</strong></p>
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

    console.log('\n📧 Sending email...');
    
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Pro Arbeitsschutz'}" <${process.env.SMTP_FROM}>`,
      to: invoice.client.email,
      subject: `Rechnung ${invoiceNumber} - Pro Arbeitsschutz`,
      html,
    });

    console.log('✅ Email sent successfully!');
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log(`📨 Response: ${info.response}`);

    // Update invoice status to 'sent'
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'sent' },
    });

    console.log('✅ Invoice status updated to "sent"');

    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('❌ Error in API simulation:', error.message);
    return { error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('🚀 Invoice Email API Route Simulation');
  console.log('This simulates exactly what happens when you click "Rechnung senden"');
  console.log('');

  // Use the invoice we prepared earlier
  const invoiceId = 'a5db4927-49c1-4d0e-a2ab-4393125777f9';
  
  const result = await simulateAPIRoute(invoiceId);
  
  console.log('\n🎯 Final Result:');
  console.log(JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log('\n🎉 SUCCESS! The email sending logic is working perfectly!');
    console.log('📧 Check drinshd@gmail.com for the invoice email.');
    console.log('');
    console.log('💡 This means your dashboard email sending should work.');
    console.log('🔧 If the dashboard button isn\'t working, the issue is in the frontend, not the backend.');
  } else {
    console.log('\n❌ FAILED! There is an issue with the email sending logic.');
    console.log('🔧 This needs to be fixed before the dashboard will work.');
  }
}

main().catch(console.error);