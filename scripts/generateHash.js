const bcrypt = require('bcryptjs');

const generateHash = async () => {
    const password = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    console.log('Password: admin123');
    console.log('Hash:', hash);
    console.log('\nMongoDB Command:');
    console.log('================');
    console.log('use foundry');
    console.log('');
    console.log('db.users.insertOne({');
    console.log('  name: "Admin User",');
    console.log('  email: "admin@foundry.io",');
    console.log(`  password_hash: "${hash}",`);
    console.log('  role: "ADMIN",');
    console.log('  created_at: new Date()');
    console.log('})');
};

generateHash();
