#!/bin/bash
# ============================================
# ClickUp Sync — Script de sincronização manual
# ============================================
# Uso:
#   ./scripts/clickup-sync.sh comment "Mensagem aqui"
#   ./scripts/clickup-sync.sh status "in progress"
#   ./scripts/clickup-sync.sh deploy
#
# Requer: CLICKUP_API_KEY e CLICKUP_PARENT_TASK_ID no .env.local
# ============================================

set -e

# Carregar variáveis do .env.local
if [ -f .env.local ]; then
  export $(grep -E '^CLICKUP_' .env.local | xargs)
fi

API_KEY="${CLICKUP_API_KEY:-}"
TASK_ID="${CLICKUP_PARENT_TASK_ID:-}"

if [ -z "$API_KEY" ] || [ -z "$TASK_ID" ]; then
  echo "❌ Faltam variáveis CLICKUP_API_KEY e/ou CLICKUP_PARENT_TASK_ID no .env.local"
  exit 1
fi

ACTION="${1:-help}"
VALUE="${2:-}"

case "$ACTION" in
  comment)
    if [ -z "$VALUE" ]; then
      echo "❌ Uso: $0 comment \"Sua mensagem\""
      exit 1
    fi
    curl -s -X POST \
      "https://api.clickup.com/api/v2/task/${TASK_ID}/comment" \
      -H "Authorization: ${API_KEY}" \
      -H "Content-Type: application/json" \
      -d "{\"comment_text\": \"💬 $VALUE\"}" > /dev/null
    echo "✅ Comentário adicionado no ClickUp"
    ;;

  status)
    if [ -z "$VALUE" ]; then
      echo "❌ Uso: $0 status \"in progress|complete|to do\""
      exit 1
    fi
    curl -s -X PUT \
      "https://api.clickup.com/api/v2/task/${TASK_ID}" \
      -H "Authorization: ${API_KEY}" \
      -H "Content-Type: application/json" \
      -d "{\"status\": \"$VALUE\"}" > /dev/null
    echo "✅ Status atualizado para: $VALUE"
    ;;

  deploy)
    SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    MSG=$(git log -1 --pretty=%s 2>/dev/null || echo "deploy manual")
    BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    DATE=$(date '+%d/%m/%Y %H:%M')

    COMMENT="🚀 **Deploy manual**\n\n"
    COMMENT+="**Commit:** \`${SHA}\` — ${MSG}\n"
    COMMENT+="**Branch:** \`${BRANCH}\`\n"
    COMMENT+="**Data:** ${DATE}"

    curl -s -X POST \
      "https://api.clickup.com/api/v2/task/${TASK_ID}/comment" \
      -H "Authorization: ${API_KEY}" \
      -H "Content-Type: application/json" \
      -d "{\"comment_text\": \"$(echo -e $COMMENT)\"}" > /dev/null
    echo "✅ Deploy registrado no ClickUp ($SHA)"
    ;;

  help|*)
    echo "📋 ClickUp Sync — Comandos disponíveis:"
    echo ""
    echo "  comment \"msg\"   Adiciona comentário na tarefa"
    echo "  status \"status\" Atualiza status (to do, in progress, complete)"
    echo "  deploy          Registra deploy com info do git"
    echo ""
    echo "Configuração necessária no .env.local:"
    echo "  CLICKUP_API_KEY=pk_..."
    echo "  CLICKUP_PARENT_TASK_ID=86e03z..."
    ;;
esac
