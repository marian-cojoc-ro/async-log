const fs = require('fs');
const http = require('http');

const asyncLog = require('./');

function doCall1(){
  return new Promise((y) => {
    const trace = asyncLog.newTrace({ type: 'db' });
    setTimeout(() => {
      trace.end();
      y();
    }, 200);
  });
}

function doCall2() {
  return new Promise((y) => {
    const trace = asyncLog.newTrace({ type: 'db' });
    setTimeout(() => {
      trace.end();
      y();
    }, 600);
  });
}

function handle(req, res) {
  if (req.url === '/') {
    doCall1().then(() => {
      res.end(`response for: ${req.url}\n`);
    });
  } else {
    Promise.all([doCall1(), doCall2()]).then(() => {
      setTimeout(() => {
        doCall1().then(() => {
          res.end(`response for: ${req.url}\n`);
        });
      }, 500);
    });
  }
}

http.createServer((req, res) => {
  // create a new transaction every time the server handles a request
  const trans = asyncLog.newTransaction({
    url: req.url,
  });

  res.on('finish', function () {
    trans.data.status = res.statusCode;
    trans.end();
  });

  handle(req, res);

}).listen(3131, () => {
  console.log(`** started listening on port ${3131}`);
});
