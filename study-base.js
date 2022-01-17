const Path = require('path');
const FS = require('fs');
const Level = require('level');
const ora = require('ora');
const promisify = require('util').promisify;

const baseIndexPath = Path.join(__dirname, 'db2', 'indexes', 'base');

(async function main() {
  try {
    const baseLevel = Level(baseIndexPath);

    const meta = JSON.parse(
      await promisify(baseLevel.get.bind(baseLevel))('\x00'),
    );
    console.log(
      `Loaded keys leveldb with:\n` +
        `  Version: ${meta.version}\n` +
        `  Entries: ${meta.processed}\n` +
        `  Offset: ${meta.offset}\n`,
    );

    const spinner = ora('Validating...').start();

    const dataset = [];

    baseLevel
      .createReadStream({keys: true, values: true})
      .on('data', (data) => {
        if (data.key === '\x00') return;
        const authorId = data.key;
        const {sequence, offset} = JSON.parse(data.value);
        dataset.push({authorId, sequence, offset});
      })
      .on('error', (err) => {
        spinner.fail(err);
      })
      .on('end', () => {
        spinner.succeed('Level stream ended');

        if (FS.existsSync('study.txt')) {
          FS.unlinkSync('study.txt');
        }
        const stream = FS.createWriteStream('study.txt', {flags: 'a'});
        dataset.forEach(({authorId, sequence, offset}) => {
          stream.write(`${authorId} | ${offset} | ${sequence}\n`);
        });
        stream.end();
      });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
