#!/bin/bash
set -eo pipefail

if [ -z "$SHIPPING_DB_USER" ] || [ -z "$SHIPPING_DB_PASSWORD" ]; then
    echo "ERROR: SHIPPING_DB_USER or SHIPPING_DB_PASSWORD is not set." >&2
    exit 1
fi

if [ -z "$RATINGS_DB_USER" ] || [ -z "$RATINGS_DB_PASSWORD" ]; then
    echo "ERROR: RATINGS_DB_USER or RATINGS_DB_PASSWORD is not set." >&2
    exit 1
fi

MYSQL_AUTH="-uroot"
if [ -n "$MYSQL_ROOT_PASSWORD" ]; then
    MYSQL_AUTH="-uroot -p${MYSQL_ROOT_PASSWORD}"
fi

SHIPPING_DB="${MYSQL_DATABASE:-cities}"

escape_sql_literal() {
    # Escape backslashes first, then single quotes
    printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e "s/'/\\\\'/g"
}

ESC_SHIP_USER=$(escape_sql_literal "$SHIPPING_DB_USER")
ESC_SHIP_PASS=$(escape_sql_literal "$SHIPPING_DB_PASSWORD")
ESC_RATE_USER=$(escape_sql_literal "$RATINGS_DB_USER")
ESC_RATE_PASS=$(escape_sql_literal "$RATINGS_DB_PASSWORD")

# Provision users using safely escaped literals
mysql $MYSQL_AUTH <<-EOSQL
    CREATE USER IF NOT EXISTS '${ESC_SHIP_USER}'@'%' IDENTIFIED BY '${ESC_SHIP_PASS}';
    GRANT ALL ON \`${SHIPPING_DB}\`.* TO '${ESC_SHIP_USER}'@'%';

    CREATE USER IF NOT EXISTS '${ESC_RATE_USER}'@'%' IDENTIFIED BY '${ESC_RATE_PASS}';
    GRANT ALL ON \`ratings\`.* TO '${ESC_RATE_USER}'@'%';

    FLUSH PRIVILEGES;
EOSQL

echo "Application users provisioned successfully."
