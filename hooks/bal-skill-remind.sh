#!/usr/bin/env bash
#
# Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
#
# WSO2 LLC. licenses this file to you under the Apache License,
# Version 2.0 (the "License"); you may not use this file except
# in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied. See the License for the
# specific language governing permissions and limitations
# under the License.

input=$(cat)
tool=$(echo "$input" | jq -r '.tool_name // .tool // ""')

case "$tool" in
  Write|Edit)
    fp=$(echo "$input" | jq -r '.tool_input.file_path // ""')
    [[ "$fp" == *.bal ]] || exit 0
    ;;
  Bash)
    cmd=$(echo "$input" | jq -r '.tool_input.command // ""')
    [[ "$cmd" =~ (^|[[:space:];&|])bal[[:space:]]+(new|run|build|test|add|push|pull|format|doc)([[:space:]]|$) ]] || exit 0
    ;;
  *) exit 0 ;;
esac

session_id=$(echo "$input" | jq -r '.session_id // ""')
[[ -z "$session_id" ]] && exit 0
tmpdir="${TMPDIR:-/tmp}"
MARKER="${tmpdir%/}/.ballerina-skill-${session_id}"
[[ -f "$MARKER" ]] && exit 0

touch "$MARKER"

printf '{"suppressOutput":true,"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow","additionalContext":"<system-reminder>\nThe '\''ballerina'\'' skill has not been activated yet. Invoke it now to load the mandatory Ballerina code rules before proceeding.\n</system-reminder>"}}'
exit 0
