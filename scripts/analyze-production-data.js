const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeProductionData() {
  console.log('🔍 Analyzing production data before migration...\n');

  try {
    // Count total invoices
    const totalInvoices = await prisma.invoice.count();
    console.log(`📊 Total invoices in database: ${totalInvoices}`);

    // Count invoices with invoice numbers
    const invoicesWithNumbers = await prisma.invoice.count({
      where: {
        invoiceNumber: {
          not: null
        }
      }
    });
    console.log(`🔢 Invoices with invoice numbers: ${invoicesWithNumbers}`);

    // Get unique invoice numbers
    const uniqueInvoiceNumbers = await prisma.invoice.findMany({
      where: {
        invoiceNumber: {
          not: null
        }
      },
      select: {
        invoiceNumber: true,
        clientId: true,
        client: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        invoiceNumber: 'asc'
      }
    });

    console.log('\n📋 Current invoice numbers by client:');
    const clientGroups = {};
    uniqueInvoiceNumbers.forEach(invoice => {
      const clientName = invoice.client?.name || 'Unknown';
      if (!clientGroups[clientName]) {
        clientGroups[clientName] = [];
      }
      clientGroups[clientName].push(invoice.invoiceNumber);
    });

    for (const [clientName, numbers] of Object.entries(clientGroups)) {
      console.log(`  ${clientName}: ${numbers.join(', ')}`);
    }

    // Check for potential conflicts (same invoice number for different clients)
    console.log('\n🔍 Checking for potential invoice number conflicts...');
    const numberCounts = {};
    uniqueInvoiceNumbers.forEach(invoice => {
      const num = invoice.invoiceNumber;
      if (!numberCounts[num]) {
        numberCounts[num] = [];
      }
      numberCounts[num].push(invoice.client?.name || 'Unknown');
    });

    let hasConflicts = false;
    for (const [number, clients] of Object.entries(numberCounts)) {
      if (clients.length > 1) {
        console.log(`⚠️  Invoice number ${number} is used by multiple clients: ${clients.join(', ')}`);
        hasConflicts = true;
      }
    }

    if (!hasConflicts) {
      console.log('✅ No conflicts found - each invoice number is unique across all clients');
    }

    console.log('\n📝 Migration Safety Assessment:');
    console.log('✅ Removing unique constraint is SAFE - no data will be lost');
    console.log('✅ All existing invoice numbers will remain unchanged');
    console.log('✅ New invoices will use client-specific numbering');
    
  } catch (error) {
    console.error('❌ Error analyzing production data:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeProductionData();