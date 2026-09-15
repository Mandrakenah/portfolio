import tinygpt from '../../../public/models/tinygpt.json'
import comparison from '../../../public/models/comparison.json'
import corpus from '../../../public/models/corpus-stats.json'

/**
 * The narrative version of the machine learning on this site. The numbers all
 * come from the build manifests, so this section cannot drift from what
 * actually shipped.
 */

const STEPS = [
  {
    n: '01',
    title: 'Getting the text',
    body: [
      `A language model is mostly its training data, and good text is harder to come by than it sounds. Common Crawl, Wikipedia dumps and the usual corpora were all out of reach, and scraping news or Reddit would have meant training on other people's copyrighted work and publishing the result under my own name.`,
      `So the corpus is built from text that is genuinely free to use: public-domain novels, the NLTK research corpora — news wire, forum posts, film reviews, chat transcripts — and the documentation shipped inside MIT-licensed npm packages. That last part matters more than its size suggests. Without it the model had never seen the words "React" or "TypeScript", which is a problem for a site about exactly that.`,
    ],
    stat: [`${(corpus.words / 1e6).toFixed(2)}M words`, `${corpus.sources} sources`, `${corpus.technicalShare}% software English`],
  },
  {
    n: '02',
    title: 'The model',
    body: [
      `A decoder-only transformer — the same family as GPT, several orders of magnitude smaller. ${tinygpt.arch.nLayer} layers, ${tinygpt.arch.dModel} dimensions, ${tinygpt.arch.nHead} attention heads, a ${tinygpt.arch.context}-word context window, and input and output embeddings tied together to halve the parameter count.`,
      `Size was not an aesthetic choice. It had to train on two CPU threads and then download to somebody's phone, and those two constraints set the budget long before any question of what would be ideal.`,
    ],
    stat: [`${(tinygpt.training.params / 1e6).toFixed(2)}M parameters`, `${tinygpt.arch.context}-word context`, `${tinygpt.arch.vocabSize.toLocaleString()} vocabulary`],
  },
  {
    n: '03',
    title: 'Training it',
    body: [
      `Trained from scratch — no pretrained weights, nothing fine-tuned. AdamW with a one-cycle schedule, gradient clipping, dropout, and a held-out split the model never sees.`,
      `Validation loss is checked every 250 steps and the weights are only saved when it improves, so what ships is the best the model ever was rather than wherever it happened to stop. Training halts on its own once six checks pass without progress.`,
    ],
    stat: [`held-out split`, `checkpoint on best only`, `early stopping`],
  },
  {
    n: '04',
    title: 'Running it in your browser',
    body: [
      `The forward pass is hand-written TypeScript — attention, feed-forward, layer norm — about 250 lines over Float32Array. No ONNX runtime, no WASM blob, no third-party inference library.`,
      `The weights are quantised to 8-bit integers with one scale per tensor, which is what turns ${(tinygpt.training.params * 4 / 1e6).toFixed(0)} MB of float32 into 5.5 MB you can actually send to a phone. It was checked against PyTorch afterwards: same tokenisation, same top-five predictions, and perfect agreement across the top eight on every test prompt.`,
    ],
    stat: [`~250 lines of TypeScript`, `int8 quantised`, `verified against PyTorch`],
  },
  {
    n: '05',
    title: 'Checking it was worth it',
    body: [
      `A bigger model is not automatically a better one, so it was measured against the thing it replaced: a Kneser-Ney trigram, on the same vocabulary, the same tokenisation and the same held-out tokens.`,
      `The transformer scored ${comparison.transformerPerplexity} perplexity against the trigram's ${comparison.trigramPerplexity} — ${comparison.improvementPct}% better. That gap is context: the trigram sees the last two words, the transformer sees ${comparison.transformerContext}.`,
    ],
    stat: [`${comparison.transformerPerplexity} vs ${comparison.trigramPerplexity}`, `${comparison.improvementPct}% better`, `same held-out tokens`],
  },
  {
    n: '06',
    title: 'Where it fails',
    body: [
      `The obvious next move was to use one network for everything — prediction and search from the same brain. The first attempt lost to BM25 on every single query, and the reason turned out to be diagnosable: trained on novels and news, the model had never seen the word "TypeScript". It knew none of the fifteen technical terms this site is about, so its sense of which projects resemble each other was meaningless.`,
      `Adding software documentation to the training data fixed that — 13 of 15 now — and it began returning the right evidence on some queries. It still loses to BM25 overall, so search stays on BM25: a ranking formula from the 1970s, beating a neural network, because the neural network is the wrong tool for 76 short documents about a subject it barely knows.`,
    ],
    stat: [`0/15 → 13/15 terms`, `BM25 still wins`, `measured, not assumed`],
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
          trained on two CPU threads from text anyone can download. The interesting question was never
          whether it could win — it was whether I could build the whole path end to end, measure it
          honestly, and know exactly where it breaks.
        </p>
      </div>
    </section>
  )
}
