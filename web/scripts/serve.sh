#!/usr/bin/env bash
# Restart the production server. Runs the next binary directly (not through
# npx) so $! is the actual server process and the pidfile is meaningful.
PORT="${1:-3100}"
PIDFILE="/tmp/portfolio-server-$PORT.pid"

if [ -f "$PIDFILE" ]; then
  kill "$(cat "$PIDFILE")" 2>/dev/null
  for _ in $(seq 1 10); do kill -0 "$(cat "$PIDFILE")" 2>/dev/null || break; sleep 0.5; done
  kill -9 "$(cat "$PIDFILE")" 2>/dev/null
  rm -f "$PIDFILE"
fi

# Anything else still holding the port (orphan from an earlier run)
for pid in $(grep -l . /proc/*/cmdline 2>/dev/null | sed 's|/proc/\(.*\)/cmdline|\1|'); do
  [ "$pid" = "$$" ] && continue
  if tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null | grep -qE "next-server|next/dist/bin/next start -p $PORT"; then
    kill -9 "$pid" 2>/dev/null
  fi
done
sleep 1

nohup node node_modules/next/dist/bin/next start -p "$PORT" > /tmp/server-$PORT.log 2>&1 &
echo $! > "$PIDFILE"

for _ in $(seq 1 30); do
  [ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/" 2>/dev/null)" = "200" ] && {
    echo "server up on $PORT (pid $(cat "$PIDFILE"))"; exit 0; }
  sleep 1
done
echo "FAILED to start"; tail -12 "/tmp/server-$PORT.log"; exit 1
