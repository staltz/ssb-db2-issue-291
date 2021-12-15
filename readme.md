Just some scripts I put together to debug https://github.com/ssb-ngi-pointer/ssb-db2/issues/291

-------

1. Make sure you have `log.bipf` in `./db2/log.bipf`
1. `npm install`
1. `node rebuild-indexes.js` and wait for it to complete
1. Send me `./db2/indexes` as a zip