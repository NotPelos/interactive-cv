#!/usr/bin/env bash
# sync-content.sh
#
# Copia los archivos Markdown de contenido del CV desde el frontend (apps/web/src/content/)
# al classpath del backend (apps/api/src/main/resources/content/).
#
# Uso:
#   ./apps/api/scripts/sync-content.sh
#
# Cuándo ejecutar:
#   - Antes de `./mvnw package` si el contenido canónico vive en apps/web/src/content/.
#   - No es necesario en el MVP actual: apps/api/src/main/resources/content/
#     contiene las copias directamente hasta que el frontend esté en marcha.
#
# En CI se puede añadir como paso previo al mvn verify:
#   - name: Sync content
#     run: ./apps/api/scripts/sync-content.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

SRC="${REPO_ROOT}/apps/web/src/content"
DST="${SCRIPT_DIR}/../src/main/resources/content"

if [[ ! -d "${SRC}" ]]; then
  echo "[sync-content] Source ${SRC} does not exist — skipping sync (MVP mode: content lives in api classpath)."
  exit 0
fi

mkdir -p "${DST}"
echo "[sync-content] Syncing ${SRC} -> ${DST}"
rsync -av --include="*.md" --exclude="*" "${SRC}/" "${DST}/"
echo "[sync-content] Done."
