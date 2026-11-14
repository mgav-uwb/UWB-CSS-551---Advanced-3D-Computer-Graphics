using System;
using System.Collections.Generic;

// ImageLab.cs: image processing as arithmetic on arrays. An image is a flat double[], row after row, w columns by h rows, values in
// [0, 1] unless a method says 0 to 255. It covers convolution with a kernel and its border choices, the median and the unsharp
// mask, the discrete Fourier transform (by its formula and by the fast algorithm), frequency masks and the convolution theorem,
// the cosine transform and every step of JPEG (quantization, zigzag and run lengths, chroma subsampling, a whole image with its
// size), Gaussian and Laplacian pyramids, histograms and tone curves, linear light, and the two metrics PSNR and SSIM. Plain C#,
// no MonoBehaviour. ImageLabScene.cs shows one image and its JPEG. No method changes its arguments.
// Each method returns its named intermediate results as a small struct or tuple, with the field names and the order of the object
// imagelab.js returns. The arithmetic is double, as in JavaScript, so the two tracks round alike.
// The same methods, line for line where the languages allow, are imagelab.js in ../webgl/
// (lib/tests/programs/image-lab.test.mjs runs both on the same inputs and compares the numbers).
public static class ImageLab
{
    public struct ColorPlanes { public double[] r, g, b; }
    public struct NeighborhoodResult { public double[] neighbors, products; public double value; }
    public struct ConvolveResult { public double[] image; public double low, high; }
    public struct KernelResult { public int size; public double[] values; }
    public struct SeparateResult { public bool separable; public double[] column, row; public int costFull, costSeparable; }
    public struct MedianResult { public double[] neighbors, sorted; public double value; }
    public struct ImageResult { public double[] image; }
    public struct ComplexResult { public double[] re, im; }
    public struct SpectrumResult { public double[] shown; public double peak; }
    public struct MaskResult
    {
        public double[] spectrumRe, spectrumIm, keptRe, keptIm, filtered;
        public double imaginary, energyBefore, energyKept;
    }
    public struct FrequencyResult
    {
        public double[] image, re, im;
        public int[] us, vs;
        public double[] magnitudes;
        public int mirrorU, mirrorV, folded;
    }
    public struct TheoremResult { public double[] kernelRe, kernelIm, productRe, productIm, image; }
    public struct IdctResult { public double[] columns, block; }
    public struct DctResult { public double[] rows, coefficients; }
    public struct KeptResult { public double[] kept, rebuilt; }
    public struct ScaledResult { public double scale; public double[] table; }
    public struct QuantizeResult { public double[] levels, dequantized, errors; public int nonzero; }
    public struct RunResult { public double[] sequence; public double dc; public int[] runs; public double[] values; public bool endOfBlock; }
    public struct BlockResult
    {
        public double[] shifted, coefficients;
        public double scale;
        public double[] table, levels, dequantized;
        public int nonzero;
        public double[] reconstructed, difference;
        public double rms, maxError;
    }
    public struct ChromaResult
    {
        public double[] r, g, b, luma, blueHalf, redHalf;
        public int numbersBefore, numbersAfter;
    }
    public struct PlaneResult { public double[] decoded; public int blocks, nonzero; public double nonzeroPerBlock, bits; }
    public struct ColorResult { public double[] r, g, b; public double bits, bitsPerPixel, ratio, psnr; }
    public struct SizedImage { public double[] image; public int w, h; }
    public struct PyramidResult { public double[][] images; public double pixels; }
    public struct LaplacianResult { public double[][] gaussian, bands; public double[] top; }
    public struct CollapseResult { public double[] image; public double[][] steps; }
    public struct HistogramResult { public double[] counts, fractions, cumulative; public double mean; }
    public struct EqualizeResult { public double[] mapped, cumulative; public double meanBefore, meanAfter; }
    public struct LightResult { public double[] light, image; }
    public struct SsimResult
    {
        public double meanP, meanQ, varianceP, varianceQ, covariance, luminance, contrastStructure, ssim;
    }
    public struct SsimImageResult { public double ssim; public int windows; }

    static double[] Zeros(int count) { return new double[count]; }

    static double[] Slice(double[] a, int from, int to)
    {
        double[] result = new double[to - from];
        for (int k = from; k < to; k++) result[k - from] = a[k];
        return result;
    }

    #region Test images
    // Small images made by rules, so both tracks hold the same pixels. Park-Miller is the random generator; a Gaussian number is
    // the sum of twelve uniform ones minus 6 (mean 0, variance 1). The glyph is 12 by 12 with
    // ink 0.99, a soft edge 0.29 and paper 0; rows 4 to 6 hold the lecture's neighborhood (0.99, 0.29, 0) at columns 5 to 7. The
    // scene is a color picture with a ramp, a disc, a box, a thin line and fine stripes; its luma is the gray test image.
    public static double NextRandom(double state)
    {
        return (state * 48271) % 2147483647;
    }

    public static double[] MakeNoise(int count, double seed)
    {
        double[] values = Zeros(count);
        double state = seed;
        for (int k = 0; k < count; k++)
        {
            state = NextRandom(state);
            values[k] = state / 2147483647;
        }
        return values;
    }

    public static double[] MakeGaussianNoise(int count, double seed, double sigma)
    {
        double[] values = Zeros(count);
        double state = seed;
        for (int k = 0; k < count; k++)
        {
            double sum = 0;
            for (int draw = 0; draw < 12; draw++)
            {
                state = NextRandom(state);
                sum += state / 2147483647;
            }
            values[k] = sigma * (sum - 6);
        }
        return values;
    }

    static readonly string[] GlyphRows =
    {
        "............",
        "...o##o.....",
        "..o###o.....",
        ".o####o.....",
        "...o##o.....",
        "...o##o.....",
        "...o##o.....",
        "...o##o.....",
        "...o##o.....",
        "...o##o.....",
        ".o######o...",
        "............",
    };

    public static double[] MakeGlyph()
    {
        double[] image = Zeros(144);
        for (int j = 0; j < 12; j++)
        {
            for (int i = 0; i < 12; i++)
            {
                char mark = GlyphRows[j][i];
                image[j * 12 + i] = mark == '#' ? 0.99 : (mark == 'o' ? 0.29 : 0);
            }
        }
        return image;
    }

    public static double[] LumaOf(double[] r, double[] g, double[] b)
    {
        double[] luma = Zeros(r.Length);
        for (int k = 0; k < r.Length; k++) luma[k] = 0.299 * r[k] + 0.587 * g[k] + 0.114 * b[k];
        return luma;
    }

    public static ColorPlanes MakeColorScene(int n)
    {
        double[] r = Zeros(n * n);
        double[] g = Zeros(n * n);
        double[] b = Zeros(n * n);
        for (int j = 0; j < n; j++)
        {
            for (int i = 0; i < n; i++)
            {
                double x = (i + 0.5) / n;
                double y = (j + 0.5) / n;
                double red = 0.30 + 0.50 * y;
                double green = 0.50 + 0.40 * y;
                double blue = 0.85 + 0.15 * y;
                if (y > 0.72)
                {
                    double shade = (i / 2) % 2 == 0 ? 0.8 : 1.0;
                    red = 0.30 * shade; green = 0.55 * shade; blue = 0.25 * shade;
                }
                if (Math.Abs(x + y - 1.0) < 1.5 / n) { red = 1.0; green = 0.9; blue = 0.1; }
                if ((x - 0.30) * (x - 0.30) + (y - 0.38) * (y - 0.38) < 0.17 * 0.17) { red = 0.9; green = 0.12; blue = 0.10; }
                if (x > 0.55 && x < 0.88 && y > 0.28 && y < 0.60) { red = 0.10; green = 0.20; blue = 0.85; }
                r[j * n + i] = red;
                g[j * n + i] = green;
                b[j * n + i] = blue;
            }
        }
        ColorPlanes result;
        result.r = r; result.g = g; result.b = b;
        return result;
    }

    public static double[] MakeScene(int n)
    {
        ColorPlanes color = MakeColorScene(n);
        return LumaOf(color.r, color.g, color.b);
    }
    #endregion

    #region Borders
    // A kernel centered on an edge pixel reaches past the image. Clamp repeats the edge pixel, wrap treats the image as a torus,
    // mirror reflects it (the same rule as the texture lab's address modes), and zero treats the outside as black.
    public static int BorderIndex(int i, int size, string mode)
    {
        if (mode == "zero") return (i < 0 || i >= size) ? -1 : i;
        if (mode == "clamp") return Math.Min(Math.Max(i, 0), size - 1);
        int period = (int)Math.Floor((double)i / size);
        int inside = i - period * size;
        if (mode == "mirror" && period % 2 != 0) return size - 1 - inside;
        return inside;
    }

    public static double PixelAt(double[] image, int w, int h, int i, int j, string mode)
    {
        int row = BorderIndex(i, h, mode);
        int column = BorderIndex(j, w, mode);
        if (row < 0 || column < 0) return 0;
        return image[row * w + column];
    }
    #endregion

    #region Convolution at a pixel
    // Replace a pixel by the weighted sum of its neighborhood: y(i, j) = sum over a, b of K(a, b) * x(i + a, j + b), with i the row
    // and j the column, as in the lecture. Each product is kept so it can be read. (Written this way the sum is a correlation; a
    // symmetric kernel gives the same numbers, and flipping the kernel in both directions turns it into convolution proper.)
    public static NeighborhoodResult ConvolvePixel(double[] image, int w, int h, double[] kernel, int size, int i, int j, string border)
    {
        int half = (size - 1) / 2;
        List<double> neighbors = new List<double>();
        List<double> products = new List<double>();
        double value = 0;
        for (int a = -half; a <= half; a++)
        {
            for (int b = -half; b <= half; b++)
            {
                double x = PixelAt(image, w, h, i + a, j + b, border);
                double weight = kernel[(a + half) * size + (b + half)];
                neighbors.Add(x);
                products.Add(weight * x);
                value += weight * x;
            }
        }
        NeighborhoodResult result;
        result.neighbors = neighbors.ToArray(); result.products = products.ToArray(); result.value = value;
        return result;
    }
    #endregion

    #region Convolution of an image
    // The same sum at every pixel. The result may leave [0, 1] (a Sobel response is negative on one side of an edge), so its range
    // is returned for the display to scale.
    public static ConvolveResult Convolve(double[] image, int w, int h, double[] kernel, int size, string border)
    {
        double[] result = Zeros(w * h);
        double low = double.PositiveInfinity;
        double high = double.NegativeInfinity;
        for (int i = 0; i < h; i++)
        {
            for (int j = 0; j < w; j++)
            {
                double value = ConvolvePixel(image, w, h, kernel, size, i, j, border).value;
                result[i * w + j] = value;
                low = Math.Min(low, value);
                high = Math.Max(high, value);
            }
        }
        ConvolveResult output;
        output.image = result; output.low = low; output.high = high;
        return output;
    }
    #endregion

    #region Kernels
    // The kernels of the lecture. Sizes are odd; values run row by row. The Gaussian is the binomial approximation. A kernel that sums
    // to 1 keeps a constant image; Sobel and Laplacian sum to 0 and send a constant image to 0. A kernel is separable when it is a
    // column times a row, and then two passes of size multiply-adds replace one pass of size squared.
    static KernelResult Kernel(int size, double[] values)
    {
        KernelResult result;
        result.size = size; result.values = values;
        return result;
    }

    public static KernelResult MakeKernel(string name)
    {
        if (name == "box3") return Kernel(3, new double[] { 1.0 / 9, 1.0 / 9, 1.0 / 9, 1.0 / 9, 1.0 / 9, 1.0 / 9, 1.0 / 9, 1.0 / 9, 1.0 / 9 });
        if (name == "gauss3") return Kernel(3, new double[] { 1.0 / 16, 2.0 / 16, 1.0 / 16, 2.0 / 16, 4.0 / 16, 2.0 / 16, 1.0 / 16, 2.0 / 16, 1.0 / 16 });
        if (name == "sharpen") return Kernel(3, new double[] { 0, -1, 0, -1, 5, -1, 0, -1, 0 });
        if (name == "sobelX") return Kernel(3, new double[] { -1, 0, 1, -2, 0, 2, -1, 0, 1 });
        if (name == "sobelY") return Kernel(3, new double[] { -1, -2, -1, 0, 0, 0, 1, 2, 1 });
        if (name == "laplacian") return Kernel(3, new double[] { 0, 1, 0, 1, -4, 1, 0, 1, 0 });
        if (name == "gauss5")
        {
            double[] row = { 1, 4, 6, 4, 1 };
            List<double> values = new List<double>();
            for (int a = 0; a < 5; a++)
            {
                for (int b = 0; b < 5; b++) values.Add(row[a] * row[b] / 256);
            }
            return Kernel(5, values.ToArray());
        }
        return Kernel(3, new double[] { 0, 0, 0, 0, 1, 0, 0, 0, 0 });
    }

    public static double KernelSum(double[] values)
    {
        double total = 0;
        for (int k = 0; k < values.Length; k++) total += values[k];
        return total;
    }

    public static SeparateResult Separate(double[] values, int size)
    {
        int pivotRow = 0;
        int pivotColumn = 0;
        for (int k = values.Length - 1; k >= 0; k--)
        {
            if (Math.Abs(values[k]) > 1e-12) { pivotRow = k / size; pivotColumn = k % size; }
        }
        double pivot = values[pivotRow * size + pivotColumn];
        double[] column = Zeros(size);
        double[] row = Zeros(size);
        for (int a = 0; a < size; a++) column[a] = values[a * size + pivotColumn];
        for (int b = 0; b < size; b++) row[b] = values[pivotRow * size + b] / pivot;
        bool separable = Math.Abs(pivot) > 1e-12;
        for (int a = 0; a < size; a++)
        {
            for (int b = 0; b < size; b++)
            {
                if (Math.Abs(values[a * size + b] - column[a] * row[b]) > 1e-9) separable = false;
            }
        }
        SeparateResult result;
        result.separable = separable; result.column = column; result.row = row;
        result.costFull = size * size; result.costSeparable = 2 * size;
        return result;
    }
    #endregion

    #region Median filter
    // Replace a pixel by the median of its neighborhood. It is not linear, so it has no kernel: a lone wrong pixel is outvoted
    // instead of spread over its neighbors, and a step edge stays a step.
    public static MedianResult MedianPixel(double[] image, int w, int h, int size, int i, int j, string border)
    {
        int half = (size - 1) / 2;
        List<double> neighbors = new List<double>();
        for (int a = -half; a <= half; a++)
        {
            for (int b = -half; b <= half; b++) neighbors.Add(PixelAt(image, w, h, i + a, j + b, border));
        }
        double[] sorted = neighbors.ToArray();
        for (int p = 1; p < sorted.Length; p++)
        {
            double held = sorted[p];
            int q = p - 1;
            while (q >= 0 && sorted[q] > held) { sorted[q + 1] = sorted[q]; q--; }
            sorted[q + 1] = held;
        }
        double value = sorted[(sorted.Length - 1) / 2];
        MedianResult result;
        result.neighbors = neighbors.ToArray(); result.sorted = sorted; result.value = value;
        return result;
    }

    public static ImageResult MedianFilter(double[] image, int w, int h, int size, string border)
    {
        double[] result = Zeros(w * h);
        for (int i = 0; i < h; i++)
        {
            for (int j = 0; j < w; j++) result[i * w + j] = MedianPixel(image, w, h, size, i, j, border).value;
        }
        ImageResult output;
        output.image = result;
        return output;
    }
    #endregion

    #region Unsharp mask
    // Add back the detail a blur removes: y = x + k (x - blur(x)). For a blur kernel B this is one kernel, (1 + k) times the
    // identity minus k times B, so the convolution above applies it. Where the edge steepens the result leaves [0, 1]: the halo.
    public static KernelResult UnsharpKernel(double[] blur, int size, double amount)
    {
        double[] values = Zeros(size * size);
        int center = (size * size - 1) / 2;
        for (int k = 0; k < size * size; k++)
        {
            double identity = k == center ? 1 : 0;
            values[k] = identity + amount * (identity - blur[k]);
        }
        return Kernel(size, values);
    }
    #endregion

    #region Frequency response of a kernel
    // Put a cosine of frequency omega (radians per pixel) through a one-dimensional kernel with wrapped borders and the output is the
    // same cosine times H(omega) = sum over a of taps(a) e^(-i a omega): the factor that frequency is multiplied by. A negative H
    // inverts the stripes.
    public static double[] Convolve1d(double[] signal, double[] taps, string border)
    {
        int half = (taps.Length - 1) / 2;
        double[] result = Zeros(signal.Length);
        for (int i = 0; i < signal.Length; i++)
        {
            double sum = 0;
            for (int a = -half; a <= half; a++)
            {
                int at = BorderIndex(i + a, signal.Length, border);
                if (at >= 0) sum += taps[a + half] * signal[at];
            }
            result[i] = sum;
        }
        return result;
    }

    public static (double re, double im, double gain) FrequencyResponse(double[] taps, double omega)
    {
        int half = (taps.Length - 1) / 2;
        double re = 0;
        double im = 0;
        for (int a = -half; a <= half; a++)
        {
            re += taps[a + half] * Math.Cos(a * omega);
            im -= taps[a + half] * Math.Sin(a * omega);
        }
        double gain = Math.Sqrt(re * re + im * im);
        return (re, im, gain);
    }
    #endregion

    #region Discrete Fourier transform
    // The coefficient at horizontal frequency u and vertical frequency v is X(u, v) = sum over x, y of image(x, y) e^(-2 pi i (u x / w
    // + v y / h)), with x the column and y the row. Keep real and imaginary parts in two arrays. The inverse flips the sign and divides
    // by w h. The sum has w h terms per coefficient, w h coefficients: this is the definition, and it is slow.
    static ComplexResult Complex(double[] re, double[] im)
    {
        ComplexResult result;
        result.re = re; result.im = im;
        return result;
    }

    public static ComplexResult Dft2d(double[] re, double[] im, int w, int h, bool inverse)
    {
        double sign = inverse ? 1 : -1;
        double scale = inverse ? 1.0 / (w * h) : 1;
        double[] outRe = Zeros(w * h);
        double[] outIm = Zeros(w * h);
        for (int v = 0; v < h; v++)
        {
            for (int u = 0; u < w; u++)
            {
                double sumRe = 0;
                double sumIm = 0;
                for (int y = 0; y < h; y++)
                {
                    for (int x = 0; x < w; x++)
                    {
                        double angle = sign * 2 * Math.PI * ((double)u * x / w + (double)v * y / h);
                        double c = Math.Cos(angle);
                        double s = Math.Sin(angle);
                        sumRe += re[y * w + x] * c - im[y * w + x] * s;
                        sumIm += re[y * w + x] * s + im[y * w + x] * c;
                    }
                }
                outRe[v * w + u] = sumRe * scale;
                outIm[v * w + u] = sumIm * scale;
            }
        }
        return Complex(outRe, outIm);
    }
    #endregion

    #region Fast Fourier transform
    // Cooley and Tukey (1965): a transform of length n is two of length n / 2 plus n / 2 twiddle multiplications, so n log n instead
    // of n squared. The 2D transform is the 1D transform of every row, then of every column. The length must be a power of two.
    public static ComplexResult Fft1d(double[] re, double[] im, bool inverse)
    {
        int n = re.Length;
        double[] outRe = (double[])re.Clone();
        double[] outIm = (double[])im.Clone();
        int j = 0;
        for (int i = 1; i < n; i++)
        {
            int bit = n >> 1;
            while ((j & bit) != 0) { j ^= bit; bit >>= 1; }
            j ^= bit;
            if (i < j)
            {
                double tr = outRe[i]; outRe[i] = outRe[j]; outRe[j] = tr;
                double ti = outIm[i]; outIm[i] = outIm[j]; outIm[j] = ti;
            }
        }
        for (int length = 2; length <= n; length *= 2)
        {
            double step = (inverse ? 2 : -2) * Math.PI / length;
            for (int start = 0; start < n; start += length)
            {
                for (int k = 0; k < length / 2; k++)
                {
                    double c = Math.Cos(step * k);
                    double s = Math.Sin(step * k);
                    int p = start + k;
                    int q = p + length / 2;
                    double tr = outRe[q] * c - outIm[q] * s;
                    double ti = outRe[q] * s + outIm[q] * c;
                    outRe[q] = outRe[p] - tr;
                    outIm[q] = outIm[p] - ti;
                    outRe[p] += tr;
                    outIm[p] += ti;
                }
            }
        }
        if (inverse)
        {
            for (int i = 0; i < n; i++) { outRe[i] /= n; outIm[i] /= n; }
        }
        return Complex(outRe, outIm);
    }

    public static ComplexResult Fft2d(double[] re, double[] im, int w, int h, bool inverse)
    {
        double[] rowsRe = (double[])re.Clone();
        double[] rowsIm = (double[])im.Clone();
        for (int y = 0; y < h; y++)
        {
            ComplexResult row = Fft1d(Slice(rowsRe, y * w, (y + 1) * w), Slice(rowsIm, y * w, (y + 1) * w), inverse);
            for (int x = 0; x < w; x++) { rowsRe[y * w + x] = row.re[x]; rowsIm[y * w + x] = row.im[x]; }
        }
        for (int x = 0; x < w; x++)
        {
            double[] columnRe = Zeros(h);
            double[] columnIm = Zeros(h);
            for (int y = 0; y < h; y++) { columnRe[y] = rowsRe[y * w + x]; columnIm[y] = rowsIm[y * w + x]; }
            ComplexResult column = Fft1d(columnRe, columnIm, inverse);
            for (int y = 0; y < h; y++) { rowsRe[y * w + x] = column.re[y]; rowsIm[y * w + x] = column.im[y]; }
        }
        return Complex(rowsRe, rowsIm);
    }
    #endregion

    #region Spectrum and frequency masks
    // Parseval: the picture's energy, the sum of its squares, equals the spectrum's energy divided by w h. The display puts zero
    // frequency in the middle and shows log(1 + |X|), since the mean dwarfs everything else. A mask scales each coefficient by a
    // number that depends on its distance from zero frequency (a frequency u above w / 2 counts as w - u: the grid folds it back).
    public static double ImageEnergy(double[] image)
    {
        double total = 0;
        for (int k = 0; k < image.Length; k++) total += image[k] * image[k];
        return total;
    }

    public static double SpectralEnergy(double[] re, double[] im, int w, int h)
    {
        double total = 0;
        for (int k = 0; k < re.Length; k++) total += re[k] * re[k] + im[k] * im[k];
        return total / (w * h);
    }

    public static SpectrumResult LogSpectrum(double[] re, double[] im, int w, int h)
    {
        double[] shown = Zeros(w * h);
        double peak = 0;
        for (int k = 0; k < re.Length; k++) peak = Math.Max(peak, Math.Log(1 + Math.Sqrt(re[k] * re[k] + im[k] * im[k])));
        for (int y = 0; y < h; y++)
        {
            for (int x = 0; x < w; x++)
            {
                int k = ((y + h / 2) % h) * w + ((x + w / 2) % w);
                shown[y * w + x] = peak > 0 ? Math.Log(1 + Math.Sqrt(re[k] * re[k] + im[k] * im[k])) / peak : 0;
            }
        }
        SpectrumResult result;
        result.shown = shown; result.peak = peak;
        return result;
    }

    public static double[] RadialMask(int w, int h, double radius, string kind)
    {
        double[] mask = Zeros(w * h);
        double width = Math.Max(radius, 0.01);
        for (int v = 0; v < h; v++)
        {
            for (int u = 0; u < w; u++)
            {
                int du = Math.Min(u, w - u);
                int dv = Math.Min(v, h - v);
                double distance = Math.Sqrt(du * du + dv * dv);
                double low = distance <= radius ? 1 : 0;
                double soft = Math.Exp(-distance * distance / (2 * width * width));
                double value = low;
                if (kind == "high") value = 1 - low;
                if (kind == "gaussian-low") value = soft;
                if (kind == "gaussian-high") value = 1 - soft;
                mask[v * w + u] = value;
            }
        }
        return mask;
    }

    public static MaskResult FilterByMask(double[] image, int w, int h, double[] mask)
    {
        double[] zeros = Zeros(w * h);
        ComplexResult spectrum = Fft2d(image, zeros, w, h, false);
        double[] keptRe = Zeros(w * h);
        double[] keptIm = Zeros(w * h);
        for (int k = 0; k < w * h; k++)
        {
            keptRe[k] = spectrum.re[k] * mask[k];
            keptIm[k] = spectrum.im[k] * mask[k];
        }
        ComplexResult back = Fft2d(keptRe, keptIm, w, h, true);
        double energyBefore = SpectralEnergy(spectrum.re, spectrum.im, w, h);
        double energyKept = SpectralEnergy(keptRe, keptIm, w, h);
        double imaginary = 0;
        for (int k = 0; k < w * h; k++) imaginary = Math.Max(imaginary, Math.Abs(back.im[k]));
        MaskResult result;
        result.spectrumRe = spectrum.re; result.spectrumIm = spectrum.im; result.keptRe = keptRe; result.keptIm = keptIm;
        result.filtered = back.re; result.imaginary = imaginary; result.energyBefore = energyBefore; result.energyKept = energyKept;
        return result;
    }
    #endregion

    #region One frequency
    // A stripe pattern of u periods across and v down is 1/2 + 1/2 cos(2 pi (u x / w + v y / h)). Its spectrum is three dots: the
    // mean at zero frequency and the pair (u, v) and (w - u, h - v), one at each side of the center. A frequency above w / 2 lands
    // on the same pixels as w - u: the stripes alias.
    public static double[] FrequencyImage(int w, int h, int u, int v, double phase)
    {
        double[] image = Zeros(w * h);
        for (int y = 0; y < h; y++)
        {
            for (int x = 0; x < w; x++) image[y * w + x] = 0.5 + 0.5 * Math.Cos(2 * Math.PI * ((double)u * x / w + (double)v * y / h) + phase);
        }
        return image;
    }

    public static FrequencyResult OneFrequency(int w, int h, int u, int v)
    {
        double[] image = FrequencyImage(w, h, u, v, 0);
        double[] zeros = Zeros(w * h);
        ComplexResult spectrum = Fft2d(image, zeros, w, h, false);
        List<int> us = new List<int>();
        List<int> vs = new List<int>();
        List<double> magnitudes = new List<double>();
        for (int k = 0; k < w * h; k++)
        {
            double magnitude = Math.Sqrt(spectrum.re[k] * spectrum.re[k] + spectrum.im[k] * spectrum.im[k]);
            if (magnitude > 1e-6) { us.Add(k % w); vs.Add(k / w); magnitudes.Add(magnitude); }
        }
        int mirrorU = (w - u % w) % w;
        int mirrorV = (h - v % h) % h;
        int folded = Math.Min(u % w, w - u % w);
        FrequencyResult result;
        result.image = image; result.re = spectrum.re; result.im = spectrum.im; result.us = us.ToArray(); result.vs = vs.ToArray();
        result.magnitudes = magnitudes.ToArray(); result.mirrorU = mirrorU; result.mirrorV = mirrorV; result.folded = folded;
        return result;
    }
    #endregion

    #region Convolution theorem
    // Convolution in space is multiplication in frequency: F{K * x} = F{K} F{x}. Put the kernel in an image-sized array, flipped in both
    // directions so the sum above becomes a true convolution, with its center at the corner (wrapped); transform it; multiply by the
    // image's transform; transform back. The answer equals convolve with wrapped borders. For a large kernel this costs n log n.
    public static TheoremResult ConvolveByFrequency(double[] image, int w, int h, double[] kernel, int size)
    {
        int half = (size - 1) / 2;
        double[] padded = Zeros(w * h);
        for (int a = -half; a <= half; a++)
        {
            for (int b = -half; b <= half; b++)
            {
                int y = ((-a) % h + h) % h;
                int x = ((-b) % w + w) % w;
                padded[y * w + x] += kernel[(a + half) * size + (b + half)];
            }
        }
        double[] zeros = Zeros(w * h);
        ComplexResult kernelSpectrum = Fft2d(padded, zeros, w, h, false);
        ComplexResult imageSpectrum = Fft2d(image, zeros, w, h, false);
        double[] productRe = Zeros(w * h);
        double[] productIm = Zeros(w * h);
        for (int k = 0; k < w * h; k++)
        {
            productRe[k] = kernelSpectrum.re[k] * imageSpectrum.re[k] - kernelSpectrum.im[k] * imageSpectrum.im[k];
            productIm[k] = kernelSpectrum.re[k] * imageSpectrum.im[k] + kernelSpectrum.im[k] * imageSpectrum.re[k];
        }
        ComplexResult back = Fft2d(productRe, productIm, w, h, true);
        TheoremResult result;
        result.kernelRe = kernelSpectrum.re; result.kernelIm = kernelSpectrum.im;
        result.productRe = productRe; result.productIm = productIm; result.image = back.re;
        return result;
    }
    #endregion

    #region Cosine transform
    // The orthonormal discrete cosine transform: row k of the matrix is sqrt(2 / n) cos((2 t + 1) k pi / 2 n) (sqrt(1 / n) for
    // k = 0). An orthonormal transform is a rotation of coordinates: it keeps the sum of squares and loses nothing. The 2D basis
    // image for horizontal frequency u and vertical v is the product of two rows; a block is a weighted sum of the n squared of them.
    public static double[] DctMatrix(int n)
    {
        double[] matrix = Zeros(n * n);
        for (int k = 0; k < n; k++)
        {
            double scale = k == 0 ? Math.Sqrt(1.0 / n) : Math.Sqrt(2.0 / n);
            for (int t = 0; t < n; t++) matrix[k * n + t] = scale * Math.Cos((2 * t + 1) * k * Math.PI / (2 * n));
        }
        return matrix;
    }

    public static double[] Dct1d(double[] signal)
    {
        int n = signal.Length;
        double[] matrix = DctMatrix(n);
        double[] coefficients = Zeros(n);
        for (int k = 0; k < n; k++)
        {
            for (int t = 0; t < n; t++) coefficients[k] += matrix[k * n + t] * signal[t];
        }
        return coefficients;
    }

    public static double[] DctBasis(int u, int v, int n)
    {
        double[] matrix = DctMatrix(n);
        double[] image = Zeros(n * n);
        for (int y = 0; y < n; y++)
        {
            for (int x = 0; x < n; x++) image[y * n + x] = matrix[u * n + x] * matrix[v * n + y];
        }
        return image;
    }

    public static IdctResult Idct2d(double[] coefficients, int n)
    {
        double[] matrix = DctMatrix(n);
        double[] columns = Zeros(n * n);
        double[] block = Zeros(n * n);
        for (int v = 0; v < n; v++)
        {
            for (int x = 0; x < n; x++)
            {
                for (int u = 0; u < n; u++) columns[v * n + x] += matrix[u * n + x] * coefficients[v * n + u];
            }
        }
        for (int y = 0; y < n; y++)
        {
            for (int x = 0; x < n; x++)
            {
                for (int v = 0; v < n; v++) block[y * n + x] += matrix[v * n + y] * columns[v * n + x];
            }
        }
        IdctResult result;
        result.columns = columns; result.block = block;
        return result;
    }

    public static DctResult Dct2d(double[] block, int n)
    {
        double[] matrix = DctMatrix(n);
        double[] rows = Zeros(n * n);
        double[] coefficients = Zeros(n * n);
        for (int y = 0; y < n; y++)
        {
            for (int u = 0; u < n; u++)
            {
                for (int x = 0; x < n; x++) rows[y * n + u] += matrix[u * n + x] * block[y * n + x];
            }
        }
        for (int v = 0; v < n; v++)
        {
            for (int u = 0; u < n; u++)
            {
                for (int y = 0; y < n; y++) coefficients[v * n + u] += matrix[v * n + y] * rows[y * n + u];
            }
        }
        DctResult result;
        result.rows = rows; result.coefficients = coefficients;
        return result;
    }

    public static KeptResult LowestFrequencies(double[] coefficients, int n, int keep)
    {
        double[] kept = Zeros(n * n);
        for (int v = 0; v < keep && v < n; v++)
        {
            for (int u = 0; u < keep && u < n; u++) kept[v * n + u] = coefficients[v * n + u];
        }
        double[] rebuilt = Idct2d(kept, n).block;
        KeptResult result;
        result.kept = kept; result.rebuilt = rebuilt;
        return result;
    }
    #endregion

    #region Quantization tables
    // The standard luminance and chrominance tables of the JPEG standard (ITU-T T.81, Annex K), for quality 50. Rows are vertical
    // frequency, columns horizontal; the entries grow toward the high frequencies, where the eye is least sensitive.
    public static readonly double[] LumaTable =
    {
        16, 11, 10, 16, 24, 40, 51, 61,
        12, 12, 14, 19, 26, 58, 60, 55,
        14, 13, 16, 24, 40, 57, 69, 56,
        14, 17, 22, 29, 51, 87, 80, 62,
        18, 22, 37, 56, 68, 109, 103, 77,
        24, 35, 55, 64, 81, 104, 113, 92,
        49, 64, 78, 87, 103, 121, 120, 101,
        72, 92, 95, 98, 112, 100, 103, 99,
    };

    public static readonly double[] ChromaTable =
    {
        17, 18, 24, 47, 99, 99, 99, 99,
        18, 21, 26, 66, 99, 99, 99, 99,
        24, 26, 56, 99, 99, 99, 99, 99,
        47, 66, 99, 99, 99, 99, 99, 99,
        99, 99, 99, 99, 99, 99, 99, 99,
        99, 99, 99, 99, 99, 99, 99, 99,
        99, 99, 99, 99, 99, 99, 99, 99,
        99, 99, 99, 99, 99, 99, 99, 99,
    };
    #endregion

    #region Quantization
    // The quality setting scales the table: percent = 5000 / quality below 50 and 200 - 2 quality from 50 up (the Independent JPEG
    // Group's rule), and each entry becomes floor((entry percent + 50) / 100), at least 1. Dividing a coefficient by its entry and
    // rounding is the only lossy step of JPEG. Rounding errs by at most half an entry, so the error of a coefficient is at most
    // entry / 2.
    public static double RoundHalfAway(double x)
    {
        return x < 0 ? -Math.Floor(-x + 0.5) : Math.Floor(x + 0.5);
    }

    public static double QualityScale(double quality)
    {
        double q = Math.Min(Math.Max(quality, 1), 100);
        return q < 50 ? 5000 / q : 200 - 2 * q;
    }

    public static ScaledResult ScaledTable(double[] table, double quality)
    {
        double scale = QualityScale(quality);
        double[] scaled = Zeros(table.Length);
        for (int k = 0; k < table.Length; k++) scaled[k] = Math.Min(255, Math.Max(1, Math.Floor((table[k] * scale + 50) / 100)));
        ScaledResult result;
        result.scale = scale; result.table = scaled;
        return result;
    }

    public static QuantizeResult Quantize(double[] coefficients, double[] table)
    {
        double[] levels = Zeros(coefficients.Length);
        double[] dequantized = Zeros(coefficients.Length);
        double[] errors = Zeros(coefficients.Length);
        int nonzero = 0;
        for (int k = 0; k < coefficients.Length; k++)
        {
            levels[k] = RoundHalfAway(coefficients[k] / table[k]);
            dequantized[k] = levels[k] * table[k];
            errors[k] = coefficients[k] - dequantized[k];
            if (levels[k] != 0) nonzero++;
        }
        QuantizeResult result;
        result.levels = levels; result.dequantized = dequantized; result.errors = errors; result.nonzero = nonzero;
        return result;
    }
    #endregion

    #region Zigzag and run lengths
    // Read the 64 integers along the anti-diagonals, low frequencies first, so the zeros collect at the end. The first is the DC
    // coefficient, stored as a difference from the previous block. The other 63 are stored as pairs (run of zeros before it, value);
    // sixteen zeros in a row take the symbol (15, 0), and trailing zeros take one end-of-block mark.
    public static int[] ZigzagOrder()
    {
        List<int> order = new List<int>();
        for (int s = 0; s < 15; s++)
        {
            int first = Math.Max(0, s - 7);
            int last = Math.Min(s, 7);
            if (s % 2 == 1)
            {
                for (int row = first; row <= last; row++) order.Add(row * 8 + (s - row));
            }
            else
            {
                for (int row = last; row >= first; row--) order.Add(row * 8 + (s - row));
            }
        }
        return order.ToArray();
    }

    public static RunResult RunLengths(double[] levels)
    {
        int[] order = ZigzagOrder();
        double[] sequence = Zeros(64);
        for (int k = 0; k < 64; k++) sequence[k] = levels[order[k]];
        List<int> runs = new List<int>();
        List<double> values = new List<double>();
        int run = 0;
        for (int k = 1; k < 64; k++)
        {
            if (sequence[k] == 0) { run++; continue; }
            while (run > 15) { runs.Add(15); values.Add(0); run -= 16; }
            runs.Add(run);
            values.Add(sequence[k]);
            run = 0;
        }
        bool endOfBlock = run > 0;
        RunResult result;
        result.sequence = sequence; result.dc = sequence[0]; result.runs = runs.ToArray(); result.values = values.ToArray();
        result.endOfBlock = endOfBlock;
        return result;
    }
    #endregion

    #region One JPEG block
    // Subtract 128, transform, divide by the scaled table and round; to decode, multiply back, invert the transform, add 128 and
    // round to a gray level. The pixels are 0 to 255, row by row. The error per pixel is what the rounding of the coefficients left.
    public static BlockResult JpegBlock(double[] pixels, double quality, double[] table)
    {
        double[] shifted = Zeros(64);
        for (int k = 0; k < 64; k++) shifted[k] = pixels[k] - 128;
        double[] coefficients = Dct2d(shifted, 8).coefficients;
        ScaledResult scaled = ScaledTable(table, quality);
        QuantizeResult quantized = Quantize(coefficients, scaled.table);
        double[] restored = Idct2d(quantized.dequantized, 8).block;
        double[] reconstructed = Zeros(64);
        double[] difference = Zeros(64);
        double squares = 0;
        double maxError = 0;
        for (int k = 0; k < 64; k++)
        {
            reconstructed[k] = Math.Min(255, Math.Max(0, RoundHalfAway(restored[k] + 128)));
            difference[k] = pixels[k] - reconstructed[k];
            squares += difference[k] * difference[k];
            maxError = Math.Max(maxError, Math.Abs(difference[k]));
        }
        double rms = Math.Sqrt(squares / 64);
        BlockResult result;
        result.shifted = shifted; result.coefficients = coefficients; result.scale = scaled.scale; result.table = scaled.table;
        result.levels = quantized.levels; result.dequantized = quantized.dequantized; result.nonzero = quantized.nonzero;
        result.reconstructed = reconstructed; result.difference = difference; result.rms = rms; result.maxError = maxError;
        return result;
    }
    #endregion

    #region Chroma subsampling
    // JPEG converts RGB to Y (brightness) and Cb, Cr (blue and red differences), then keeps the two color planes at half resolution
    // in each direction (4:2:0): per 2 by 2 pixels, 4 Y + 1 Cb + 1 Cr = 6 numbers instead of 12, before any cosine transform. The
    // eye resolves brightness detail better than color detail. The planes are 0 to 255.
    public static (double y, double cb, double cr) RgbToYcc(double r, double g, double b)
    {
        double y = 0.299 * r + 0.587 * g + 0.114 * b;
        double cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        double cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
        return (y, cb, cr);
    }

    public static (double r, double g, double b) YccToRgb(double y, double cb, double cr)
    {
        double r = y + 1.402 * (cr - 128);
        double g = y - 0.344136 * (cb - 128) - 0.714136 * (cr - 128);
        double b = y + 1.772 * (cb - 128);
        return (r, g, b);
    }

    public static double[] HalvePlane(double[] plane, int w, int h)
    {
        double[] half = Zeros((w / 2) * (h / 2));
        for (int y = 0; y < h / 2; y++)
        {
            for (int x = 0; x < w / 2; x++)
            {
                half[y * (w / 2) + x] = (plane[2 * y * w + 2 * x] + plane[2 * y * w + 2 * x + 1] + plane[(2 * y + 1) * w + 2 * x] + plane[(2 * y + 1) * w + 2 * x + 1]) / 4;
            }
        }
        return half;
    }

    public static double[] RepeatPlane(double[] plane, int w, int h)
    {
        double[] full = Zeros(4 * w * h);
        for (int y = 0; y < 2 * h; y++)
        {
            for (int x = 0; x < 2 * w; x++) full[y * 2 * w + x] = plane[(y / 2) * w + (x / 2)];
        }
        return full;
    }

    public static ChromaResult ChromaSubsample(double[] r, double[] g, double[] b, int w, int h)
    {
        double[] luma = Zeros(w * h);
        double[] blue = Zeros(w * h);
        double[] red = Zeros(w * h);
        for (int k = 0; k < w * h; k++)
        {
            var c = RgbToYcc(r[k], g[k], b[k]);
            luma[k] = c.y; blue[k] = c.cb; red[k] = c.cr;
        }
        double[] blueHalf = HalvePlane(blue, w, h);
        double[] redHalf = HalvePlane(red, w, h);
        double[] blueFull = RepeatPlane(blueHalf, w / 2, h / 2);
        double[] redFull = RepeatPlane(redHalf, w / 2, h / 2);
        double[] outR = Zeros(w * h);
        double[] outG = Zeros(w * h);
        double[] outB = Zeros(w * h);
        for (int k = 0; k < w * h; k++)
        {
            var c = YccToRgb(luma[k], blueFull[k], redFull[k]);
            outR[k] = Math.Min(255, Math.Max(0, c.r));
            outG[k] = Math.Min(255, Math.Max(0, c.g));
            outB[k] = Math.Min(255, Math.Max(0, c.b));
        }
        int numbersBefore = 3 * w * h;
        int numbersAfter = w * h + 2 * (w / 2) * (h / 2);
        ChromaResult result;
        result.r = outR; result.g = outG; result.b = outB; result.luma = luma; result.blueHalf = blueHalf; result.redHalf = redHalf;
        result.numbersBefore = numbersBefore; result.numbersAfter = numbersAfter;
        return result;
    }
    #endregion

    #region Size of a JPEG image
    // Cut a plane into 8 by 8 blocks and code each as above. The size is an estimate: the first-order entropy of the symbols (the
    // category of each DC difference; the run and the category of each AC pair, with end-of-block and the 16-zero symbol) plus the
    // bits of each value's magnitude. A real file spends a little more (Huffman tables, headers). Pixels are 0 to 255.
    public static int BitLength(double value)
    {
        double magnitude = Math.Abs(value);
        int bits = 0;
        while (magnitude >= 1) { bits++; magnitude = Math.Floor(magnitude / 2); }
        return bits;
    }

    public static double EntropyBits(double[] counts)
    {
        double total = 0;
        for (int k = 0; k < counts.Length; k++) total += counts[k];
        double bits = 0;
        for (int k = 0; k < counts.Length; k++)
        {
            if (counts[k] > 0) bits -= counts[k] * Math.Log(counts[k] / total) / Math.Log(2);
        }
        return bits;
    }

    public static PlaneResult CodePlane(double[] plane, int w, int h, double quality, double[] table)
    {
        double[] scaled = ScaledTable(table, quality).table;
        double[] decoded = Zeros(w * h);
        double[] dcCounts = Zeros(12);
        double[] acCounts = Zeros(256);
        double extraBits = 0;
        int nonzero = 0;
        double previousDc = 0;
        for (int by = 0; by < h; by += 8)
        {
            for (int bx = 0; bx < w; bx += 8)
            {
                double[] block = Zeros(64);
                for (int y = 0; y < 8; y++)
                {
                    for (int x = 0; x < 8; x++) block[y * 8 + x] = plane[(by + y) * w + bx + x] - 128;
                }
                QuantizeResult quantized = Quantize(Dct2d(block, 8).coefficients, scaled);
                double[] restored = Idct2d(quantized.dequantized, 8).block;
                for (int y = 0; y < 8; y++)
                {
                    for (int x = 0; x < 8; x++) decoded[(by + y) * w + bx + x] = Math.Min(255, Math.Max(0, restored[y * 8 + x] + 128));
                }
                nonzero += quantized.nonzero;
                RunResult runs = RunLengths(quantized.levels);
                int category = BitLength(runs.dc - previousDc);
                dcCounts[category]++;
                extraBits += category;
                previousDc = runs.dc;
                for (int p = 0; p < runs.runs.Length; p++)
                {
                    int size = BitLength(runs.values[p]);
                    acCounts[runs.runs[p] * 16 + size]++;
                    extraBits += size;
                }
                if (runs.endOfBlock) acCounts[0]++;
            }
        }
        int blocks = (w / 8) * (h / 8);
        double bits = EntropyBits(dcCounts) + EntropyBits(acCounts) + extraBits;
        PlaneResult result;
        result.decoded = decoded; result.blocks = blocks; result.nonzero = nonzero; result.nonzeroPerBlock = (double)nonzero / blocks;
        result.bits = bits;
        return result;
    }

    public static ColorResult JpegColor(double[] r, double[] g, double[] b, int w, int h, double quality, bool subsample)
    {
        double[] luma = Zeros(w * h);
        double[] blue = Zeros(w * h);
        double[] red = Zeros(w * h);
        for (int k = 0; k < w * h; k++)
        {
            var c = RgbToYcc(r[k], g[k], b[k]);
            luma[k] = c.y; blue[k] = c.cb; red[k] = c.cr;
        }
        PlaneResult codedY = CodePlane(luma, w, h, quality, LumaTable);
        PlaneResult codedBlue;
        PlaneResult codedRed;
        double[] blueFull;
        double[] redFull;
        if (subsample)
        {
            codedBlue = CodePlane(HalvePlane(blue, w, h), w / 2, h / 2, quality, ChromaTable);
            codedRed = CodePlane(HalvePlane(red, w, h), w / 2, h / 2, quality, ChromaTable);
            blueFull = RepeatPlane(codedBlue.decoded, w / 2, h / 2);
            redFull = RepeatPlane(codedRed.decoded, w / 2, h / 2);
        }
        else
        {
            codedBlue = CodePlane(blue, w, h, quality, ChromaTable);
            codedRed = CodePlane(red, w, h, quality, ChromaTable);
            blueFull = codedBlue.decoded;
            redFull = codedRed.decoded;
        }
        double[] outR = Zeros(w * h);
        double[] outG = Zeros(w * h);
        double[] outB = Zeros(w * h);
        double squares = 0;
        for (int k = 0; k < w * h; k++)
        {
            var c = YccToRgb(codedY.decoded[k], blueFull[k], redFull[k]);
            outR[k] = Math.Min(255, Math.Max(0, c.r));
            outG[k] = Math.Min(255, Math.Max(0, c.g));
            outB[k] = Math.Min(255, Math.Max(0, c.b));
            squares += (outR[k] - r[k]) * (outR[k] - r[k]) + (outG[k] - g[k]) * (outG[k] - g[k]) + (outB[k] - b[k]) * (outB[k] - b[k]);
        }
        double bits = codedY.bits + codedBlue.bits + codedRed.bits;
        double bitsPerPixel = bits / (w * h);
        double psnr = 10 * Math.Log(255 * 255 / Math.Max(squares / (3 * w * h), 1e-10)) / Math.Log(10);
        ColorResult result;
        result.r = outR; result.g = outG; result.b = outB; result.bits = bits; result.bitsPerPixel = bitsPerPixel;
        result.ratio = 24 / bitsPerPixel; result.psnr = psnr;
        return result;
    }
    #endregion

    #region Image pyramids
    // The Gaussian pyramid blurs and drops every other row and column, level after level: G(k + 1) = reduce(G(k)). The Laplacian
    // pyramid keeps what each coarser level lost: L(k) = G(k) - expand(G(k + 1)), and the coarsest Gaussian level. Working back up,
    // G(k) = L(k) + expand(G(k + 1)) rebuilds the image exactly, whatever reduce and expand are, since L(k) is defined as the
    // difference. Burt and Adelson (1983). Reduce methods: drop, average (2 by 2), blur (3 by 3 binomial, then drop). Expand methods:
    // repeat, bilinear.
    static SizedImage Sized(double[] image, int w, int h)
    {
        SizedImage result;
        result.image = image; result.w = w; result.h = h;
        return result;
    }

    public static SizedImage ReduceImage(double[] image, int w, int h, string method)
    {
        int w2 = w / 2;
        int h2 = h / 2;
        double[] source = image;
        if (method == "blur") source = Convolve(image, w, h, MakeKernel("gauss3").values, 3, "clamp").image;
        double[] result = Zeros(w2 * h2);
        for (int y = 0; y < h2; y++)
        {
            for (int x = 0; x < w2; x++)
            {
                if (method == "average")
                {
                    result[y * w2 + x] = (image[2 * y * w + 2 * x] + image[2 * y * w + 2 * x + 1] + image[(2 * y + 1) * w + 2 * x] + image[(2 * y + 1) * w + 2 * x + 1]) / 4;
                }
                else
                {
                    result[y * w2 + x] = source[2 * y * w + 2 * x];
                }
            }
        }
        return Sized(result, w2, h2);
    }

    public static SizedImage ExpandImage(double[] image, int w, int h, string method)
    {
        int w2 = 2 * w;
        int h2 = 2 * h;
        double[] result = Zeros(w2 * h2);
        for (int y = 0; y < h2; y++)
        {
            for (int x = 0; x < w2; x++)
            {
                if (method == "repeat")
                {
                    result[y * w2 + x] = image[(y / 2) * w + (x / 2)];
                }
                else
                {
                    double fx = Math.Min(w - 1, x / 2.0);
                    double fy = Math.Min(h - 1, y / 2.0);
                    int x0 = (int)Math.Floor(fx);
                    int y0 = (int)Math.Floor(fy);
                    int x1 = Math.Min(w - 1, x0 + 1);
                    int y1 = Math.Min(h - 1, y0 + 1);
                    double tx = fx - x0;
                    double ty = fy - y0;
                    result[y * w2 + x] = (1 - ty) * ((1 - tx) * image[y0 * w + x0] + tx * image[y0 * w + x1])
                        + ty * ((1 - tx) * image[y1 * w + x0] + tx * image[y1 * w + x1]);
                }
            }
        }
        return Sized(result, w2, h2);
    }

    public static double PyramidPixels(int n, int levels)
    {
        double total = 0;
        for (int k = 0; k < levels; k++) total += (n / Math.Pow(2, k)) * (n / Math.Pow(2, k));
        return total;
    }

    public static PyramidResult GaussianPyramid(double[] image, int n, int levels, string method)
    {
        List<double[]> images = new List<double[]>();
        images.Add(image);
        int size = n;
        for (int k = 1; k < levels; k++)
        {
            images.Add(ReduceImage(images[k - 1], size, size, method).image);
            size = size / 2;
        }
        PyramidResult result;
        result.images = images.ToArray(); result.pixels = PyramidPixels(n, levels);
        return result;
    }

    public static LaplacianResult LaplacianPyramid(double[] image, int n, int levels, string reduceMethod, string expandMethod)
    {
        double[][] gaussian = GaussianPyramid(image, n, levels, reduceMethod).images;
        List<double[]> bands = new List<double[]>();
        int size = n;
        for (int k = 0; k < levels - 1; k++)
        {
            double[] up = ExpandImage(gaussian[k + 1], size / 2, size / 2, expandMethod).image;
            double[] band = Zeros(size * size);
            for (int p = 0; p < size * size; p++) band[p] = gaussian[k][p] - up[p];
            bands.Add(band);
            size = size / 2;
        }
        double[] top = gaussian[levels - 1];
        LaplacianResult result;
        result.gaussian = gaussian; result.bands = bands.ToArray(); result.top = top;
        return result;
    }

    public static CollapseResult CollapsePyramid(double[][] bands, double[] top, int n, string expandMethod)
    {
        int size = (int)(n / Math.Pow(2, bands.Length));
        double[] image = top;
        List<double[]> steps = new List<double[]>();
        for (int k = bands.Length - 1; k >= 0; k--)
        {
            double[] up = ExpandImage(image, size, size, expandMethod).image;
            size = size * 2;
            image = Zeros(size * size);
            for (int p = 0; p < size * size; p++) image[p] = bands[k][p] + up[p];
            steps.Add(image);
        }
        CollapseResult result;
        result.image = image; result.steps = steps.ToArray();
        return result;
    }
    #endregion

    #region Histogram
    // Count pixels by value: nothing about content, a great deal about exposure. The bin of a value v in [0, 1] is floor(v bins),
    // the last bin closed. The cumulative distribution C at a bin is the fraction of pixels in that bin or below.
    public static HistogramResult Histogram(double[] image, int bins)
    {
        double[] counts = Zeros(bins);
        double sum = 0;
        for (int k = 0; k < image.Length; k++)
        {
            counts[Math.Min(bins - 1, (int)Math.Floor(image[k] * bins))]++;
            sum += image[k];
        }
        double[] fractions = Zeros(bins);
        double[] cumulative = Zeros(bins);
        double running = 0;
        for (int b = 0; b < bins; b++)
        {
            fractions[b] = counts[b] / image.Length;
            running += counts[b];
            cumulative[b] = running / image.Length;
        }
        HistogramResult result;
        result.counts = counts; result.fractions = fractions; result.cumulative = cumulative; result.mean = sum / image.Length;
        return result;
    }
    #endregion

    #region Equalization
    // Map each value v to C(v), the fraction of pixels at or below v. The map is monotone, so brighter stays brighter, and it makes
    // the histogram as flat as the data allow. It maps values, not pixels: pixels that share a value share a result.
    public static EqualizeResult Equalize(double[] image, int bins)
    {
        HistogramResult before = Histogram(image, bins);
        double[] mapped = Zeros(image.Length);
        double sum = 0;
        for (int k = 0; k < image.Length; k++)
        {
            mapped[k] = before.cumulative[Math.Min(bins - 1, (int)Math.Floor(image[k] * bins))];
            sum += mapped[k];
        }
        EqualizeResult result;
        result.mapped = mapped; result.cumulative = before.cumulative; result.meanBefore = before.mean; result.meanAfter = sum / image.Length;
        return result;
    }
    #endregion

    #region Stretch and gamma
    // Two simpler tone curves. A linear stretch sends [low, high] to [0, 1] and clips what lies outside; a power curve v^gamma
    // bends every value without clipping (gamma below 1 lifts the shadows, above 1 deepens them). Both are monotone.
    public static double StretchValue(double v, double low, double high)
    {
        return Math.Min(1, Math.Max(0, (v - low) / (high - low)));
    }

    public static double GammaValue(double v, double gamma)
    {
        return Math.Pow(Math.Min(1, Math.Max(0, v)), gamma);
    }
    #endregion

    #region Linear light
    // A stored pixel is an sRGB code, not light. decode gives the light a code emits; encode is its inverse. To blend or blur,
    // decode first, operate, encode for display. Averaging codes instead of light darkens every edge between bright and dark.
    public static double SrgbDecode(double code)
    {
        return code <= 0.04045 ? code / 12.92 : Math.Pow((code + 0.055) / 1.055, 2.4);
    }

    public static double SrgbEncode(double light)
    {
        return light <= 0.0031308 ? 12.92 * light : 1.055 * Math.Pow(light, 1 / 2.4) - 0.055;
    }

    public static (double codeMix, double lightOfCodeMix, double lightMix, double codeOfLightMix) BlendCodes(double a, double b, double t)
    {
        double codeMix = (1 - t) * a + t * b;
        double lightOfCodeMix = SrgbDecode(codeMix);
        double lightMix = (1 - t) * SrgbDecode(a) + t * SrgbDecode(b);
        double codeOfLightMix = SrgbEncode(lightMix);
        return (codeMix, lightOfCodeMix, lightMix, codeOfLightMix);
    }

    public static LightResult ConvolveInLight(double[] image, int w, int h, double[] kernel, int size, string border)
    {
        double[] light = Zeros(w * h);
        for (int k = 0; k < w * h; k++) light[k] = SrgbDecode(image[k]);
        double[] blurred = Convolve(light, w, h, kernel, size, border).image;
        double[] result = Zeros(w * h);
        for (int k = 0; k < w * h; k++) result[k] = SrgbEncode(Math.Min(1, Math.Max(0, blurred[k])));
        LightResult output;
        output.light = light; output.image = result;
        return output;
    }
    #endregion

    #region Comparing two images
    // Mean squared error, PSNR = 10 log10(peak squared / MSE), and SSIM (Wang, Bovik, Sheikh and Simoncelli, 2004) on a patch:
    // (2 mean_p mean_q + C1)(2 cov + C2) / ((mean_p^2 + mean_q^2 + C1)(var_p + var_q + C2)), with C1 = (0.01)^2, C2 = (0.03)^2 for
    // values in [0, 1] and population variances.
    public static double MeanSquaredError(double[] a, double[] b)
    {
        double total = 0;
        for (int k = 0; k < a.Length; k++) total += (a[k] - b[k]) * (a[k] - b[k]);
        return total / a.Length;
    }

    public static double PsnrOf(double[] a, double[] b, double peak)
    {
        double mse = MeanSquaredError(a, b);
        return Math.Min(200, 10 * Math.Log(peak * peak / Math.Max(mse, 1e-20)) / Math.Log(10));
    }

    public static SsimResult SsimPatches(double[] p, double[] q, double c1, double c2)
    {
        int n = p.Length;
        double meanP = 0;
        double meanQ = 0;
        for (int k = 0; k < n; k++) { meanP += p[k] / n; meanQ += q[k] / n; }
        double varianceP = 0;
        double varianceQ = 0;
        double covariance = 0;
        for (int k = 0; k < n; k++)
        {
            varianceP += (p[k] - meanP) * (p[k] - meanP) / n;
            varianceQ += (q[k] - meanQ) * (q[k] - meanQ) / n;
            covariance += (p[k] - meanP) * (q[k] - meanQ) / n;
        }
        double luminance = (2 * meanP * meanQ + c1) / (meanP * meanP + meanQ * meanQ + c1);
        double contrastStructure = (2 * covariance + c2) / (varianceP + varianceQ + c2);
        double ssim = luminance * contrastStructure;
        SsimResult result;
        result.meanP = meanP; result.meanQ = meanQ; result.varianceP = varianceP; result.varianceQ = varianceQ;
        result.covariance = covariance; result.luminance = luminance; result.contrastStructure = contrastStructure; result.ssim = ssim;
        return result;
    }

    #endregion

    #region Distortions and SSIM of an image
    // SSIM of an image is the mean of SSIM over non-overlapping windows. A distortion is one of: noise (Gaussian, standard deviation
    // amount), offset (every pixel plus amount), sparse (every hundredth pixel plus 0.5), shift (amount columns to the right, black
    // fills the left), blur (amount passes of the 3 by 3 Gaussian).
    public static SsimImageResult SsimImage(double[] a, double[] b, int w, int h, int window)
    {
        double total = 0;
        int count = 0;
        for (int by = 0; by + window <= h; by += window)
        {
            for (int bx = 0; bx + window <= w; bx += window)
            {
                List<double> p = new List<double>();
                List<double> q = new List<double>();
                for (int y = 0; y < window; y++)
                {
                    for (int x = 0; x < window; x++) { p.Add(a[(by + y) * w + bx + x]); q.Add(b[(by + y) * w + bx + x]); }
                }
                total += SsimPatches(p.ToArray(), q.ToArray(), 0.0001, 0.0009).ssim;
                count++;
            }
        }
        SsimImageResult result;
        result.ssim = total / count; result.windows = count;
        return result;
    }

    public static double[] Distort(double[] image, int w, int h, string kind, double amount)
    {
        double[] result = (double[])image.Clone();
        if (kind == "noise")
        {
            double[] noise = MakeGaussianNoise(w * h, 20261105, amount);
            for (int k = 0; k < w * h; k++) result[k] = Math.Min(1, Math.Max(0, image[k] + noise[k]));
        }
        if (kind == "offset")
        {
            for (int k = 0; k < w * h; k++) result[k] = image[k] + amount;
        }
        if (kind == "sparse")
        {
            for (int k = 0; k < w * h; k += 100) result[k] = image[k] + 0.5;
        }
        if (kind == "shift")
        {
            for (int y = 0; y < h; y++)
            {
                for (int x = 0; x < w; x++) result[y * w + x] = x >= amount ? image[y * w + x - (int)amount] : 0;
            }
        }
        if (kind == "blur")
        {
            double[] blurred = image;
            for (int pass = 0; pass < amount; pass++) blurred = Convolve(blurred, w, h, MakeKernel("gauss3").values, 3, "clamp").image;
            for (int k = 0; k < w * h; k++) result[k] = blurred[k];
        }
        return result;
    }
    #endregion
}
