'CREATE TABLE bouts (id SERIAL PRIMARY KEY, tweet_id VARCHAR(40) not null, current_id VARCHAR(40) not null, next_id VARCHAR(40) not null, player_data jsonb);'

heroku run worker --app boutbot

Vars
export DATABASE_URL=postgres://uuneqniuttwlga:09c9ea960d793cbc7fbb0612937c0e02004a792aab6c484304b8b01dad186ff7@ec2-54-163-234-140.compute-1.amazonaws.com:5432/da52r59q3ke190
export ACCESS_TOKEN_KEY=2578652522-ryLGPZC6Cy84TySAftw12s4xAjJG0of9Tto48ik
export ACCESS_TOKEN_SECRET=yL0K63v1dHMlsljat0z2jfv5em6K7i99QgC3sWLJtLInV
export CONSUMER_KEY=gBE32DFY3YNJJZfm21TjkYqOO
export CONSUMER_SECRET=9vBbsofTABalH1R1A42iLEQQiiU9a6r6dEuCMT55lE6xoG8QBi

To handle this error... "The local psql command could not be located."
PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"

From psql command line:
\dt => lists all tables
\q => quit psql
select * from bouts; => lists all bouts
:q => quit table view
drop table [table name] => deletes table
