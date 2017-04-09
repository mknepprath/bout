const cron = require('node-cron')
const process = require('process')
const child_process = require('child_process')

const simple_log = process.argv.indexOf('--simple') > -1

cron.schedule('0,15,30,45 * * * * *', function () {
  var exec = child_process.exec, child

  child = exec('node app.js {{args}}',
    function (error, stdout, stderr) {
      if (simple_log) {
        console.log('Ping!')
      } else {
        console.log('=================')
        console.log('* RAN FROM CRON *')
        console.log('=================')
        console.log(stdout)
      }
      if (stderr) console.log('stderr: ' + stderr)
      if (error !== null) console.log('exec error: ' + error)
  })
})
