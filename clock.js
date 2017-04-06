const CronJob = require('cron').CronJob
const childProcess = require('child_process')

new CronJob({
  cronTime: '1 * * * *', //15 seconds after every minute
  onTick: runBout('./app.js', function (err) {
    if (err) throw err
    console.log('Finished running app.js')
  }),
  start: true
})

function runBout(scriptPath, callback) {

  // keep track of whether callback has been invoked to prevent multiple invocations
  let invoked = false

  const process = childProcess.fork(scriptPath)

  // listen for errors as they may prevent the exit event from firing
  process.on('error', function (err) {
    if (invoked) return
    invoked = true
    callback(err)
  })

  // execute the callback once the process has finished running
  process.on('exit', function (code) {
    if (invoked) return
    invoked = true
    const err = code === 0 ? null : new Error('exit code ' + code)
    callback(err)
  })

}
