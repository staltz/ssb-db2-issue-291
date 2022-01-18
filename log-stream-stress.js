const BIPF = require('bipf');
const SecretStack = require('secret-stack');
const caps = require('ssb-caps');
const Keys = require('ssb-keys');
const fs = require('fs');

const B_KEY = Buffer.from('key');

const verifyMode = process.argv.includes('--verify');

const sbot = SecretStack({caps})
  .use(require('ssb-db2'))
  .call(null, {
    path: __dirname,
    keys: Keys.generate(),
    db2: {
      maxCpu: 91, // %
      maxCpuWait: 80, // ms
      maxCpuMaxPause: 120, // ms
    },
  });

setTimeout(() => {
  const fileStream = verifyMode
    ? null
    : fs.createWriteStream('keys.txt', {flags: 'a'});

  const keysStored = fs.readFileSync('keys.txt', 'UTF-8');
  const lines = keysStored.split('\n');
  let i = 0;

  const stream = sbot.db.getLog().stream({gt: 0});

  stream
    .pipe({
      paused: false,
      write(record) {
        const buf = record.value;
        const pKey = BIPF.seekKey(buf, 0, B_KEY);
        const key = BIPF.decode(buf, pKey);
        const expectedKey = lines[i];
        i += 1;
        if (verifyMode) {
          if (key !== expectedKey) {
            console.log(`Offset ${record.offset} (seq=${i}) has bad key.`);
            console.log(`Expected: ${expectedKey}`);
            console.log(`Actual:   ${key}`);
            process.exit(1);
          }
        } else {
          fileStream.write(`${key}\n`);
        }
      },
      end() {
        if (!verifyMode) fileStream.end();
        sbot.close(true);
      },
    });

  setTimeout(function forceIt() {
    console.log('force stream.resume()')
    stream.resume();
    setTimeout(forceIt, Math.random()*200);
  }, 20);
}, 1000);
