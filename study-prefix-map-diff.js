const Path = require('path');
const promisify = require('util').promisify;
const {loadPrefixMapFile} = require('jitdb/files');

const filename = 'value_author.32prefix';
const goodPath = Path.join(__dirname, 'db2', 'indexes', filename);
const badPath = Path.join(__dirname, 'db2', 'indexes-bad', filename);

(async function main() {
  try {
    const goodIndex = await promisify(loadPrefixMapFile)(goodPath);
    console.log(
      `Loaded good index with:\n` +
        // `  Version: ${goodIndex.version}\n` +
        `  Entries: ${goodIndex.count}\n` +
        `  Offset: ${goodIndex.offset}\n`,
    );

    // const badIndex = await promisify(loadPrefixMapFile)(badPath, Uint32Array);
    // console.log(
    //   `Loaded BAD index with:\n` +
    //     `  Version: ${badIndex.version}\n` +
    //     `  Entries: ${badIndex.count}\n` +
    //     `  Offset: ${badIndex.offset}\n`,
    // );

    // const goodJSON = JSON.stringify(goodIndex.map);
    // const badJSON = JSON.stringify(badIndex.map);

    if (goodJSON !== badJSON) {
      // console.log(`Indexes are different!`, goodIndex.map, badIndex.map);
      process.exit(1);
    } else {
      console.log(`Indexes are the same!`);
      process.exit(0);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
