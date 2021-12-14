const Path = require('path');
const FS = require('fs');
const BIPF = require('bipf');
const Level = require('level');
const AAOL = require('async-append-only-log');
const ora = require('ora');
const promisify = require('util').promisify;
const {
  loadBitsetFile,
  loadPrefixMapFile,
  loadTypedArrayFile,
} = require('jitdb/files');

const logPath = Path.join(__dirname, 'db2', 'log.bipf');
const keysIndexPath = Path.join(__dirname, 'db2', 'indexes', 'keys');
const seqIndexPath = Path.join(__dirname, 'db2', 'indexes', 'seq.index');

(async function main() {
  try {
    const log = AAOL(logPath, {
      blockSize: 64 * 1024,
      validateRecord: (d) => {
        try {
          BIPF.decode(d, 0);
          return true;
        } catch (ex) {
          return false;
        }
      },
    });

    const seqIndex = await promisify(loadTypedArrayFile)(
      seqIndexPath,
      Uint32Array,
    );
    console.log(
      `Loaded seq.index with:\n` +
        `  Entries: ${seqIndex.count}\n` +
        `  Offset: ${seqIndex.offset}\n`,
    );
    // idx.tarr[seq] = offset

    const keysLevel = Level(keysIndexPath);

    const meta = JSON.parse(
      await promisify(keysLevel.get.bind(keysLevel))('\x00'),
    );
    console.log(
      `Loaded keys leveldb with:\n` +
        `  Version: ${meta.version}\n` +
        `  Entries: ${meta.processed}\n` +
        `  Offset: ${meta.offset}\n`,
    );

    const spinner = ora('Validating...').start();

    // setTimeout(() => {
    //   spinner.color = 'yellow';
    //   spinner.text = 'Loading rainbows';
    // }, 1000);

    let minBrokenSeq = Number.MAX_SAFE_INTEGER;

    const dataset = [];

    keysLevel
      .createReadStream({keys: true, values: true})
      .on('data', (data) => {
        if (data.key === '\x00') return;
        const actualKey = data.key;
        const seq = parseInt(data.value, 10);
        const offset = seqIndex.tarr[seq];
        log.get(offset, (err, record) => {
          if (err) {
            console.error('Log.get Error', err);
            process.exit(1);
          }
          const msg = BIPF.decode(record, 0);
          const expectedKey = msg.key;
          if (actualKey !== expectedKey) {
            // spinner.text =
            //   `Invalid key:\n` +
            //   `  actual   = ${actualKey}\n` +
            //   `  expected = ${expectedKey}\n` +
            //   `  offset   = ${offset}\n` +
            //   `  seq      = ${seq}\n`;
            // `  msg      = ${JSON.stringify(msg)}\n`,
            dataset.push({actualKey, expectedKey, offset, seq});
            minBrokenSeq = Math.min(minBrokenSeq, seq);
          } else {
            dataset.push({actualKey, expectedKey, offset, seq});
            // spinner.text = `Validated key ${actualKey} ${seq}`;
          }
        });
      })
      .on('error', (err) => {
        spinner.fail(err);
      })
      .on('end', () => {
        spinner.succeed('Level stream ended');
        const minBrokenOffset = seqIndex.tarr[minBrokenSeq];
        console.log('\nminBrokenSeq =', minBrokenSeq);
        console.log('minBrokenOffset =', minBrokenOffset);

        if (FS.existsSync('study.txt')) {
          FS.unlinkSync('study.txt')
        }
        const stream = FS.createWriteStream('study.txt', {flags: 'a'});
        dataset
          .sort((a, b) => a.seq - b.seq)
          .forEach((d) => {
            if (d.actualKey !== d.expectedKey) {
              stream.write(
                `${d.seq} | ${d.offset} | ${d.actualKey} | ${d.expectedKey}\n`,
              );
            } else {
              stream.write(`${d.seq} | ${d.offset} | ${d.actualKey}\n`);
            }
          });
        stream.end();
      });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
