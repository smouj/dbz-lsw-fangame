#!/bin/bash
# DBZ LSW Dev Server Manager
# Usage: ./scripts/dev-server.sh [start|stop|restart|status|log]

PORT=5178
DIR="/home/local-user/.openclaw/workspace/dbz-lsw-fangame"
LOG="/home/local-user/.openclaw/tmp/vite-dev.log"
PIDFILE="/home/local-user/.openclaw/tmp/vite-dev.pid"

case "$1" in
  start)
    if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
      echo "Dev server already running (PID $(cat "$PIDFILE"))"
      echo "  http://localhost:$PORT/"
      echo "  http://localhost:$PORT/?dev=1"
      exit 0
    fi
    cd "$DIR"
    nohup npm run dev > "$LOG" 2>&1 &
    echo $! > "$PIDFILE"
    # Wait for Vite to be ready
    for i in $(seq 1 10); do
      sleep 1
      if curl -sS --connect-timeout 1 --max-time 2 -o /dev/null http://localhost:$PORT/ 2>/dev/null; then
        echo "Dev server started (PID $(cat "$PIDFILE"))"
        echo "  http://localhost:$PORT/"
        echo "  http://localhost:$PORT/?dev=1"
        echo "  Log: $LOG"
        exit 0
      fi
    done
    echo "Warning: server may still be starting. Check log: $LOG"
    ;;
  stop)
    if [ -f "$PIDFILE" ]; then
      PID=$(cat "$PIDFILE")
      # Kill the npm process and its children
      kill -- -$(ps -o pgid= -p "$PID" | tr -d ' ') 2>/dev/null
      kill "$PID" 2>/dev/null
      rm -f "$PIDFILE"
      echo "Dev server stopped"
    else
      # Try to find and kill any running vite on this port
      pkill -f "vite.*$PORT" 2>/dev/null && echo "Killed vite process" || echo "No dev server found"
    fi
    ;;
  restart)
    $0 stop
    sleep 2
    $0 start
    ;;
  status)
    if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
      PID=$(cat "$PIDFILE")
      echo "Dev server running (PID $PID)"
      echo "  http://localhost:$PORT/"
      echo "  http://localhost:$PORT/?dev=1"
      curl -sS --connect-timeout 2 --max-time 3 -o /dev/null -w "  HTTP status: %{http_code}\n" http://localhost:$PORT/
    else
      echo "Dev server not running"
      [ -f "$PIDFILE" ] && rm -f "$PIDFILE"
    fi
    ;;
  log)
    if [ -f "$LOG" ]; then
      tail -30 "$LOG"
    else
      echo "No log file found"
    fi
    ;;
  *)
    echo "DBZ LSW Dev Server Manager"
    echo "Usage: $0 {start|stop|restart|status|log}"
    echo ""
    echo "  start   - Start the dev server (persistent, survives session close)"
    echo "  stop    - Stop the dev server"
    echo "  restart - Stop and start"
    echo "  status  - Check if running"
    echo "  log     - Show last 30 lines of log"
    ;;
esac