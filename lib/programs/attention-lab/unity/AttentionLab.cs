using System;
using UnityEngine;

// AttentionLab.cs: attention, the layer that lets every token look at every other. Queries, keys and values; the scores
// q . k / sqrt(d); a stable softmax with a temperature; the output as a weighted sum of values; self-attention and cross-attention
// over a list of tokens; the effect of order and of a positional encoding; why the scores are divided by sqrt(d); a tiny picture cut
// into patches; and what the n x n score matrix costs. Plain C#, no MonoBehaviour: a token is a float[] of d numbers, a list of
// tokens is a float[][], and a matrix is the array of its rows. AttentionLabScene.cs draws the slide's three tokens. No method
// changes its arguments.
// Each method returns its named intermediate results as a tuple, with the field names and the order of the object attentionlab.js
// returns. mono's compiler rejects tuples over 7 fields, so the two results with more are small structs declared below.
// The same functions, line for line where the languages allow, are attentionlab.js in ../webgl/
// (lib/tests/programs/attention-lab.test.mjs runs both on the same inputs and compares the numbers).
public static class AttentionLab
{
    public struct RowResult { public int d; public float scale; public float[] scores; public float max; public float[] exps; public float sum; public float[] weights; public float[] y; }
    public struct AttendResult { public float[][] Q, K, V, S, A, Y; }

    #region Settings and random numbers
    // The random numbers are Park and Miller's integer generator (multiplier 48271, modulus 2^31 - 1): the state is an integer, so
    // both tracks draw the same numbers. A normal random number comes from two uniform ones (Box and Muller, 1958).
    public const int Modulus = 2147483647;
    public const int Multiplier = 48271;

    public static (int state, float u) NextState(int state)
    {
        int next = (int)(((long)state * Multiplier) % Modulus);
        float u = (float)((double)next / Modulus);
        return (next, u);
    }

    public static (int state, float z) Gaussian(int state)
    {
        var first = NextState(state);
        var second = NextState(first.state);
        float radius = Mathf.Sqrt(-2f * Mathf.Log(first.u));
        float z = radius * Mathf.Cos(2f * Mathf.PI * second.u);
        return (second.state, z);
    }

    // d normal numbers: a vector whose entries have mean 0 and variance 1.
    public static (int state, float[] v) RandomVector(int state, int d)
    {
        float[] v = new float[d];
        int next = state;
        for (int i = 0; i < d; i++)
        {
            var g = Gaussian(next);
            next = g.state;
            v[i] = g.z;
        }
        return (next, v);
    }
    #endregion

    #region Vectors and matrices
    // A token is d numbers, a matrix is its rows. project applies one matrix to every token: row i of the result is W x_i, so
    // Q = project(X, Wq), K = project(X, Wk), V = project(X, Wv).
    public static float Dot(float[] a, float[] b)
    {
        double total = 0;
        for (int i = 0; i < a.Length; i++) total += a[i] * b[i];
        return (float)total;
    }

    public static float[] MatVec(float[][] W, float[] x)
    {
        float[] y = new float[W.Length];
        for (int r = 0; r < W.Length; r++) y[r] = Dot(W[r], x);
        return y;
    }

    public static float[][] Project(float[][] X, float[][] W)
    {
        float[][] Y = new float[X.Length][];
        for (int i = 0; i < X.Length; i++) Y[i] = MatVec(W, X[i]);
        return Y;
    }

    // A 2 x 2 matrix that turns by angle (radians) and stretches by scale: [c -s; s c] times scale. W_k = turned(angle, scale) moves
    // every key, so a query that matched one token now matches another.
    public static float[][] Turned(float angle, float scale)
    {
        float c = Mathf.Cos(angle) * scale;
        float s = Mathf.Sin(angle) * scale;
        return new float[][] { new float[] { c, -s }, new float[] { s, c } };
    }
    #endregion

    #region Scores
    // The score of key j for query q is q . k_j. A dot product of two vectors of d independent entries has a spread of sqrt(d), so
    // the scores are divided by sqrt(d): then their spread stays near 1 whatever d is, and the softmax below keeps some choice
    // instead of picking one key.
    public static (int d, float scale, float[] scores) ScoresFor(float[] q, float[][] K, bool scaled)
    {
        int d = q.Length;
        float scale = scaled ? 1f / Mathf.Sqrt(d) : 1f;
        float[] scores = new float[K.Length];
        for (int j = 0; j < K.Length; j++) scores[j] = Dot(q, K[j]) * scale;
        return (d, scale, scores);
    }
    #endregion

    #region Softmax
    // Weights that are positive and sum to 1: alpha_j = exp(s_j / T) / sum of exp(s_i / T). The temperature T widens (large) or
    // sharpens (small) the choice. Subtracting the largest score first changes no weight, since softmax ignores a constant added to
    // every score, and keeps every exponent at most 0, so exp never overflows.
    public static float MaxOf(float[] values)
    {
        float best = values[0];
        for (int i = 1; i < values.Length; i++) if (values[i] > best) best = values[i];
        return best;
    }

    public static (float max, float[] exps, float sum, float[] weights) Softmax(float[] scores, float temperature)
    {
        float max = MaxOf(scores);
        float[] exps = new float[scores.Length];
        double sum = 0;
        for (int j = 0; j < scores.Length; j++)
        {
            float e = Mathf.Exp((scores[j] - max) / temperature);
            exps[j] = e;
            sum += e;
        }
        float[] weights = new float[scores.Length];
        for (int j = 0; j < scores.Length; j++) weights[j] = (float)(exps[j] / sum);
        return (max, exps, (float)sum, weights);
    }

    // The number of tokens the weights are spread over: exp of the entropy. One-hot weights give 1, equal weights over n give n.
    public static float EffectiveCount(float[] weights)
    {
        double entropy = 0;
        for (int j = 0; j < weights.Length; j++) if (weights[j] > 0) entropy -= weights[j] * Math.Log(weights[j]);
        return (float)Math.Exp(entropy);
    }
    #endregion

    #region The output
    // y = sum over j of alpha_j v_j: each token's output is an average of the values, weighted by how well its query matched each key.
    public static (int d, float[] y) MixValues(float[] weights, float[][] V)
    {
        int d = V[0].Length;
        float[] y = new float[d];
        for (int c = 0; c < d; c++)
        {
            double total = 0;
            for (int j = 0; j < V.Length; j++) total += weights[j] * V[j][c];
            y[c] = (float)total;
        }
        return (d, y);
    }
    #endregion

    #region One query
    // One query against every key and value: scores, softmax, mix. The query comes from one set of tokens and the keys and values
    // from another (the same set for self-attention, the caption's tokens for cross-attention).
    public static RowResult AttendRow(float[] q, float[][] K, float[][] V, float temperature, bool scaled)
    {
        var scored = ScoresFor(q, K, scaled);
        var soft = Softmax(scored.scores, temperature);
        var mixed = MixValues(soft.weights, V);
        return new RowResult { d = scored.d, scale = scored.scale, scores = scored.scores, max = soft.max, exps = soft.exps, sum = soft.sum, weights = soft.weights, y = mixed.y };
    }
    #endregion

    #region One layer of attention
    // Every query token against every key token: S[i][j] is the score, A[i][j] the weight (each row sums to 1), Y[i] the output.
    // Self-attention is attend(X, X, ...); cross-attention is attend(imageTokens, captionTokens, ...). The two loops are the n^2.
    public static AttendResult Attend(float[][] Xq, float[][] Xk, float[][] Wq, float[][] Wk, float[][] Wv, float temperature, bool scaled)
    {
        float[][] Q = Project(Xq, Wq);
        float[][] K = Project(Xk, Wk);
        float[][] V = Project(Xk, Wv);
        float[][] S = new float[Q.Length][];
        float[][] A = new float[Q.Length][];
        float[][] Y = new float[Q.Length][];
        for (int i = 0; i < Q.Length; i++)
        {
            RowResult row = AttendRow(Q[i], K, V, temperature, scaled);
            S[i] = row.scores;
            A[i] = row.weights;
            Y[i] = row.y;
        }
        return new AttendResult { Q = Q, K = K, V = V, S = S, A = A, Y = Y };
    }
    #endregion

    #region Order and position
    // Attention sums over the tokens, and a sum does not care about order: permute the tokens and the outputs permute with them.
    // A positional encoding is added to each token first, so that order survives: token i gets (sin i, cos i) for d = 2 and, for
    // larger d, sines and cosines at geometrically spaced frequencies (the same code as the denoiser's time code and NeRF's).
    public static float[][] Permute(float[][] X, int[] order)
    {
        float[][] arranged = new float[order.Length][];
        for (int i = 0; i < order.Length; i++) arranged[i] = (float[])X[order[i]].Clone();
        return arranged;
    }

    // The largest change in any token's output between two orders: Y2[i] is the output of token order[i].
    public static float OrderChange(float[][] Y1, float[][] Y2, int[] order)
    {
        float worst = 0;
        for (int i = 0; i < order.Length; i++)
        {
            for (int c = 0; c < Y2[i].Length; c++)
            {
                float difference = Mathf.Abs(Y2[i][c] - Y1[order[i]][c]);
                if (difference > worst) worst = difference;
            }
        }
        return worst;
    }

    public static float[] PositionCode(int position, int d)
    {
        float[] code = new float[d];
        for (int k = 0; k < d / 2; k++)
        {
            float angle = position * Mathf.Pow(10000f, -2f * k / d);
            code[2 * k] = Mathf.Sin(angle);
            code[2 * k + 1] = Mathf.Cos(angle);
        }
        return code;
    }

    public static float[][] AddPositions(float[][] X, float amplitude)
    {
        float[][] shifted = new float[X.Length][];
        for (int i = 0; i < X.Length; i++)
        {
            float[] code = PositionCode(i, X[i].Length);
            float[] token = new float[X[i].Length];
            for (int c = 0; c < X[i].Length; c++) token[c] = X[i][c] + amplitude * code[c];
            shifted[i] = token;
        }
        return shifted;
    }
    #endregion

    #region Why divide by the square root of d
    // Random queries and keys with independent standard normal entries: the spread of q . k grows as sqrt(d), and with it the gap
    // between the best score and the rest. Undivided, the softmax over 8 keys gives nearly all its weight to one of them at large d;
    // divided by sqrt(d), the spread stays near 1 and so does the choice. dotSpread averages over trials; randomScores is one draw.
    public static (float[] raw, float[] scaled, float[] weightsRaw, float[] weightsScaled) RandomScores(int d, int keys, int seed)
    {
        var qd = RandomVector(seed, d);
        int state = qd.state;
        float[] raw = new float[keys];
        for (int j = 0; j < keys; j++)
        {
            var kd = RandomVector(state, d);
            state = kd.state;
            raw[j] = Dot(qd.v, kd.v);
        }
        float[] scaled = new float[keys];
        for (int j = 0; j < keys; j++) scaled[j] = raw[j] / Mathf.Sqrt(d);
        float[] weightsRaw = Softmax(raw, 1f).weights;
        float[] weightsScaled = Softmax(scaled, 1f).weights;
        return (raw, scaled, weightsRaw, weightsScaled);
    }

    public static (int d, float std, float stdScaled, float best, float bestScaled) DotSpread(int d, int trials, int keys, int seed)
    {
        int state = seed;
        double sumSquares = 0;
        double sumBest = 0;
        double sumBestScaled = 0;
        for (int t = 0; t < trials; t++)
        {
            var qd = RandomVector(state, d);
            state = qd.state;
            float[] raw = new float[keys];
            float[] scaled = new float[keys];
            for (int j = 0; j < keys; j++)
            {
                var kd = RandomVector(state, d);
                state = kd.state;
                float score = Dot(qd.v, kd.v);
                raw[j] = score;
                scaled[j] = score / Mathf.Sqrt(d);
                sumSquares += score * score;
            }
            sumBest += MaxOf(Softmax(raw, 1f).weights);
            sumBestScaled += MaxOf(Softmax(scaled, 1f).weights);
        }
        float std = (float)Math.Sqrt(sumSquares / (trials * keys));
        return (d, std, std / Mathf.Sqrt(d), (float)(sumBest / trials), (float)(sumBestScaled / trials));
    }
    #endregion

    #region A tiny picture and its patches
    // A picture of four materials (0 sky, 1 sun, 2 grass, 3 dirt), cut into patches. An image encoder would turn each patch into a
    // feature vector; here the encoder is a table, one 2D feature per material, plus a small shift that grows with position, so
    // that two patches of the same material are close and not equal. A word's vector lives in the same 2D space: "sky" sits near
    // the feature of sky patches. u runs left to right and v top to bottom, both in [0, 1).
    public static readonly float[][] MaterialFeature = {
        new float[] { -0.9f, 0.4f }, new float[] { 0.8f, 0.7f }, new float[] { 0.3f, -0.9f }, new float[] { -0.6f, -0.6f } };
    public static readonly float[][] MaterialColor = {
        new float[] { 0.42f, 0.66f, 0.95f }, new float[] { 1f, 0.86f, 0.3f }, new float[] { 0.24f, 0.62f, 0.26f }, new float[] { 0.52f, 0.38f, 0.24f } };

    public static int SceneMaterial(float u, float v)
    {
        float horizon = 0.58f + 0.04f * Mathf.Sin(6.3f * u);
        if (v < horizon)
        {
            float sunDistance = Mathf.Sqrt((u - 0.875f) * (u - 0.875f) + (v - 0.17f) * (v - 0.17f));
            return sunDistance < 0.12f ? 1 : 0;
        }
        float centre = 0.34f + 0.5f * (v - horizon);
        float width = 0.04f + 0.22f * (v - horizon);
        return Mathf.Abs(u - centre) < width ? 3 : 2;
    }

    // The color of a point: its material's color, a little lighter toward the top of the sky, a little darker toward the bottom.
    public static float[] SceneColor(float u, float v)
    {
        int material = SceneMaterial(u, v);
        float shade = material == 0 ? 1f - 0.18f * v : material == 1 ? 1f : 1f - 0.25f * (v - 0.5f);
        float[] baseColor = MaterialColor[material];
        return new float[] { baseColor[0] * shade, baseColor[1] * shade, baseColor[2] * shade };
    }

    // A patch is cols x rows cells; each is sampled at 3 x 3 points and the samples' features are averaged.
    public static float[][] PatchFeatures(int cols, int rows)
    {
        float[][] features = new float[cols * rows][];
        for (int r = 0; r < rows; r++)
        {
            for (int c = 0; c < cols; c++)
            {
                double fx = 0;
                double fy = 0;
                for (int b = 0; b < 3; b++)
                {
                    for (int a = 0; a < 3; a++)
                    {
                        float u = (c + (a + 0.5f) / 3f) / cols;
                        float v = (r + (b + 0.5f) / 3f) / rows;
                        float[] baseFeature = MaterialFeature[SceneMaterial(u, v)];
                        fx += baseFeature[0] + 0.12f * (u - 0.5f);
                        fy += baseFeature[1] + 0.12f * (v - 0.5f);
                    }
                }
                features[r * cols + c] = new float[] { (float)(fx / 9), (float)(fy / 9) };
            }
        }
        return features;
    }

    // The average color of each patch, for drawing the picture as the encoder sees it.
    public static float[][] PatchColors(int cols, int rows)
    {
        float[][] colors = new float[cols * rows][];
        for (int r = 0; r < rows; r++)
        {
            for (int c = 0; c < cols; c++)
            {
                double red = 0;
                double green = 0;
                double blue = 0;
                for (int b = 0; b < 3; b++)
                {
                    for (int a = 0; a < 3; a++)
                    {
                        float[] rgb = SceneColor((c + (a + 0.5f) / 3f) / cols, (r + (b + 0.5f) / 3f) / rows);
                        red += rgb[0];
                        green += rgb[1];
                        blue += rgb[2];
                    }
                }
                colors[r * cols + c] = new float[] { (float)(red / 9), (float)(green / 9), (float)(blue / 9) };
            }
        }
        return colors;
    }

    // One patch's weights over every patch, from the patches' own features scaled by gain: the row of the score matrix for that patch.
    public static (float[] weights, float best, float spread) PatchRow(float[][] features, int selected, float gain, float temperature)
    {
        float[][] keys = Project(features, new float[][] { new float[] { gain, 0f }, new float[] { 0f, gain } });
        RowResult row = AttendRow(keys[selected], keys, keys, temperature, true);
        return (row.weights, MaxOf(row.weights), EffectiveCount(row.weights));
    }
    #endregion

    #region The cost
    // Every token scores every other token: n tokens make n^2 scores per head per layer. A side x side image in patch x patch
    // pieces has (side / patch)^2 tokens. One score matrix in 32-bit floats takes 4 bytes a score. Doubling the side quadruples the
    // area, and with it n, so n^2 grows by 16.
    public static (int grid, float n, float scores, float bytes, float ratio) AttentionCost(int side, int patch)
    {
        int grid = side / patch;
        float n = (float)grid * grid;
        float scores = n * n;
        float bytes = scores * 4f;
        float doubled = (2f * grid) * (2f * grid) * ((2f * grid) * (2f * grid));
        float ratio = doubled / scores;
        return (grid, n, scores, bytes, ratio);
    }
    #endregion
}
