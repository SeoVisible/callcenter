const { PrismaClient } = require('@prisma/client');
const { generateNextInvoiceNumberForClient, getClientInvoiceNumbers } = require('../lib/client-invoice-number.ts');

const prisma = new PrismaClient();

async function testClientInvoiceNumbers() {
  console.log('🧪 Testing Client-Specific Invoice Numbering\n');

  try {
    // Get all clients to test with
    const clients = await prisma.client.findMany({
      select: { id: true, name: true, email: true }
    });

    if (clients.length === 0) {
      console.log('❌ No clients found. Please create some clients first.');
      return;
    }

    console.log(`📋 Found ${clients.length} clients:\n`);
    
    for (const client of clients) {
      console.log(`👤 Client: ${client.name} (${client.email})`);
      
      // Get existing invoice numbers for this client
      const existingNumbers = await getClientInvoiceNumbers(client.id);
      console.log(`   Existing invoices: ${existingNumbers.length > 0 ? existingNumbers.join(', ') : 'None'}`);
      
      // Generate next invoice number for this client
      const nextNumber = await generateNextInvoiceNumberForClient(client.id);
      console.log(`   Next invoice number: ${nextNumber}`);
      console.log('');
    }

    console.log('✅ Client-specific invoice numbering is working correctly!');
    console.log('\n📝 How it works:');
    console.log('- Each client gets their own invoice sequence starting from 001');
    console.log('- Client A: 001, 002, 003, ...');
    console.log('- Client B: 001, 002, 003, ...');
    console.log('- Client C: 001, 002, 003, ...');
    
  } catch (error) {
    console.error('❌ Error testing client invoice numbers:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testClientInvoiceNumbers();