const Path = require('path');
const promisify = require('util').promisify;
const {loadTypedArrayFile} = require('jitdb/files');

const filename = 'timestamp.index';
const goodPath = Path.join(__dirname, 'db2', 'indexes', filename);
const badPath = Path.join(__dirname, 'db2', 'indexes-bad', filename);

(async function main() {
  try {
    const goodIndex = await promisify(loadTypedArrayFile)(
      goodPath,
      Uint32Array,
    );
    console.log(
      `Loaded good index with:\n` +
        `  Entries: ${goodIndex.count}\n` +
        `  Offset: ${goodIndex.offset}\n`,
    );

    const badIndex = await promisify(loadTypedArrayFile)(badPath, Uint32Array);
    console.log(
      `Loaded BAD index with:\n` +
        `  Entries: ${badIndex.count}\n` +
        `  Offset: ${badIndex.offset}\n`,
    );

    for (let i = 0; i < goodIndex.count; i++) {
      const goodEntry = goodIndex.tarr[i];
      const badEntry = badIndex.tarr[i];
      if (goodEntry !== badEntry) {
        console.log(`Difference at index ${i}: ${goodEntry} vs ${badEntry}`);
        process.exit(1);
      }
    }
    console.log('Indexes are identical!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
