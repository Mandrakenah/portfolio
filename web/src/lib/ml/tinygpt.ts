/**
 * Inference for the transformer trained in ml/train/transformer.py.
 *
 * This is a hand-written forward pass — no ONNX runtime, no transformers.js,
 * no WASM blob. The model was defined, trained and quantised here, and this
 * file is the other half of that: the same architecture expressed in about two
 * hundred lines of TypeScript over Float32Array.
 *
 * Weights arrive as one int8 binary plus a manifest of offsets, so loading is
 * a single fetch and a few typed-array views rather than a parse.
 */

export type Arch = {
  dModel: number
  nLayer: number
  nHead: number
  dFF: number
  context: number
  vocabSize: number
  tiedHead: boolean
}

type TensorSpec = {
  name: string
  shape: number[]
  dtype: 'int8' | 'float32'
  scale: number
  offset: number
  bytes: number
}

export type Manifest = {
  arch: Arch
  tensors: TensorSpec[]
  vocab: string[]
  training: { params: number; valLoss: number; valPerplexity: number }
}

/** int8 + scale, or raw float32, into a Float32Array. */
function dequantise(buf: ArrayBuffer, t: TensorSpec): Float32Array {
  if (t.dtype === 'float32') {
    return new Float32Array(buf.slice(t.offset, t.offset + t.bytes))
  }
  const q = new Int8Array(buf, t.offset, t.bytes)
  const out = new Float32Array(q.length)
  for (let i = 0; i < q.length; i++) out[i] = q[i] * t.scale
  return out
}

/** y[m,n] = x[m,k] · W[n,k]^T + b[n]   (W stored row-major as [out, in], like torch) */
function matmul(x: Float32Array, W: Float32Array, b: Float32Array | null, M: number, K: number, N: number): Float32Array {
  const y = new Float32Array(M * N)
  for (let m = 0; m < M; m++) {
    const xo = m * K
    const yo = m * N
    for (let n = 0; n < N; n++) {
      const wo = n * K
      let s = b ? b[n] : 0
      for (let k = 0; k < K; k++) s += x[xo + k] * W[wo + k]
      y[yo + n] = s
    }
  }
  return y
}

function layerNorm(x: Float32Array, g: Float32Array, b: Float32Array, M: number, D: number): Float32Array {
  const y = new Float32Array(M * D)
  for (let m = 0; m < M; m++) {
    const o = m * D
    let mean = 0
    for (let d = 0; d < D; d++) mean += x[o + d]
    mean /= D
    let v = 0
    for (let d = 0; d < D; d++) { const t = x[o + d] - mean; v += t * t }
    const inv = 1 / Math.sqrt(v / D + 1e-5)
    for (let d = 0; d < D; d++) y[o + d] = (x[o + d] - mean) * inv * g[d] + b[d]
  }
  return y
}

const gelu = (v: number) =>
  0.5 * v * (1 + Math.tanh(0.7978845608028654 * (v + 0.044715 * v * v * v)))

export class TinyGPT {
  private w = new Map<string, Float32Array>()
  readonly arch: Arch
  readonly vocab: string[]
  readonly training: Manifest['training']
  private index: Map<string, number>

  constructor(manifest: Manifest, weights: ArrayBuffer) {
    this.arch = manifest.arch
    this.vocab = manifest.vocab
    this.training = manifest.training
    this.index = new Map(manifest.vocab.map((w, i) => [w, i]))
    for (const t of manifest.tensors) this.w.set(t.name, dequantise(weights, t))
  }

  private get(n: string): Float32Array {
    const t = this.w.get(n)
    if (!t) throw new Error(`missing tensor ${n}`)
    return t
  }

  tokenize(text: string): number[] {
    const toks = text.toLowerCase().match(/[a-z][a-z'\-]*|[.,;:!?]/g) ?? []
    return toks.map((t) => this.index.get(t) ?? 0)
  }

  /**
   * Runs the transformer stack and returns the final hidden states [T, D].
   * Both next-word prediction and sentence embedding read from this — one
   * network, two uses, which is the whole point of the thing.
   */
  private stack(ids: number[]): { h: Float32Array; T: number } {
    const { dModel: D, nLayer: L, nHead: H, dFF: FF, context: C } = this.arch
    const seq = ids.slice(-C)
    const T = seq.length
    const hd = D / H
    const tok = this.get('tok')
    const pos = this.get('pos')

    const x = new Float32Array(T * D)
    for (let t = 0; t < T; t++) {
      for (let d = 0; d < D; d++) x[t * D + d] = tok[seq[t] * D + d] + pos[t * D + d]
    }

    const scores = new Float32Array(T)
    for (let l = 0; l < L; l++) {
      const h = layerNorm(x, this.get(`l${l}.ln1.g`), this.get(`l${l}.ln1.b`), T, D)
      // in_proj_weight is [3D, D], laid out as [Wq; Wk; Wv] — one matmul for all three
      const qkv = matmul(h, this.get(`l${l}.attn.inW`), this.get(`l${l}.attn.inB`), T, D, 3 * D)

      const ctx = new Float32Array(T * D)
      const scale = 1 / Math.sqrt(hd)
      for (let head = 0; head < H; head++) {
        const base = head * hd
        for (let i = 0; i < T; i++) {
          // causal mask: position i may only see j <= i
          let max = -Infinity
          for (let j = 0; j <= i; j++) {
            let dot = 0
            for (let d = 0; d < hd; d++) {
              dot += qkv[i * 3 * D + base + d] * qkv[j * 3 * D + D + base + d]
            }
            dot *= scale
            scores[j] = dot
            if (dot > max) max = dot
          }
          let sum = 0
          for (let j = 0; j <= i; j++) { const e = Math.exp(scores[j] - max); scores[j] = e; sum += e }
          const inv = 1 / sum
          for (let d = 0; d < hd; d++) {
            let acc = 0
            for (let j = 0; j <= i; j++) acc += scores[j] * inv * qkv[j * 3 * D + 2 * D + base + d]
            ctx[i * D + base + d] = acc
          }
        }
      }

      const attnOut = matmul(ctx, this.get(`l${l}.attn.outW`), this.get(`l${l}.attn.outB`), T, D, D)
      for (let i = 0; i < T * D; i++) x[i] += attnOut[i]

      const h2 = layerNorm(x, this.get(`l${l}.ln2.g`), this.get(`l${l}.ln2.b`), T, D)
      const ff1 = matmul(h2, this.get(`l${l}.ff1W`), this.get(`l${l}.ff1B`), T, D, FF)
      for (let i = 0; i < ff1.length; i++) ff1[i] = gelu(ff1[i])
      const ff2 = matmul(ff1, this.get(`l${l}.ff2W`), this.get(`l${l}.ff2B`), T, FF, D)
      for (let i = 0; i < T * D; i++) x[i] += ff2[i]
    }

    return { h: layerNorm(x, this.get('lnf.g'), this.get('lnf.b'), T, D), T }
  }

  /** Logits for the position after the given token ids. */
  forward(ids: number[]): Float32Array {
    const { dModel: D, vocabSize: V } = this.arch
    if (!ids.length) return new Float32Array(V)
    const { h, T } = this.stack(ids)
    const last = h.subarray((T - 1) * D, T * D)
    const head = this.get('tok')            // output head is tied to the token embedding
    const logits = new Float32Array(V)
    for (let v = 0; v < V; v++) {
      const o = v * D
      let s = 0
      for (let d = 0; d < D; d++) s += last[d] * head[o + d]
      logits[v] = s
    }
    return logits
  }

  /** Mean-pooled final hidden state — the same network used as a sentence encoder. */
  embed(text: string): Float32Array {
    const { dModel: D } = this.arch
    const ids = this.tokenize(text)
    const out = new Float32Array(D)
    if (!ids.length) return out
    const { h, T } = this.stack(ids)
    for (let t = 0; t < T; t++) for (let d = 0; d < D; d++) out[d] += h[t * D + d]
    let norm = 0
    for (let d = 0; d < D; d++) { out[d] /= T; norm += out[d] * out[d] }
    norm = Math.sqrt(norm) || 1
    for (let d = 0; d < D; d++) out[d] /= norm
    return out
  }

  /** Top-k next words with probabilities. */
  topK(text: string, k = 5): { word: string; p: number }[] {
    const ids = this.tokenize(text)
    const logits = this.forward(ids)
    let max = -Infinity
    for (let i = 0; i < logits.length; i++) if (logits[i] > max) max = logits[i]
    let sum = 0
    const exp = new Float32Array(logits.length)
    for (let i = 0; i < logits.length; i++) { const e = Math.exp(logits[i] - max); exp[i] = e; sum += e }
    const idx = Array.from({ length: logits.length }, (_, i) => i)
    idx.sort((a, b) => exp[b] - exp[a])
    const out: { word: string; p: number }[] = []
    for (const i of idx) {
      const w = this.vocab[i]
      if (!w || w === '<unk>' || w === '</s>' || !/[a-z0-9]/i.test(w)) continue
      out.push({ word: w, p: exp[i] / sum })
      if (out.length >= k) break
    }
    return out
  }

  /**
   * Ghost-text continuation, greedy, stopping as soon as the model is unsure.
   *
   * The thresholds are low on purpose. A softmax over 8,000 words spreads its
   * mass thinly — a confident prediction here sits around 10%, not 60% — so an
   * n-gram's cutoff would silence the model entirely. These numbers come from
   * measuring the actual distribution, not from taste.
   */
  suggest(text: string, maxWords = 4, minP = 0.045): string {
    if (!text.trim()) return ''
    const words: string[] = []
    let cursor = text

    // Greedy decoding on a small model loops — "used to be used to". Penalise
    // words already emitted (or present in the last few words the visitor
    // typed) so the continuation has to move forward instead of circling.
    const recent = new Map<string, number>()
    for (const w of this.tokenize(text).slice(-6)) {
      const t = this.vocab[w]
      if (t) recent.set(t, (recent.get(t) ?? 0) + 1)
    }

    for (let i = 0; i < maxWords; i++) {
      const cands = this.topK(cursor, 6)
      if (!cands.length) break
      const scored = cands.map((c) => ({
        ...c,
        adj: c.p * Math.pow(0.35, recent.get(c.word) ?? 0),
      }))
      scored.sort((a, b) => b.adj - a.adj)
      const best = scored[0]
      if (!best || best.adj < (i === 0 ? minP : 0.03)) break
      words.push(best.word)
      recent.set(best.word, (recent.get(best.word) ?? 0) + 1)
      cursor = cursor.replace(/\s+$/, '') + ' ' + best.word
    }
    if (!words.length) return ''
    return (text.endsWith(' ') ? '' : ' ') + words.join(' ')
  }
}

export async function loadTinyGPT(base = ''): Promise<TinyGPT> {
  const [manifest, weights] = await Promise.all([
    fetch(`${base}/models/tinygpt.json`).then((r) => {
      if (!r.ok) throw new Error(`tinygpt.json ${r.status}`)
      return r.json() as Promise<Manifest>
    }),
    fetch(`${base}/models/tinygpt.bin`).then((r) => {
      if (!r.ok) throw new Error(`tinygpt.bin ${r.status}`)
      return r.arrayBuffer()
    }),
  ])
  return new TinyGPT(manifest, weights)
}
