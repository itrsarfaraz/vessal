const path = require('path');
const tsNode = require('ts-node');

// Register ts-node to compile TypeScript files on the fly
tsNode.register({
  project: path.join(__dirname, 'tsconfig.json'),
});

// Load the TypeORM CLI
require('typeorm/cli');
