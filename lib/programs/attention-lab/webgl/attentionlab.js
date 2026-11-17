// attentionlab.js: attention, the layer that lets every token look at every other. Queries, keys and values; the scores
// q . k / sqrt(d); a stable softmax with a temperature; the output as a weighted sum of values; self-attention and cross-attention
// over a list of tokens; the effect of order and of a positional encoding; why the scores are divided by sqrt(d); a tiny picture cut
// into patches; and what the n x n score matrix costs. No three.js here: a token is an array of d numbers, a list of tokens is an
// array of such arrays, and a matrix is the array of its rows. scene.js draws the slide's three tokens; the course demo
// (lib/demos/attention-lab.js) runs these same functions, so a value the demo prints beside a line of code is the value that
// line computed. No function changes its arguments.
// The same functions, line for line where the languages allow, are AttentionLab.cs in ../unity/
// (lib/tests/programs/attention-lab.test.mjs runs both on the same inputs and compares the numbers).

// #region Settings and random numbers
// The random numbers are Park and Miller's integer generator (multiplier 48271, modulus 2^31 - 1): the state is an integer, so
// both tracks draw the same numbers. A normal random number comes from two uniform ones (Box and Muller, 1958).
export const MODULUS = 2147483647;
export const MULTIPLIER = 48271;

export function nextState(state) {
  const next = (state * MULTIPLIER) % MODULUS;
  const u = next / MODULUS;
  return { state: next, u };
}

export function gaussian(state) {
  const first = nextState(state);
  const second = nextState(first.state);
  const radius = Math.sqrt(-2 * Math.log(first.u));
  const z = radius * Math.cos(2 * Math.PI * second.u);
  return { state: second.state, z };
}

// d normal numbers: a vector whose entries have mean 0 and variance 1.
export function randomVector(state, d) {
  const v = [];
  let next = state;
  for (let i = 0; i < d; i++) {
    const g = gaussian(next);
    next = g.state;
    v.push(g.z);
  }
  return { state: next, v };
}
// #endregion

// #region Vectors and matrices
// A token is d numbers, a matrix is its rows. project applies one matrix to every token: row i of the result is W x_i, so
// Q = project(X, Wq), K = project(X, Wk), V = project(X, Wv).
export function dot(a, b) {
  let total = 0;
  for (let i = 0; i < a.length; i++) total += a[i] * b[i];
  return total;
}

export function matVec(W, x) {
  const y = [];
  for (let r = 0; r < W.length; r++) y.push(dot(W[r], x));
  return y;
}

export function project(X, W) {
  const Y = [];
  for (let i = 0; i < X.length; i++) Y.push(matVec(W, X[i]));
  return Y;
}

// A 2 x 2 matrix that turns by angle (radians) and stretches by scale: [c -s; s c] times scale. W_k = turned(angle, scale) moves
// every key, so a query that matched one token now matches another.
export function turned(angle, scale) {
  const c = Math.cos(angle) * scale;
  const s = Math.sin(angle) * scale;
  return [[c, -s], [s, c]];
}
// #endregion

// #region Scores
// The score of key j for query q is q . k_j. A dot product of two vectors of d independent entries has a spread of sqrt(d), so
// the scores are divided by sqrt(d): then their spread stays near 1 whatever d is, and the softmax below keeps some choice
// instead of picking one key.
export function scoresFor(q, K, scaled) {
  const d = q.length;
  const scale = scaled ? 1 / Math.sqrt(d) : 1;
  const scores = [];
  for (let j = 0; j < K.length; j++) scores.push(dot(q, K[j]) * scale);
  return { d, scale, scores };
}
// #endregion

// #region Softmax
// Weights that are positive and sum to 1: alpha_j = exp(s_j / T) / sum of exp(s_i / T). The temperature T widens (large) or
// sharpens (small) the choice. Subtracting the largest score first changes no weight, since softmax ignores a constant added to
// every score, and keeps every exponent at most 0, so exp never overflows.
export function maxOf(values) {
  let best = values[0];
  for (let i = 1; i < values.length; i++) if (values[i] > best) best = values[i];
  return best;
}

export function softmax(scores, temperature) {
  const max = maxOf(scores);
  const exps = [];
  let sum = 0;
  for (let j = 0; j < scores.length; j++) {
    const e = Math.exp((scores[j] - max) / temperature);
    exps.push(e);
    sum += e;
  }
  const weights = [];
  for (let j = 0; j < scores.length; j++) weights.push(exps[j] / sum);
  return { max, exps, sum, weights };
}

// The number of tokens the weights are spread over: exp of the entropy. One-hot weights give 1, equal weights over n give n.
export function effectiveCount(weights) {
  let entropy = 0;
  for (let j = 0; j < weights.length; j++) if (weights[j] > 0) entropy -= weights[j] * Math.log(weights[j]);
  return Math.exp(entropy);
}
// #endregion

// #region The output
// y = sum over j of alpha_j v_j: each token's output is an average of the values, weighted by how well its query matched each key.
export function mixValues(weights, V) {
  const d = V[0].length;
  const y = [];
  for (let c = 0; c < d; c++) {
    let total = 0;
    for (let j = 0; j < V.length; j++) total += weights[j] * V[j][c];
    y.push(total);
  }
  return { d, y };
}
// #endregion

// #region One query
// One query against every key and value: scores, softmax, mix. The query comes from one set of tokens and the keys and values
// from another (the same set for self-attention, the caption's tokens for cross-attention).
export function attendRow(q, K, V, temperature, scaled) {
  const scored = scoresFor(q, K, scaled);
  const soft = softmax(scored.scores, temperature);
  const mixed = mixValues(soft.weights, V);
  return { d: scored.d, scale: scored.scale, scores: scored.scores, max: soft.max, exps: soft.exps, sum: soft.sum, weights: soft.weights, y: mixed.y };
}
// #endregion

// #region One layer of attention
// Every query token against every key token: S[i][j] is the score, A[i][j] the weight (each row sums to 1), Y[i] the output.
// Self-attention is attend(X, X, ...); cross-attention is attend(imageTokens, captionTokens, ...). The two loops are the n^2.
export function attend(Xq, Xk, Wq, Wk, Wv, temperature, scaled) {
  const Q = project(Xq, Wq);
  const K = project(Xk, Wk);
  const V = project(Xk, Wv);
  const S = [];
  const A = [];
  const Y = [];
  for (let i = 0; i < Q.length; i++) {
    const row = attendRow(Q[i], K, V, temperature, scaled);
    S.push(row.scores);
    A.push(row.weights);
    Y.push(row.y);
  }
  return { Q, K, V, S, A, Y };
}
// #endregion

// #region Order and position
// Attention sums over the tokens, and a sum does not care about order: permute the tokens and the outputs permute with them.
// A positional encoding is added to each token first, so that order survives: token i gets (sin i, cos i) for d = 2 and, for
// larger d, sines and cosines at geometrically spaced frequencies (the same code as the denoiser's time code and NeRF's).
export function permute(X, order) {
  const arranged = [];
  for (let i = 0; i < order.length; i++) arranged.push(X[order[i]].slice());
  return arranged;
}

// The largest change in any token's output between two orders: Y2[i] is the output of token order[i].
export function orderChange(Y1, Y2, order) {
  let worst = 0;
  for (let i = 0; i < order.length; i++) {
    for (let c = 0; c < Y2[i].length; c++) {
      const difference = Math.abs(Y2[i][c] - Y1[order[i]][c]);
      if (difference > worst) worst = difference;
    }
  }
  return worst;
}

export function positionCode(position, d) {
  const code = [];
  for (let k = 0; k < d / 2; k++) {
    const angle = position * Math.pow(10000, -2 * k / d);
    code.push(Math.sin(angle));
    code.push(Math.cos(angle));
  }
  return code;
}

export function addPositions(X, amplitude) {
  const shifted = [];
  for (let i = 0; i < X.length; i++) {
    const code = positionCode(i, X[i].length);
    const token = [];
    for (let c = 0; c < X[i].length; c++) token.push(X[i][c] + amplitude * code[c]);
    shifted.push(token);
  }
  return shifted;
}
// #endregion

// #region Why divide by the square root of d
// Random queries and keys with independent standard normal entries: the spread of q . k grows as sqrt(d), and with it the gap
// between the best score and the rest. Undivided, the softmax over 8 keys gives nearly all its weight to one of them at large d;
// divided by sqrt(d), the spread stays near 1 and so does the choice. dotSpread averages over trials; randomScores is one draw.
export function randomScores(d, keys, seed) {
  const qd = randomVector(seed, d);
  let state = qd.state;
  const raw = [];
  for (let j = 0; j < keys; j++) {
    const kd = randomVector(state, d);
    state = kd.state;
    raw.push(dot(qd.v, kd.v));
  }
  const scaled = [];
  for (let j = 0; j < keys; j++) scaled.push(raw[j] / Math.sqrt(d));
  const weightsRaw = softmax(raw, 1).weights;
  const weightsScaled = softmax(scaled, 1).weights;
  return { raw, scaled, weightsRaw, weightsScaled };
}

export function dotSpread(d, trials, keys, seed) {
  let state = seed;
  let sumSquares = 0;
  let sumBest = 0;
  let sumBestScaled = 0;
  for (let t = 0; t < trials; t++) {
    const qd = randomVector(state, d);
    state = qd.state;
    const raw = [];
    const scaled = [];
    for (let j = 0; j < keys; j++) {
      const kd = randomVector(state, d);
      state = kd.state;
      const score = dot(qd.v, kd.v);
      raw.push(score);
      scaled.push(score / Math.sqrt(d));
      sumSquares += score * score;
    }
    sumBest += maxOf(softmax(raw, 1).weights);
    sumBestScaled += maxOf(softmax(scaled, 1).weights);
  }
  const std = Math.sqrt(sumSquares / (trials * keys));
  return { d, std, stdScaled: std / Math.sqrt(d), best: sumBest / trials, bestScaled: sumBestScaled / trials };
}
// #endregion

// #region A tiny picture and its patches
// A picture of four materials (0 sky, 1 sun, 2 grass, 3 dirt), cut into patches. An image encoder would turn each patch into a
// feature vector; here the encoder is a table, one 2D feature per material, plus a small shift that grows with position, so
// that two patches of the same material are close and not equal. A word's vector lives in the same 2D space: "sky" sits near
// the feature of sky patches. u runs left to right and v top to bottom, both in [0, 1).
export const MATERIAL_FEATURE = [[-0.9, 0.4], [0.8, 0.7], [0.3, -0.9], [-0.6, -0.6]];
export const MATERIAL_COLOR = [[0.42, 0.66, 0.95], [1, 0.86, 0.3], [0.24, 0.62, 0.26], [0.52, 0.38, 0.24]];

export function sceneMaterial(u, v) {
  const horizon = 0.58 + 0.04 * Math.sin(6.3 * u);
  if (v < horizon) {
    const sunDistance = Math.sqrt((u - 0.875) * (u - 0.875) + (v - 0.17) * (v - 0.17));
    return sunDistance < 0.12 ? 1 : 0;
  }
  const centre = 0.34 + 0.5 * (v - horizon);
  const width = 0.04 + 0.22 * (v - horizon);
  return Math.abs(u - centre) < width ? 3 : 2;
}

// The color of a point: its material's color, a little lighter toward the top of the sky, a little darker toward the bottom.
export function sceneColor(u, v) {
  const material = sceneMaterial(u, v);
  const shade = material === 0 ? 1 - 0.18 * v : material === 1 ? 1 : 1 - 0.25 * (v - 0.5);
  const base = MATERIAL_COLOR[material];
  return [base[0] * shade, base[1] * shade, base[2] * shade];
}

// A patch is cols x rows cells; each is sampled at 3 x 3 points and the samples' features are averaged.
export function patchFeatures(cols, rows) {
  const features = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let fx = 0;
      let fy = 0;
      for (let b = 0; b < 3; b++) {
        for (let a = 0; a < 3; a++) {
          const u = (c + (a + 0.5) / 3) / cols;
          const v = (r + (b + 0.5) / 3) / rows;
          const base = MATERIAL_FEATURE[sceneMaterial(u, v)];
          fx += base[0] + 0.12 * (u - 0.5);
          fy += base[1] + 0.12 * (v - 0.5);
        }
      }
      features.push([fx / 9, fy / 9]);
    }
  }
  return features;
}

// The average color of each patch, for drawing the picture as the encoder sees it.
export function patchColors(cols, rows) {
  const colors = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let red = 0;
      let green = 0;
      let blue = 0;
      for (let b = 0; b < 3; b++) {
        for (let a = 0; a < 3; a++) {
          const rgb = sceneColor((c + (a + 0.5) / 3) / cols, (r + (b + 0.5) / 3) / rows);
          red += rgb[0];
          green += rgb[1];
          blue += rgb[2];
        }
      }
      colors.push([red / 9, green / 9, blue / 9]);
    }
  }
  return colors;
}

// One patch's weights over every patch, from the patches' own features scaled by gain: the row of the score matrix for that patch.
export function patchRow(features, selected, gain, temperature) {
  const keys = project(features, [[gain, 0], [0, gain]]);
  const row = attendRow(keys[selected], keys, keys, temperature, true);
  return { weights: row.weights, best: maxOf(row.weights), spread: effectiveCount(row.weights) };
}
// #endregion

// #region The cost
// Every token scores every other token: n tokens make n^2 scores per head per layer. A side x side image in patch x patch
// pieces has (side / patch)^2 tokens. One score matrix in 32-bit floats takes 4 bytes a score. Doubling the side quadruples the
// area, and with it n, so n^2 grows by 16.
export function attentionCost(side, patch) {
  const grid = Math.floor(side / patch);
  const n = grid * grid;
  const scores = n * n;
  const bytes = scores * 4;
  const doubled = (2 * grid) * (2 * grid) * ((2 * grid) * (2 * grid));
  const ratio = doubled / scores;
  return { grid, n, scores, bytes, ratio };
}
// #endregion
