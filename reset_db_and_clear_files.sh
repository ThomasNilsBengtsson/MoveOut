#!/bin/bash


export $(grep -v '^#' .env | xargs)


mysql -u $DB_USER -p$DB_PASSWORD -h $DB_HOST -P $DB_PORT --ssl-ca=./certs/ca-certificate.crt $DB_DATABASE < sql/moveout/ddl.sql

node clearLabelFolders.js

echo "Database and label content reset successfully."
