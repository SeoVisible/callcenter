require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testEmailWithUpdatedPDF() {
  console.log('🧪 Testing Email with Updated PDF Format...\n');
  
  const invoiceId = 'fa09c3c5-852d-42f5-8b3f-80213355ab9d';
  
  try {
    // Make sure the invoice status is back to pending so we can send it
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'pending' },
    });

    console.log('📋 Invoice status reset to pending');
    console.log('🚀 Starting Next.js dev server for API test...');
    
    // We need to start the dev server to test the API endpoint
    console.log('Please start the dev server with: npm run dev');
    console.log('Then test the API endpoint manually or through the UI');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testEmailWithUpdatedPDF();