using UnityEngine;

// TexLab.cs: the sampler. A texture lookup from a coordinate (u, v) to a value: the wrap modes, nearest and bilinear filtering, the
// mipmap pyramid and the level chosen from the screen-space derivatives of (u, v), trilinear and anisotropic filtering, a
// tilted checker floor rendered one pixel at a time by this sampler, a cube map lookup and a shadow map lookup. Plain C#, no
// MonoBehaviour: a texture is a flat float[] of grayscale values in [0, 1], row after row from v = 0 upward, n by n texels with
// n a power of two; a mipmap is one float[] holding level 0, then level 1, and so on. TexLabScene.cs draws a floor with Unity's
// own sampler. No method changes its arguments.
// Each method returns its named intermediate results as a tuple, with the field names and the order of the object texlab.js
// returns. mono's compiler rejects tuples over 7 fields, so the results with more are small structs declared below.
// The same functions, line for line where the languages allow, are texlab.js in ../webgl/
// (lib/tests/programs/tex-lab.test.mjs runs both on the same inputs and compares the numbers).
public static class TexLab
{
    public struct BilinearResult
    {
        public int size, offset;
        public float wu, wv, x, y;
        public int i, j;
        public float fx, fy;
        public int i0, i1, j0, j1;
        public float t00, t10, t01, t11, rowLow, rowHigh, w00, w10, w01, w11, value;
    }
    public struct FootprintResult
    {
        public float footprintX, footprintY, rho, lambda;
        public int top;
        public float clamped;
        public int lower, upper;
        public float blend, texelsLower, texelsUpper, shorter, anisotropy, anisoLambda;
    }
    public struct TrilinearResult
    {
        public int top;
        public float clamped;
        public int lower, upper;
        public float blend, valueLower, valueUpper, value;
    }
    public struct AnisotropicResult
    {
        public float lengthX, lengthY;
        public bool longIsX;
        public float longer, shorter, ratio;
        public int taps;
        public float lambda, majorU, majorV, sum, value;
    }
    public struct CubeResult
    {
        public float ax, ay, az;
        public int face;
        public string faceName;
        public float ma, sc, tc, s, t;
        public int texelX, texelY;
    }
    public struct ShadowResult
    {
        public float own, a, b;
        public int i, j;
        public bool inside;
        public float stored, difference;
        public bool inShadow;
    }

    #region Settings and vector helpers
    // Below EPS a length counts as zero. Unity's Vector3 has these operations built in.
    public const float Eps = 1e-9f;
    #endregion

    #region Test textures
    // A checker of check-texel squares, the worked 4 by 4 texture of the lecture, and a seeded noise. Park-Miller is the random
    // generator, so both tracks make the same noise. Value (0, 0) of a checker is the light one.
    public static float[] WorkedTexture()
    {
        return new float[] { 0.1f, 0.3f, 0.5f, 0.7f,
            0.2f, 0.9f, 0.4f, 0.6f,
            0.8f, 0.2f, 0.7f, 0.1f,
            0.3f, 0.5f, 0.9f, 0.4f };
    }

    public static float[] MakeNoise(int n, int seed)
    {
        float[] texture = new float[n * n];
        long state = seed;
        for (int k = 0; k < n * n; k++)
        {
            state = (state * 48271) % 2147483647;
            texture[k] = state / 2147483647f;
        }
        return texture;
    }

    public static float[] MakeChecker(int n, int check, float dark, float light)
    {
        float[] texture = new float[n * n];
        for (int j = 0; j < n; j++)
        {
            for (int i = 0; i < n; i++)
            {
                int parity = (i / check + j / check) % 2;
                texture[j * n + i] = parity == 0 ? light : dark;
            }
        }
        return texture;
    }
    #endregion

    #region Wrap modes
    // What comes back for a coordinate outside [0, 1]. Repeat keeps the fraction, clamp holds the edge, mirror flips every other
    // period. The same rule applied to a texel index serves the neighbors a bilinear sample reads past the edge.
    public static int WrapIndex(int i, int size, string mode)
    {
        if (mode == "clamp") return Mathf.Min(Mathf.Max(i, 0), size - 1);
        int period = Mathf.FloorToInt((float)i / size);
        int inside = i - period * size;
        if (mode == "mirror" && period % 2 != 0) return size - 1 - inside;
        return inside;
    }

    public static (int period, float fraction, float wrapped) WrapCoordinate(float u, string mode)
    {
        int period = Mathf.FloorToInt(u);
        float fraction = u - period;
        float wrapped = fraction;
        if (mode == "clamp") wrapped = Mathf.Min(Mathf.Max(u, 0f), 1f);
        if (mode == "mirror" && period % 2 != 0) wrapped = 1f - fraction;
        return (period, fraction, wrapped);
    }
    #endregion

    #region Pyramid layout
    // One array holds every level of a mipmap, level 0 first. A level is half the size of the one below it, down to a single texel,
    // and level L starts after the texels of the levels before it.
    public static int LevelCount(int n)
    {
        int levels = 1;
        for (int size = n; size > 1; size = size / 2) levels += 1;
        return levels;
    }

    public static int LevelSize(int n, int level)
    {
        int size = n;
        for (int k = 0; k < level; k++) size = Mathf.Max(1, size / 2);
        return size;
    }

    public static int LevelOffset(int n, int level)
    {
        int offset = 0;
        for (int k = 0; k < level; k++) offset += LevelSize(n, k) * LevelSize(n, k);
        return offset;
    }
    #endregion

    #region Nearest
    // The texel whose square contains the coordinate: wrap the coordinate, scale it to texels and take the floor. Texel i covers u
    // from i/size to (i+1)/size.
    public static (int size, int offset, float wu, float wv, int i, int j, float value) SampleNearest(float[] pyramid, int n, int level, float u, float v, string mode)
    {
        int size = LevelSize(n, level);
        int offset = LevelOffset(n, level);
        float wu = WrapCoordinate(u, mode).wrapped;
        float wv = WrapCoordinate(v, mode).wrapped;
        int i = WrapIndex(Mathf.FloorToInt(wu * size), size, mode);
        int j = WrapIndex(Mathf.FloorToInt(wv * size), size, mode);
        float value = pyramid[offset + j * size + i];
        return (size, offset, wu, wv, i, j, value);
    }
    #endregion

    #region Bilinear
    // Texel centers sit at (i + 0.5) / size, so the coordinate in texel space is u * size - 0.5. The four texels around it are
    // blended: along x in two rows, then along y. The weights are the four products of the fractions and sum to 1.
    public static BilinearResult SampleBilinear(float[] pyramid, int n, int level, float u, float v, string mode)
    {
        int size = LevelSize(n, level);
        int offset = LevelOffset(n, level);
        float wu = WrapCoordinate(u, mode).wrapped;
        float wv = WrapCoordinate(v, mode).wrapped;
        float x = wu * size - 0.5f;
        float y = wv * size - 0.5f;
        int i = Mathf.FloorToInt(x);
        int j = Mathf.FloorToInt(y);
        float fx = x - i;
        float fy = y - j;
        int i0 = WrapIndex(i, size, mode);
        int i1 = WrapIndex(i + 1, size, mode);
        int j0 = WrapIndex(j, size, mode);
        int j1 = WrapIndex(j + 1, size, mode);
        float t00 = pyramid[offset + j0 * size + i0];
        float t10 = pyramid[offset + j0 * size + i1];
        float t01 = pyramid[offset + j1 * size + i0];
        float t11 = pyramid[offset + j1 * size + i1];
        float rowLow = t00 + fx * (t10 - t00);
        float rowHigh = t01 + fx * (t11 - t01);
        float w00 = (1 - fx) * (1 - fy);
        float w10 = fx * (1 - fy);
        float w01 = (1 - fx) * fy;
        float w11 = fx * fy;
        float value = rowLow + fy * (rowHigh - rowLow);
        BilinearResult r = new BilinearResult();
        r.size = size; r.offset = offset; r.wu = wu; r.wv = wv; r.x = x; r.y = y; r.i = i; r.j = j; r.fx = fx; r.fy = fy;
        r.i0 = i0; r.i1 = i1; r.j0 = j0; r.j1 = j1;
        r.t00 = t00; r.t10 = t10; r.t01 = t01; r.t11 = t11; r.rowLow = rowLow; r.rowHigh = rowHigh;
        r.w00 = w00; r.w10 = w10; r.w01 = w01; r.w11 = w11; r.value = value;
        return r;
    }
    #endregion

    #region Box filter
    // Each texel of level k + 1 is the mean of a 2 by 2 block of level k, so a texel of level k is the average of a 2^k by 2^k
    // patch of the original. The pyramid holds 1 + 1/4 + 1/16 + ... of the base: at most 4/3 of it.
    public static (float[] pyramid, int levels, int texels, float ratio) BuildMipmap(float[] baseLevel, int n)
    {
        int levels = LevelCount(n);
        int texels = 0;
        for (int level = 0; level < levels; level++) texels += LevelSize(n, level) * LevelSize(n, level);
        float[] pyramid = new float[texels];
        for (int k = 0; k < n * n; k++) pyramid[k] = baseLevel[k];
        for (int level = 1; level < levels; level++)
        {
            int size = LevelSize(n, level);
            int below = LevelSize(n, level - 1);
            int from = LevelOffset(n, level - 1);
            int to = LevelOffset(n, level);
            for (int j = 0; j < size; j++)
            {
                for (int i = 0; i < size; i++)
                {
                    float a = pyramid[from + (2 * j) * below + 2 * i];
                    float b = pyramid[from + (2 * j) * below + 2 * i + 1];
                    float c = pyramid[from + (2 * j + 1) * below + 2 * i];
                    float d = pyramid[from + (2 * j + 1) * below + 2 * i + 1];
                    pyramid[to + j * size + i] = (a + b + c + d) / 4;
                }
            }
        }
        float ratio = (float)texels / (n * n);
        return (pyramid, levels, texels, ratio);
    }
    #endregion

    #region Footprint and level
    // The derivatives say how far (u, v) moves per pixel. Scaled to texels, that is the pixel's footprint along each screen axis.
    // The longer one, rho, sets the level: lambda = log2(rho). The shorter one gives the finer level anisotropic filtering uses.
    public static FootprintResult FootprintLevel(float dudx, float dvdx, float dudy, float dvdy, int n, int levels)
    {
        float footprintX = n * Mathf.Sqrt(dudx * dudx + dvdx * dvdx);
        float footprintY = n * Mathf.Sqrt(dudy * dudy + dvdy * dvdy);
        float rho = Mathf.Max(footprintX, footprintY);
        float lambda = Mathf.Log(Mathf.Max(rho, Eps), 2f);
        int top = levels - 1;
        float clamped = Mathf.Min(Mathf.Max(lambda, 0f), top);
        int lower = Mathf.FloorToInt(clamped);
        int upper = Mathf.Min(lower + 1, top);
        float blend = clamped - lower;
        float texelsLower = rho / Mathf.Pow(2f, lower);
        float texelsUpper = rho / Mathf.Pow(2f, upper);
        float shorter = Mathf.Min(footprintX, footprintY);
        float anisotropy = rho / Mathf.Max(shorter, Eps);
        float anisoLambda = Mathf.Log(Mathf.Max(shorter, Eps), 2f);
        FootprintResult r = new FootprintResult();
        r.footprintX = footprintX; r.footprintY = footprintY; r.rho = rho; r.lambda = lambda;
        r.top = top; r.clamped = clamped; r.lower = lower; r.upper = upper; r.blend = blend;
        r.texelsLower = texelsLower; r.texelsUpper = texelsUpper; r.shorter = shorter; r.anisotropy = anisotropy; r.anisoLambda = anisoLambda;
        return r;
    }
    #endregion

    #region Trilinear
    // Bilinear samples from the two levels either side of lambda, blended by how far lambda is from the lower one. A lambda below 0
    // is magnification: level 0. Above the top level, the top level.
    public static TrilinearResult SampleTrilinear(float[] pyramid, int n, int levels, float u, float v, float lambda, string mode)
    {
        int top = levels - 1;
        float clamped = Mathf.Min(Mathf.Max(lambda, 0f), top);
        int lower = Mathf.FloorToInt(clamped);
        int upper = Mathf.Min(lower + 1, top);
        float blend = clamped - lower;
        float valueLower = SampleBilinear(pyramid, n, lower, u, v, mode).value;
        float valueUpper = SampleBilinear(pyramid, n, upper, u, v, mode).value;
        float value = valueLower + blend * (valueUpper - valueLower);
        TrilinearResult r = new TrilinearResult();
        r.top = top; r.clamped = clamped; r.lower = lower; r.upper = upper; r.blend = blend;
        r.valueLower = valueLower; r.valueUpper = valueUpper; r.value = value;
        return r;
    }
    #endregion

    #region Anisotropic
    // A footprint longer than it is wide is read with several trilinear samples spaced along the long axis, each at the level of the
    // short axis: the level the long axis would choose is too blurry across the footprint. The tap count is the ratio rounded up,
    // at most maxTaps (a ratio a hair over a whole number, from rounding, adds no tap); past the cap the level coarsens until the
    // taps cover the footprint again. One tap is plain trilinear.
    public static AnisotropicResult SampleAnisotropic(float[] pyramid, int n, int levels, float u, float v, float dudx, float dvdx, float dudy, float dvdy, int maxTaps, string mode)
    {
        float lengthX = n * Mathf.Sqrt(dudx * dudx + dvdx * dvdx);
        float lengthY = n * Mathf.Sqrt(dudy * dudy + dvdy * dvdy);
        bool longIsX = lengthX >= lengthY;
        float majorU = longIsX ? dudx : dudy;
        float majorV = longIsX ? dvdx : dvdy;
        float longer = Mathf.Max(lengthX, lengthY);
        float shorter = Mathf.Min(lengthX, lengthY);
        float ratio = longer / Mathf.Max(shorter, Eps);
        int taps = Mathf.Max(1, Mathf.Min(Mathf.CeilToInt(ratio - 0.01f), maxTaps));
        float lambda = Mathf.Log(Mathf.Max(shorter, Mathf.Max(longer / taps, Eps)), 2f);
        float sum = 0;
        for (int k = 0; k < taps; k++)
        {
            float along = (k + 0.5f) / taps - 0.5f;
            var at = SampleTrilinear(pyramid, n, levels, u + along * majorU,
                v + along * majorV, lambda, mode);
            sum += at.value;
        }
        float value = sum / taps;
        AnisotropicResult r = new AnisotropicResult();
        r.lengthX = lengthX; r.lengthY = lengthY; r.longIsX = longIsX; r.longer = longer; r.shorter = shorter;
        r.ratio = ratio; r.taps = taps; r.lambda = lambda; r.majorU = majorU; r.majorV = majorV; r.sum = sum; r.value = value;
        return r;
    }
    #endregion

    #region Floor pixel
    // A pinhole camera at the origin looks down -z with a 50 degree field of view. A texture plane passes through (0, 0, -1) and is
    // tilted about the x axis: 0 faces the camera, larger tilts lean the top away. A pixel's ray meets the plane at a point whose
    // plane coordinates, divided by the tile size, are (u, v). The derivatives are differences to the next pixel right and below,
    // as a GPU gets them from a 2 by 2 block of pixels.
    public const float FovDegrees = 50f;

    public static (bool hit, float u, float v, float depth, float sx, float sy) FloorPixel(float px, float py, int width, int height, float tiltDegrees, float tiles)
    {
        float tilt = tiltDegrees * Mathf.PI / 180f;
        float halfHeight = Mathf.Tan(FovDegrees * Mathf.PI / 360f);
        float halfWidth = halfHeight * width / height;
        float sx = (px / width * 2 - 1) * halfWidth;
        float sy = (1 - py / height * 2) * halfHeight;
        float denominator = Mathf.Cos(tilt) - Mathf.Sin(tilt) * sy;
        if (denominator <= 0.0001f) return (false, 0f, 0f, 0f, sx, sy);
        float depth = Mathf.Cos(tilt) / denominator;
        float along = depth * sx;
        float up = depth * sy * Mathf.Cos(tilt) - (1 - depth) * Mathf.Sin(tilt);
        float tileSize = 2 * halfWidth / tiles;
        return (true, along / tileSize + 0.5f, up / tileSize + 0.5f, depth, sx, sy);
    }

    public static (bool hit, float u, float v, float dudx, float dvdx, float dudy, float dvdy) FloorFootprint(int ix, int iy, int width, int height, float tiltDegrees, float tiles)
    {
        var here = FloorPixel(ix + 0.5f, iy + 0.5f,
            width, height, tiltDegrees, tiles);
        var right = FloorPixel(ix + 1.5f, iy + 0.5f,
            width, height, tiltDegrees, tiles);
        var below = FloorPixel(ix + 0.5f, iy + 1.5f,
            width, height, tiltDegrees, tiles);
        bool hit = here.hit && right.hit && below.hit;
        float dudx = right.u - here.u;
        float dvdx = right.v - here.v;
        float dudy = below.u - here.u;
        float dvdy = below.v - here.v;
        return (hit, here.u, here.v, dudx, dvdx, dudy, dvdy);
    }
    #endregion

    #region Reference average
    // The correct color is the average over the pixel's area. This takes grid by grid samples inside the pixel, each read by
    // nearest from level 0, and averages them: slow, and what the mipmap approximates.
    public static (int samples, float value) ReferenceAverage(float[] pyramid, int n, int ix, int iy, int width, int height, float tiltDegrees, float tiles, int grid, string mode)
    {
        float sum = 0;
        int samples = 0;
        for (int b = 0; b < grid; b++)
        {
            for (int a = 0; a < grid; a++)
            {
                float sx = ix + (a + 0.5f) / grid;
                float sy = iy + (b + 0.5f) / grid;
                var spot = FloorPixel(sx, sy, width, height, tiltDegrees, tiles);
                if (spot.hit)
                {
                    sum += SampleNearest(pyramid, n, 0, spot.u, spot.v, mode).value;
                    samples += 1;
                }
            }
        }
        float value = samples > 0 ? sum / samples : 0f;
        return (samples, value);
    }
    #endregion

    #region Shade a pixel
    // One pixel of the floor: find its (u, v) and derivatives, then read the texture with the chosen filter: nearest, bilinear,
    // level (one mip level, lambda rounded), trilinear, anisotropic or the reference average. A pixel above the horizon is sky.
    public static (bool hit, float u, float v, float lambda, int taps, float value, int levels) ShadeFloor(float[] pyramid, int n, int ix, int iy, int width, int height, float tiltDegrees, float tiles, string filter, int maxTaps, string mode)
    {
        int levels = LevelCount(n);
        var f = FloorFootprint(ix, iy, width, height, tiltDegrees, tiles);
        if (!f.hit) return (false, 0f, 0f, 0f, 0, 0f, levels);
        FootprintResult fp = FootprintLevel(f.dudx, f.dvdx, f.dudy, f.dvdy, n, levels);
        float value = 0;
        int taps = 1;
        if (filter == "nearest")
        {
            value = SampleNearest(pyramid, n, 0, f.u, f.v, mode).value;
        }
        else if (filter == "bilinear")
        {
            value = SampleBilinear(pyramid, n, 0, f.u, f.v, mode).value;
        }
        else if (filter == "level")
        {
            int nearestLevel = Mathf.FloorToInt(fp.lambda + 0.5f);
            int rounded = Mathf.Min(Mathf.Max(nearestLevel, 0), levels - 1);
            value = SampleBilinear(pyramid, n, rounded, f.u, f.v, mode).value;
        }
        else if (filter == "trilinear")
        {
            value = SampleTrilinear(pyramid, n, levels, f.u, f.v, fp.lambda, mode).value;
        }
        else if (filter == "anisotropic")
        {
            var a = SampleAnisotropic(pyramid, n, levels, f.u, f.v,
                f.dudx, f.dvdx, f.dudy, f.dvdy, maxTaps, mode);
            value = a.value;
            taps = a.taps;
        }
        else
        {
            var average = ReferenceAverage(pyramid, n, ix, iy, width, height,
                tiltDegrees, tiles, 4, mode);
            value = average.value;
            taps = 16;
        }
        return (true, f.u, f.v, fp.lambda, taps, value, levels);
    }
    #endregion

    #region Cube map lookup
    // A direction picks the face of its largest component, with that component's sign. The other two components, divided by the
    // largest and mapped from [-1, 1] to [0, 1], are the coordinates on the face. The signs of sc and tc per face are OpenGL's.
    static readonly string[] FaceNames = { "+X", "-X", "+Y", "-Y", "+Z", "-Z" };

    public static CubeResult CubeLookup(float x, float y, float z, int size)
    {
        float ax = Mathf.Abs(x);
        float ay = Mathf.Abs(y);
        float az = Mathf.Abs(z);
        int face = 0;
        float ma = ax;
        float sc = 0;
        float tc = 0;
        if (ax >= ay && ax >= az)
        {
            face = x > 0 ? 0 : 1;
            ma = ax;
            sc = x > 0 ? -z : z;
            tc = -y;
        }
        else if (ay >= az)
        {
            face = y > 0 ? 2 : 3;
            ma = ay;
            sc = x;
            tc = y > 0 ? z : -z;
        }
        else
        {
            face = z > 0 ? 4 : 5;
            ma = az;
            sc = z > 0 ? x : -x;
            tc = -y;
        }
        string faceName = FaceNames[face];
        float s = (sc / Mathf.Max(ma, Eps) + 1) / 2;
        float t = (tc / Mathf.Max(ma, Eps) + 1) / 2;
        int texelX = Mathf.Min(Mathf.FloorToInt(s * size + 0.0001f), size - 1);
        int texelY = Mathf.Min(Mathf.FloorToInt(t * size + 0.0001f), size - 1);
        CubeResult r = new CubeResult();
        r.ax = ax; r.ay = ay; r.az = az; r.face = face; r.faceName = faceName; r.ma = ma; r.sc = sc; r.tc = tc; r.s = s; r.t = t;
        r.texelX = texelX; r.texelY = texelY;
        return r;
    }
    #endregion

    #region Cube face point
    // The reverse: the point of the unit cube's surface that face, s and t name.
    public static Vector3 CubeFacePoint(int face, float s, float t)
    {
        float a = 2 * s - 1;
        float b = 2 * t - 1;
        if (face == 0) return new Vector3(1, -b, -a);
        if (face == 1) return new Vector3(-1, -b, a);
        if (face == 2) return new Vector3(a, 1, b);
        if (face == 3) return new Vector3(a, -1, -b);
        if (face == 4) return new Vector3(a, -b, 1);
        return new Vector3(-a, -b, -1);
    }
    #endregion

    #region Cube map memory
    // Six square faces of bytesPerTexel bytes. A full mip chain adds 1/4 + 1/16 + ... of each face.
    public static (int faceBytes, int bytes, int withMips) CubeMemory(int size, int bytesPerTexel)
    {
        int faceBytes = size * size * bytesPerTexel;
        int bytes = 6 * faceBytes;
        int withMips = 0;
        for (int level = 0; level < LevelCount(size); level++)
        {
            int side = LevelSize(size, level);
            withMips += 6 * side * side * bytesPerTexel;
        }
        return (faceBytes, bytes, withMips);
    }
    #endregion

    #region Shadow scene
    // A directional light along LIGHT_DIR, an orthographic light camera at LIGHT_ORIGIN covering a COVER by COVER square of the
    // plane perpendicular to the light, and a floor (y = 0) with a unit box standing on it. A depth is a distance along the
    // light direction from the plane through LIGHT_ORIGIN.
    public static readonly Vector3 LightDir = new Vector3(-2f / 3f, -2f / 3f, -1f / 3f);
    public static readonly Vector3 LightOrigin = new Vector3(20f / 3f, 20f / 3f, 10f / 3f);
    public const float Cover = 6f;
    public static readonly Vector3 BoxMin = new Vector3(-0.5f, 0f, -0.5f);
    public static readonly Vector3 BoxMax = new Vector3(0.5f, 1f, 0.5f);

    public static (Vector3 right, Vector3 up) LightAxes()
    {
        Vector3 right = Vector3.Cross(LightDir, new Vector3(0f, 1f, 0f)).normalized;
        Vector3 up = Vector3.Cross(right, LightDir);
        return (right, up);
    }

    // The distances at which a ray enters and leaves the slab lo..hi along one axis.
    public static (float near, float far) Slab(float origin, float direction, float lo, float hi)
    {
        if (Mathf.Abs(direction) < Eps)
        {
            bool inside = origin >= lo && origin <= hi;
            return inside ? (-1e9f, 1e9f) : (1e9f, -1e9f);
        }
        float t1 = (lo - origin) / direction;
        float t2 = (hi - origin) / direction;
        return (Mathf.Min(t1, t2), Mathf.Max(t1, t2));
    }
    #endregion

    #region Shadow map texel
    // What the map stores at texel (i, j): the ray from the texel's center along the light meets the box or the floor, whichever is
    // first, and the stored depth is the distance to it.
    public static (float a, float b, bool hitsBox, float depth) StoredDepth(int i, int j, int res)
    {
        var axes = LightAxes();
        float a = ((i + 0.5f) / res - 0.5f) * Cover;
        float b = ((j + 0.5f) / res - 0.5f) * Cover;
        Vector3 across = axes.right * a + axes.up * b;
        Vector3 origin = LightOrigin + across;
        float floorDistance = -origin.y / LightDir.y;
        var sx = Slab(origin.x, LightDir.x, BoxMin.x, BoxMax.x);
        var sy = Slab(origin.y, LightDir.y, BoxMin.y, BoxMax.y);
        var sz = Slab(origin.z, LightDir.z, BoxMin.z, BoxMax.z);
        float near = Mathf.Max(sx.near, Mathf.Max(sy.near, sz.near));
        float far = Mathf.Min(sx.far, Mathf.Min(sy.far, sz.far));
        bool hitsBox = near <= far && far > 0 && near < floorDistance;
        float depth = hitsBox ? Mathf.Max(near, 0f) : floorDistance;
        return (a, b, hitsBox, depth);
    }
    #endregion

    #region Shadow test
    // Project the point into the light camera to find its texel, read what the map stores there, and compare it with the point's
    // own depth. Farther than the stored depth by more than the bias means something nearer to the light is in the way.
    public static ShadowResult ShadowTest(Vector3 point, int res, float bias)
    {
        var axes = LightAxes();
        Vector3 fromLight = point - LightOrigin;
        float own = Vector3.Dot(fromLight, LightDir);
        float a = Vector3.Dot(fromLight, axes.right);
        float b = Vector3.Dot(fromLight, axes.up);
        int i = Mathf.FloorToInt((a / Cover + 0.5f) * res);
        int j = Mathf.FloorToInt((b / Cover + 0.5f) * res);
        bool inside = i >= 0 && i < res && j >= 0 && j < res;
        float stored = inside ? StoredDepth(i, j, res).depth : own;
        float difference = own - stored;
        bool inShadow = difference > bias;
        ShadowResult r = new ShadowResult();
        r.own = own; r.a = a; r.b = b; r.i = i; r.j = j; r.inside = inside;
        r.stored = stored; r.difference = difference; r.inShadow = inShadow;
        return r;
    }
    #endregion

    #region Shadow bias
    // A floor tilted to the light changes its depth across a texel: the texel's width times the tangent of the angle between the
    // floor's normal and the light. A bias of a texel and a half covers the offset between a texel's center and the point.
    public static (float texel, float perTexel, float bias) ShadowBias(int res, float texels)
    {
        float texel = Cover / res;
        float cosine = -LightDir.y;
        float perTexel = texel * Mathf.Sqrt(1 - cosine * cosine) / cosine;
        float bias = texels * perTexel;
        return (texel, perTexel, bias);
    }
    #endregion
}
