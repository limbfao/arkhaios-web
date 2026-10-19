#!/bin/bash
# Runs Arkhaios locally with fake data: local Redis + MongoDB in Docker,
# mocked external APIs, and a seeded demo account. No .env needed.
#   ./demo/start.sh          start (seeds the database on first run)
#   ./demo/start.sh --reseed reset the demo data, then start
set -e
cd "$(dirname "$0")/.."

export NODE_ENV=development
export DEMO_MODE=1
export PORT="${PORT:-3000}"
export MONGO_URL="mongodb://127.0.0.1:27018"
export REDIS_SERVER=127.0.0.1 REDIS_PORT=6380 REDIS_PASSWORD=demo
export AES_KEY="1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16"
export PEPPER=demo-pepper SECRET=demo KEY_ID=demo
export SENDGRID_API_KEY=SG.demo SENDGRID_FROM=demo@arkhaios.test SENDGRID_TEMPLATE=demo
export FINNHUB_API_KEY=demo PLAID_CLIENTID=demo PLAID_SANDBOX=demo
export DEMO_MODE=1 # simulated bank linking instead of Plaid
export FIRM_ACCOUNT=firm-0000-demo-account
export KAFKAJS_NO_PARTITIONER_WARNING=1

start_container() { # name, image, port, extra args...
  local name=$1 image=$2 port=$3; shift 3
  if [ -z "$(docker ps -q -f name="^${name}$")" ]; then
    docker rm -f "$name" >/dev/null 2>&1 || true
    docker run -d --name "$name" -p "127.0.0.1:${port}" "$image" "$@" >/dev/null
    echo "Started $name"
  fi
}

start_container arkhaios-demo-redis redis:7 6380:6379 redis-server --requirepass demo
start_container arkhaios-demo-mongo mongo:7 27018:27017

until docker exec arkhaios-demo-mongo mongosh --quiet --eval "db.runCommand({ping:1}).ok" >/dev/null 2>&1; do
  sleep 1
done

seeded=$(docker exec arkhaios-demo-mongo mongosh db --quiet --eval "db.Users.countDocuments()")
if [ "$1" == "--reseed" ] || [ "$seeded" == "0" ]; then
  docker exec arkhaios-demo-redis redis-cli -a demo --no-auth-warning FLUSHALL >/dev/null
  node demo/seed.js
fi

echo "Open http://localhost:${PORT} and log in with demo@arkhaios.test / demo1234"
# Large header limit: browsers often carry many localhost cookies from other projects (HTTP 431)
exec node --max-http-header-size=131072 -r ./demo/mock-apis.js server.js
