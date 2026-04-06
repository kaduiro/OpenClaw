#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/wsl-runtime.sh"

assert_wsl_linux_runtime "scripts/build-sandbox-image.sh"

if [[ -f "${REPO_ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${REPO_ROOT}/.env"
  set +a
fi

TARGET_IMAGE="${OPENCLAW_SANDBOX_IMAGE:-openclaw-sandbox:bookworm-python}"
BASE_IMAGE="${OPENCLAW_SANDBOX_BASE_IMAGE:-openclaw-sandbox:bookworm-slim}"
DOCKERFILE_PATH="${REPO_ROOT}/docker/sandbox-python/Dockerfile"

DOCKER_BIN="$(resolve_command DOCKER_BIN docker)"
ensure_command "docker" "${DOCKER_BIN}" "docker is required. Enable Docker Desktop WSL integration and confirm \`docker version\` in WSL."

docker_output="$("${DOCKER_BIN}" version 2>&1 || true)"
if [[ "${docker_output}" == *"could not be found in this WSL 2 distro"* ]] || [[ "${docker_output}" == *"command 'docker' could not be found in this WSL 2 distro"* ]]; then
  diagnose_issue \
    "Docker Desktop WSL integration is disabled" \
    "docker exists but WSL reports that this distro is not integrated with Docker Desktop." \
    "Building the sandbox image requires Docker from inside WSL." \
    "Open Docker Desktop > Settings > Resources > WSL Integration, enable Ubuntu, then rerun \`docker version\`."
fi

if [[ "${docker_output}" == *"Cannot connect to the Docker daemon"* ]]; then
  diagnose_issue \
    "Docker daemon is unavailable" \
    "docker is installed but cannot connect to the daemon." \
    "Image builds require a running Docker daemon reachable from WSL." \
    "Start Docker Desktop on Windows, wait for it to finish booting, then rerun \`docker version\`."
fi

[[ -f "${DOCKERFILE_PATH}" ]] || fail_check "Sandbox Dockerfile not found at ${DOCKERFILE_PATH}"

if ! "${DOCKER_BIN}" image inspect "${BASE_IMAGE}" >/dev/null 2>&1; then
  diagnose_issue \
    "Sandbox base image is unavailable locally" \
    "Required base image: ${BASE_IMAGE}" \
    "This repo builds the Python-enabled sandbox image as a thin derivative of the standard slim image." \
    "Install or pull ${BASE_IMAGE}, then rerun:\n  bash scripts/build-sandbox-image.sh"
fi

printf 'Building sandbox image %s from base %s\n' "${TARGET_IMAGE}" "${BASE_IMAGE}"
"${DOCKER_BIN}" build \
  --build-arg "OPENCLAW_SANDBOX_BASE_IMAGE=${BASE_IMAGE}" \
  --tag "${TARGET_IMAGE}" \
  --file "${DOCKERFILE_PATH}" \
  "${REPO_ROOT}"

if ! "${DOCKER_BIN}" run --rm --entrypoint sh "${TARGET_IMAGE}" -lc "command -v python3 || command -v python" >/dev/null 2>&1; then
  diagnose_issue \
    "Built sandbox image failed python verification" \
    "Image ${TARGET_IMAGE} built successfully but python3/python is still unavailable inside it." \
    "OpenClaw's pinned mutation helper needs Python inside the sandbox to write files." \
    "Inspect the Dockerfile at ${DOCKERFILE_PATH} and rebuild the image."
fi

printf 'Sandbox image ready: %s\n' "${TARGET_IMAGE}"
