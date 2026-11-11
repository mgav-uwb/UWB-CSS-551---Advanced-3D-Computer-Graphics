using System;
using UnityEngine;

// LightLab.cs: light at a surface point, from the light sources to the pixel value: the light's direction, distance and cone,
// Lambert's diffuse term, the mirror direction, Phong's and Blinn's specular terms, ambient, the sum over lights, shading per
// vertex and per pixel, tone mapping of an unbounded sum, the sRGB curve, and what goes wrong when a blend or a lighting sum
// is done on codes instead of light. Plain C#, no MonoBehaviour: vectors and colors are Vector3 ([r, g, b] for a color, in
// linear light unless a name says "code"). LightLabScene.cs draws it. No method changes its arguments.
// Each method returns its named intermediate results as a tuple, with the field names and the order of the object lightlab.js
// returns. A result with a single field (ambientTerm, luminance) is that field itself, since C# has no one-element tuple.
// The same functions, line for line where the languages allow, are lightlab.js in ../webgl/
// (lib/tests/programs/light-lab.test.mjs runs both on the same inputs and compares the numbers).
public static class LightLab
{
    #region Settings and vector helpers
    // Below EPS a length counts as zero. Angles are returned in degrees. Unity's Vector3 has these operations built in.
    public const float Eps = 1e-6f;
    public const float Deg = 180f / Mathf.PI;

    static Vector3 Mul(Vector3 a, Vector3 b) { return Vector3.Scale(a, b); }
    static Vector3 Normalize(Vector3 a)
    {
        float l = a.magnitude;
        return l > Eps ? a / l : Vector3.zero;
    }
    #endregion

    #region Light: direction and distance
    // A directional light has a direction and no position: L is the same everywhere and there is no distance. A point light, and
    // a spot light, have a position: L points from the surface point toward it, and d is the distance the light travels.
    // L always points toward the light, so facing the light means N . L near 1. lightDir is the way a directional light travels.
    public static (Vector3 toLight, float d, Vector3 L) LightVector(string kind, Vector3 point, Vector3 lightPos, Vector3 lightDir)
    {
        Vector3 toLight = kind == "directional" ? -lightDir : lightPos - point;
        float d = kind == "directional" ? 0f : toLight.magnitude;
        Vector3 L = Normalize(toLight);
        return (toLight, d, L);
    }
    #endregion

    #region Light: distance attenuation
    // A light of fixed power spreads over a sphere of area 4 pi d^2, so the physical falloff is 1 / d^2. Engines also use a
    // tunable 1 / (kc + kl d + kq d^2), whose constant term keeps it finite at d = 0, and a cutoff radius beyond which the
    // light is skipped. At d = 0 the inverse square is capped at 1 / EPS.
    public static (float inverseSquare, float polynomial, float cutoff) Attenuation(float d, float kc, float kl, float kq, float far)
    {
        float inverseSquare = 1f / Mathf.Max(d * d, Eps);
        float polynomial = 1f / Mathf.Max(kc + kl * d + kq * d * d, Eps);
        float cutoff = d <= far ? polynomial : 0f;
        return (inverseSquare, polynomial, cutoff);
    }
    #endregion

    #region Light: the spot cone
    // A spot light is a point light masked by a cone around its aim D. alpha is the angle between -L and D. Inside the inner angle
    // the mask is 1, outside the outer angle it is 0, and between them it fades: x = n^2 / range^2 with n = inner - alpha,
    // then smoothstep(1, 0, x) = 3 t^2 - 2 t^3 with t = 1 - x (Kelvin Sung's soft edge). A zero-width ramp is a hard edge.
    public static (float alpha, float n, float range, float x, float t, float strength) SpotMask(Vector3 L, Vector3 aim, float innerDeg, float outerDeg)
    {
        Vector3 D = Normalize(aim);
        float alpha = Mathf.Acos(Mathf.Clamp(Vector3.Dot(-L, D), -1f, 1f)) * Deg;
        float range = outerDeg - innerDeg;
        float n = innerDeg - alpha;
        bool inFade = alpha > innerDeg && alpha < outerDeg && range > Eps;
        float x = inFade ? (n * n) / (range * range) : (alpha <= innerDeg ? 0f : 1f);
        float t = 1f - x;
        float strength = inFade ? t * t * (3f - 2f * t) : (alpha <= innerDeg ? 1f : 0f);
        return (alpha, n, range, x, t, strength);
    }
    #endregion

    #region Light: an area light
    // A disc of radius R and radiance L straight above a point at height h gives the irradiance pi L R^2 / (h^2 + R^2). A point
    // light of the same power gives pi L R^2 / h^2. Their ratio is (h^2 + R^2) / h^2: the point light is too bright up close.
    public static (float disc, float point, float ratio) AreaLight(float radius, float radiance, float h)
    {
        float disc = (Mathf.PI * radiance * radius * radius) / (h * h + radius * radius);
        float point = (Mathf.PI * radiance * radius * radius) / Mathf.Max(h * h, Eps);
        float ratio = point / disc;
        return (disc, point, ratio);
    }
    #endregion

    #region Diffuse: Lambert
    // A matte surface catches light in proportion to the cosine of the thetaN between N and L. Behind the surface the cosine is
    // negative and no light arrives, so it is clamped at 0. kd and lightColor multiply per channel.
    public static (float nDotL, float thetaN, float clamped, Vector3 lightDiffuse) Lambert(Vector3 N, Vector3 L, Vector3 kd, Vector3 lightColor)
    {
        float nDotL = Vector3.Dot(N, L);
        float thetaN = Mathf.Acos(Mathf.Clamp(nDotL, -1f, 1f)) * Deg;
        float clamped = Mathf.Max(0f, nDotL);
        Vector3 lightDiffuse = Mul(kd, lightColor) * clamped;
        return (nDotL, thetaN, clamped, lightDiffuse);
    }
    #endregion

    #region Specular: the mirror direction
    // Split L into the part along N and the part in the surface. Reflecting keeps the first and flips the second:
    // R = (N . L) N - [L - (N . L) N] = 2 (N . L) N - L. R is unit when N and L are.
    public static (float nDotL, Vector3 along, Vector3 inSurface, Vector3 R) MirrorDirection(Vector3 N, Vector3 L)
    {
        float nDotL = Vector3.Dot(N, L);
        Vector3 along = N * nDotL;
        Vector3 inSurface = L - along;
        Vector3 R = along - inSurface;
        return (nDotL, along, inSurface, R);
    }
    #endregion

    #region Specular: Phong
    // The highlight is brightest where the mirror direction R points at the eye V. The cosine R . V is raised to the shininess s,
    // so only directions near the mirror survive. Normalized, the lobe is multiplied by (s + 2) / (2 pi), so a tighter highlight
    // is a brighter one and the total light reflected stays the same.
    public static (float rDotV, float thetaR, float phongFactor, float phongNorm, Vector3 phongSpec) Phong(Vector3 R, Vector3 V, float s, Vector3 ks, Vector3 lightColor, bool normalized)
    {
        float rDotV = Vector3.Dot(R, V);
        float thetaR = Mathf.Acos(Mathf.Clamp(rDotV, -1f, 1f)) * Deg;
        float phongFactor = Mathf.Pow(Mathf.Max(0f, rDotV), s);
        float phongNorm = normalized ? (s + 2f) / (2f * Mathf.PI) : 1f;
        Vector3 phongSpec = Mul(ks, lightColor) * (phongFactor * phongNorm);
        return (rDotV, thetaR, phongFactor, phongNorm, phongSpec);
    }
    #endregion

    #region Specular: Blinn's half vector
    // Blinn (1977) replaces the mirror test with H = normalize(L + V), the direction halfway between the light and the eye. The
    // surface mirrors the light into the eye exactly when N = H, so H . N peaks where R . V does. It needs no reflection vector.
    public static (Vector3 H, float hDotN, float thetaH, float blinnFactor, float blinnNorm, Vector3 blinnSpec) Blinn(Vector3 N, Vector3 L, Vector3 V, float s, Vector3 ks, Vector3 lightColor, bool normalized)
    {
        Vector3 H = Normalize(L + V);
        float hDotN = Vector3.Dot(H, N);
        float thetaH = Mathf.Acos(Mathf.Clamp(hDotN, -1f, 1f)) * Deg;
        float blinnFactor = Mathf.Pow(Mathf.Max(0f, hDotN), s);
        float blinnNorm = normalized ? (s + 2f) / (2f * Mathf.PI) : 1f;
        Vector3 blinnSpec = Mul(ks, lightColor) * (blinnFactor * blinnNorm);
        return (H, hDotN, thetaH, blinnFactor, blinnNorm, blinnSpec);
    }
    #endregion

    #region Specular: matching the exponent
    // The angle between H and N is about half the angle between R and V, so Blinn's cosine is larger. To give the same highlight
    // value as Phong at one point, Blinn needs the exponent s = ln(phongFactor) / ln(H . N): about four times Phong's.
    public static (float sBlinn, float sRatio) MatchExponent(float phongFactor, float hDotN, float phongS)
    {
        float sBlinn = Mathf.Log(phongFactor) / Mathf.Log(hDotN);
        float sRatio = sBlinn / phongS;
        return (sBlinn, sRatio);
    }
    #endregion

    #region Specular: energy
    // Narrowing the lobe also shrinks the light it reflects. With the cosine toward the surface, the lobe integrates to
    // 2 pi / (s + 2) over the hemisphere (2 pi / (s + 1) without it). Here the integral is summed in 4000 steps of the angle
    // theta from the lobe's axis; the normalizer (s + 2) / (2 pi) makes the total 1 at every s.
    public static (float raw, float exact, float rawNoCos, float exactNoCos, float normalizer, float normalized) LobeEnergy(float s)
    {
        int steps = 4000;
        double dTheta = (Math.PI / 2) / steps;
        double raw = 0;
        double rawNoCos = 0;
        for (int i = 0; i < steps; i++)
        {
            double theta = (i + 0.5) * dTheta;
            double lobe = Math.Pow(Math.Cos(theta), s) * Math.Sin(theta);
            rawNoCos += lobe * dTheta;
            raw += lobe * Math.Cos(theta) * dTheta;
        }
        raw *= 2 * Math.PI;
        rawNoCos *= 2 * Math.PI;
        float exact = (2f * Mathf.PI) / (s + 2f);
        float exactNoCos = (2f * Mathf.PI) / (s + 1f);
        float normalizer = (s + 2f) / (2f * Mathf.PI);
        float normalized = (float)raw * normalizer;
        return ((float)raw, exact, (float)rawNoCos, exactNoCos, normalizer, normalized);
    }
    #endregion

    #region Ambient
    // Where no light arrives directly, a model with only diffuse and specular terms is pure black. Real shadows are filled by
    // bounced light, which a local model does not compute: one constant stands in for it, the same at every point. Here the
    // ambient reflectance is ka times the diffuse color kd.
    public static Vector3 AmbientTerm(float ka, Vector3 kd, Vector3 ambientColor)
    {
        Vector3 ambient = Mul(kd, ambientColor) * ka;
        return ambient;
    }
    #endregion

    #region The sum over lights
    // The model is linear in the lights, so each light adds its own diffuse and specular terms, and the ambient term is added
    // once. A light behind the surface (N . L not positive) adds neither. model is "phong" or "blinn".
    public static (Vector3 V, Vector3 ambient, Vector3 diffuse, Vector3 specular, Vector3 color, float[] nDotLs, float[] cosines) ShadeSurface(Vector3 P, Vector3 N, Vector3 eye, Vector3[] lightPos, Vector3[] lightCol, Vector3 ambientColor, float ka, Vector3 kd, Vector3 ks, float s, string model, bool normalized)
    {
        Vector3 V = Normalize(eye - P);
        Vector3 ambient = AmbientTerm(ka, kd, ambientColor);
        Vector3 diffuse = Vector3.zero;
        Vector3 specular = Vector3.zero;
        float[] nDotLs = new float[lightPos.Length];
        float[] cosines = new float[lightPos.Length];
        for (int i = 0; i < lightPos.Length; i++)
        {
            Vector3 L = Normalize(lightPos[i] - P);
            var lam = Lambert(N, L, kd, lightCol[i]);
            Vector3 spec = Vector3.zero;
            float cosine = 0f;
            if (model == "blinn")
            {
                var b = Blinn(N, L, V, s, ks, lightCol[i], normalized);
                spec = b.blinnSpec;
                cosine = b.hDotN;
            }
            else
            {
                var p = Phong(MirrorDirection(N, L).R, V, s, ks, lightCol[i], normalized);
                spec = p.phongSpec;
                cosine = p.rDotV;
            }
            float lit = lam.nDotL > 0f ? 1f : 0f;
            diffuse = diffuse + lam.lightDiffuse;
            specular = specular + spec * lit;
            nDotLs[i] = lam.nDotL;
            cosines[i] = cosine;
        }
        Vector3 color = ambient + diffuse + specular;
        return (V, ambient, diffuse, specular, color, nDotLs, cosines);
    }
    #endregion

    #region Shading: barycentric weights
    // A point p inside the triangle a, b, c (2D) is u a + v b + w c with u + v + w = 1. Each weight is the signed area of the
    // triangle opposite its corner over the whole triangle. The point is inside when all three are not negative.
    public static (float u, float v, float w, bool inside) Barycentric(Vector2 p, Vector2 a, Vector2 b, Vector2 c)
    {
        Vector2 e0 = b - a;
        Vector2 e1 = c - a;
        Vector2 e2 = p - a;
        float d = e0.x * e1.y - e0.y * e1.x;
        if (Mathf.Abs(d) < Eps) return (0f, 0f, 0f, false);
        float v = (e2.x * e1.y - e2.y * e1.x) / d;
        float w = (e0.x * e2.y - e0.y * e2.x) / d;
        float u = 1f - v - w;
        bool inside = u >= -Eps && v >= -Eps && w >= -Eps;
        return (u, v, w, inside);
    }
    #endregion

    #region Shading: per vertex
    // Gouraud (1971): light each vertex once, then give each pixel the weighted mean of the three vertex colors. A highlight
    // smaller than a triangle is smeared or lost, because it exists only if it falls on a vertex.
    public static Vector3 Gouraud(float[] weights, Vector3 ca, Vector3 cb, Vector3 cc)
    {
        Vector3 color = ca * weights[0] + cb * weights[1] + cc * weights[2];
        return color;
    }
    #endregion

    #region Shading: per pixel
    // Phong shading: give each pixel the weighted mean of the three vertex normals, renormalized, and light that pixel. The
    // lighting sum then runs once per pixel, and a highlight between vertices appears.
    public static (Vector3 blended, Vector3 normal) PhongShading(float[] weights, Vector3 na, Vector3 nb, Vector3 nc)
    {
        Vector3 blended = na * weights[0] + nb * weights[1] + nc * weights[2];
        Vector3 normal = Normalize(blended);
        return (blended, normal);
    }
    #endregion

    #region Shading: cost
    // Counts of lighting evaluations. Per vertex: one per vertex per light. Per pixel: one per covered pixel per light. Forward
    // shading pays for every fragment, overdraw included; deferred shading once per pixel; tiled deferred shading only for the
    // lights that reach the pixel's tile.
    public static (long gouraudEvals, long pixelEvals, float ratio, long forward, long deferred, long tiled, long gBufferBytes) ShadingCost(int vertices, int pixels, int overdraw, int lights, int tileLights, int bytesPerPixel)
    {
        long gouraudEvals = (long)vertices * lights;
        long pixelEvals = (long)pixels * lights;
        float ratio = (float)pixelEvals / gouraudEvals;
        long forward = (long)pixels * overdraw * lights;
        long deferred = (long)pixels * lights;
        long tiled = (long)pixels * tileLights;
        long gBufferBytes = (long)pixels * bytesPerPixel;
        return (gouraudEvals, pixelEvals, ratio, forward, deferred, tiled, gBufferBytes);
    }
    #endregion

    #region Tone mapping
    // A lighting sum is unbounded, and a display shows 0 to 1. Exposure scales the sum first. Clipping sends every value above 1
    // to white. Reinhard (2002) maps x to x / (1 + x), which approaches 1 and never reaches it. The film-like curve is Narkowicz's
    // (2015) fit to the ACES curve. All of them run last, per channel, before the sRGB encode.
    public static (float scaled, float clip, float reinhard, float aces) ToneMapChannel(float x, float exposure)
    {
        float scaled = x * exposure;
        float clip = Mathf.Min(1f, scaled);
        float reinhard = scaled / (1f + scaled);
        float aces = Mathf.Clamp((scaled * (2.51f * scaled + 0.03f)) / (scaled * (2.43f * scaled + 0.59f) + 0.14f), 0f, 1f);
        return (scaled, clip, reinhard, aces);
    }
    #endregion

    #region An HDR scene
    // A picture of values far above 1, as a lighting sum would give: a sky of 6, clouds of 4, a sun disc of 40, a dark ground
    // near 0.05, and a red sphere lit by the sun with a white highlight. x and y run 0 to 1 across the image, y downward. kind:
    // 0 sky, 1 cloud, 2 sun, 3 sphere, 4 ground.
    public static (Vector3 radiance, int kind) HdrScene(float x, float y)
    {
        float horizon = 0.64f;
        int kind = 0;
        Vector3 radiance = Vector3.zero;
        if (y > horizon)
        {
            float g = (y - horizon) / (1f - horizon);
            radiance = new Vector3(0.03f + 0.1f * g, 0.05f + 0.18f * g, 0.02f + 0.06f * g);
            kind = 4;
        }
        else
        {
            float lift = 1f - 0.25f * (y / horizon);
            radiance = new Vector3(4.3f * lift, 5.2f * lift, 6f * lift);
        }
        float[][] clouds = { new float[] { 0.3f, 0.22f, 0.18f, 0.06f }, new float[] { 0.54f, 0.36f, 0.16f, 0.05f }, new float[] { 0.12f, 0.4f, 0.14f, 0.045f } };
        if (y <= horizon)
        {
            for (int i = 0; i < clouds.Length; i++)
            {
                float ex = (x - clouds[i][0]) / clouds[i][2];
                float ey = (y - clouds[i][1]) / clouds[i][3];
                float cover = Mathf.Clamp((1f - (ex * ex + ey * ey)) * 5f, 0f, 1f);
                if (cover > 0f)
                {
                    radiance = radiance * (1f - cover) + new Vector3(4f, 4f, 4f) * cover;
                    if (cover > 0.5f) kind = 1;
                }
            }
            float r = Mathf.Sqrt((x - 0.8f) * (x - 0.8f) + (y - 0.18f) * (y - 0.18f));
            if (r < 0.04f)
            {
                radiance = new Vector3(40f, 38.4f, 34f);
                kind = 2;
            }
            else
            {
                radiance = radiance + new Vector3(1f, 0.9f, 0.7f) * (14f * Mathf.Exp(-(r - 0.04f) / 0.05f));
            }
        }
        float px = (x - 0.42f) / 0.17f;
        float py = -(y - 0.72f) / 0.17f;
        if (px * px + py * py < 1f)
        {
            Vector3 normal = new Vector3(px, py, Mathf.Sqrt(1f - px * px - py * py));
            var lit = ShadeSurface(normal, normal, new Vector3(0f, 0f, 8f), new Vector3[] { new Vector3(4f, 3f, 4.5f) },
                new Vector3[] { new Vector3(8f, 8f, 7.2f) }, new Vector3(0.6f, 0.8f, 1f),
                0.12f, new Vector3(0.75f, 0.35f, 0.28f), new Vector3(0.8f, 0.8f, 0.8f), 60f, "blinn", false);
            radiance = lit.color;
            kind = 3;
        }
        return (radiance, kind);
    }
    #endregion

    #region sRGB: decode
    // A code c in 0 to 1 is not light. The sRGB curve (IEC 61966-2-1) is linear near black and a power 2.4 above:
    // v = c / 12.92 for c <= 0.04045, otherwise ((c + 0.055) / 1.055)^2.4. segment is 0 on the line and 1 on the power.
    public static (float linear, int segment) SrgbDecode(float code)
    {
        int segment = code <= 0.04045f ? 0 : 1;
        float linear = segment == 0 ? code / 12.92f : Mathf.Pow((code + 0.055f) / 1.055f, 2.4f);
        return (linear, segment);
    }
    #endregion

    #region sRGB: encode
    // The inverse: c = 12.92 v for v <= 0.0031308, otherwise 1.055 v^(1/2.4) - 0.055. The byte is the nearest of the 256 codes.
    // Light above 1 or below 0 is clamped first, since a display cannot show it.
    public static (float code, int @byte, int segment) SrgbEncode(float linear)
    {
        float v = Mathf.Clamp(linear, 0f, 1f);
        int segment = v <= 0.0031308f ? 0 : 1;
        float code = segment == 0 ? 12.92f * v : 1.055f * Mathf.Pow(v, 1f / 2.4f) - 0.055f;
        int @byte = (int)Mathf.Floor(code * 255f + 0.5f);
        return (code, @byte, segment);
    }
    #endregion

    #region Quantization
    // Storing a value in a fixed number of levels rounds it to the nearest of levels evenly spaced values from 0 to 1. Rounding
    // light costs the darks their detail; rounding the sRGB code spreads the steps to match the eye.
    public static (int index, float quantized) Quantize(float value, int levels)
    {
        int index = (int)Mathf.Floor(Mathf.Clamp(value, 0f, 1f) * (levels - 1) + 0.5f);
        float quantized = (float)index / (levels - 1);
        return (index, quantized);
    }
    #endregion

    #region Codes in the darks
    // How many of the 256 codes of an 8-bit image, black included, stand for light below a fraction of full light: the sRGB
    // codes (each decoded), against codes that were linear light stored directly.
    public static (int srgb, int linear) CodesBelow(float fraction)
    {
        int srgb = 0;
        int linear = 0;
        for (int c = 0; c < 256; c++)
        {
            if (SrgbDecode(c / 255f).linear < fraction) srgb++;
            if (c / 255f < fraction) linear++;
        }
        return (srgb, linear);
    }
    #endregion

    #region Luminance
    // The light the eye adds up from a linear color: Y = 0.2126 R + 0.7152 G + 0.0722 B (the sRGB primaries, ITU-R BT.709).
    public static float Luminance(Vector3 rgb)
    {
        float Y = 0.2126f * rgb.x + 0.7152f * rgb.y + 0.0722f * rgb.z;
        return Y;
    }
    #endregion

    #region Blending in two spaces
    // A 50 % mix of two colors. Averaging the codes gives codesMix; the eye averages light, so the right mix is the average of
    // the decoded values, then encoded. A fine checker of the two colors, seen from afar, has the luminance lightY.
    public static (Vector3 codesMix, Vector3 codesLight, Vector3 lightMix, Vector3 lightCodes, float codesY, float lightY, float ratio) BlendSpaces(Vector3 codeA, Vector3 codeB, float t)
    {
        Vector3 codesMix = codeA * (1f - t) + codeB * t;
        Vector3 codesLight = new Vector3(SrgbDecode(codesMix.x).linear, SrgbDecode(codesMix.y).linear, SrgbDecode(codesMix.z).linear);
        Vector3 lightA = new Vector3(SrgbDecode(codeA.x).linear, SrgbDecode(codeA.y).linear, SrgbDecode(codeA.z).linear);
        Vector3 lightB = new Vector3(SrgbDecode(codeB.x).linear, SrgbDecode(codeB.y).linear, SrgbDecode(codeB.z).linear);
        Vector3 lightMix = lightA * (1f - t) + lightB * t;
        Vector3 lightCodes = new Vector3(SrgbEncode(lightMix.x).code, SrgbEncode(lightMix.y).code, SrgbEncode(lightMix.z).code);
        float codesY = Luminance(codesLight);
        float lightY = Luminance(lightMix);
        float ratio = codesY / lightY;
        return (codesMix, codesLight, lightMix, lightCodes, codesY, lightY, ratio);
    }
    #endregion

    #region Lighting in two spaces
    // A texel with albedo code a, lit at a given N . L. Correct: decode the albedo, multiply the light, encode the result.
    // Wrong: multiply the code, as a shader does that skips the conversions. The second gives too little light, and more so for
    // partly lit surfaces.
    public static (float albedoLinear, float rightLight, float rightCode, float wrongCode, float wrongLight, float fraction) LightSpaces(float albedoCode, float nDotL)
    {
        float albedoLinear = SrgbDecode(albedoCode).linear;
        float rightLight = albedoLinear * nDotL;
        float rightCode = SrgbEncode(rightLight).code;
        float wrongCode = albedoCode * nDotL;
        float wrongLight = SrgbDecode(wrongCode).linear;
        float fraction = wrongLight / Mathf.Max(rightLight, Eps);
        return (albedoLinear, rightLight, rightCode, wrongCode, wrongLight, fraction);
    }
    #endregion
}
