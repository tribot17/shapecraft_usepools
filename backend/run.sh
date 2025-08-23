#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d "../venv" ]; then
  echo "Python venv not found at ../venv. Create it with: python3 -m venv ../venv"
  exit 1
fi

source ../venv/bin/activate
pip install -r requirements.txt

export PYTHONPATH="$(pwd)${PYTHONPATH:+:$PYTHONPATH}"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000


