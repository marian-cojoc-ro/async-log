# async-log
Utility and sample code for logging async operations in the context of a web-server using the async_hooks core api

# Requirements
* node: > 8.1.0

# Use the helper

(you can view the demo.js file for all the details)

* add it as a dependency
  
  `yarn add async-log`,

* include it in your main entry point

  `const asyncLog = require('async-log');`

* create a transaction every time your server handles a request

  ```
  const trans = asyncLog.newTransaction({
   url: req.url,
  });
   ```

* end the transaction every time your server finished handling the request

  ```
  trans.end();
  ```

* in between these two calls, every time you want to track fetching a remote resource you need to create a new trace before, then end the created trace after

  ```
  const trace = asyncLog.newTrace({ type: 'db' });
  //...
  trace.end();
  ```

# Use the demo

* clone this repo and change directory to it's folder
* start the server in one tab

  ```bash
  node demo.js
  ```

* make request to the server in another tab
  
  ```
  curl http://localhost:3131/ & curl http://localhost:3131/yoyo & wait
  ```

* in the initial tab, you will see how much each request took, and out of that how much it waited for async resources (file access, network requests, etc.)

# Caveats

* the async wait measurements also include some overhead. So it's not 100% accurate. I consider it close enough for my needs.

# Acknowledgements

This is inspired by [this talk](https://youtu.be/A2CqsR_1wyc?t=19587) from [Thomas Watson](https://github.com/watson) and his [example code](https://github.com/watson/talks/tree/master/2016/06%20NodeConf%20Oslo/example-app)

