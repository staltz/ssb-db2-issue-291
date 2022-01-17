const Path = require('path');
const AAOL = require('async-append-only-log');
const BIPF = require('bipf');

const logPath = Path.join(__dirname, 'db2', 'log.bipf');

const BLOCK = 64 * 1024;
const log = AAOL(logPath, {
  blockSize: BLOCK,
  validateRecord: (d) => {
    try {
      BIPF.decode(d, 0);
      return true;
    } catch (ex) {
      return false;
    }
  },
});

const map = new Map();
log.stream({}).pipe({
  paused: false,
  write: function (record) {
    const buffer = record.value;
    const offset = record.offset;
    const msg = BIPF.decode(buffer);
    if (map.has(msg.key)) {
      const existing = map.get(msg.key);
      console.log(
        `${msg.key} already exists at offset ${existing}, ` +
          `would repeat at offset ${offset}`,
      );
      process.exit(1);
    } else {
      map.set(msg.key, offset);
    }
  },
  end: () => {
    console.log('No duplicates found');
    process.exit(0);
  },
});
