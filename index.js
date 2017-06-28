const fs = require('fs');
const util = require('util');
const asyncHooks = require('async_hooks');

const agent = module.exports = {};

const initState = new Map();
const prevState = new Map();

// hooks
function init(id/*, type, triggerId, resource*/) {
  initState.set(id, agent.currentTransaction);
}

function before(id) {
  prevState.set(id, agent.currentTransaction);
  agent.currentTransaction = initState.get(id);
}

function after(id) {
  agent.currentTransaction = prevState.get(id);
}

function destroy(id) {
  initState.delete(id);
  prevState.delete(id);
}

const hook = asyncHooks.createHook({init, before, after, destroy});
hook.enable();

/**
 *
 * @param trace
 * @returns {number} milliseconds
 */
function timeDiff(trace) {
  const diff = [
    trace.end[0] - trace.start[0],
    trace.end[1] - trace.start[1],
  ];
  return (diff[0] * 1e9 + diff[1]) / 1e6;
}

class Trace {
  constructor(name, onEnd){
    this.name = name;
    this._onEnd = onEnd;
    this._start = process.hrtime();
    this.duration = null;
  }
  end() {
    const diff = process.hrtime(this._start);
    const ns = diff[0] * 1e9 + diff[1];
    this.duration = ns / 1e6;
    this._onEnd(this);
  }
}

class Transaction{
  constructor(data, onEnd) {
    this.data = data;
    this._onEnd = onEnd;
    this.traces = [];
    this.tracePoints = [];
    this.ended = false;
    this.rootTrace = {
      data: { type: 'transaction' },
      start: process.hrtime(),
    };
  }

  newTrace(data) {
    const trans = this;
    const trace = {
      data,
      start: process.hrtime(),
    };
    trans.tracePoints.push({
      value: trace.start,
      type: 'start',
    });
    return ({
      end() {
        if (trans.ended) {
          return;
        }
        trace.end = process.hrtime();
        trans.traces.push(trace);
        trans.tracePoints.push({
          value: trace.end,
          type: 'end',
        });
      },
    });
  }

  end() {
    this.rootTrace.end = process.hrtime();
    this.ended = true;
    this._onEnd(this);
  }
}

agent.newTransaction = function newTransaction(data, onEnd = null) {

  const doOnEnd = onEnd || ((trans) => {
    const total = timeDiff(trans.rootTrace);
    let traceFlag = 0;
    let start = null;
    let totalAdded = 0;
    trans.tracePoints.forEach((tracePoint) => {
      if (tracePoint.type === 'start') {
        if (!start) {
          start = tracePoint.value;
        }
        traceFlag = traceFlag + 1;
      } else {
        // type is end
        traceFlag = traceFlag - 1;
        if (traceFlag === 0) {
          totalAdded = totalAdded + timeDiff({start: start, end: tracePoint.value});
          start = null;
        }
      }
    });
    console.log(`# Transaction: ${trans.data.url} took ${Math.round(total)}ms but waited ${Math.round(totalAdded)}ms for ${trans.traces.length} resources`);
  });
  agent.currentTransaction = new Transaction(data, doOnEnd);
  return agent.currentTransaction;
};

agent.newTrace = function(data) {
  return agent.currentTransaction.newTrace(data);
};
