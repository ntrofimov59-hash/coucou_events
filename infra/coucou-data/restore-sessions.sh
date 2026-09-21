#!/bin/bash
# Восстановление sessions.json из последнего бэкапа
LATEST=$(ls -t /root/coucou-data/sessions-backups/sessions-*.json.gz 2>/dev/null | head -1)
if [ -z "$LATEST" ]; then
  echo "❌ Нет бэкапов"
  exit 1
fi
echo "Восстанавливаю из: $LATEST"
echo "Текущий sessions.json будет перезаписан. Ctrl+C для отмены, Enter — продолжить."
read
pm2 stop coucou-agent-v2
gunzip -c "$LATEST" > /root/coucou_events/agent/data/sessions.json
pm2 start coucou-agent-v2
echo "✅ Восстановлено"
