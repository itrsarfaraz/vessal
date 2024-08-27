const fs = require('fs-extra');
const path = require('path');

const copyFiles = async () => {
  try {
    await fs.copy(path.join(__dirname, 'src/templates'), path.join(__dirname, 'dist/templates'));
    await fs.copy(path.join(__dirname, 'package.json'), path.join(__dirname, 'dist/package.json'));
    await fs.copy(path.join(__dirname, '.env'), path.join(__dirname, 'dist/.env'));
    console.log('Templates and package.json copied successfully!');
  } catch (err) {
    console.error('Error copying files:', err);
  }
};

copyFiles();
