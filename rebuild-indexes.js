const SecretStack = require('secret-stack');
const caps = require('ssb-caps');
const Keys = require('ssb-keys');
const Mnemonic = require('ssb-keys-mnemonic');
const readline = require('readline');
const {
  where,
  or,
  type,
  author,
  hasRoot,
  hasFork,
  isRoot,
  isPrivate,
  isPublic,
  votesFor,
  toCallback,
} = require('ssb-db2/operators');

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

  const keys =
    userInput.length > 10 ? Mnemonic.wordsToKeys(userInput) : Keys.generate();
  console.log('\nYour ID is', keys.id);
  console.log('\nRebuilding indexes...');

  const sbot = SecretStack({caps})
    .use(require('ssb-db2'))
    .use(require('ssb-db2/about-self'))
    .use(require('ssb-db2/compat/ebt'))
    .use(require('ssb-db2/full-mentions'))
    .use(require('ssb-friends'))
    .use(require('ssb-threads'))
    .use(require('ssb-search2'))
    .call(null, {path: __dirname, keys});

  setTimeout(() => {
    sbot.db.query(
      where(
        or(
          type('contact'),
          type('post'),
          type('pub'),
          type('room/alias'),
          type('vote'),
          votesFor('NOTHING'),
          hasRoot('NOTHING'),
          hasFork('NOTHING'),
          isRoot(),
          isPrivate(),
          isPublic(),
          author('@NOTHINGNOTHINGNOTHINGNOTHINGNTOHING', {dedicated: false}),
        ),
      ),
      toCallback((err, msgs) => {
        console.log('Indexes rebuilt! They should be now in ./db2/indexes');
        sbot.close();
      }),
    );
  }, 1000);
});
