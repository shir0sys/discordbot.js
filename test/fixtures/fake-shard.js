// Stands in for a real bot process in ShardingManager tests: mimics the IPC
// contract ShardClientUtil implements, without starting a real Gateway connection.
globalThis.shardId = Number(process.env.SHARD_ID);

process.on("message", (message) => {
  if (message?._sEval) {
    try {
      const value = eval(message._sEval);
      process.send({ _sEvalResult: true, _id: message._id, value });
    } catch (error) {
      process.send({ _sEvalResult: true, _id: message._id, error: error.message });
    }
  }
});

process.send({ _sReady: true });
