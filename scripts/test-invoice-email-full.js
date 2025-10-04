require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testInvoiceEmailingDirectly() {
  console.log('🧪 Testing Invoice Email Sending Directly\n');
  console.log('=' .repeat(50));

  try {
    // First, let's see what invoices we have
    console.log('📋 Checking available invoices...');
    const invoices = await prisma.invoice.findMany({
      include: { 
        client: true, 
        lineItems: true 
      },
      take: 5 // Get first 5 invoices
    });

    if (invoices.length === 0) {
      console.log('❌ No invoices found in database');
      return;
    }

    console.log(`✅ Found ${invoices.length} invoices`);
    
    // Show invoice details
    invoices.forEach((invoice, index) => {
      console.log(`\n📄 Invoice ${index + 1}:`);
      console.log(`  ID: ${invoice.id}`);
      console.log(`  Number: ${invoice.invoiceNumber || 'Not set'}`);
      console.log(`  Status: ${invoice.status}`);
      console.log(`  Client: ${invoice.client?.name || 'No client'}`);
      console.log(`  Client Email: ${invoice.client?.email || 'No email'}`);
      console.log(`  Line Items: ${invoice.lineItems.length}`);
      console.log(`  Can Send: ${(invoice.status === 'pending' || invoice.status === 'maker') && invoice.client?.email ? '✅' : '❌'}`);
    });

    // Find a sendable invoice
    const sendableInvoice = invoices.find(inv => 
      (inv.status === 'pending' || inv.status === 'maker') && inv.client?.email
    );

    if (!sendableInvoice) {
      console.log('\n⚠️ No invoices found that can be sent (need status pending/maker + client email)');
      
      // Let's create a test invoice
      console.log('\n🔧 Creating a test invoice...');
      
      // First find or create a test client
      let testClient = await prisma.client.findFirst({
        where: { email: 'drinshd@gmail.com' }
      });
      
      if (!testClient) {
        testClient = await prisma.client.create({
          data: {
            name: 'Test Client',
            email: 'drinshd@gmail.com',
            company: 'Test Company'
          }
        });
        console.log('✅ Created test client');
      }

      // Create a test invoice
      const testInvoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `TEST-${Date.now()}`,
          clientId: testClient.id,
          clientName: testClient.name,
          clientEmail: testClient.email,
          clientCompany: testClient.company,
          status: 'pending',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          subtotal: 1000,
          taxRate: 19,
          taxAmount: 190,
          total: 1190,
          lineItems: {
            create: [
              {
                productName: 'Test Product',
                description: 'Test product for email testing',
                quantity: 2,
                unitPrice: 500,
                total: 1000
              }
            ]
          }
        },
        include: {
          client: true,
          lineItems: true
        }
      });

      console.log(`✅ Created test invoice: ${testInvoice.id}`);
      console.log(`📧 Will send test email to: ${testInvoice.clientEmail}`);

      // Now test sending this invoice
      await testEmailSending(testInvoice);
      
    } else {
      console.log(`\n🎯 Found sendable invoice: ${sendableInvoice.id}`);
      console.log(`📧 Will send to: ${sendableInvoice.client.email}`);
      
      await testEmailSending(sendableInvoice);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function testEmailSending(invoice) {
  console.log('\n📨 Testing Email Sending...');
  console.log('-'.repeat(30));

  try {
    // Simulate the API call that the frontend makes
    const response = await fetch(`http://localhost:3000/api/invoices/${invoice.id}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log(`📡 API Response Status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Email sent successfully!');
      console.log('📧 Result:', result);
      
      // Check if invoice status was updated
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id }
      });
      console.log(`📋 Invoice status updated: ${invoice.status} → ${updatedInvoice.status}`);
      
    } else {
      const error = await response.json();
      console.log('❌ Email sending failed');
      console.log('🔍 Error details:', error);
    }

  } catch (error) {
    console.log('❌ Failed to test email sending via API');
    console.log('🔍 Error:', error.message);
    
    // Try direct SMTP test instead
    console.log('\n🔄 Trying direct SMTP test...');
    await testDirectSMTP(invoice);
  }
}

async function testDirectSMTP(invoice) {
  const nodemailer = require('nodemailer');
  
  try {
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      requireTLS: true,
      tls: {
        rejectUnauthorized: false
      }
    });

    const invoiceNumber = invoice.invoiceNumber || `#${invoice.id.slice(-6)}`;
    
    const result = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to: invoice.clientEmail,
      subject: `Rechnung ${invoiceNumber} - Pro Arbeitsschutz`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Rechnung ${invoiceNumber}</h2>
          <p>Sehr geehrte/r ${invoice.clientName},</p>
          <p>anbei erhalten Sie Ihre Rechnung von <strong>Pro Arbeitsschutz</strong>.</p>
          <p><strong>Rechnungsbetrag: € ${invoice.total.toFixed(2)}</strong></p>
          <hr style="margin: 30px 0;">
          <div style="font-size: 12px; color: #666;">
            <p><strong>Pro Arbeitsschutz</strong><br>
            Dieselstraße 6–8<br>
            63165 Mühlheim am Main<br>
            Tel: +49 6108 9944981<br>
            info@pro-arbeitsschutz.com</p>
          </div>
        </div>
      `
    });

    console.log('✅ Direct SMTP test successful!');
    console.log(`📧 Message ID: ${result.messageId}`);
    
  } catch (error) {
    console.log('❌ Direct SMTP test failed:', error.message);
  }
}

testInvoiceEmailingDirectly().catch(console.error);