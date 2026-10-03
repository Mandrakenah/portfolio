"""
Quantise the trained transformer and pack it for the browser.

Weights go to int8 with one scale per tensor; the small tensors (layer-norm
gains, biases) stay float32 because quantising them saves nothing and costs
accuracy. Everything lands in one binary blob with a JSON manifest describing
the offsets, so the browser does a single fetch and reads straight into
typed arrays with no parsing.
"""
from __future__ import annotations

import json, struct
from pathlib import Path

import numpy as np
import torch

ROOT = Path(__file__).resolve().parents[2]
CKPT = ROOT / "ml" / "checkpoints" / "tinygpt.pt"
OUT = ROOT / "web" / "public" / "models"


def q8(t: np.ndarray):
    """Symmetric int8 with a single scale — cheap to undo in JS."""
    scale = float(np.abs(t).max()) / 127.0 or 1e-8
    q = np.clip(np.round(t / scale), -127, 127).astype(np.int8)
    return q, scale


def main() -> None:
    ck = torch.load(CKPT, map_location="cpu", weights_only=False)
    sd, cfg, vocab = ck["model"], ck["cfg"], ck["vocab"]
    D, L, H, FF, C = cfg["D_MODEL"], cfg["N_LAYER"], cfg["N_HEAD"], cfg["D_FF"], cfg["CONTEXT"]

    blobs: list[bytes] = []
    tensors: list[dict] = []
    offset = 0

    def add(name: str, arr: torch.Tensor, quant: bool):
        nonlocal offset
        a = arr.detach().cpu().float().numpy()
        if quant:
            q, scale = q8(a)
            raw = q.tobytes()
            dtype, sc = "int8", scale
        else:
            raw = a.astype(np.float32).tobytes()
            dtype, sc = "float32", 1.0
        blobs.append(raw)
        tensors.append({"name": name, "shape": list(a.shape), "dtype": dtype,
                        "scale": sc, "offset": offset, "bytes": len(raw)})
        offset += len(raw)

    # embeddings (big → quantised)
    add("tok", sd["tok.weight"], True)
    add("pos", sd["pos.weight"], True)

    for i in range(L):
        p = f"blocks.{i}."
        add(f"l{i}.ln1.g", sd[p + "ln1.weight"], False)
        add(f"l{i}.ln1.b", sd[p + "ln1.bias"], False)
        add(f"l{i}.attn.inW", sd[p + "attn.in_proj_weight"], True)
        add(f"l{i}.attn.inB", sd[p + "attn.in_proj_bias"], False)
        add(f"l{i}.attn.outW", sd[p + "attn.out_proj.weight"], True)
        add(f"l{i}.attn.outB", sd[p + "attn.out_proj.bias"], False)
        add(f"l{i}.ln2.g", sd[p + "ln2.weight"], False)
        add(f"l{i}.ln2.b", sd[p + "ln2.bias"], False)
        add(f"l{i}.ff1W", sd[p + "ff.0.weight"], True)
        add(f"l{i}.ff1B", sd[p + "ff.0.bias"], False)
        add(f"l{i}.ff2W", sd[p + "ff.2.weight"], True)
        add(f"l{i}.ff2B", sd[p + "ff.2.bias"], False)

    add("lnf.g", sd["lnf.weight"], False)
    add("lnf.b", sd["lnf.bias"], False)

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "tinygpt.bin").write_bytes(b"".join(blobs))
    manifest = {
        "arch": {"dModel": D, "nLayer": L, "nHead": H, "dFF": FF, "context": C,
                 "vocabSize": len(vocab), "tiedHead": True},
        "tensors": tensors,
        "vocab": vocab,
        "training": {
            "params": ck["params"],
            "valLoss": round(ck["val_loss"], 4),
            "valPerplexity": round(ck["val_ppl"], 1),
        },
    }
    (OUT / "tinygpt.json").write_text(json.dumps(manifest, separators=(",", ":")))

    # Reference predictions for the browser-side parity test. Generated here,
    # from the same checkpoint, so the float32 numbers the TypeScript int8
    # inference is checked against can never drift out of sync with the weights
    # that were actually shipped.
    import sys
    sys.path.insert(0, str(Path(__file__).parent))
    from transformer import TinyGPT, TOKEN                      # noqa: E402
    model = TinyGPT(); model.load_state_dict(sd); model.eval()
    idx = {w: i for i, w in enumerate(vocab)}
    ref = {}
    for text in ["what do you", "I would like to", "thank you for your",
                 "the component is", "he looked at the"]:
        ids = [idx.get(t, 0) for t in TOKEN.findall(text.lower())]
        with torch.no_grad():
            logits = model(torch.tensor([ids]))[0, -1]
        top = torch.topk(logits, 8).indices.tolist()
        ref[text] = {"ids": ids,
                     "topWords": [vocab[i] for i in top],
                     "logitMean": round(logits.mean().item(), 4)}
    (ROOT / "web" / "scripts" / "reference.json").write_text(json.dumps(ref, indent=1))
    print(f"reference     : {len(ref)} prompts → web/scripts/reference.json")

    mb_bin = (OUT / "tinygpt.bin").stat().st_size / 1_048_576
    mb_man = (OUT / "tinygpt.json").stat().st_size / 1_048_576
    print(f"params        : {ck['params']/1e6:.2f}M")
    print(f"val perplexity: {ck['val_ppl']:.1f}")
    print(f"weights       : {mb_bin:.2f} MB (int8)")
    print(f"manifest+vocab: {mb_man:.2f} MB")
    print(f"total         : {mb_bin+mb_man:.2f} MB")


if __name__ == "__main__":
    main()
