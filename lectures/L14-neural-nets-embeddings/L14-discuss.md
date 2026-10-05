<!--
  CSS 551 · L14 discussion and wrap (~30 min). Mounted by index.html AFTER the topic.
  Five peer-instruction questions (vote, argue in pairs two minutes, vote again, then work it).
  Answers and worked solutions live ONLY in the Note: blocks. Every number is from
  tools/gen-lecture-figures-d1.mjs (lectures/L16-diffusion-1/analysis/numbers-d1.json, keys
  tiny.relu, adam, contrastive) or from textbook/neural-nets-embeddings.html Section 5.1.
-->

### Discussion

<small>(~27 min)</small>


---

## Question 1: swap the nonlinearity

The hand network (`w1 = (1.0, −1.0)`, `b1 = (0.5, 0.5)`, `w2 = (0.8, −0.6)`, `b2 = 0.1`), input x = 0.4, with **ReLU** in place of tanh. What is f?

- **A.** 0.613
- **B.** 0.660
- **C.** 0.760
- **D.** 0.880


---

## Question 2: the first Adam step

Two weights have gradients **0.0624** and **0.6265** at step 1. With Adam at η = 0.01 (β₁ = 0.9, β₂ = 0.999), by how much does each move?

- **A.** 0.0006 and 0.0063
- **B.** 0.0100 and 0.0100
- **C.** 0.0062 and 0.0627
- **D.** 0.0010 and 0.0100


---

## Question 3: the temperature

A batch of two images and two captions has cosines `S = [0.8 0.2; 0.1 0.7]`, matches on the diagonal. At temperature **τ = 1**, what probability does the contrastive softmax give image 1's correct caption?

- **A.** 0.998
- **B.** 0.800
- **C.** 0.646
- **D.** 0.500


---

## Question 4: which network do you ship?

The noisy wave (12 points, noise variance 0.0225), trained 5000 epochs, error against the true curve on 150 held-out points:

| network | training error | held-out error |
| ------- | -------------- | -------------- |
| H = 40 | 0.0057 | 0.0108 (minimum 0.0099 at epoch 950) |
| H = 40, weight decay 0.002 | 0.0124 | 0.0080 |
| H = 4 | | 0.0164 |

- **A.** H = 40 at epoch 5000: lowest training error
- **B.** H = 40 stopped at epoch 950
- **C.** H = 40 with weight decay
- **D.** H = 4: too small to overfit


---

## Question 5: the NaN

Your classifier's final layer outputs logits **(1000, 999)** and the loss is NaN. Which change returns the correct class probabilities?

- **A.** switch from single to double precision
- **B.** divide both logits by 1000 before the softmax
- **C.** subtract the larger logit from both before exponentiating
- **D.** clamp each exponential at 10³⁰⁰


---

## Wrap

- a network is a function set by weights; training is the chain rule, one backward sweep per step
- embeddings put similar things near each other; contrastive training puts words and pictures in **one space**

**Read:** [Neural Networks and Embeddings](../../textbook/neural-nets-embeddings.html), all sections

**Due:** HW6, Wednesday November 18, 11:59 PM · **Thursday:** Quiz 5 in the first 20 minutes, on Lectures 12 and 13, tonight's lecture, and HW6

