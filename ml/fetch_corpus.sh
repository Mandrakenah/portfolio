#!/usr/bin/env bash
# Downloads the training corpus. Not committed — it is ~8 MB of public-domain
# text that anyone can re-fetch, and a repo is not a place to keep a dataset.
set -e
cd "$(dirname "$0")" && mkdir -p corpus && cd corpus

BOOKS="Pride-and-Prejudice_1342/master/1342 The-Adventures-of-Sherlock-Holmes_1661/master/1661 \
Alice-s-Adventures-in-Wonderland_11/master/11 A-Tale-of-Two-Cities_98/master/98 \
Great-Expectations_1400/master/1400 The-Picture-of-Dorian-Gray_174/master/174 \
Jane-Eyre_1260/master/1260 Moby-Dick--Or-The-Whale_2701/master/2701 Emma_158/master/158 \
Little-Women_514/master/514 The-Time-Machine_35/master/35"

for b in $BOOKS; do
  n=$(echo "$b" | cut -d/ -f1)
  [ -f "$n.txt" ] || curl -sL "https://raw.githubusercontent.com/GITenberg/$b.txt" -o "$n.txt"
done
[ -f twitter.txt ] || curl -sL \
  "https://raw.githubusercontent.com/Phylliida/Dialogue-Datasets/master/TwitterLowerAsciiCorpus.txt" \
  -o twitter.txt
# Modern English from NLTK's corpora — news wire, forums, reviews and chat.
# The novels alone made the model sound Victorian; these fix the register.
for c in brown reuters webtext movie_reviews nps_chat; do
  [ -f "nltk-$c.done" ] && continue
  curl -sL "https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/$c.zip" -o "/tmp/$c.zip"
  unzip -qo "/tmp/$c.zip" -d /tmp/nltk_extract 2>/dev/null && touch "nltk-$c.done"
done
python3 "$(dirname "$0")/prepare_nltk.py" 2>/dev/null || true

echo "corpus ready: $(ls *.txt | wc -l) files, $(du -sh . | cut -f1)"
