#!/bin/bash
# Ежедневный отчёт: диалоги, лиды, ошибки, токены
set -e

BOOKING_TOKEN=$(grep '^BOOKING_BOT_TOKEN=' /root/coucou_events/.env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
BOOKING_CHAT=$(grep '^BOOKING_CHAT_ID=' /root/coucou_events/.env | cut -d'=' -f2- | tr -d '"' | tr -d "'")

count_logs() {
  local pattern="$1"
  pm2 logs coucou-agent-v2 --lines 5000 --nostream 2>/dev/null | grep -c "$pattern" 2>/dev/null || echo 0
}

TOTAL_MSGS=$(count_logs '📩')
LEADS=$(pm2 logs coucou-agent-v2 --lines 5000 --nostream 2>/dev/null | grep -c 'Лид создан\|Лид обновлён' || true)
ESCALATIONS=$(count_logs 'Escalation triggered')
ERRORS=$(pm2 logs coucou-agent-v2 --lines 5000 --nostream 2>/dev/null | grep -c 'Ошибка модели\|Ошибка CRM' || true)
SESSIONS=$(python3 -c "import json; print(len(json.load(open('/root/coucou_events/agent/data/sessions.json')).get('sessions',{})))" 2>/dev/null || echo "?")

# Токены за последние 5000 строк (одна строка, sum)
TOKENS=$(pm2 logs coucou-agent-v2 --lines 5000 --nostream 2>/dev/null | grep -oE 'total=[0-9]+' | awk -F= '{s+=$2} END {print s+0}')

DISK=$(df -h / | awk 'NR==2 {print $5}')

MSG="📊 <b>CouCou Agent — дневной отчёт</b>

💬 Сообщений: <b>$TOTAL_MSGS</b>
🎯 Лидов: <b>$LEADS</b>
🚨 Эскалаций: <b>$ESCALATIONS</b>
❌ Ошибок: <b>$ERRORS</b>
👥 Сессий: <b>$SESSIONS</b>
🧮 Токенов: <b>$TOKENS</b>
💾 Диск: <b>$DISK</b>"

curl -s -X POST "https://api.telegram.org/bot$BOOKING_TOKEN/sendMessage" \
  --data-urlencode "chat_id=$BOOKING_CHAT" \
  --data-urlencode "text=$MSG" \
  --data-urlencode "parse_mode=HTML" > /dev/null

echo "[$(date)] digest: msgs=$TOTAL_MSGS leads=$LEADS escal=$ESCALATIONS errors=$ERRORS sessions=$SESSIONS tokens=$TOKENS disk=$DISK"
