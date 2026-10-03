"""
Sets this laptop up to train the portfolio model on its GPU, then trains it.

This replaces an earlier PowerShell version. Python is already required for the
training itself, so doing the setup here too removes a whole language and its
quirks from the path between a double-click and a running model.

Everything heavy -- corpus, token cache, checkpoints, about 700 MB -- lives in
LOCALAPPDATA rather than the OneDrive project folder, so OneDrive does not sync
it all to the cloud. Only the finished model goes back to the project.
"""
from __future__ import annotations

import gzip
import hashlib
import os
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORK = Path(os.environ.get("LOCALAPPDATA", HERE)) / "portfolio-training"
CORPUS, CKPT = WORK / "corpus", WORK / "checkpoints"


def say(msg: str = "") -> None:
    print(msg, flush=True)


def stop_sleep() -> None:
    """Ask Windows to stay awake while this runs. Not a permanent settings
    change -- it lapses the moment this process exits. Not worth failing over."""
    try:
        import ctypes
        # ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_AWAYMODE_REQUIRED
        ctypes.windll.kernel32.SetThreadExecutionState(0x80000041)
        say("Sleep disabled while this window is open.")
    except Exception:
        say("Could not disable sleep -- set your power plan to Never sleep.")


def cuda_state() -> str | None:
    """'yes' if torch sees a GPU, 'no-cuda' if torch is installed without CUDA
    support, None if torch is not installed at all. Checked in a subprocess so a
    freshly installed torch is picked up without restarting."""
    r = subprocess.run([sys.executable, "-c",
                        "import torch; print('yes' if torch.cuda.is_available() else 'no-cuda')"],
                       capture_output=True, text=True)
    if r.returncode != 0:
        return None
    return r.stdout.strip().splitlines()[-1] if r.stdout.strip() else None


def ensure_torch() -> bool:
    state = cuda_state()
    if state == "yes":
        return True

    if state == "no-cuda":
        say()
        say("PyTorch is installed but was built without CUDA, so it cannot use your GPU.")
        say("Replacing it with the CUDA build. About 2.5 GB, one time.")
        subprocess.run([sys.executable, "-m", "pip", "uninstall", "-y",
                        "torch", "torchvision", "torchaudio"],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        say()
        say("Installing PyTorch with CUDA support. About 2.5 GB, one time.")
    say("This takes several minutes. Leave it alone until it finishes.")
    say()

    # cu121 covers every RTX 30-series card and is the most widely tested build.
    subprocess.run([sys.executable, "-m", "pip", "install", "--no-cache-dir",
                    "torch", "--index-url", "https://download.pytorch.org/whl/cu121"])
    return cuda_state() == "yes"


def rebuild_corpus() -> bool:
    target = CORPUS / "corpus.txt"
    if target.exists() and target.stat().st_size > 190_000_000:
        say("Corpus already unpacked.")
        return True

    part_dir = HERE / "corpus-parts"
    parts = sorted(p for p in part_dir.glob("corpus.gz.*") if p.suffix != ".md5")
    if not parts:
        say("ERROR: the corpus-parts folder is missing or empty. Tell Claude.")
        return False

    say()
    say("Rebuilding the training corpus (34 million words)...")
    blob = WORK / "corpus.txt.gz"
    digest = hashlib.md5()
    with blob.open("wb") as out:
        for p in parts:
            say(f"  {p.name}")
            data = p.read_bytes()
            digest.update(data)
            out.write(data)

    # The parts were split from one gzip stream. A damaged part would decompress
    # into silently truncated training data, so check before trusting it rather
    # than after wasting a night on it.
    expected = (part_dir / "corpus.gz.md5").read_text().strip()
    if digest.hexdigest() != expected:
        blob.unlink(missing_ok=True)
        say("ERROR: the reassembled corpus is corrupt (checksum mismatch).")
        say("Tell Claude -- do not train on it.")
        return False
    say("  checksum ok")

    with gzip.open(blob, "rb") as src, target.open("wb") as dst:
        shutil.copyfileobj(src, dst, length=8 << 20)
    blob.unlink(missing_ok=True)
    say(f"Corpus ready: {target.stat().st_size / 1e6:.0f} MB")
    return True


def main() -> int:
    say("Portfolio model trainer")
    say("-----------------------")
    CORPUS.mkdir(parents=True, exist_ok=True)
    CKPT.mkdir(parents=True, exist_ok=True)
    say(f"Python {sys.version.split()[0]}")
    say(f"Working folder: {WORK}")
    stop_sleep()

    if ensure_torch():
        import torch
        say()
        say(f"GPU ready: {torch.cuda.get_device_name(0)}")
    else:
        say()
        say("Your GPU is not visible to PyTorch.")
        say("Training on the CPU would take days rather than hours.")
        if input("Type Y to train on CPU anyway, or anything else to stop: ").strip().lower() != "y":
            return 1

    if not rebuild_corpus():
        return 1

    script = HERE / "ml" / "train" / "transformer.py"
    if not script.exists():
        say(f"ERROR: cannot find {script}. Tell Claude.")
        return 1

    env = dict(os.environ, CORPUS_DIR=str(CORPUS), CKPT_DIR=str(CKPT), PYTHONUNBUFFERED="1")
    say()
    say("Starting training.")
    say("The first few minutes are quiet while it reads the corpus. That is normal.")
    say("Then a line every 500 steps. About 3 hours in total.")
    say()
    say("Leave this window open. Closing it stops training.")
    say("If it stops, run TRAIN.bat again -- it resumes from the last checkpoint.")
    say()

    rc = subprocess.run([sys.executable, str(script)], env=env).returncode
    say()
    if rc == 0:
        say("Training finished. Tell Claude, and the model will be measured")
        say("and put on your site.")
        say(f"Checkpoints: {CKPT}")
    else:
        say(f"Training stopped with error code {rc}. Send the text above to Claude.")
    return rc


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        say()
        say("Stopped. Run TRAIN.bat again to resume from the last checkpoint.")
        sys.exit(1)
    except Exception as exc:
        say()
        say(f"Something went wrong: {type(exc).__name__}: {exc}")
        say("Send this to Claude.")
        import traceback
        traceback.print_exc()
        sys.exit(1)
