# Trains the portfolio transformer on this laptop's GPU.
#
# The cloud container this was being trained in has no GPU and gets recycled
# whenever the session idles, which is why it kept dying. An RTX 3050 does the
# same work roughly ten times faster and nothing here reclaims it mid-run.
#
# Everything heavy (corpus, token cache, checkpoints — about 700 MB) is kept in
# LOCALAPPDATA, NOT in the OneDrive project folder, so OneDrive does not try to
# sync it to the cloud every few minutes. Only the finished model comes back.

Set-Location $PSScriptRoot

function Say($msg, $colour = "Cyan") { Write-Host "" ; Write-Host $msg -ForegroundColor $colour }

Write-Host "Portfolio model trainer" -ForegroundColor Green
Write-Host "-----------------------" -ForegroundColor DarkGray

# Everything below runs inside this try. Without it, any error closes the window
# instantly and you never see what went wrong — which is exactly what happened
# on the first version of this script.
try {

$work   = Join-Path $env:LOCALAPPDATA "portfolio-training"
$corpus = Join-Path $work "corpus"
$ckpt   = Join-Path $work "checkpoints"
New-Item -ItemType Directory -Force -Path $corpus, $ckpt | Out-Null
Write-Host "Working folder: $work" -ForegroundColor DarkGray

# ── keep the laptop awake ───────────────────────────────────────────────
# Asks Windows to stay awake only while this window is open. Not a permanent
# settings change — closing the window gives sleep straight back. Failing to
# set it is not worth stopping over, so this one is allowed to fail quietly.
try {
    Add-Type -Name Power -Namespace Win32 -MemberDefinition @'
[DllImport("kernel32.dll", SetLastError = true)]
public static extern uint SetThreadExecutionState(uint esFlags);
'@
    # ES_CONTINUOUS (0x80000000) | ES_SYSTEM_REQUIRED (0x01) | ES_AWAYMODE_REQUIRED (0x40).
    # Unquoted hex: PowerShell parses 0x... as a number, but "0x..." as text,
    # and casting that text to uint32 throws.
    [void][Win32.Power]::SetThreadExecutionState(0x80000041)
    Write-Host "Sleep disabled while this window is open." -ForegroundColor DarkGray
} catch {
    Write-Host "Could not disable sleep — set your power plan to Never sleep." -ForegroundColor Yellow
}

# ── find python ─────────────────────────────────────────────────────────
$py = $null
foreach ($c in @("python", "py")) {
    try {
        $v = & $c -c "import sys; print(sys.version_info[0])" 2>$null
        if ($LASTEXITCODE -eq 0 -and $v -eq "3") { $py = $c; break }
    } catch { }
}
if (-not $py) {
    Say "Could not find Python on this computer." "Red"
    Say "Install it from python.org and tick 'Add python.exe to PATH', then run this again." "Yellow"
    Read-Host "Press Enter to close"; exit 1
}
Say "Python $(& $py -c 'import sys; print(sys.version.split()[0])')" "DarkGray"

# ── make sure torch can see the GPU ─────────────────────────────────────
$cuda = ""
try { $cuda = (& $py -c "import torch; print(torch.cuda.is_available())" 2>$null | Select-Object -Last 1) } catch { }

if ($cuda -ne "True") {
    if ($cuda -eq "False") {
        Say "PyTorch is installed but was built without CUDA, so it cannot use your GPU."
        Say "Replacing it with the CUDA build. About 2.5 GB, one time, several minutes."
        & $py -m pip uninstall -y torch torchvision torchaudio 2>&1 | Out-Null
    } else {
        Say "Installing PyTorch with CUDA support. About 2.5 GB, one time, several minutes."
    }
    Write-Host "(Leave it alone until it finishes.)" -ForegroundColor DarkGray
    & $py -m pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cu121
    $cuda = ""
    try { $cuda = (& $py -c "import torch; print(torch.cuda.is_available())" 2>$null | Select-Object -Last 1) } catch { }
}

if ($cuda -eq "True") {
    Say "GPU ready: $(& $py -c 'import torch; print(torch.cuda.get_device_name(0))')" "Green"
} else {
    Say "Your GPU still is not visible to PyTorch." "Yellow"
    Say "Training on the CPU instead would take days rather than hours." "Yellow"
    $go = Read-Host "Type Y to train on CPU anyway, or anything else to stop and tell Claude"
    if ($go -ne "Y" -and $go -ne "y") { exit 1 }
}

# ── rebuild the corpus from its parts ───────────────────────────────────
$corpusTxt = Join-Path $corpus "corpus.txt"
if (-not (Test-Path $corpusTxt)) {
    Say "Rebuilding the training corpus (34 million words)..."
    $partDir = Join-Path $PSScriptRoot "corpus-parts"
    if (-not (Test-Path $partDir)) { Say "corpus-parts folder is missing. Tell Claude." "Red"; Read-Host; exit 1 }
    $parts = Get-ChildItem $partDir -Filter "corpus.gz.*" |
             Where-Object { $_.Name -notlike "*.md5" } | Sort-Object Name
    if ($parts.Count -eq 0) { Say "corpus-parts folder is empty. Tell Claude." "Red"; Read-Host; exit 1 }

    $gz = Join-Path $work "corpus.txt.gz"
    $out = [System.IO.File]::Create($gz)
    try {
        foreach ($p in $parts) {
            Write-Host "  $($p.Name)" -ForegroundColor DarkGray
            $bytes = [System.IO.File]::ReadAllBytes($p.FullName)
            $out.Write($bytes, 0, $bytes.Length)
        }
    } finally { $out.Close() }

    # The parts were split from one gzip stream. If any arrived damaged, the
    # decompression below would quietly produce truncated training data, so
    # check before trusting it rather than after wasting a night on it.
    $expected = (Get-Content (Join-Path $partDir "corpus.gz.md5")).Trim()
    $actual = (Get-FileHash $gz -Algorithm MD5).Hash.ToLower()
    if ($actual -ne $expected) {
        Say "The reassembled corpus is corrupt (checksum mismatch)." "Red"
        Say "Tell Claude — do not train on it." "Red"
        Remove-Item $gz -Force -ErrorAction SilentlyContinue
        Read-Host "Press Enter to close"; exit 1
    }
    Write-Host "  checksum ok" -ForegroundColor DarkGray

    Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction SilentlyContinue
    $in  = [System.IO.File]::OpenRead($gz)
    $dec = New-Object System.IO.Compression.GZipStream($in, [System.IO.Compression.CompressionMode]::Decompress)
    $dst = [System.IO.File]::Create($corpusTxt)
    try { $dec.CopyTo($dst) } finally { $dst.Close(); $dec.Close(); $in.Close() }
    Remove-Item $gz -Force
    Say "Corpus ready: $([math]::Round((Get-Item $corpusTxt).Length / 1MB)) MB" "Green"
} else {
    Say "Corpus already unpacked." "DarkGray"
}

# ── train ───────────────────────────────────────────────────────────────
$script = Join-Path $PSScriptRoot "ml\train\transformer.py"
if (-not (Test-Path $script)) { Say "Cannot find ml\train\transformer.py. Tell Claude." "Red"; Read-Host; exit 1 }

$env:CORPUS_DIR = $corpus
$env:CKPT_DIR   = $ckpt
$env:PYTHONUNBUFFERED = "1"

Say "Starting training." "Green"
Write-Host "The first few minutes are quiet while it reads the corpus - that is normal." -ForegroundColor DarkGray
Write-Host "Then you will see a line every 500 steps. About 3 hours in total." -ForegroundColor DarkGray
Write-Host ""
Write-Host "Leave this window open. Closing it stops training." -ForegroundColor Yellow
Write-Host "If it does stop, run TRAIN.bat again - it resumes from the last checkpoint." -ForegroundColor DarkGray
Write-Host ""

& $py $script 2>&1 | Tee-Object -FilePath (Join-Path $work "train.log") -Append

Say "Training finished. Tell Claude, and the model will be measured and put on your site." "Green"
Write-Host "Checkpoints: $ckpt" -ForegroundColor DarkGray

} catch {
    Say "Something went wrong:" "Red"
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Line $($_.InvocationInfo.ScriptLineNumber): $($_.InvocationInfo.Line.Trim())" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "Send the red text above to Claude." -ForegroundColor Yellow
}

Read-Host "Press Enter to close"
