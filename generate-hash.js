const bcrypt = require('bcryptjs');

// Change this to your desired password
const password = '24762476';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('\nCopy the hash above and paste it into your Airtable Users table');
  }
});