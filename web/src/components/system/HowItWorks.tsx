import tinygpt from '../../../public/models/tinygpt.json'
import comparison from '../../../public/models/comparison.json'
import corpus from '../../../public/models/corpus-stats.json'

/**
 * The narrative version of the machine learning on this site. The numbers all
 * come from the build manifests, so this section cannot drift from what
 * actually shipped.
 */

const byKind = Object.fromEntries(corpus.byKind.map((k) => [k.kind, k]))
const techShare = byKind['software documentation']?.share ?? 0
const books = ((byKind['books']?.words ?? 0) / 1e6).toFixed(1)
const docRepos = corpus.breakdown.filter((b) => b.kind === 'software documentation').length

const STEPS = [
  {
    n: '01',
    title: 'Getting the text',
    body: [
      `A language model is mostly its training data, and good text is harder to come by than it sounds. Common Crawl, Wikipedia dumps and the usual corpora were all out of reach, and scraping news or Reddit would have meant training on other people's copyrighted work and publishing the result under my own name.`,
      `What is reachable turns out to be enough. ${corpus.sources} sources, all public domain or openly licensed: the documentation of ${docRepos} software projects — MDN, Kubernetes, Python, PostgreSQL, Django, React and the rest — ${books}M words of public-domain books, and the NLTK research corpora for news, reviews and forum English.`,
      `The documentation matters more than its share suggests. Without it the model had never seen the words "React" or "TypeScript", which is a problem for a site about exactly that. Every duplicate line is removed across the whole corpus first — ${corpus.duplicateLinesRemoved.toLocaleString()} of them — because an earlier version scored a flattering 84.7 perplexity purely by being tested on sentences it had already been trained on.`,
    ],
    stat: [`${(corpus.words / 1e6).toFixed(1)}M words`, `${corpus.sources} sources`, `${techShare}% software English`],
  },
  {
    n: '02',
    title: 'The model',
    body: [
      `A decoder-only transformer — the same family as GPT, several orders of magnitude smaller. ${tinygpt.arch.nLayer} layers, ${tinygpt.arch.dModel} dimensions, ${tinygpt.arch.nHead} attention heads, a ${tinygpt.arch.context}-word context window, and input and output embeddings tied together to halve the parameter count.`,
      `Size was not an aesthetic choice: it has to download to somebody's phone before it can predict anything. That ceiling, not ambition, is what fixes the parameter count.`,
    ],
    stat: [`${(tinygpt.training.params / 1e6).toFixed(2)}M parameters`, `${tinygpt.arch.context}-word context`, `${tinygpt.arch.vocabSize.toLocaleString()} vocabulary`],
  },
  {
    n: '03',
    title: 'Training it',
    body: [
      `Trained from scratch — no pretrained weights, nothing fine-tuned. AdamW with a one-cycle schedule, gradient clipping, dropout, and a held-out split the model never sees.`,
      `Validation loss is checked every 500 steps and the weights are only saved when it improves, so what ships is the best the model ever was rather than wherever it happened to stop. Training halts once eight checks pass without progress — which is exactly what happened, at step 34,500, keeping step 30,500.`,
      `It ran on a laptop GPU in 33 minutes. The same run on two CPU threads had managed a thousand steps in eight days, because the cloud container doing it was reclaimed every time the session went idle. The hardware was never the ambitious part; noticing it was the problem took far longer than fixing it.`,
    ],
    stat: [`33 minutes on an RTX 3050`, `checkpoint on best only`, `early stopping fired`],
  },
  {
    n: '04',
    title: 'Running it in your browser',
    body: [
      `The forward pass is hand-written TypeScript — attention, feed-forward, layer norm — about 250 lines over Float32Array. No ONNX runtime, no WASM blob, no third-party inference library.`,
      `The weights are quantised to 8-bit integers with one scale per tensor, which is what turns ${(tinygpt.training.params * 4 / 1e6).toFixed(0)} MB of float32 into 12.0 MB you can actually send to a phone. It was checked against PyTorch afterwards: same tokenisation, same top-five predictions, and perfect agreement across the top eight on every test prompt.`,
    ],
    stat: [`~250 lines of TypeScript`, `int8 quantised`, `verified against PyTorch`],
  },
  {
    n: '05',
    title: 'Checking it was worth it',
    body: [
      `A bigger model is not automatically a better one, so it was measured against the thing it replaced: a Kneser-Ney trigram, on the same vocabulary, the same tokenisation and the same held-out tokens.`,
      `The transformer scored ${comparison.transformerPerplexity} perplexity against the trigram's ${comparison.trigramPerplexity} — ${comparison.improvementPct}% better. That gap is context: the trigram sees the last two words, the transformer sees ${comparison.transformerContext}.`,
      `Both numbers are measured on ${comparison.heldOutSentences.toLocaleString()} sentences that occur exactly once in the corpus, so neither model can have memorised them. Worth saying plainly: quadrupling the training data roughly halved the transformer's perplexity, but it halved the trigram's too. The baseline got better as fast as the model did, and reporting only one of those would be the dishonest version.`,
    ],
    stat: [`${comparison.transformerPerplexity} vs ${comparison.trigramPerplexity}`, `${comparison.improvementPct}% better`, `sentences seen exactly once`],
  },
  {
    n: '06',
    title: 'Where it fails',
    body: [
      `The obvious next move was to use one network for everything — prediction and search from the same brain. The first attempt lost to BM25 on every single query, and the reason turned out to be diagnosable: trained on novels and news, the model had never seen the word "TypeScript". It knew none of the fifteen technical terms this site is about, so its sense of which projects resemble each other was meaningless.`,
      `Adding software documentation to the training data fixed that — all fifteen now — and it began returning the right evidence on some queries. It still loses to BM25 overall, so search stays on BM25: a ranking formula from the 1970s, beating a neural network, because the neural network is the wrong tool for 76 short documents about a subject it barely knows.`,
    ],
    stat: [`0/15 → 15/15 terms`, `BM25 still wins`, `measured, not assumed`],
  },
]

export function HowItWorks() {
  return (
    <section className="px-5 pb-24 md:px-10 md:pb-32">
      <div className="mx-auto max-w-[1100px]">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-volt">
          How the model was built
        </h2>
        <p className="mb-12 max-w-2xl text-[15px] leading-relaxed text-mute">
          The full account, including the part that did not work. Every number below is read from the
          build manifests, so it cannot drift from what actually shipped.
        </p>

        <ol className="space-y-px overflow-hidden rounded-2xl border border-line bg-line">
          {STEPS.map((s) => (
            <li key={s.n} className="bg-ink p-6 md:p-8">
              <div className="grid gap-6 md:grid-cols-[auto_1fr_15rem] md:gap-10">
                <span className="font-mono text-[13px] text-volt md:pt-1">{s.n}</span>
                <div>
                  <h3 className="mb-3 text-[clamp(1.05rem,2vw,1.35rem)] font-medium tracking-[-0.02em] text-bone">
                    {s.title}
                  </h3>
                  <div className="space-y-3">
                    {s.body.map((p, i) => (
                      <p key={i} className="text-[14.5px] leading-relaxed text-mute">{p}</p>
                    ))}
                  </div>
                </div>
                <ul className="space-y-2 md:pt-1">
                  {s.stat.map((t) => (
                    <li
                      key={t}
                      className="rounded-lg border border-line bg-void/60 px-3 py-2 font-mono text-[11px] text-bone"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-10 max-w-2xl border-l-2 border-volt/40 pl-5 text-[14px] leading-relaxed text-mute">
          <span className="text-bone">What this is not.</span> It is not competitive with a frontier
          model, and nothing here claims otherwise. Those are roughly ten thousand times larger, trained
          on ten thousand times more text, on hardware that costs more than a house. This model was
          trained on a laptop GPU from text anyone can download. The interesting question was never
          whether it could win — it was whether I could build the whole path end to end, measure it
          honestly, and know exactly where it breaks.
        </p>
        <div className="mt-16 border-t border-line pt-10">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-volt">
            Where the text came from
          </h3>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-mute">
            Every source is public domain or openly licensed, and every one is credited here because
            several of these licences require it. Nothing was scraped.
          </p>
          <ul className="mt-6 grid gap-x-8 gap-y-2 md:grid-cols-2">
            {corpus.breakdown.map((b) => (
              <li
                key={b.label}
                className="flex items-baseline justify-between gap-4 border-b border-line/60 py-2"
              >
                <span className="text-[13px] text-bone">{b.label}</span>
                <span className="shrink-0 font-mono text-[11px] text-faint">{b.licence}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-2xl text-[13px] leading-relaxed text-faint">
            MDN Web Docs is CC BY-SA, which carries forward to anything trained on it, so the model
            weights are released under the same licence.
          </p>
        </div>
      </div>
    </section>
  )
}
