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
const foldername = 'keys';
const goodPath = Path.join(__dirname, 'db2', 'indexes', foldername);
const badPath = Path.join(__dirname, 'db2', 'indexes-bad', foldername);

(async function main() {
  try {
    const goodLevel = Level(goodPath);
    const badLevel = Level(badPath);

    const goodMeta = JSON.parse(
      await promisify(goodLevel.get.bind(goodLevel))('\x00'),
    );
    console.log(
      `Loaded keys leveldb with:\n` +
        `  Version: ${goodMeta.version}\n` +
        `  Entries: ${goodMeta.processed}\n` +
        `  Offset: ${goodMeta.offset}\n`,
    );

    const badMeta = JSON.parse(
      await promisify(badLevel.get.bind(badLevel))('\x00'),
    );
    console.log(
      `Loaded keys leveldb with:\n` +
        `  Version: ${badMeta.version}\n` +
        `  Entries: ${badMeta.processed}\n` +
        `  Offset: ${badMeta.offset}\n`,
    );

    const spinner = ora('Validating...').start();

    // setTimeout(() => {
    //   spinner.color = 'yellow';
    //   spinner.text = 'Loading rainbows';
    // }, 1000);

    const goodDataset = [];
    const badDataset = [];

    let i = 0;
    goodLevel
      .createReadStream({keys: true, values: true})
      .on('data', (data) => {
        if (data.key === '\x00') return;
        const key = data.key;
        const seq = parseInt(data.value, 10);
        goodDataset.push({key, seq});
        const percent = ((100 * i++) / goodMeta.processed).toFixed(1);
        spinner.text = `Scanning good leveldb at ${percent}%...`;
      })
      .on('error', (err) => {
        spinner.fail(err);
      })
      .on('end', () => {
        i = 0;
        badLevel
          .createReadStream({keys: true, values: true})
          .on('data', (data) => {
            if (data.key === '\x00') return;
            const key = data.key;
            const seq = parseInt(data.value, 10);
            badDataset.push({key, seq});
            const percent = ((100 * i++) / goodMeta.processed).toFixed(1);
            spinner.text = `Scanning bad leveldb at ${percent}%...`;
          })
          .on('error', (err) => {
            spinner.fail(err);
          })
          .on('end', () => {
            spinner.succeed('Scanned all');

            let minimumSeq = Number.MAX_SAFE_INTEGER;
            for (let j = 0; j < goodDataset.length; j++) {
              const good = goodDataset[j];
              const bad = badDataset[j];
              if (good.key !== bad.key || good.seq !== bad.seq) {
                console.log(`Mismatch at #${j}!`, good, bad);
                minimumSeq = Math.min(minimumSeq, good.seq, bad.seq);
                if (minimumSeq === 1381000) {
                  process.exit(1);
                }
              }
            }
            console.log('Minumum:', minimumSeq);
          });
      });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
