const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestClients() {
  console.log('🏢 Creating test clients for invoice numbering demo\n');

  // Get the admin user to use as createdBy
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@admin.com' }
  });

  if (!adminUser) {
    console.log('❌ Admin user not found. Please create admin user first.');
    return;
  }

  const testClients = [
    {
      name: 'ABC Company GmbH',
      email: 'contact@abc-company.de',
      address: { street: 'Musterstraße 123', city: 'Berlin', zipCode: '12345', country: 'Germany' },
      phone: '+49 30 123456789',
      company: 'ABC Company GmbH',
      createdBy: adminUser.id
    },
    {
      name: 'XYZ Solutions AG',
      email: 'info@xyz-solutions.de',
      address: { street: 'Beispielweg 456', city: 'Hamburg', zipCode: '54321', country: 'Germany' },
      phone: '+49 40 987654321',
      company: 'XYZ Solutions AG',
      createdBy: adminUser.id
    },
    {
      name: 'Tech Innovations UG',
      email: 'hello@tech-innovations.de',
      address: { street: 'Innovationsplatz 789', city: 'München', zipCode: '98765', country: 'Germany' },
      phone: '+49 89 555666777',
      company: 'Tech Innovations UG',
      createdBy: adminUser.id
    }
  ];

  try {
    for (const clientData of testClients) {
      // Check if client already exists
      const existingClient = await prisma.client.findUnique({
        where: { email: clientData.email }
      });

      if (existingClient) {
        console.log(`✅ Client already exists: ${clientData.name}`);
        continue;
      }

      const client = await prisma.client.create({
        data: clientData
      });

      console.log(`✅ Created client: ${client.name} (ID: ${client.id})`);
    }

    console.log('\n🎉 Test clients ready for invoice numbering demo!');
    
  } catch (error) {
    console.error('❌ Error creating test clients:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestClients();