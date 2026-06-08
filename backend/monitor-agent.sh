#!/bin/bash
# Garuda Nexa Monitoring Agent
# Collects real-time system metrics and pushes to API
# Usage: ./monitor-agent.sh [server_id]
# Add to crontab: */5 * * * * /path/to/monitor-agent.sh 1

SERVER_ID="${1:-1}"
API_URL="http://localhost:3010/api.php"

# Collect metrics
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{printf "%.2f", $2+$4}')
RAM_INFO=$(free | grep Mem | awk '{printf "%.2f %d", $3/$2*100, $2/1024}')
RAM_USAGE=$(echo "$RAM_INFO" | awk '{print $1}')
RAM_TOTAL=$(echo "$RAM_INFO" | awk '{print $2}')
DISK_INFO=$(df / | tail -1 | awk '{printf "%.2f %d", $3/$2*100, $2/1024}')
DISK_USAGE=$(echo "$DISK_INFO" | awk '{print $1}')
DISK_TOTAL=$(echo "$DISK_INFO" | awk '{print $2}')
LOAD_1=$(cat /proc/loadavg | awk '{print $1}')
LOAD_5=$(cat /proc/loadavg | awk '{print $2}')
LOAD_15=$(cat /proc/loadavg | awk '{print $3}')

# Determine status
STATUS="online"
if (( $(echo "$CPU_USAGE > 80" | bc -l) )) || (( $(echo "$RAM_USAGE > 80" | bc -l) )); then
  STATUS="critical"
elif (( $(echo "$CPU_USAGE > 60" | bc -l) )) || (( $(echo "$RAM_USAGE > 60" | bc -l) )); then
  STATUS="warning"
fi

# Push to API
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"monitor_push_metrics\",
    \"server_id\": $SERVER_ID,
    \"cpu_usage\": $CPU_USAGE,
    \"ram_usage\": $RAM_USAGE,
    \"ram_total\": $RAM_TOTAL,
    \"disk_usage\": $DISK_USAGE,
    \"disk_total\": $DISK_TOTAL,
    \"load_1min\": $LOAD_1,
    \"load_5min\": $LOAD_5,
    \"load_15min\": $LOAD_15,
    \"status\": \"$STATUS\"
  }" > /dev/null 2>&1

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server #$SERVER_ID: CPU=$CPU_USAGE% RAM=$RAM_USAGE% DISK=$DISK_USAGE% Status=$STATUS"
