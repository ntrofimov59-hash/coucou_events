#!/bin/bash
# Проверка здоровья агента и сайта. При проблемах — алерт в Telegram.
set -e

STATE_FILE="/root/coucou-data/health-state.json"
FAIL_THRESHOLD=2

BOOKING_TOKEN=$(grep '^BOOKING_BOT_TOKEN=' /root/coucou_events/.env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
BOOKING_CHAT=$(grep '^BOOKING_CHAT_ID=' /root/coucou_events/.env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
AGENT_SECRET=$(grep '^AGENT_HTTP_SECRET=' /root/coucou_events/.env | cut -d'=' -f2- | tr -d '"' | tr -d "'")

alert() {
  local msg="$1"
  if [ -n "$BOOKING_TOKEN" ] && [ -n "$BOOKING_CHAT" ]; then
    curl -s -X POST "https://api.telegram.org/bot$BOOKING_TOKEN/sendMessage" \
      --data-urlencode "chat_id=$BOOKING_CHAT" \
      --data-urlencode "text=$msg" \
      --data-urlencode "parse_mode=HTML" > /dev/null
  fi
  echo "$msg"
}

failures=""

# 1. Agent HTTP health
AGENT_RESP=$(curl -s -m 5 "http://127.0.0.1:3001/health" -H "x-agent-secret: $AGENT_SECRET" 2>/dev/null || echo "")
if ! echo "$AGENT_RESP" | grep -q '"ok":true'; then
  failures="$failures agent-http"
fi

# 2. Site HTTP
SITE_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "http://127.0.0.1:4321/ru" 2>/dev/null || echo "000")
if [ "$SITE_CODE" != "200" ] && [ "$SITE_CODE" != "301" ]; then
  failures="$failures site($SITE_CODE)"
fi

# 3. PM2 — считаем online-процессы
AGENT_ONLINE=$(pm2 list 2>/dev/null | grep 'coucou-agent-v2' | grep -c 'online' || true)
if [ "$AGENT_ONLINE" -eq 0 ]; then
  failures="$failures agent-pm2"
fi
SITE_ONLINE=$(pm2 list 2>/dev/null | grep 'coucou-site' | grep -c 'online' || true)
if [ "$SITE_ONLINE" -eq 0 ]; then
  failures="$failures site-pm2"
fi

# 4. Свежие ошибки за последние 200 строк логов
ERR_COUNT=$(pm2 logs coucou-agent-v2 --lines 200 --nostream 2>/dev/null | grep -c 'Ошибка модели\|ERROR\|auth_failure' || true)
if [ "${ERR_COUNT:-0}" -gt 10 ]; then
  failures="$failures errors($ERR_COUNT)"
fi

# Записываем состояние
if [ -z "$failures" ]; then
  echo '{"fails":0,"ts":'$(date +%s)'}' > "$STATE_FILE"
  curr_fails=0
else
  prev_fails=$(python3 -c "import json; print(json.load(open('$STATE_FILE')).get('fails',0))" 2>/dev/null || echo 0)
  curr_fails=$((prev_fails + 1))
  echo '{"fails":'$curr_fails',"ts":'$(date +%s)',"issues":"'$failures'"}' > "$STATE_FILE"

  if [ "$curr_fails" -ge "$FAIL_THRESHOLD" ]; then
    alert "⚠️ <b>Проблемы в CouCou Agent</b>

Проблемы: $failures
Подряд: $curr_fails попыток
Сервер: coucou-agent-vps"
  fi
fi

echo "[$(date)] healthcheck: [$failures] (fails=$curr_fails)"
