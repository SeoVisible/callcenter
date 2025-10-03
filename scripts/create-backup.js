const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function createBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');
    
    // Create backups directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    
    console.log('Creating database backup...');
    
    // Get all data using raw queries to avoid type issues
    const users = await prisma.$queryRaw`SELECT * FROM "User"`;
    const clients = await prisma.$queryRaw`SELECT * FROM "Client"`;  
    const products = await prisma.$queryRaw`SELECT * FROM "Product"`;
    const invoices = await prisma.$queryRaw`SELECT * FROM "Invoice"`;
    const invoiceItems = await prisma.$queryRaw`SELECT * FROM "InvoiceItem"`;
    
    const backup = {
      timestamp: new Date().toISOString(),
      database: 'callcenter',
      data: {
        users: users,
        clients: clients,
        products: products,
        invoices: invoices,
        invoiceItems: invoiceItems
      },
      counts: {
        users: users.length,
        clients: clients.length,
        products: products.length,
        invoices: invoices.length,
        invoiceItems: invoiceItems.length
      }
    };
    
    const backupFile = path.join(backupDir, `database-backup-${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    
    console.log('✅ Backup created successfully!');
    console.log('Backup file:', backupFile);
    console.log('Backup contains:');
    console.log('- Users:', backup.counts.users);
    console.log('- Clients:', backup.counts.clients);
    console.log('- Products:', backup.counts.products);
    console.log('- Invoices:', backup.counts.invoices);
    console.log('- Invoice Items:', backup.counts.invoiceItems);
    
    return backupFile;
    
  } catch (error) {
    console.error('❌ Error creating backup:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createBackup().catch(console.error);