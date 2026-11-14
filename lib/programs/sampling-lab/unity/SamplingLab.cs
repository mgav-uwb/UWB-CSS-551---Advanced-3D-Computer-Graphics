using System;
using System.Collections.Generic;
using UnityEngine;

// SamplingLab.cs: sampling and antialiasing as numbers. A sine sampled below its frequency and the alias it returns as, the
// reconstruction filters (box, tent, Gaussian, Lanczos-3, Mitchell-Netravali) and what they pass, a zone plate rendered one
// pixel at a time, the coverage of an edge across a pixel estimated by sample patterns, the cost of supersampling and
// multisampling, a spinning wheel filmed at a frame rate, and the history a temporal filter keeps. Plain C#, no MonoBehaviour.
// SamplingLabScene.cs draws a zone plate. No method changes its arguments.
// Each method returns its named intermediate results as a tuple, with the field names and the order of the object
// samplinglab.js returns. mono's compiler rejects tuples over 7 fields, so the three results with more are small structs
// declared below.
// The same functions, line for line where the languages allow, are samplinglab.js in ../webgl/
// (lib/tests/programs/sampling-lab.test.mjs runs both on the same inputs and compares the numbers).
public static class SamplingLab
{
    public struct SineSamples { public float[] times, values, aliasValues; public float signed, alias, nyquist; public bool aliased; public float mismatch; }
    public struct CostResult { public double pixels, ssaaRuns, msaaRuns, noneInstructions, ssaaInstructions, msaaInstructions, noneMiB, multiMiB; }
    public struct WheelResult { public float spacing, turn, spokeRate, nyquist, aliasRate, apparentRps, apparentStep, sweep, contrast; public bool aliased; }

    #region Settings and helpers
    // Below Eps two numbers count as equal. Rng is Mulberry32 (Tommy Ettinger, 2017): a counter and a mixing step on 32-bit whole
    // numbers, so the same seed gives the same numbers in both tracks.
    public const float Eps = 1e-6f;

    public static float Clamp(float x, float lo, float hi) { return Mathf.Max(lo, Mathf.Min(hi, x)); }

    public static float Sinc(float x)
    {
        if (Mathf.Abs(x) < Eps) return 1f;
        return Mathf.Sin(Mathf.PI * x) / (Mathf.PI * x);
    }

    public static float[] SortAscending(float[] list)
    {
        List<float> sorted = new List<float>();
        for (int i = 0; i < list.Length; i++)
        {
            int at = sorted.Count;
            while (at > 0 && sorted[at - 1] > list[i]) at--;
            sorted.Insert(at, list[i]);
        }
        return sorted.ToArray();
    }

    public class Rng
    {
        uint state;
        public Rng(uint seed) { state = seed; }
        public float Next()
        {
            state = state + 0x6d2b79f5u;
            uint t = state;
            t = (t ^ (t >> 15)) * (t | 1u);
            t ^= t + (t ^ (t >> 7)) * (t | 61u);
            return (float)((t ^ (t >> 14)) / 4294967296.0);
        }
    }
    #endregion

    #region Alias frequency
    // A sine of frequency f, sampled fs times per unit, has the same samples as the sine of frequency f - k fs for every whole
    // number k. Nothing in the samples says which one was sampled, and reconstruction draws the lowest: k is the multiple of fs
    // that brings f into [-fs/2, fs/2]. Its size is the alias, its sign says whether the pattern runs backward. A frequency
    // above the Nyquist frequency fs/2 comes back as a different one.
    public static (float f, float fs, float nyquist, int k, float signed, float alias, bool aliased) AliasFrequency(float f, float fs)
    {
        float nyquist = fs / 2f;
        int k = Mathf.FloorToInt(f / fs + 0.5f);
        float signed = f - k * fs;
        float alias = Mathf.Abs(signed);
        bool aliased = f > nyquist + Eps;
        return (f, fs, nyquist, k, signed, alias, aliased);
    }
    #endregion

    #region Sample a sine
    // The samples are taken at t = i / fs. The sine of the signed alias frequency, with the same phase, passes through every one
    // of them: mismatch is the largest gap between the two at the sample times, zero up to rounding.
    public static float SineValue(float f, float phase, float t) { return Mathf.Sin(2f * Mathf.PI * f * t + phase); }

    public static SineSamples SampleSine(float f, float fs, float phase, int count)
    {
        var a = AliasFrequency(f, fs);
        float[] times = new float[count];
        float[] values = new float[count];
        float[] aliasValues = new float[count];
        float mismatch = 0f;
        for (int i = 0; i < count; i++)
        {
            float t = i / fs;
            times[i] = t;
            values[i] = SineValue(f, phase, t);
            aliasValues[i] = SineValue(a.signed, phase, t);
            mismatch = Mathf.Max(mismatch, Mathf.Abs(values[i] - aliasValues[i]));
        }
        float signed = a.signed;
        float alias = a.alias;
        float nyquist = a.nyquist;
        bool aliased = a.aliased;
        return new SineSamples { times = times, values = values, aliasValues = aliasValues, signed = signed, alias = alias, nyquist = nyquist, aliased = aliased, mismatch = mismatch };
    }
    #endregion

    #region Filter kernels
    // A reconstruction filter h(u) gives the weight of a sample u sample-spacings away. Box: 1 inside half a spacing. Tent: 1 - |u|.
    // Gaussian: a bell of standard deviation sigma with area 1. Lanczos-3: a sinc windowed by a wider sinc, with negative lobes.
    // Mitchell and Netravali (1988): a cubic on [-2, 2] with a blur knob B and a ringing knob C; (1/3, 1/3) is their recommendation.
    public static float FilterSupport(string kind, float sigma)
    {
        if (kind == "box") return 0.5f;
        if (kind == "tent") return 1f;
        if (kind == "gaussian") return 4f * sigma;
        if (kind == "lanczos3") return 3f;
        return 2f;
    }

    static float MitchellWeight(float x, float B, float C)
    {
        if (x < 1f) return ((12f - 9f * B - 6f * C) * x * x * x + (-18f + 12f * B + 6f * C) * x * x + (6f - 2f * B)) / 6f;
        if (x < 2f) return ((-B - 6f * C) * x * x * x + (6f * B + 30f * C) * x * x + (-12f * B - 48f * C) * x + (8f * B + 24f * C)) / 6f;
        return 0f;
    }

    public static float FilterWeight(string kind, float u, float B, float C, float sigma)
    {
        float x = Mathf.Abs(u);
        if (kind == "box") return u >= -0.5f && u < 0.5f ? 1f : 0f;
        if (kind == "tent") return Mathf.Max(0f, 1f - x);
        if (kind == "gaussian")
        {
            if (x > 4f * sigma) return 0f;
            return Mathf.Exp(-x * x / (2f * sigma * sigma)) / (sigma * Mathf.Sqrt(2f * Mathf.PI));
        }
        if (kind == "lanczos3") return x < 3f ? Sinc(x) * Sinc(x / 3f) : 0f;
        return MitchellWeight(x, B, C);
    }
    #endregion

    #region Filter taps
    // The samples a filter reads at position x (sample i sits at i): every i within the support, each with the weight h(x - i).
    // The Gaussian's copies at whole spacings add to a little over 1, so its weights are divided by their sum; the others are as
    // defined. sum is the total before that division.
    public static (int first, float[] weights, float sum, bool normalized) FilterTaps(string kind, float x, float B, float C, float sigma)
    {
        float support = FilterSupport(kind, sigma);
        int first = Mathf.CeilToInt(x - support);
        int last = Mathf.FloorToInt(x + support);
        float[] weights = new float[Math.Max(0, last - first + 1)];
        float sum = 0f;
        for (int i = first; i <= last; i++)
        {
            float w = FilterWeight(kind, x - i, B, C, sigma);
            weights[i - first] = w;
            sum += w;
        }
        bool normalized = kind == "gaussian" && sum > Eps;
        if (normalized)
        {
            for (int j = 0; j < weights.Length; j++) weights[j] = weights[j] / sum;
        }
        return (first, weights, sum, normalized);
    }
    #endregion

    #region Reconstruct from samples
    // The reconstructed value at x is the sum of the samples, each times its filter weight: f~(x) = sum of f(i / fs) h(x fs - i).
    // The test signal has frequencies 1.5 and 4, so its highest is 4 and the theorem asks for fs above 8.
    // The error is measured against the signal itself at 600 points across x in [0.5, 3.5], away from the ends of the samples, at
    // the middle of each step so that no point falls exactly between two samples (where a box would have to pick one).
    public static float TwoTone(float x) { return Mathf.Sin(2f * Mathf.PI * 1.5f * x) + 0.5f * Mathf.Sin(2f * Mathf.PI * 4f * x); }

    public static float Reconstruct(float[] samples, float x, string kind, float B, float C, float sigma)
    {
        var taps = FilterTaps(kind, x, B, C, sigma);
        float sum = 0f;
        for (int j = 0; j < taps.weights.Length; j++)
        {
            int i = taps.first + j;
            if (i >= 0 && i < samples.Length) sum += samples[i] * taps.weights[j];
        }
        return sum;
    }

    public static (int count, float rms, float signalRms) ReconstructionError(string kind, float fs, float B, float C, float sigma)
    {
        int count = Mathf.FloorToInt(4f * fs + Eps) + 1;
        float[] samples = new float[count];
        for (int i = 0; i < count; i++) samples[i] = TwoTone(i / fs);
        int steps = 600;
        double errorSquares = 0;
        for (int j = 0; j < steps; j++)
        {
            float x = 0.5f + 0.005f * (j + 0.5f);
            float error = Reconstruct(samples, x * fs, kind, B, C, sigma) - TwoTone(x);
            errorSquares += error * error;
        }
        float rms = (float)Math.Sqrt(errorSquares / steps);
        float signalRms = Mathf.Sqrt((1f + 0.25f) / 2f);
        return (count, rms, signalRms);
    }
    #endregion

    #region Frequency response
    // What a filter does to a sine of frequency f (cycles per sample spacing) is multiply its size by H(f), the cosine transform of
    // the kernel. Box: |sinc f|. Tent: sinc^2 f. Gaussian: exp(-2 pi^2 sigma^2 f^2). Lanczos and Mitchell have no short form, so
    // the kernel is integrated against a cosine with Simpson's rule. An ideal filter passes 1 below 1/2 and 0 above.
    public static float FilterResponse(string kind, float f, float B, float C, float sigma)
    {
        if (kind == "box") return Mathf.Abs(Sinc(f));
        if (kind == "tent") return Sinc(f) * Sinc(f);
        if (kind == "gaussian") return Mathf.Exp(-2f * Mathf.PI * Mathf.PI * sigma * sigma * f * f);
        float support = FilterSupport(kind, sigma);
        int steps = 200;
        float h = 2f * support / steps;
        double total = 0;
        for (int i = 0; i <= steps; i++)
        {
            float x = -support + i * h;
            float simpson = 2f;
            if (i == 0 || i == steps) simpson = 1f;
            else if (i % 2 == 1) simpson = 4f;
            total += simpson * FilterWeight(kind, x, B, C, sigma) * Mathf.Cos(2f * Mathf.PI * f * x);
        }
        return (float)Math.Abs(total * h / 3);
    }
    #endregion

    #region Step response
    // Reconstruct an edge: samples that are 0 up to i = -1 and 1 from i = 0. Blur is the distance the value takes to rise from
    // 10 % to 90 % of its final level (read between the 0.01 steps by linear interpolation); ringing is how far it goes past 1 (overshoot) and below 0 (undershoot). A kernel with no
    // negative lobe cannot ring.
    public static (float overshoot, float undershoot, float rise, float plateau) StepResponse(string kind, float B, float C, float sigma)
    {
        float high = -1000f;
        float low = 1000f;
        float x10 = 0f;
        float x90 = 0f;
        bool found10 = false;
        bool found90 = false;
        float last = 0f;
        float previous = 0f;
        for (int j = 0; j <= 800; j++)
        {
            float x = -4f + 0.01f * j;
            var taps = FilterTaps(kind, x, B, C, sigma);
            float value = 0f;
            for (int t = 0; t < taps.weights.Length; t++)
            {
                if (taps.first + t >= 0) value += taps.weights[t];
            }
            high = Mathf.Max(high, value);
            low = Mathf.Min(low, value);
            if (!found10 && value >= 0.1f) { found10 = true; x10 = x - 0.01f * (value - 0.1f) / (value - previous); }
            if (!found90 && value >= 0.9f) { found90 = true; x90 = x - 0.01f * (value - 0.9f) / (value - previous); }
            previous = value;
            last = value;
        }
        float overshoot = Mathf.Max(0f, high - last);
        float undershoot = Mathf.Max(0f, -low);
        float rise = x90 - x10;
        return (overshoot, undershoot, rise, last);
    }
    #endregion

    #region Zone plate
    // A zone plate is 1/2 + 1/2 cos(K r^2 / size), r the distance from the centre in pixels. The phase grows as r squared, so the
    // local frequency K r / (pi size) grows in proportion to r, and reaches the Nyquist frequency, 1/2 cycle per pixel, along an
    // axis at r = pi size / (2 K). A pixel's value is the mean of n x n samples on a regular grid inside it, or one random sample in
    // each of its n x n cells (jitter). Pixel (ix, iy) covers [ix, ix + 1] x [iy, iy + 1].
    public const int ZoneSize = 200;
    public const float ZoneK = 5.2f;

    public static float ZoneFrequency(float r, float size, float K) { return K * r / (Mathf.PI * size); }

    public static float ZoneRadius(float frequency, float size, float K) { return frequency * Mathf.PI * size / K; }

    public static float ZoneValue(float x, float y, float size, float K)
    {
        float dx = x - size / 2f;
        float dy = y - size / 2f;
        return 0.5f + 0.5f * Mathf.Cos(K * (dx * dx + dy * dy) / size);
    }

    public static (float value, int samples) ZonePixel(int ix, int iy, int n, bool jitter, float size, float K)
    {
        Rng rng = new Rng((uint)(ix + 4096 * iy + 1));
        float total = 0f;
        for (int b = 0; b < n; b++)
        {
            for (int a = 0; a < n; a++)
            {
                float ox = (a + 0.5f) / n;
                float oy = (b + 0.5f) / n;
                if (jitter)
                {
                    ox = (a + rng.Next()) / n;
                    oy = (b + rng.Next()) / n;
                }
                total += ZoneValue(ix + ox, iy + oy, size, K);
            }
        }
        int samples = n * n;
        float value = total / samples;
        return (value, samples);
    }
    #endregion

    #region Edge coverage
    // A pixel is the unit square. The edge is the line y = slope x + offset, and the polygon is the part above it. Its exact
    // coverage is the area above the line: the height of the inside at x, clamped to [0, 1], integrated across the pixel. That
    // height is piecewise linear, bending where the line meets the top and the bottom of the pixel, so the trapezoid rule between
    // the bends is exact.
    static float InsideHeight(float slope, float offset, float x) { return Clamp(1f - (slope * x + offset), 0f, 1f); }

    public static float ExactCoverage(float slope, float offset)
    {
        List<float> xs = new List<float> { 0f, 1f };
        if (Mathf.Abs(slope) > Eps)
        {
            float atTop = (1f - offset) / slope;
            float atBottom = (0f - offset) / slope;
            if (atTop > 0f && atTop < 1f) xs.Add(atTop);
            if (atBottom > 0f && atBottom < 1f) xs.Add(atBottom);
        }
        float[] sorted = SortAscending(xs.ToArray());
        float area = 0f;
        for (int i = 0; i + 1 < sorted.Length; i++)
        {
            float h0 = InsideHeight(slope, offset, sorted[i]);
            float h1 = InsideHeight(slope, offset, sorted[i + 1]);
            area += 0.5f * (h0 + h1) * (sorted[i + 1] - sorted[i]);
        }
        return area;
    }
    #endregion

    #region Sample patterns
    // Where the samples sit inside the pixel. single: the centre. grid4 and grid16: regular grids of 2 x 2 and 4 x 4. rotated4:
    // four samples, no two in a row or a column (the 4x multisampling pattern). random16: sixteen anywhere. stratified16: one
    // random sample in each cell of a 4 x 4 grid. n samples give at most n + 1 coverage levels, and a pattern with fewer distinct
    // rows gives a horizontal edge fewer: rows + 1.
    public static Vector2[] SamplePattern(string kind, uint seed)
    {
        List<Vector2> points = new List<Vector2>();
        Rng rng = new Rng(seed);
        if (kind == "single")
        {
            points.Add(new Vector2(0.5f, 0.5f));
        }
        else if (kind == "grid4")
        {
            for (int b = 0; b < 2; b++) for (int a = 0; a < 2; a++) points.Add(new Vector2((a + 0.5f) / 2f, (b + 0.5f) / 2f));
        }
        else if (kind == "rotated4")
        {
            points.Add(new Vector2(0.375f, 0.125f));
            points.Add(new Vector2(0.875f, 0.375f));
            points.Add(new Vector2(0.125f, 0.625f));
            points.Add(new Vector2(0.625f, 0.875f));
        }
        else if (kind == "grid16")
        {
            for (int b = 0; b < 4; b++) for (int a = 0; a < 4; a++) points.Add(new Vector2((a + 0.5f) / 4f, (b + 0.5f) / 4f));
        }
        else if (kind == "random16")
        {
            for (int i = 0; i < 16; i++)
            {
                float x = rng.Next();
                float y = rng.Next();
                points.Add(new Vector2(x, y));
            }
        }
        else
        {
            for (int b = 0; b < 4; b++)
            {
                for (int a = 0; a < 4; a++)
                {
                    float x = (a + rng.Next()) / 4f;
                    float y = (b + rng.Next()) / 4f;
                    points.Add(new Vector2(x, y));
                }
            }
        }
        return points.ToArray();
    }

    public static (int count, int rows, int columns, int horizontalLevels, int verticalLevels) PatternLevels(Vector2[] points)
    {
        int rowValues = 0;
        int columnValues = 0;
        for (int i = 0; i < points.Length; i++)
        {
            bool newColumn = true;
            bool newRow = true;
            for (int j = 0; j < i; j++)
            {
                if (Mathf.Abs(points[j].x - points[i].x) < 1e-4f) newColumn = false;
                if (Mathf.Abs(points[j].y - points[i].y) < 1e-4f) newRow = false;
            }
            if (newColumn) columnValues++;
            if (newRow) rowValues++;
        }
        int count = points.Length;
        int rows = rowValues;
        int columns = columnValues;
        return (count, rows, columns, rows + 1, columns + 1);
    }
    #endregion

    #region Estimate coverage
    // A sample is inside when it lies above the edge (strictly: a sample exactly on it counts as outside). The estimate is the
    // fraction of samples inside; the error is the estimate minus the exact coverage.
    public static (int count, int inside, float estimate, float exact, float error, int[] flags) EstimateCoverage(Vector2[] points, float slope, float offset)
    {
        int[] flags = new int[points.Length];
        int inside = 0;
        for (int i = 0; i < points.Length; i++)
        {
            int hit = points[i].y > slope * points[i].x + offset ? 1 : 0;
            flags[i] = hit;
            inside += hit;
        }
        int count = points.Length;
        float estimate = (float)inside / count;
        float exact = ExactCoverage(slope, offset);
        float error = estimate - exact;
        return (count, inside, estimate, exact, error, flags);
    }
    #endregion

    #region Random against stratified
    // A pixel half covered by the edge y = 0.3 x + 0.35, estimated with 16 samples, over many trials. Random samples have the
    // binomial error sqrt(p (1 - p) / 16) = 0.125. Stratified samples (one per cell of a 4 x 4 grid) only miscount in the cells
    // the edge crosses. Both draw from one stream, random trials first. randomHits[k] counts the trials with k of the 16 samples
    // inside, so the spread of the estimates can be drawn.
    public static (float exact, float random, float stratified, float ratio, float binomial, int[] randomHits, int[] stratifiedHits) SamplingError(int trials, uint seed)
    {
        Rng rng = new Rng(seed);
        float exact = ExactCoverage(0.3f, 0.35f);
        int[] randomHits = new int[17];
        int[] stratifiedHits = new int[17];
        double randomSquares = 0;
        double stratifiedSquares = 0;
        for (int t = 0; t < trials; t++)
        {
            int hits = 0;
            for (int i = 0; i < 16; i++)
            {
                float x = rng.Next();
                float y = rng.Next();
                if (y > 0.3f * x + 0.35f) hits++;
            }
            float error = hits / 16f - exact;
            randomSquares += error * error;
            randomHits[hits] += 1;
        }
        for (int t = 0; t < trials; t++)
        {
            int hits = 0;
            for (int b = 0; b < 4; b++)
            {
                for (int a = 0; a < 4; a++)
                {
                    float x = (a + rng.Next()) / 4f;
                    float y = (b + rng.Next()) / 4f;
                    if (y > 0.3f * x + 0.35f) hits++;
                }
            }
            float error = hits / 16f - exact;
            stratifiedSquares += error * error;
            stratifiedHits[hits] += 1;
        }
        float random = (float)Math.Sqrt(randomSquares / trials);
        float stratified = (float)Math.Sqrt(stratifiedSquares / trials);
        float binomial = Mathf.Sqrt(exact * (1f - exact) / 16f);
        return (exact, random, stratified, random / stratified, binomial, randomHits, stratifiedHits);
    }
    #endregion

    #region Shading cost
    // Supersampling (SSAA) runs the fragment shader once per sample: fragments x samples runs. Multisampling (MSAA) tests
    // coverage and depth at every sample but runs the shader once per fragment, and writes its color to each covered sample. Both
    // keep a color for every sample of every pixel, 4 bytes each; the figures count color only, in mebibytes (1024 x 1024 bytes).
    public static CostResult AntialiasingCost(int width, int height, double fragments, int samples, double instructions)
    {
        var pixels = (double)width * height;
        var ssaaRuns = fragments * samples;
        var msaaRuns = fragments;
        var noneInstructions = fragments * instructions;
        var ssaaInstructions = ssaaRuns * instructions;
        var msaaInstructions = msaaRuns * instructions;
        var noneMiB = pixels * 4 / 1048576;
        var multiMiB = pixels * samples * 4 / 1048576;
        return new CostResult { pixels = pixels, ssaaRuns = ssaaRuns, msaaRuns = msaaRuns, noneInstructions = noneInstructions, ssaaInstructions = ssaaInstructions, msaaInstructions = msaaInstructions, noneMiB = noneMiB, multiMiB = multiMiB };
    }
    #endregion

    #region Blend space
    // Coverage is a fraction of light, and an 8-bit code is not: the sRGB code c stands for light ((c + 0.055) / 1.055)^2.4. A
    // white edge on black covering half a pixel should emit half the light. Blending the codes (255 x 1/2, code 128) emits
    // 0.216; blending the light, then encoding (code 188) emits 0.503.
    public static float SrgbDecode(float code)
    {
        if (code <= 0.04045f) return code / 12.92f;
        return Mathf.Pow((code + 0.055f) / 1.055f, 2.4f);
    }

    public static float SrgbEncode(float linear)
    {
        if (linear <= 0.0031308f) return linear * 12.92f;
        return 1.055f * Mathf.Pow(linear, 1f / 2.4f) - 0.055f;
    }

    public static (int code, float light, float wanted, float error) BlendCoverage(float coverage, bool inLinearLight)
    {
        int code = Mathf.FloorToInt(255f * coverage + 0.5f);
        if (inLinearLight) code = Mathf.FloorToInt(255f * SrgbEncode(coverage) + 0.5f);
        float light = SrgbDecode(code / 255f);
        float error = light - coverage;
        return (code, light, coverage, error);
    }
    #endregion

    #region Wheel
    // A wheel with N spokes turning at rps revolutions per second shows a spoke pattern of frequency N rps (spokes per second).
    // Filmed at fps frames per second, that is a signal sampled at fps: the apparent rate is the alias of N rps. The wheel turns
    // 360 rps / fps degrees per frame, and the picture repeats every 360 / N degrees. A shutter open for the fraction s of a frame
    // averages the motion over a box of that width: the swept angle is turn x s, and the spoke pattern keeps |sinc(N rps s / fps)|
    // of its contrast.
    public static WheelResult WheelMotion(float spokes, float rps, float fps, float shutter)
    {
        float spacing = 360f / spokes;
        float turn = 360f * rps / fps;
        float spokeRate = spokes * rps;
        var a = AliasFrequency(spokeRate, fps);
        float apparentRps = a.signed / spokes;
        float apparentStep = a.signed / fps * spacing;
        float sweep = turn * shutter;
        float contrast = Mathf.Abs(Sinc(spokeRate * shutter / fps));
        bool aliased = a.aliased;
        return new WheelResult { spacing = spacing, turn = turn, spokeRate = spokeRate, nyquist = a.nyquist, aliasRate = a.signed, apparentRps = apparentRps, apparentStep = apparentStep, sweep = sweep, contrast = contrast, aliased = aliased };
    }
    #endregion

    #region History blend
    // Temporal antialiasing keeps a history and blends each frame into it: history = (1 - alpha) history + alpha current. After a
    // jump from 0 to 1 the history has reached 1 - (1 - alpha)^n after n frames, so it reaches a fraction p after
    // ln(1 - p) / ln(1 - alpha) frames, rounded up.
    public static float[] BlendHistory(float[] history, float[] current, float alpha)
    {
        float[] next = new float[history.Length];
        for (int i = 0; i < history.Length; i++) next[i] = (1f - alpha) * history[i] + alpha * current[i];
        return next;
    }

    public static (float exact, int frames, float seconds, float reached) FramesToReach(float alpha, float fraction, float fps)
    {
        float exact = Mathf.Log(1f - fraction) / Mathf.Log(1f - alpha);
        int frames = Mathf.CeilToInt(exact - Eps);
        float seconds = frames / fps;
        float reached = 1f - Mathf.Pow(1f - alpha, frames);
        return (exact, frames, seconds, reached);
    }

    #endregion

    #region Ghost trail
    // A bar barWidth pixels wide moves speed pixels per frame across a row, and the history blends each frame in with weight alpha.
    // A pixel the bar has left keeps a fraction of its value, (1 - alpha) per frame, so the bar drags a trail behind it: trail
    // counts the pixels behind the bar that still hold at least 0.1.
    public static (float[] row, float barStart, int trail) GhostRow(int width, int barWidth, float speed, float alpha, int frames)
    {
        float[] history = new float[width];
        float barStart = 0f;
        for (int n = 0; n <= frames; n++)
        {
            barStart = 4f + speed * n;
            float[] current = new float[width];
            for (int x = 0; x < width; x++) current[x] = x >= barStart && x < barStart + barWidth ? 1f : 0f;
            history = BlendHistory(history, current, alpha);
        }
        int trail = 0;
        for (int x = 0; x < width; x++)
        {
            if (x < barStart && history[x] >= 0.1f) trail++;
        }
        return (history, barStart, trail);
    }
    #endregion
}
