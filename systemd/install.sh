#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="kachina-md.service"
SERVICE_SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_SRC="${SERVICE_SRC_DIR}/${SERVICE_NAME}"

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root: sudo $0" >&2
  exit 1
fi

install -D -m 0644 "$SERVICE_SRC" \
  "/etc/systemd/system/${SERVICE_NAME}"

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"

echo "Installed and started ${SERVICE_NAME}."
systemctl --no-pager --full status "${SERVICE_NAME}" || true

