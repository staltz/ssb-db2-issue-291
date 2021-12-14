const SecretStack = require('secret-stack');
const caps = require('ssb-caps');
const Keys = require('ssb-keys');
const Mnemonic = require('ssb-keys-mnemonic');
const readline = require('readline');
const {where, and, type, toCallback} = require('ssb-db2/operators');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('Type your 24 key-recovery words below THEN newline\n');

rl.prompt();

let gotIt = false;
rl.on('line', (userInput) => {
  if (gotIt) return;
  else gotIt = true;

  const keys = Mnemonic.wordsToKeys(userInput);
  console.log('\nYour ID is', keys.id);
  console.log('\nRebuilding indexes...');

  const sbot = SecretStack({caps})
    .use(require('ssb-db2'))
    .call(null, {path: __dirname, keys});

  setTimeout(() => {
    sbot.db.query(
      where(and(type('post'))),
      toCallback((err, msgs) => {
        console.log('Indexes rebuilt! They should be now in ./db2/indexes');
        sbot.close();
      }),
    );
  }, 1000);
});
