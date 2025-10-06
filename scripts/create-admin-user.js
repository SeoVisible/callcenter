const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin@admin.com' }
    });

    if (existingUser) {
      console.log('Admin user already exists:', {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        role: existingUser.role
      });
      return;
    }

    // Create the admin user (plain text password as per current auth system)
    const user = await prisma.user.create({
      data: {
        email: 'admin@admin.com',
        name: 'Administrator',
        password: 'proarbeitsschutz25crm',
        role: 'superadmin'
      }
    });
    
    console.log('✅ Admin user created successfully:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    console.log('\n🔑 Login credentials:');
    console.log('Email: admin@admin.com');
    console.log('Password: proarbeitsschutz25crm');
    
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();