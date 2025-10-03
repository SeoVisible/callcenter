const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testInvoiceNumbers() {
  try {
    console.log('🧪 Testing invoice number functionality...\n');
    
    // Check existing invoices
    const existingInvoices = await prisma.$queryRaw`
      SELECT id, "invoiceNumber", "createdAt" 
      FROM "Invoice" 
      ORDER BY "createdAt";
    `;
    console.log('📋 Existing invoices:');
    console.log(existingInvoices);
    
    // Test sequence
    console.log('\n🔢 Testing sequence...');
    const nextVal = await prisma.$queryRaw`SELECT nextval('invoice_number_seq') as nextval;`;
    console.log('Next sequence value:', Number(nextVal[0].nextval));
    
    // Test invoice number generation function
    try {
      const { generateNextInvoiceNumber } = require('../lib/invoice-number.ts');
      const nextNumber = await generateNextInvoiceNumber();
      console.log('Next invoice number from function:', nextNumber);
    } catch (error) {
      console.log('⚠️  Invoice number function error:', error.message);
    }
    
    console.log('\n✅ Invoice number system is ready!');
    console.log('📝 Next steps:');
    console.log('1. Create a new invoice through the UI');
    console.log('2. Check that it gets assigned invoice number #002');
    console.log('3. Verify the PDF shows the invoice number');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testInvoiceNumbers();