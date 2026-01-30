#!/bin/bash
#
# Ralph Loop - Iterative AI Development
# Based on Geoffrey Huntley's technique: https://ghuntley.com/ralph/
#
# Usage:
#   ./scripts/ralph-loop.sh [PROMPT_FILE] [MAX_ITERATIONS]
#
# Examples:
#   ./scripts/ralph-loop.sh                           # Uses PROMPT.md, runs forever
#   ./scripts/ralph-loop.sh prompts/case-entity.md    # Custom prompt file
#   ./scripts/ralph-loop.sh PROMPT.md 10              # Max 10 iterations
#

set -e

PROMPT_FILE="${1:-PROMPT.md}"
MAX_ITERATIONS="${2:-0}"  # 0 = infinite
ITERATION=0
COMPLETION_MARKER="<promise>"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              RALPH LOOP - Iterative Development            ║${NC}"
echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC} Prompt file: ${GREEN}$PROMPT_FILE${NC}"
echo -e "${BLUE}║${NC} Max iterations: ${GREEN}${MAX_ITERATIONS:-unlimited}${NC}"
echo -e "${BLUE}║${NC} Stop with: ${YELLOW}Ctrl+C${NC} or completion promise"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verify prompt file exists
if [ ! -f "$PROMPT_FILE" ]; then
    echo -e "${RED}Error: Prompt file '$PROMPT_FILE' not found${NC}"
    echo ""
    echo "Create a PROMPT.md file with your task instructions."
    echo "See scripts/ralph-prompts/ for examples."
    exit 1
fi

# Show prompt content
echo -e "${YELLOW}━━━ Prompt Content ━━━${NC}"
cat "$PROMPT_FILE"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Confirm before starting
read -p "Start Ralph Loop? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# Create log file for this session
LOG_DIR="scripts/ralph-logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/ralph-$(date +%Y%m%d-%H%M%S).log"
echo "Logging to: $LOG_FILE"
echo ""

# Main loop
while true; do
    ITERATION=$((ITERATION + 1))

    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ITERATION $ITERATION                                              ${NC}"
    echo -e "${GREEN}║  $(date '+%Y-%m-%d %H:%M:%S')                                    ${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Log iteration start
    echo "=== ITERATION $ITERATION - $(date) ===" >> "$LOG_FILE"

    # Run Claude with the prompt, using --continue to maintain context via git
    # Capture output to check for completion promise
    OUTPUT_FILE=$(mktemp)

    cat "$PROMPT_FILE" | claude --continue --output-format stream-json 2>&1 | tee -a "$LOG_FILE" "$OUTPUT_FILE"

    # Check for completion promise in output
    if grep -q "$COMPLETION_MARKER" "$OUTPUT_FILE"; then
        echo ""
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║  COMPLETION PROMISE DETECTED                               ║${NC}"
        echo -e "${GREEN}║  Ralph Loop finished after $ITERATION iterations              ${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
        rm "$OUTPUT_FILE"
        exit 0
    fi

    rm "$OUTPUT_FILE"

    # Check max iterations
    if [ "$MAX_ITERATIONS" -gt 0 ] && [ "$ITERATION" -ge "$MAX_ITERATIONS" ]; then
        echo ""
        echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║  MAX ITERATIONS REACHED ($MAX_ITERATIONS)                          ${NC}"
        echo -e "${YELLOW}║  Ralph Loop stopped                                        ║${NC}"
        echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
        exit 0
    fi

    # Brief pause between iterations
    echo ""
    echo -e "${BLUE}Starting next iteration in 3 seconds... (Ctrl+C to stop)${NC}"
    sleep 3
done
