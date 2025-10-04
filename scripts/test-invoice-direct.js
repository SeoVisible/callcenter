require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function prepareTestInvoice() {
  console.log('🔧 Preparing Test Invoice for Email Sending\n');
  console.log('=' .repeat(50));

  try {
    // Find an existing invoice that we can use for testing
    const invoice = await prisma.invoice.findFirst({
      where: {
        client: {
          email: 'drinshd@gmail.com'
        }
      },
      include: {
        client: true,
        lineItems: true
      }
    });

    if (!invoice) {
      console.log('❌ No invoice found with drinshd@gmail.com');
      return;
    }

    console.log(`📧 Found invoice: ${invoice.id}`);
    console.log(`📋 Current status: ${invoice.status}`);
    console.log(`👤 Client: ${invoice.clientName}`);
    console.log(`📧 Email: ${invoice.client.email}`);

    // Change status to pending so we can send it
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'pending' },
      include: {
        client: true,
        lineItems: true
      }
    });

    console.log(`✅ Updated invoice status to: ${updatedInvoice.status}`);
    console.log(`🎯 Invoice ${updatedInvoice.id} is now ready for email testing`);

    // Now test the email sending directly using our SMTP
    await testDirectEmailSending(updatedInvoice);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function testDirectEmailSending(invoice) {
  console.log('\n📨 Testing Direct Email Sending...');
  console.log('-'.repeat(40));

  const nodemailer = require('nodemailer');
  
  try {
    // Use the same configuration as the API route
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

    console.log('🔧 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified');

    // Calculate totals like the API does
    const subtotal = invoice.lineItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const taxAmount = subtotal * (Number(invoice.taxRate) / 100);
    const total = subtotal + taxAmount;

    const invoiceNumber = invoice.invoiceNumber ? `${invoice.invoiceNumber}` : `#${invoice.id.slice(-6)}`;
    
    // Create email content like the API route does
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
          <p><strong>Nettobetrag: € ${subtotal.toFixed(2)}</strong></p>
          <p><strong>MwSt. (${invoice.taxRate}%): € ${taxAmount.toFixed(2)}</strong></p>
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

    console.log('📧 Sending email...');
    console.log(`From: ${process.env.SMTP_FROM}`);
    console.log(`To: ${invoice.client.email}`);
    console.log(`Subject: Rechnung ${invoiceNumber} - Pro Arbeitsschutz`);

    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Pro Arbeitsschutz'}" <${process.env.SMTP_FROM}>`,
      to: invoice.client.email,
      subject: `Rechnung ${invoiceNumber} - Pro Arbeitsschutz`,
      html,
    });

    console.log('✅ Email sent successfully!');
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log(`📨 Server Response: ${info.response}`);

    // Update invoice status to 'sent' like the API does
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'sent' }
    });

    console.log('✅ Invoice status updated to "sent"');
    console.log('\n🎉 Email sending test completed successfully!');
    console.log('📬 Check drinshd@gmail.com for the invoice email');

  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
  }
}

prepareTestInvoice().catch(console.error);