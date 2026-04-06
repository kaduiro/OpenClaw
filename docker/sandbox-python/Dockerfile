ARG OPENCLAW_SANDBOX_BASE_IMAGE=openclaw-sandbox:bookworm-slim
FROM ${OPENCLAW_SANDBOX_BASE_IMAGE}

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python-is-python3 \
  && rm -rf /var/lib/apt/lists/*
