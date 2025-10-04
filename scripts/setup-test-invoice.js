require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupTestInvoice() {
  console.log('🔧 Setting up Test Invoice for Dashboard Testing\n');
  
  try {
    // Create a fresh invoice with "pending" status for testing
    const testClient = await prisma.client.upsert({
      where: { email: 'drinshd@gmail.com' },
      create: {
        name: 'Drin Ramadani',
        email: 'drinshd@gmail.com',
        company: 'Test Company',
        phone: '+1234567890',
        createdBy: 'cb0b8732-1e2d-47e4-a035-7172eddc833d', // Use existing user ID
        address: {
          street: 'Test Street 123',
          city: 'Test City',
          zipCode: '12345',
          country: 'Germany'
        }
      },
      update: {}
    });

    const testInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `TEST-${Date.now()}`,
        clientId: testClient.id,
        createdBy: 'cb0b8732-1e2d-47e4-a035-7172eddc833d',
        status: 'pending', // This status allows sending
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        taxRate: 19,
        lineItems: {
          create: [
            {
              productName: 'Test Arbeitsschutzausrüstung',
              description: 'Test product for dashboard email testing',
              quantity: 2,
              unitPrice: 150.00
            }
          ]
        }
      },
      include: {
        client: true,
        lineItems: true
      }
    });

    // Calculate totals
    const subtotal = testInvoice.lineItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const taxAmount = subtotal * (testInvoice.taxRate / 100);
    const total = subtotal + taxAmount;

    // Update the invoice with calculated totals
    await prisma.invoice.update({
      where: { id: testInvoice.id },
      data: {
        // Note: Add these fields to schema if they don't exist
        // For now we'll just ensure the invoice is ready
      }
    });

    console.log('✅ Test invoice created successfully!');
    console.log(`📧 Invoice ID: ${testInvoice.id}`);
    console.log(`📋 Invoice Number: ${testInvoice.invoiceNumber}`);
    console.log(`📊 Status: ${testInvoice.status} (ready to send)`);
    console.log(`👤 Client: ${testInvoice.client.name}`);
    console.log(`📧 Email: ${testInvoice.client.email}`);
    console.log(`💰 Subtotal: €${subtotal.toFixed(2)}`);
    console.log(`💳 Total: €${total.toFixed(2)}`);
    console.log('');
    console.log('🎯 This invoice is ready for testing in your dashboard!');
    console.log('👆 Go to your dashboard and look for this invoice');
    console.log('📧 Click "Rechnung senden" button to test');
    
  } catch (error) {
    console.error('❌ Error creating test invoice:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestInvoice().catch(console.error);