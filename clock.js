/* eslint no-console: ["error", { allow: ["warn", "error"] }] */

const cron = require('node-cron')
const process = require('process')
const childProcess = require('child_process')

const simpleLog = process.argv.indexOf('--simple') > -1

cron.schedule('0,15,30,45 * * * * *', () => {
  const { exec } = childProcess
  exec(
    'node app.js {{args}}',
    (error, stdout, stderr) => {
      if (simpleLog) {
        console.warn('Ping!')
      } else {
        console.warn('=* RAN FROM CRON *=')
        console.warn(`stdout: ${stdout}`)
        console.warn(`stderr: ${stderr}`)
      }
      if (error !== null) console.error(`exec error: ${error}`)
    }
  )
})
