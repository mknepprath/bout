const cron = require('node-cron')
const childProcess = require('child_process')

cron.schedule('* * * * *', () => {
  childProcess.exec('node app.js')
})
