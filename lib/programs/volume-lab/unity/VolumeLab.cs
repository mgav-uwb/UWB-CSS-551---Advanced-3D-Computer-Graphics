using System;
using UnityEngine;

// VolumeLab.cs: volume rendering along one ray, the way a neural radiance field makes a pixel (Mildenhall and others, 2020): a
// density and a color along the ray, the samples and their spacing, the opacity, transmittance and weight of each sample, the pixel
// as the sum of weight times color, the error against a finely sampled reference, a thin surface between samples, hierarchical
// sampling by inverting the weights' cumulative sum, a density that sharpens into a surface (a bump, or a signed distance as in
// NeuS), positional encoding with a closed-form fit, and a small 3D volume of Gaussian blobs rendered one ray at a time.
// Plain C#, no MonoBehaviour: colors and points are Vector3. VolumeLabScene.cs shows an image of the blobs. No method changes its
// arguments, except that a random number generator advances when it is asked for a number. The results with more than a few fields
// are small structs declared below, with the field names and the order of the object volumelab.js returns (mono's compiler rejects
// tuples over 7 fields). The encoding and the fit use double precision (System.Math), as the JavaScript does.
// The same functions, line for line where the languages allow, are volumelab.js in ../webgl/
// (lib/tests/programs/volume-lab.test.mjs runs both on the same inputs and compares the numbers).
public static class VolumeLab
{
    public class Rng { public long state; }
    public struct FieldValues { public float[] sigmas; public Vector3[] colors; }
    public struct RaySamples { public float binWidth; public float[] edges, depths, deltas; }
    public struct Composite { public float[] alphas, transmittances, weights; public Vector3 color; public float weightSum, tEnd; public Vector3 pixel; }
    public struct RayResult
    {
        public float[] edges;
        public float[] depths;
        public float[] deltas;
        public float[] sigmas;
        public Vector3[] colors;
        public float[] alphas;
        public float[] transmittances;
        public float[] weights;
        public Vector3 color;
        public float weightSum;
        public float tEnd;
        public Vector3 pixel;
        public float depth;
        public float spread;
    }
    public struct GradientResult { public float[] dSigma, dColor; public float pixel; }
    public struct ErrorResult { public Vector3 reference; public float referenceTEnd, error, tEndError; }
    public struct ConvergenceResult { public int[] counts; public float[] errors, tEndErrors; public float slope; }
    public struct FineSamples { public float[] pdf, cdf; public int[] bins; public float[] depths; }
    public struct HierarchicalResult
    {
        public RayResult coarse;
        public float[] us;
        public float[] pdf;
        public float[] cdf;
        public int[] bins;
        public float[] fineDepths;
        public RayResult merged;
    }
    public struct SurfaceValues { public float[] distances, phis, densities, bump; }
    public struct Encoding { public double[] frequencies, features; public double smallestPeriod; }
    public struct Damping { public double[] omegas, factors; }
    public struct Solution { public double[] coefficients; }
    public struct Network { public int inputs, hidden; public double[] weights, biases; }
    public struct Fit
    {
        public int columns;
        public double[] xs, ys, grid, truth, fitted, coefficients;
        public double trainError, testError;
    }
    public struct CameraResult { public float focal; public Vector3 cameraDir, origin, direction; }

    #region Settings
    // A density along a ray is a list of bumps, STRIDE numbers each: shape, center, width, height, red, green, blue.
    // GAUSSIAN: height * exp(-(s - center)^2 / (2 width^2)).  BOX: height on [center - width, center + width), else 0.
    // STEP: height / (1 + exp(-(s - center) / width)), a smooth wall that rises from 0 to height around center.
    // A sample exactly on a box's edge counts in the box to its left, EDGE allowing for rounding in the depth.
    public const int Stride = 7;
    public const int Gaussian = 0;
    public const int Box = 1;
    public const int Step = 2;
    public const float Edge = 1e-5f;
    public const float Eps = 1e-6f;
    public const int ReferenceN = 4096;     // the finely sampled reference uses this many samples
    public const int BlobStride = 8;        // a blob in 3D: center x, y, z, radius, height, red, green, blue
    #endregion

    #region Random numbers
    // A seeded generator (Park and Miller, 1988): the same seed gives the same numbers in both tracks, so a run can be repeated.
    // Each call returns a number strictly between 0 and 1 and advances the generator's state.
    public static Rng MakeRng(int seed)
    {
        Rng rng = new Rng();
        rng.state = (Math.Abs((long)seed) % 2147483646L) + 1;
        return rng;
    }

    public static double NextRandom(Rng rng)
    {
        rng.state = (rng.state * 16807L) % 2147483647L;
        return rng.state / 2147483647.0;
    }
    #endregion

    #region Density and color along a ray
    // Every bump adds its density at depth s. The color there is the bumps' colors weighted by their densities, so a spot where two
    // bumps overlap is a blend, and a spot with no density has no color.
    public static float BumpDensity(int shape, float center, float width, float height, float s)
    {
        float w = Mathf.Max(width, Eps);
        if (shape == Gaussian) return height * Mathf.Exp(-((s - center) * (s - center)) / (2f * w * w));
        if (shape == Box) return s > center - w + Edge && s <= center + w + Edge ? height : 0f;
        return height / (1f + Mathf.Exp(-(s - center) / w));
    }

    public static FieldValues EvaluateField(float[] field, float[] depths)
    {
        float[] sigmas = new float[depths.Length];
        Vector3[] colors = new Vector3[depths.Length];
        int count = field.Length / Stride;
        for (int i = 0; i < depths.Length; i++)
        {
            float sigma = 0f;
            float r = 0f;
            float g = 0f;
            float b = 0f;
            for (int k = 0; k < count; k++)
            {
                int o = k * Stride;
                float d = BumpDensity(Mathf.RoundToInt(field[o]), field[o + 1], field[o + 2], field[o + 3], depths[i]);
                sigma += d;
                r += d * field[o + 4];
                g += d * field[o + 5];
                b += d * field[o + 6];
            }
            sigmas[i] = sigma;
            colors[i] = sigma > Eps ? new Vector3(r / sigma, g / sigma, b / sigma) : new Vector3(0f, 0f, 0f);
        }
        FieldValues result;
        result.sigmas = sigmas;
        result.colors = colors;
        return result;
    }
    #endregion

    #region Samples along the ray
    // The ray from near to far is cut into n equal bins of width delta, and each bin gets one sample. A regular sampler puts it the same
    // fraction offset into every bin (0.5 is the middle); a stratified sampler draws that fraction at random for each bin.
    public static RaySamples RayDepths(float near, float far, int n, string mode, float offset, Rng rng)
    {
        float binWidth = (far - near) / n;
        float[] edges = new float[n + 1];
        float[] depths = new float[n];
        float[] deltas = new float[n];
        for (int i = 0; i < n; i++)
        {
            float u = mode == "stratified" ? (float)NextRandom(rng) : offset;
            edges[i] = near + i * binWidth;
            depths[i] = near + (i + u) * binWidth;
            deltas[i] = binWidth;
        }
        edges[n] = far;
        RaySamples result;
        result.binWidth = binWidth;
        result.edges = edges;
        result.depths = depths;
        result.deltas = deltas;
        return result;
    }
    #endregion

    #region Opacity and step
    // A slab of density sigma and thickness delta blocks 1 - exp(-sigma delta) of the light. Two half slabs block the same, so the
    // opacity depends on the step, which is why a network stores the density and not the opacity.
    public static (float alpha, float pieceAlpha, float combined, float transmittance) SplitSlab(float sigma, float delta, float pieces)
    {
        float alpha = 1f - Mathf.Exp(-sigma * delta);
        float pieceAlpha = 1f - Mathf.Exp(-sigma * (delta / pieces));
        float combined = 1f - Mathf.Pow(1f - pieceAlpha, pieces);
        float transmittance = Mathf.Exp(-sigma * delta);
        return (alpha, pieceAlpha, combined, transmittance);
    }
    #endregion

    #region Compositing one ray
    // Front to back. Sample i is a slab with opacity alpha_i; transmittance T_i is the fraction of the ray still unblocked when it
    // reaches the slab; its weight is w_i = T_i alpha_i, and the pixel is the sum of w_i c_i. What is left, T_end, shows the background.
    public static Composite CompositeRay(float[] sigmas, Vector3[] colors, float[] deltas, Vector3 background)
    {
        float[] alphas = new float[sigmas.Length];
        float[] transmittances = new float[sigmas.Length];
        float[] weights = new float[sigmas.Length];
        float T = 1f;
        float weightSum = 0f;
        float r = 0f;
        float g = 0f;
        float b = 0f;
        for (int i = 0; i < sigmas.Length; i++)
        {
            float alpha = 1f - Mathf.Exp(-sigmas[i] * deltas[i]);
            float w = T * alpha;
            alphas[i] = alpha;
            transmittances[i] = T;
            weights[i] = w;
            weightSum += w;
            r += w * colors[i].x;
            g += w * colors[i].y;
            b += w * colors[i].z;
            T *= 1f - alpha;
        }
        float tEnd = T;
        Vector3 color = new Vector3(r, g, b);
        Vector3 pixel = new Vector3(r + tEnd * background.x, g + tEnd * background.y, b + tEnd * background.z);
        Composite result;
        result.alphas = alphas;
        result.transmittances = transmittances;
        result.weights = weights;
        result.color = color;
        result.weightSum = weightSum;
        result.tEnd = tEnd;
        result.pixel = pixel;
        return result;
    }
    #endregion

    #region Expected depth
    // The weights are a distribution along the ray once divided by their sum, so they have a mean, the depth a NeRF renders for free,
    // and a spread. A density that has collapsed into a surface has a spread of nearly zero.
    public static (float weightSum, float depth, float variance, float spread) ExpectedDepth(float[] weights, float[] depths)
    {
        float weightSum = 0f;
        float moment = 0f;
        for (int i = 0; i < weights.Length; i++)
        {
            weightSum += weights[i];
            moment += weights[i] * depths[i];
        }
        float depth = weightSum > Eps ? moment / weightSum : 0f;
        float spread2 = 0f;
        for (int i = 0; i < weights.Length; i++) spread2 += weights[i] * (depths[i] - depth) * (depths[i] - depth);
        float variance = weightSum > Eps ? spread2 / weightSum : 0f;
        float spread = Mathf.Sqrt(variance);
        return (weightSum, depth, variance, spread);
    }
    #endregion

    #region The gradient through the march
    // Training moves the density and color of each sample to make the pixel match a photograph, so it needs how the pixel changes with them.
    // The color of sample i enters with its weight: dC/dc_i = w_i. Its density enters in two places: more of the sample's own slab (its
    // weight grows) and less of the ray left for everything behind it, so dC/dsigma_i = delta_i (T_i (1 - alpha_i) c_i - sum of w_j c_j for j > i).
    public static GradientResult ColorGradient(float[] sigmas, Vector3[] colors, float[] deltas, int channel)
    {
        int n = sigmas.Length;
        Composite march = CompositeRay(sigmas, colors, deltas, new Vector3(0f, 0f, 0f));
        float[] dColor = new float[n];
        float[] dSigma = new float[n];
        float behind = 0f;
        for (int i = n - 1; i >= 0; i--)
        {
            float own = march.transmittances[i] * (1f - march.alphas[i]) * colors[i][channel];
            dSigma[i] = deltas[i] * (own - behind);
            dColor[i] = march.weights[i];
            behind += march.weights[i] * colors[i][channel];
        }
        GradientResult result;
        result.dSigma = dSigma;
        result.dColor = dColor;
        result.pixel = march.color[channel];
        return result;
    }
    #endregion

    #region Rendering one ray
    // A ray is rendered by choosing its samples, asking the field for a density and a color at each, compositing them, and reading
    // the expected depth off the weights.
    public static RayResult MarchRay(float[] field, float[] edges, float[] depths, float[] deltas, Vector3 background)
    {
        FieldValues values = EvaluateField(field, depths);
        Composite march = CompositeRay(values.sigmas, values.colors, deltas, background);
        var seen = ExpectedDepth(march.weights, depths);
        RayResult result;
        result.edges = edges;
        result.depths = depths;
        result.deltas = deltas;
        result.sigmas = values.sigmas;
        result.colors = values.colors;
        result.alphas = march.alphas;
        result.transmittances = march.transmittances;
        result.weights = march.weights;
        result.color = march.color;
        result.weightSum = march.weightSum;
        result.tEnd = march.tEnd;
        result.pixel = march.pixel;
        result.depth = seen.depth;
        result.spread = seen.spread;
        return result;
    }

    public static RayResult RenderRay(float[] field, float near, float far, int n, string mode, float offset, Rng rng, Vector3 background)
    {
        RaySamples samples = RayDepths(near, far, n, mode, offset, rng);
        return MarchRay(field, samples.edges, samples.depths, samples.deltas, background);
    }
    #endregion

    #region The estimate against the reference
    // The reference is the same ray with REFERENCE_N regular samples. The error of an estimate is the distance between its color and the
    // reference color; a random sampler is run several times and the error is the root mean square over the runs.
    public static ErrorResult RayError(float[] field, float near, float far, int n, string mode, float offset, int trials, int seed)
    {
        Vector3 black = new Vector3(0f, 0f, 0f);
        RayResult reference = RenderRay(field, near, far, ReferenceN, "regular", 0.5f, MakeRng(1), black);
        Rng rng = MakeRng(seed);
        float sum = 0f;
        float tSum = 0f;
        for (int t = 0; t < trials; t++)
        {
            RayResult run = RenderRay(field, near, far, n, mode, offset, rng, black);
            float dr = run.color.x - reference.color.x;
            float dg = run.color.y - reference.color.y;
            float db = run.color.z - reference.color.z;
            sum += dr * dr + dg * dg + db * db;
            tSum += (run.tEnd - reference.tEnd) * (run.tEnd - reference.tEnd);
        }
        float error = Mathf.Sqrt(sum / trials);
        float tEndError = Mathf.Sqrt(tSum / trials);
        ErrorResult result;
        result.reference = reference.color;
        result.referenceTEnd = reference.tEnd;
        result.error = error;
        result.tEndError = tEndError;
        return result;
    }

    // The slope of ln(error) against ln(N): -1 means the error halves when N doubles, -2 that it quarters.
    public static float LogSlope(int[] counts, float[] errors)
    {
        int m = counts.Length;
        float mx = 0f;
        float my = 0f;
        for (int i = 0; i < m; i++)
        {
            mx += Mathf.Log(counts[i]) / m;
            my += Mathf.Log(errors[i]) / m;
        }
        float sxy = 0f;
        float sxx = 0f;
        for (int i = 0; i < m; i++)
        {
            sxy += (Mathf.Log(counts[i]) - mx) * (Mathf.Log(errors[i]) - my);
            sxx += (Mathf.Log(counts[i]) - mx) * (Mathf.Log(counts[i]) - mx);
        }
        return sxy / sxx;
    }

    public static ConvergenceResult Convergence(float[] field, float near, float far, int[] counts, string mode, float offset, int trials, int seed)
    {
        float[] errors = new float[counts.Length];
        float[] tEndErrors = new float[counts.Length];
        for (int i = 0; i < counts.Length; i++)
        {
            ErrorResult e = RayError(field, near, far, counts[i], mode, offset, trials, seed + i);
            errors[i] = e.error;
            tEndErrors[i] = e.tEndError;
        }
        float slope = LogSlope(counts, errors);
        ConvergenceResult result;
        result.counts = counts;
        result.errors = errors;
        result.tEndErrors = tEndErrors;
        result.slope = slope;
        return result;
    }
    #endregion

    #region Coarse to fine: the inverse transform
    // The weights of a coarse pass, divided by their sum, are a probability for each bin. Their running sum, the cumulative curve, is
    // steep where the weights are large. A uniform number u is mapped to the depth where the curve reaches u, interpolating inside the
    // bin, so a uniform spread of u becomes a spread of depths that is dense where the weights are large.
    public static float[] FineUniforms(int n, string mode, Rng rng)
    {
        float[] us = new float[n];
        for (int i = 0; i < n; i++)
        {
            if (mode == "regular") us[i] = (i + 0.5f) / n;
            else if (mode == "stratified") us[i] = (i + (float)NextRandom(rng)) / n;
            else us[i] = (float)NextRandom(rng);
        }
        return us;
    }

    public static FineSamples InverseTransform(float[] edges, float[] weights, float[] us)
    {
        int n = weights.Length;
        float total = 0f;
        for (int i = 0; i < n; i++) total += weights[i];
        float[] pdf = new float[n];
        float[] cdf = new float[n];
        float running = 0f;
        for (int i = 0; i < n; i++)
        {
            pdf[i] = total > Eps ? weights[i] / total : 1f / n;
            running += pdf[i];
            cdf[i] = running;
        }
        int[] bins = new int[us.Length];
        float[] depths = new float[us.Length];
        for (int j = 0; j < us.Length; j++)
        {
            int bin = 0;
            while (bin < n - 1 && cdf[bin] < us[j]) bin++;
            float before = bin > 0 ? cdf[bin - 1] : 0f;
            float inside = pdf[bin] > Eps ? (us[j] - before) / pdf[bin] : 0.5f;
            bins[j] = bin;
            depths[j] = edges[bin] + inside * (edges[bin + 1] - edges[bin]);
        }
        FineSamples result;
        result.pdf = pdf;
        result.cdf = cdf;
        result.bins = bins;
        result.depths = depths;
        return result;
    }
    #endregion

    #region Coarse and fine samples together
    // The coarse and fine depths are merged and sorted. Each sample then stands for the stretch of ray around it, from halfway to its
    // neighbor in front to halfway to its neighbor behind (the ends reach near and far), and the merged samples are composited.
    public static float[] SampleSpans(float[] depths, float near, float far)
    {
        float[] deltas = new float[depths.Length];
        int m = depths.Length;
        for (int i = 0; i < m; i++)
        {
            float start = i > 0 ? (depths[i - 1] + depths[i]) / 2f : near;
            float stop = i < m - 1 ? (depths[i] + depths[i + 1]) / 2f : far;
            deltas[i] = stop - start;
        }
        return deltas;
    }

    public static HierarchicalResult HierarchicalRay(float[] field, float near, float far, int nCoarse, float[] us, float offset, Vector3 background)
    {
        RayResult coarse = RenderRay(field, near, far, nCoarse, "regular", offset, MakeRng(1), background);
        FineSamples fine = InverseTransform(coarse.edges, coarse.weights, us);
        int nFine = us.Length;
        float[] mergedDepths = new float[nCoarse + nFine];
        for (int i = 0; i < nCoarse; i++) mergedDepths[i] = coarse.depths[i];
        for (int i = 0; i < nFine; i++) mergedDepths[nCoarse + i] = fine.depths[i];
        Array.Sort(mergedDepths);
        float[] mergedDeltas = SampleSpans(mergedDepths, near, far);
        RayResult merged = MarchRay(field, new float[0], mergedDepths, mergedDeltas, background);
        HierarchicalResult result;
        result.coarse = coarse;
        result.us = us;
        result.pdf = fine.pdf;
        result.cdf = fine.cdf;
        result.bins = fine.bins;
        result.fineDepths = fine.depths;
        result.merged = merged;
        return result;
    }
    #endregion

    #region Sharpening a bump
    // A Gaussian bump of fixed optical depth tau (the integral of the density) and width w has height tau / (w sqrt(2 pi)). As w
    // falls the same amount of stuff is packed into less length: the weights collapse toward the bump's center.
    public static float[] SharpBump(float center, float width, float tau, float r, float g, float b)
    {
        float w = Mathf.Max(width, Eps);
        float height = tau / (w * Mathf.Sqrt(2f * Mathf.PI));
        return new float[] { Gaussian, center, w, height, r, g, b };
    }
    #endregion

    #region Distance to opacity
    // NeuS (Wang and others, 2021) stores a signed distance f, positive in front of the surface and negative behind it, and passes it
    // through a logistic curve of sharpness kappa: opacity switches on over a band of width about 1 / kappa. Along a ray that moves
    // toward the surface at unit speed, the density that makes the transmittance equal this curve is kappa * (1 - phi).
    public static (float phi, float density) OpacityFromDistance(float f, float kappa)
    {
        float phi = 1f / (1f + Mathf.Exp(-kappa * f));
        float density = kappa * (1f - phi);
        return (phi, density);
    }

    public static SurfaceValues SurfaceFromDistance(float surface, float kappa, float[] depths)
    {
        float[] distances = new float[depths.Length];
        float[] phis = new float[depths.Length];
        float[] densities = new float[depths.Length];
        for (int i = 0; i < depths.Length; i++)
        {
            float f = surface - depths[i];
            var o = OpacityFromDistance(f, kappa);
            distances[i] = f;
            phis[i] = o.phi;
            densities[i] = o.density;
        }
        float[] bump = new float[] { Step, surface, 1f / kappa, kappa, 0.9f, 0.35f, 0.3f };
        SurfaceValues result;
        result.distances = distances;
        result.phis = phis;
        result.densities = densities;
        result.bump = bump;
        return result;
    }
    #endregion

    #region Positional encoding
    // gamma(p) maps one number to sines and cosines of doubling frequency, 2^k pi for k = 0 to L - 1, so a network that combines them
    // can place an edge. The entries come in (sin, cos) pairs, lowest frequency first.
    public static Encoding PositionalEncoding(double p, int L)
    {
        var frequencies = new double[L];
        var features = new double[2 * L];
        for (int k = 0; k < L; k++)
        {
            var omega = Math.Pow(2, k) * Math.PI;
            frequencies[k] = omega;
            features[2 * k] = Math.Sin(omega * p);
            features[2 * k + 1] = Math.Cos(omega * p);
        }
        var smallestPeriod = L > 0 ? 2 / Math.Pow(2, L - 1) : 0;     // the highest sine's period, 2 pi / omega
        Encoding result;
        result.frequencies = frequencies;
        result.features = features;
        result.smallestPeriod = smallestPeriod;
        return result;
    }

    // Mip-NeRF (Barron and others, 2021) averages each sine over a Gaussian footprint of standard deviation sigma, which multiplies
    // the frequency omega by exp(-omega^2 sigma^2 / 2): frequencies finer than the footprint switch themselves off.
    public static Damping FrequencyDamping(int L, double sigma)
    {
        var omegas = new double[L];
        var factors = new double[L];
        for (int k = 0; k < L; k++)
        {
            var omega = Math.Pow(2, k) * Math.PI;
            omegas[k] = omega;
            factors[k] = Math.Exp(-0.5 * omega * omega * sigma * sigma);
        }
        Damping result;
        result.omegas = omegas;
        result.factors = factors;
        return result;
    }
    #endregion

    #region Least squares
    // Solves the normal equations (A^T A + ridge I) x = A^T y by Gaussian elimination with partial pivoting. The rows of A are the
    // training points' features. Double precision, in both tracks, because the normal equations square the condition number.
    public static Solution SolveLeastSquares(double[][] rows, double[] ys, double ridge)
    {
        int m = rows.Length;
        int f = rows[0].Length;
        var a = new double[f * f];
        var b = new double[f];
        for (int i = 0; i < f; i++)
        {
            for (int j = 0; j < f; j++)
            {
                double sum = i == j ? ridge : 0;
                for (int t = 0; t < m; t++) sum += rows[t][i] * rows[t][j];
                a[i * f + j] = sum;
            }
            double rhs = 0;
            for (int t = 0; t < m; t++) rhs += rows[t][i] * ys[t];
            b[i] = rhs;
        }
        for (int col = 0; col < f; col++)
        {
            int pivot = col;
            for (int i = col + 1; i < f; i++) if (Math.Abs(a[i * f + col]) > Math.Abs(a[pivot * f + col])) pivot = i;
            if (pivot != col)
            {
                for (int j = 0; j < f; j++)
                {
                    double t = a[col * f + j];
                    a[col * f + j] = a[pivot * f + j];
                    a[pivot * f + j] = t;
                }
                double tb = b[col];
                b[col] = b[pivot];
                b[pivot] = tb;
            }
            for (int i = col + 1; i < f; i++)
            {
                double factor = a[i * f + col] / a[col * f + col];
                for (int j = col; j < f; j++) a[i * f + j] -= factor * a[col * f + j];
                b[i] -= factor * b[col];
            }
        }
        var coefficients = new double[f];
        for (int i = f - 1; i >= 0; i--)
        {
            var sum = b[i];
            for (int j = i + 1; j < f; j++) sum -= a[i * f + j] * coefficients[j];
            coefficients[i] = sum / a[i * f + i];
        }
        Solution result;
        result.coefficients = coefficients;
        return result;
    }
    #endregion

    #region A random network
    // A network with one hidden layer of tanh units. Its hidden weights are drawn once from a seeded generator and then fixed (a random-feature
    // network, Rahimi and Recht, 2007); only the output weights are fitted, and they are fitted in closed form. The weights are drawn input by
    // input, so a network given more inputs keeps the weights it had on the old ones.
    public static double NormalSample(Rng rng)
    {
        var u1 = NextRandom(rng);
        var u2 = NextRandom(rng);
        return Math.Sqrt(-2 * Math.Log(u1)) * Math.Cos(2 * Math.PI * u2);
    }

    public static Network MakeNetwork(int inputs, int hidden, double scale, int seed)
    {
        Rng rng = MakeRng(seed);
        var biases = new double[hidden];
        var weights = new double[hidden * inputs];
        for (int h = 0; h < hidden; h++) biases[h] = 2 * NextRandom(rng) - 1;
        for (int i = 0; i < inputs; i++)
        {
            for (int h = 0; h < hidden; h++) weights[h * inputs + i] = scale * NormalSample(rng);
        }
        Network result;
        result.inputs = inputs;
        result.hidden = hidden;
        result.weights = weights;
        result.biases = biases;
        return result;
    }
    #endregion

    #region Fitting a signal
    // The signal is a density along a line: a slab with two edges and a narrow bump. The network's inputs are the coordinate x and, when L > 0,
    // gamma(x); its features are a 1 and the hidden units' outputs, and the best output weights for the training points are closed-form least
    // squares. Training points sit at (j + 0.5) / count with uniform noise of amplitude noise added; the held-out error is measured on
    // gridCount points against the noise-free signal.
    public const int Hidden = 64;
    public const double WeightScale = 3;
    public const int NetworkSeed = 777;
    public const double Ridge = 1e-3;

    public static double TargetSignal(double x)
    {
        double slab = x >= 0.35 && x < 0.6 ? 1 : 0;
        double bump = 0.6 * Math.Exp(-((x - 0.8) * (x - 0.8)) / (2 * 0.02 * 0.02));
        return slab + bump;
    }

    public static double[] NetworkRow(double x, int L, Network net)
    {
        Encoding code = PositionalEncoding(x, L);
        var inputs = new double[1 + code.features.Length];
        inputs[0] = x;
        for (int i = 0; i < code.features.Length; i++) inputs[1 + i] = code.features[i];
        var row = new double[1 + net.hidden];
        row[0] = 1;
        for (int h = 0; h < net.hidden; h++)
        {
            var sum = net.biases[h];
            for (int i = 0; i < net.inputs; i++) sum += net.weights[h * net.inputs + i] * inputs[i];
            row[1 + h] = Math.Tanh(sum);
        }
        return row;
    }

    public static Fit FitSignal(int L, int count, double noise, int seed, int gridCount)
    {
        Rng rng = MakeRng(seed);
        Network net = MakeNetwork(1 + 2 * L, Hidden, WeightScale, NetworkSeed);
        var xs = new double[count];
        var ys = new double[count];
        double[][] rows = new double[count][];
        for (int j = 0; j < count; j++)
        {
            var x = (j + 0.5) / count;
            xs[j] = x;
            ys[j] = TargetSignal(x) + noise * (2 * NextRandom(rng) - 1);
            rows[j] = NetworkRow(x, L, net);
        }
        Solution solved = SolveLeastSquares(rows, ys, Ridge);
        var grid = new double[gridCount];
        var truth = new double[gridCount];
        var fitted = new double[gridCount];
        double testSum = 0;
        for (int g = 0; g < gridCount; g++)
        {
            var x = (g + 0.5) / gridCount;
            var row = NetworkRow(x, L, net);
            double value = 0;
            for (int i = 0; i < row.Length; i++) value += solved.coefficients[i] * row[i];
            grid[g] = x;
            truth[g] = TargetSignal(x);
            fitted[g] = value;
            testSum += (value - truth[g]) * (value - truth[g]);
        }
        double trainSum = 0;
        for (int j = 0; j < count; j++)
        {
            double value = 0;
            for (int i = 0; i < rows[j].Length; i++) value += solved.coefficients[i] * rows[j][i];
            trainSum += (value - ys[j]) * (value - ys[j]);
        }
        int columns = rows[0].Length;
        var trainError = Math.Sqrt(trainSum / count);
        var testError = Math.Sqrt(testSum / gridCount);
        Fit result;
        result.columns = columns;
        result.xs = xs;
        result.ys = ys;
        result.grid = grid;
        result.truth = truth;
        result.fitted = fitted;
        result.coefficients = solved.coefficients;
        result.trainError = trainError;
        result.testError = testError;
        return result;
    }
    #endregion

    #region The camera ray for a pixel
    // An image of size x size pixels with horizontal field of view fov has focal length f = (size / 2) / tan(fov / 2) in pixels. Pixel
    // (i, j) looks along ((i - size/2) / f, -(j - size/2) / f, -1) in camera space: image rows count down and the camera's y counts up.
    // The camera sits on a sphere of the given distance around the origin, at azimuth and elevation (radians), and looks at the origin.
    public static CameraResult CameraRay(float i, float j, int size, float fov, float azimuth, float elevation, float distance)
    {
        float focal = (size / 2f) / Mathf.Tan(fov / 2f);
        Vector3 cameraDir = new Vector3((i - size / 2f) / focal, -(j - size / 2f) / focal, -1f);
        Vector3 origin = new Vector3(
            distance * Mathf.Cos(elevation) * Mathf.Sin(azimuth),
            distance * Mathf.Sin(elevation),
            distance * Mathf.Cos(elevation) * Mathf.Cos(azimuth));
        Vector3 forward = new Vector3(-origin.x / distance, -origin.y / distance, -origin.z / distance);
        float rl = Mathf.Max(Mathf.Sqrt(forward.x * forward.x + forward.z * forward.z), Eps);
        Vector3 right = new Vector3(-forward.z / rl, 0f, forward.x / rl);     // forward x (0, 1, 0), unit length
        Vector3 up = new Vector3(
            right.y * forward.z - right.z * forward.y,
            right.z * forward.x - right.x * forward.z,
            right.x * forward.y - right.y * forward.x);
        float dx = right.x * cameraDir.x + up.x * cameraDir.y - forward.x * cameraDir.z;
        float dy = right.y * cameraDir.x + up.y * cameraDir.y - forward.y * cameraDir.z;
        float dz = right.z * cameraDir.x + up.z * cameraDir.y - forward.z * cameraDir.z;
        float dl = Mathf.Sqrt(dx * dx + dy * dy + dz * dz);
        Vector3 direction = new Vector3(dx / dl, dy / dl, dz / dl);
        CameraResult result;
        result.focal = focal;
        result.cameraDir = cameraDir;
        result.origin = origin;
        result.direction = direction;
        return result;
    }
    #endregion

    #region A volume of blobs
    // The scene is a few Gaussian blobs: density height * exp(-|p - center|^2 / (2 radius^2)) with a color each. A ray through the
    // volume is sampled, the blobs are asked for a density and a color at every sample point, and the samples are composited with the
    // same function as before.
    public static FieldValues EvaluateBlobs(float[] blobs, Vector3 origin, Vector3 direction, float[] depths)
    {
        float[] sigmas = new float[depths.Length];
        Vector3[] colors = new Vector3[depths.Length];
        int count = blobs.Length / BlobStride;
        for (int i = 0; i < depths.Length; i++)
        {
            float px = origin.x + depths[i] * direction.x;
            float py = origin.y + depths[i] * direction.y;
            float pz = origin.z + depths[i] * direction.z;
            float sigma = 0f;
            float r = 0f;
            float g = 0f;
            float b = 0f;
            for (int k = 0; k < count; k++)
            {
                int o = k * BlobStride;
                float dx = px - blobs[o];
                float dy = py - blobs[o + 1];
                float dz = pz - blobs[o + 2];
                float radius = Mathf.Max(blobs[o + 3], Eps);
                float d = blobs[o + 4] * Mathf.Exp(-(dx * dx + dy * dy + dz * dz) / (2f * radius * radius));
                sigma += d;
                r += d * blobs[o + 5];
                g += d * blobs[o + 6];
                b += d * blobs[o + 7];
            }
            sigmas[i] = sigma;
            colors[i] = sigma > Eps ? new Vector3(r / sigma, g / sigma, b / sigma) : new Vector3(0f, 0f, 0f);
        }
        FieldValues result;
        result.sigmas = sigmas;
        result.colors = colors;
        return result;
    }

    public static RayResult RenderVolumeRay(float[] blobs, Vector3 origin, Vector3 direction, float near, float far, int n, string mode, float offset, Rng rng, Vector3 background)
    {
        RaySamples samples = RayDepths(near, far, n, mode, offset, rng);
        FieldValues values = EvaluateBlobs(blobs, origin, direction, samples.depths);
        Composite march = CompositeRay(values.sigmas, values.colors, samples.deltas, background);
        var seen = ExpectedDepth(march.weights, samples.depths);
        RayResult result;
        result.edges = samples.edges;
        result.depths = samples.depths;
        result.deltas = samples.deltas;
        result.sigmas = values.sigmas;
        result.colors = values.colors;
        result.alphas = march.alphas;
        result.transmittances = march.transmittances;
        result.weights = march.weights;
        result.color = march.color;
        result.weightSum = march.weightSum;
        result.tEnd = march.tEnd;
        result.pixel = march.pixel;
        result.depth = seen.depth;
        result.spread = seen.spread;
        return result;
    }
    #endregion
}
