#!/bin/bash
# Download benchmark graph datasets for MI path ranking experiments
#
# Sources:
# - Cora: LINQS/Planetoid (citation network)
# - CiteSeer: LINQS/Planetoid (citation network)
# - Facebook: SNAP ego-Facebook (social network)
# - FB15k-237: Knowledge graph benchmark

set -e

BENCHMARK_DIR="$(dirname "$0")/../data/benchmarks"
mkdir -p "$BENCHMARK_DIR"

echo "=== Downloading Benchmark Datasets ==="
echo "Target directory: $BENCHMARK_DIR"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Cora Dataset (from Network Repository - direct edge list)
# ─────────────────────────────────────────────────────────────────────────────
CORA_DIR="$BENCHMARK_DIR/cora"
if [ ! -f "$CORA_DIR/cora.edges" ]; then
    echo "Downloading Cora dataset..."
    mkdir -p "$CORA_DIR"

    # Download from Network Repository (simple edge list format)
    curl -L "https://nrvis.com/download/data/labeled/cora.zip" -o "$CORA_DIR/cora.zip"
    unzip -o "$CORA_DIR/cora.zip" -d "$CORA_DIR"
    rm "$CORA_DIR/cora.zip"

    echo "✓ Cora downloaded"
else
    echo "✓ Cora already exists"
fi

# ─────────────────────────────────────────────────────────────────────────────
# CiteSeer Dataset (from Network Repository)
# ─────────────────────────────────────────────────────────────────────────────
CITESEER_DIR="$BENCHMARK_DIR/citeseer"
if [ ! -f "$CITESEER_DIR/citeseer.edges" ]; then
    echo "Downloading CiteSeer dataset..."
    mkdir -p "$CITESEER_DIR"

    curl -L "https://nrvis.com/download/data/labeled/citeseer.zip" -o "$CITESEER_DIR/citeseer.zip"
    unzip -o "$CITESEER_DIR/citeseer.zip" -d "$CITESEER_DIR"
    rm "$CITESEER_DIR/citeseer.zip"

    echo "✓ CiteSeer downloaded"
else
    echo "✓ CiteSeer already exists"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Facebook ego-network (from SNAP)
# ─────────────────────────────────────────────────────────────────────────────
FACEBOOK_DIR="$BENCHMARK_DIR/facebook"
if [ ! -f "$FACEBOOK_DIR/facebook_combined.txt" ]; then
    echo "Downloading Facebook ego-network..."
    mkdir -p "$FACEBOOK_DIR"

    # Download combined edge list from SNAP
    curl -L "https://snap.stanford.edu/data/facebook_combined.txt.gz" -o "$FACEBOOK_DIR/facebook_combined.txt.gz"
    gunzip "$FACEBOOK_DIR/facebook_combined.txt.gz"

    echo "✓ Facebook downloaded"
else
    echo "✓ Facebook already exists"
fi

# ─────────────────────────────────────────────────────────────────────────────
# FB15k-237 Knowledge Graph (from OpenKE/PyTorch Geometric source)
# ─────────────────────────────────────────────────────────────────────────────
FB15K_DIR="$BENCHMARK_DIR/fb15k-237"
if [ ! -f "$FB15K_DIR/train.txt" ]; then
    echo "Downloading FB15k-237 knowledge graph..."
    mkdir -p "$FB15K_DIR"

    # Download from GitHub mirror (OpenKE format)
    curl -L "https://raw.githubusercontent.com/thunlp/OpenKE/OpenKE-PyTorch/benchmarks/FB15K237/train2id.txt" -o "$FB15K_DIR/train2id.txt"
    curl -L "https://raw.githubusercontent.com/thunlp/OpenKE/OpenKE-PyTorch/benchmarks/FB15K237/valid2id.txt" -o "$FB15K_DIR/valid2id.txt"
    curl -L "https://raw.githubusercontent.com/thunlp/OpenKE/OpenKE-PyTorch/benchmarks/FB15K237/test2id.txt" -o "$FB15K_DIR/test2id.txt"
    curl -L "https://raw.githubusercontent.com/thunlp/OpenKE/OpenKE-PyTorch/benchmarks/FB15K237/entity2id.txt" -o "$FB15K_DIR/entity2id.txt"
    curl -L "https://raw.githubusercontent.com/thunlp/OpenKE/OpenKE-PyTorch/benchmarks/FB15K237/relation2id.txt" -o "$FB15K_DIR/relation2id.txt"

    echo "✓ FB15k-237 downloaded"
else
    echo "✓ FB15k-237 already exists"
fi

echo ""
echo "=== Download Complete ==="
echo ""
echo "Dataset summary:"
ls -la "$BENCHMARK_DIR"
