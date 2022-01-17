const Path = require('path');
const pull = require('pull-stream');
const FlumeLog = require('flumelog-offset');
const AAOL = require('async-append-only-log');
const BIPF = require('bipf');
const json = require('flumecodec/json');
const FS = require('fs');

const log1Path = Path.join(__dirname, 'flume', 'log.offset');
const log2Path = Path.join(__dirname, 'db2', 'log.bipf');

const BLOCK = 64 * 1024;
const log1 = FlumeLog(log1Path, {blockSize: BLOCK, codec: json});
const log2 = AAOL(log2Path, {
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

let summary1 = '';
pull(
  log1.stream({seqs: false, codec: json}),
  pull.drain(
    (msg) => {
      summary1 += `${msg.value.author} #${msg.value.sequence} ${msg.key}\n`;
    },
    () => {
      let summary2 = '';
      log2.stream({}).pipe({
        paused: false,
        write: function (record) {
          i++;
          const buffer = record.value;
          const msg = BIPF.decode(buffer);

          summary2 += `${msg.value.author} #${msg.value.sequence} ${msg.key}\n`;
        },

        end: () => {
          FS.writeFileSync('./log-offset-summary', summary1);
          FS.writeFileSync('./log-bipf-summary', summary2);
          process.exit(0);
        },
      });
    },
  ),
);
