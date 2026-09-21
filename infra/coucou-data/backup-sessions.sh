#!/bin/bash
# Бэкап sessions.json + important data — каждые 6 часов
set -e
SRC="/root/coucou_events/agent/data"
DST="/root/coucou-data/sessions-backups"
DATE=$(date +%Y-%m-%d_%H-%M)

if [ ! -f "$SRC/sessions.json" ]; then
  echo "[$(date)] Нет sessions.json"
  exit 0
fi

mkdir -p "$DST"
# Копируем ключевые файлы
cp "$SRC/sessions.json" "$DST/sessions-$DATE.json"
# Сжимаем
gzip -f "$DST/sessions-$DATE.json"

# Удаляем старше 14 дней
find "$DST" -name 'sessions-*.json.gz' -mtime +14 -delete

echo "[$(date)] Sessions backup: sessions-$DATE.json.gz"
ls -lh "$DST" | tail -3
