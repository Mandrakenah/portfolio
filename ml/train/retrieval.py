"""
Retrieval index: BM25 + concept expansion + character n-grams.

Why not just ship transformer embeddings? Because they cost the visitor a
~23 MB model download before the first search returns anything. This index is
~60 KB, answers instantly, and handles the queries a recruiter actually types.
The transformer is available as an opt-in upgrade in the browser; this is the
floor, not the ceiling.

Three signals, combined:
  1. BM25 over word tokens        -- the lexical backbone
  2. concept expansion            -- "ML" reaches "machine learning", "frontend"
                                     reaches "React"; a hand-built map beats a
                                     bad embedding on a 77-document corpus
  3. character 4-gram overlap     -- typo and morphology tolerance
                                     ("typescrip", "authenticate" vs "authentication")
"""
from __future__ import annotations

import math
import re
from collections import Counter, defaultdict

_WORD = re.compile(r"[a-z0-9][a-z0-9+#.\-]*")

STOP = {
    "the","a","an","and","or","but","of","to","in","on","at","for","with","is","are",
    "was","were","be","been","it","its","that","this","as","by","from","has","have",
    "had","not","no","so","than","then","they","them","their","i","my","we","our",
    "you","your","which","what","when","where","who","how","can","could","would",
    "should","will","do","does","did","if","up","out","about","into","over","also",
}

# Concept expansion: query term -> additional terms to search for.
# Hand-curated for the vocabulary of software hiring.
CONCEPTS: dict[str, list[str]] = {
    "ml": ["machine", "learning", "model", "neural", "training"],
    "ai": ["machine", "learning", "neural", "model", "intelligence", "nlp"],
    "nlp": ["language", "text", "embedding", "token", "transformer", "ngram"],
    "frontend": ["react", "ui", "interface", "component", "css", "tailwind", "browser"],
    "front-end": ["react", "ui", "interface", "component", "browser"],
    "backend": ["node", "express", "api", "server", "database", "mongodb", "rest"],
    "back-end": ["node", "express", "api", "server", "database"],
    "fullstack": ["react", "node", "express", "api", "database", "full"],
    "full-stack": ["react", "node", "express", "api", "database", "full"],
    "database": ["mongodb", "mongoose", "sql", "schema", "persistence", "atlas"],
    "db": ["mongodb", "sql", "database", "schema"],
    "testing": ["test", "vitest", "msw", "spec", "coverage", "tdd"],
    "tests": ["test", "vitest", "spec", "testing"],
    "qa": ["test", "vitest", "quality", "spec", "regression"],
    "devops": ["deployment", "build", "pipeline", "aws", "cloud", "ci"],
    "cloud": ["aws", "deployment", "pipeline", "infrastructure"],
    "api": ["rest", "endpoint", "express", "openapi", "client", "http"],
    "rest": ["api", "endpoint", "express", "http"],
    "typescript": ["typed", "types", "ts", "strict", "interface"],
    "javascript": ["js", "node", "react", "browser"],
    "js": ["javascript", "node", "react"],
    "ts": ["typescript", "typed", "types"],
    "python": ["numpy", "pandas", "sklearn", "scikit", "training"],
    "react": ["component", "hooks", "jsx", "frontend", "next"],
    "ui": ["interface", "design", "component", "css", "frontend"],
    "ux": ["interface", "design", "usability", "accessibility"],
    "performance": ["fast", "optimise", "optimize", "latency", "budget", "speed"],
    "security": ["auth", "authentication", "token", "session", "validation"],
    "auth": ["authentication", "login", "session", "token", "msal", "email"],
    "realtime": ["live", "streaming", "concurrent", "instant"],
    "real-time": ["live", "streaming", "concurrent", "instant"],
    "data": ["dataset", "pandas", "analysis", "pipeline", "database"],
    "leadership": ["led", "team", "manager", "project", "standard", "mentor"],
    "communication": ["documentation", "wrote", "guide", "standard", "writing"],
    "teamwork": ["team", "collaboration", "review", "group"],
    "mobile": ["android", "phone", "responsive", "kotlin", "room"],
    "graphql": ["api", "query", "schema"],
    "docker": ["container", "deployment", "build"],
    "agile": ["scrum", "sprint", "iteration", "team"],
    "junior": ["student", "co-op", "intern", "learning"],
    "intern": ["co-op", "student", "placement"],
    "coop": ["co-op", "internship", "placement", "student"],
    "graduate": ["student", "diploma", "college", "centennial"],
}


def tokenize(text: str) -> list[str]:
    return [t for t in _WORD.findall(text.lower()) if t not in STOP and len(t) > 1]


def char_grams(text: str, n: int = 4) -> set[str]:
    s = re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()
    return {s[i : i + n] for i in range(max(len(s) - n + 1, 0))}


class BM25Index:
    def __init__(self, k1: float = 1.4, b: float = 0.72) -> None:
        self.k1, self.b = k1, b
        self.doc_ids: list[str] = []
        self.doc_tokens: list[list[str]] = []
        self.df: Counter[str] = Counter()
        self.tf: list[Counter[str]] = []
        self.doc_len: list[int] = []
        self.avg_len = 0.0

    def fit(self, docs: list[tuple[str, str]]) -> "BM25Index":
        for doc_id, text in docs:
            toks = tokenize(text)
            self.doc_ids.append(doc_id)
            self.doc_tokens.append(toks)
            counts = Counter(toks)
            self.tf.append(counts)
            self.doc_len.append(len(toks))
            self.df.update(counts.keys())
        self.avg_len = sum(self.doc_len) / max(len(self.doc_len), 1)
        return self

    def idf(self, term: str) -> float:
        n = len(self.doc_ids)
        df = self.df.get(term, 0)
        return math.log(1 + (n - df + 0.5) / (df + 0.5))

    def export(self) -> dict:
        """Export postings so the browser can score without re-reading the corpus."""
        postings: dict[str, list[list]] = defaultdict(list)
        for i, counts in enumerate(self.tf):
            for term, c in counts.items():
                postings[term].append([i, c])
        return {
            "k1": self.k1,
            "b": self.b,
            "docIds": self.doc_ids,
            "docLen": self.doc_len,
            "avgLen": round(self.avg_len, 3),
            "idf": {t: round(self.idf(t), 4) for t in self.df},
            "postings": {t: p for t, p in postings.items()},
            "concepts": CONCEPTS,
        }
