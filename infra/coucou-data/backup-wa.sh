#!/bin/bash
# Бэкап WhatsApp сессии — раз в день, с ротацией 14 дней
set -e
SRC="/root/coucou-data/wa-auth"
DST="/root/coucou-data/wa-backups"
DATE=$(date +%Y-%m-%d_%H-%M)
if [ ! -d "$SRC" ]; then
  echo "[$(date)] Нет сессии для бэкапа"
  exit 0
fi
mkdir -p "$DST"
tar -czf "$DST/wa-auth-$DATE.tar.gz" -C "$SRC" . 2>/dev/null
echo "[$(date)] Бэкап создан: wa-auth-$DATE.tar.gz"
# Удаляем старше 14 дней
find "$DST" -name 'wa-auth-*.tar.gz' -mtime +14 -delete
ls -lh "$DST" | tail -5
