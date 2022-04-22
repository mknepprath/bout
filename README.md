# Bout (@bout_bot)

To update: All of this must get compressed into a ZIP file and upload to the AWS Lambda dashboard.

To prepare to run, you must:

- Export the required environment variables
- `npm install`

To run:

```shell
→ node testHandler.js
```

This will invoke the handler that is run by the AWS Lambda service.

Bout uses a Heroku Postgres database. The password for this database sometimes changes. This wasn't an issue when Bout ran on Heroku where the environment variables were updated automatically. Bout is now deployed as an AWS Lambda. The `DATABASE_URL` environment variable will need to be updated manually anytime it changes in Heroku.
