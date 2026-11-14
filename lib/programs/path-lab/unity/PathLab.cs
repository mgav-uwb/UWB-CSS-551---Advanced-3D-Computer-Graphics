using System.Collections.Generic;
using UnityEngine;

// PathLab.cs: Monte Carlo integration and path tracing: the estimator and its error, sampling a direction, the solid angle and
// the cosine, the rendering equation's terms at a point, a Cornell box, next-event estimation, Russian roulette, one traced path,
// and the noise of an image. Plain C#, no MonoBehaviour: vectors and colors are Vector3. PathLabScene.cs shows a progressive
// render. No method changes its arguments, except that a random number generator advances when it is asked for a number.
// Each method returns its named intermediate results as a tuple, with the field names and the order of the object pathlab.js
// returns. mono's compiler rejects tuples over 7 fields, so the results with more are small structs declared below.
// The same functions, line for line where the languages allow, are pathlab.js in ../webgl/
// (lib/tests/programs/path-lab.test.mjs runs both on the same inputs and compares the numbers).
public static class PathLab
{
    public struct CosineEstimate { public Vector3[] dirs; public float[] cosines, pdfs, terms; public float sum, estimate, exact, error, relError; }
    public struct EstimatorStats { public int n, trials; public float[] estimates; public float mean, variance, stdDev, rmsRelError, meanStdErr, predicted; }
    public struct PatchResult { public Vector3 toPatch; public float r; public Vector3 direction; public float cosTheta, thetaDeg, solidAngle, flux, irradiance; }
    public struct HemisphereResult { public float dTheta; public float[] thetas, rings, cosines, parts; public float sum, hemisphere, exact, error; }
    public struct NextEvent { public Vector3 lightPoint, wi; public float r, cosSurface, cosLight; public bool visible; public float pdfArea, pdfSolidAngle, G; public Vector3 contribution; }
    public struct Hit { public bool hit; public float t; public int id; public Vector3 p, n, albedo; public float emission; }
    public class Rng { public long state; }
    public class Wall { public int axis; public float at; public int facing; public Vector3 albedo; }
    public class Sphere { public Vector3 center; public float radius; public Vector3 albedo; }
    public class Scene { public float lightSide, lightArea, lightY, emission; public Wall[] walls; public Sphere[] spheres; }
    public class PathOptions { public int maxDepth; public string roulette; public bool nee; public float clamp; public Vector3[] forced; }
    public class PathVertex
    {
        public int id; public Vector3 p, n, albedo; public float emission; public Vector3 throughput, throughputOut, lightPoint;
        public bool visible; public Vector3 direct, contribution; public float q; public Vector3 direction; public string stop;
    }
    public class PathResult
    {
        public PathVertex[] vertices; public Vector3 radiance, rawRadiance; public float[] byBounce; public int rays, bounces;
        public bool escaped, hitLight, clamped;
    }

    #region Settings and vector helpers
    // Below EPS a length counts as zero. Unity's Vector3 has these operations built in.
    public const float Eps = 1e-6f;
    public const float Offset = 1e-3f;    // a bounce ray starts this far off the surface, along the normal, so it cannot hit its own surface

    public static float Luminance(Vector3 c) { return 0.2126f * c.x + 0.7152f * c.y + 0.0722f * c.z; }
    #endregion

    #region Random numbers
    // A seeded generator (Park and Miller, 1988): the same seed gives the same numbers in both tracks, so a run can be repeated.
    // Each call returns a number strictly between 0 and 1 and advances the generator's state.
    public static Rng MakeRng(int seed)
    {
        Rng rng = new Rng();
        rng.state = (System.Math.Abs((long)seed) % 2147483646L) + 1;
        return rng;
    }

    public static float NextRandom(Rng rng)
    {
        rng.state = (rng.state * 16807L) % 2147483647L;
        return (float)((double)rng.state / 2147483647.0);
    }
    #endregion

    #region Directions: uniform
    // Two random numbers u1, u2 in [0, 1) become a direction on the hemisphere around z. Uniform in solid angle means cos(theta) is
    // the uniform variable, not theta: cos(theta) = u1, phi = 2 pi u2, and the density is 1/(2 pi) for every direction.
    public static (float cosTheta, float sinTheta, float phi, Vector3 dir, float pdf) UniformDirection(float u1, float u2)
    {
        float cosTheta = u1;
        float sinTheta = Mathf.Sqrt(Mathf.Max(0f, 1f - cosTheta * cosTheta));
        float phi = 2f * Mathf.PI * u2;
        Vector3 dir = new Vector3(sinTheta * Mathf.Cos(phi), sinTheta * Mathf.Sin(phi), cosTheta);
        float pdf = 1f / (2f * Mathf.PI);
        return (cosTheta, sinTheta, phi, dir, pdf);
    }
    #endregion

    #region Directions: cosine-weighted (Malley)
    // Malley's method: take a uniform point on the unit disk (radius sqrt(u1), angle 2 pi u2) and lift it straight up onto the
    // hemisphere. The disk's area is cos(theta) times the solid angle, so the density comes out cos(theta)/pi.
    public static (float r, float phi, float diskX, float diskY, float cosTheta, Vector3 dir, float pdf) CosineDirection(float u1, float u2)
    {
        float r = Mathf.Sqrt(u1);
        float phi = 2f * Mathf.PI * u2;
        float diskX = r * Mathf.Cos(phi);
        float diskY = r * Mathf.Sin(phi);
        float cosTheta = Mathf.Sqrt(Mathf.Max(0f, 1f - u1));
        Vector3 dir = new Vector3(diskX, diskY, cosTheta);
        float pdf = cosTheta / Mathf.PI;
        return (r, phi, diskX, diskY, cosTheta, dir, pdf);
    }
    #endregion

    #region A direction around the normal
    // A direction chosen around z is turned to sit around any normal n: build two unit vectors square to n and to each other, and
    // take the same combination of them.
    public static (Vector3 tangent, Vector3 bitangent, Vector3 dir) ToWorld(Vector3 normal, Vector3 local)
    {
        Vector3 helper = Mathf.Abs(normal.x) > 0.9f ? new Vector3(0f, 1f, 0f) : new Vector3(1f, 0f, 0f);
        Vector3 tangent = Vector3.Cross(helper, normal).normalized;
        Vector3 bitangent = Vector3.Cross(normal, tangent);
        Vector3 dir = tangent * local.x + bitangent * local.y + normal * local.z;
        return (tangent, bitangent, dir);
    }
    #endregion

    #region The estimator: one run
    // I = integral of f over the hemisphere is estimated by drawing N directions from a density p and averaging f/p. Here f is cos(theta),
    // so I = pi exactly. Stratified sampling splits [0, 1) into N equal strata for u1 and puts one sample in each.
    public static (float[] u1, float[] u2) DrawSamples(string method, int n, Rng rng)
    {
        float[] u1 = new float[n];
        float[] u2 = new float[n];
        for (int i = 0; i < n; i++)
        {
            float a = NextRandom(rng);
            float b = NextRandom(rng);
            if (method == "stratified") a = (i + a) / n;
            u1[i] = a;
            u2[i] = b;
        }
        return (u1, u2);
    }

    public static CosineEstimate EstimateCosineIntegral(string method, float[] u1, float[] u2)
    {
        int n = u1.Length;
        Vector3[] dirs = new Vector3[n];
        float[] cosines = new float[n];
        float[] pdfs = new float[n];
        float[] terms = new float[n];
        float sum = 0f;
        for (int i = 0; i < n; i++)
        {
            float cosTheta, pdf;
            Vector3 dir;
            if (method == "cosine")
            {
                var s = CosineDirection(u1[i], u2[i]);
                cosTheta = s.cosTheta; pdf = s.pdf; dir = s.dir;
            }
            else
            {
                var s = UniformDirection(u1[i], u2[i]);
                cosTheta = s.cosTheta; pdf = s.pdf; dir = s.dir;
            }
            dirs[i] = dir;
            cosines[i] = cosTheta;
            pdfs[i] = pdf;
            terms[i] = cosTheta / pdf;
            sum += cosTheta / pdf;
        }
        float estimate = sum / n;
        float exact = Mathf.PI;
        float error = estimate - exact;
        float relError = error / exact;
        CosineEstimate result = new CosineEstimate();
        result.dirs = dirs; result.cosines = cosines; result.pdfs = pdfs; result.terms = terms; result.sum = sum;
        result.estimate = estimate; result.exact = exact; result.error = error; result.relError = relError;
        return result;
    }
    #endregion

    #region The estimator: many runs
    // The error is random, so it is measured over many runs: the mean of the estimates (it sits on pi, which is what unbiased means),
    // their spread, and the root-mean-square error relative to pi. For uniform directions Y = 2 pi u has standard deviation 2 pi/sqrt(12),
    // 0.577 of pi, so the relative error is 0.577/sqrt(N); one sample per stratum gives 0.577/N^1.5; cosine weighting makes every term pi.
    public static float PredictedError(string method, int n)
    {
        float one = 2f * Mathf.PI / Mathf.Sqrt(12f) / Mathf.PI;
        if (method == "uniform") return one / Mathf.Sqrt(n);
        if (method == "stratified") return one / Mathf.Pow(n, 1.5f);
        return 0f;
    }

    public static EstimatorStats MeasureEstimator(string method, int n, int trials, int seed)
    {
        Rng rng = MakeRng(seed);
        float[] estimates = new float[trials];
        float total = 0f;
        for (int t = 0; t < trials; t++)
        {
            var s = DrawSamples(method, n, rng);
            float e = EstimateCosineIntegral(method, s.u1, s.u2).estimate;
            estimates[t] = e;
            total += e;
        }
        float mean = total / trials;
        float spread = 0f;
        float miss = 0f;
        for (int t = 0; t < trials; t++)
        {
            spread += (estimates[t] - mean) * (estimates[t] - mean);
            miss += (estimates[t] - Mathf.PI) * (estimates[t] - Mathf.PI);
        }
        float variance = spread / trials;
        float stdDev = Mathf.Sqrt(variance);
        float rmsRelError = Mathf.Sqrt(miss / trials) / Mathf.PI;
        float meanStdErr = stdDev / Mathf.Sqrt(trials);
        float predicted = PredictedError(method, n);
        EstimatorStats result = new EstimatorStats();
        result.n = n; result.trials = trials; result.estimates = estimates; result.mean = mean; result.variance = variance;
        result.stdDev = stdDev; result.rmsRelError = rmsRelError; result.meanStdErr = meanStdErr; result.predicted = predicted;
        return result;
    }
    #endregion

    #region A cone of directions
    // A cone of half angle a around a direction covers the solid angle 2 pi (1 - cos a): a half angle of 90 degrees is the hemisphere,
    // 2 pi, and 180 degrees is the whole sphere, 4 pi. The sun, seen from Earth, has a half angle of 0.2666 degrees.
    public static (float solidAngle, float fractionOfSphere) ConeSolidAngle(float halfAngleDeg)
    {
        float half = halfAngleDeg * Mathf.PI / 180f;
        float cap = 2f * Mathf.PI * (1f - Mathf.Cos(half));
        float fractionOfSphere = cap / (4f * Mathf.PI);
        return (cap, fractionOfSphere);
    }
    #endregion

    #region Solid angle of a patch
    // A solid angle is the area a shape covers on the unit sphere around the viewer, in steradians. A cone of half angle a covers
    // 2 pi (1 - cos a). A small patch of area dA, tilted theta away from facing the point and r away, covers dA cos(theta)/r^2.
    // A point source of intensity I sends I watts into every steradian, so the patch receives I times that, and E = I cos(theta)/r^2.
    public static PatchResult PatchSolidAngle(Vector3 point, Vector3 center, Vector3 normal, float area, float intensity)
    {
        Vector3 toPatch = center - point;
        float r = Mathf.Max(toPatch.magnitude, Eps);
        Vector3 direction = toPatch / r;
        float cosTheta = Mathf.Max(0f, -Vector3.Dot(normal, direction));
        float thetaDeg = Mathf.Acos(Mathf.Min(1f, cosTheta)) * 180f / Mathf.PI;
        float solidAngle = area * cosTheta / (r * r);
        float flux = intensity * solidAngle;
        float irradiance = flux / area;
        PatchResult result = new PatchResult();
        result.toPatch = toPatch; result.r = r; result.direction = direction; result.cosTheta = cosTheta; result.thetaDeg = thetaDeg;
        result.solidAngle = solidAngle; result.flux = flux; result.irradiance = irradiance;
        return result;
    }
    #endregion

    #region The cosine over the hemisphere
    // In angles, a ring of the hemisphere between theta and theta + dTheta has solid angle 2 pi sin(theta) dTheta. Weighting each ring
    // by cos(theta) and adding them is the midpoint rule for the integral of cos(theta) over the hemisphere, which is pi. A matte
    // surface that reflects a fraction rho equally in every direction therefore has f = rho/pi, since f times the integral must be rho.
    public static (float f, float reflected) LambertBrdf(float rho, float cosineIntegral)
    {
        float f = rho / Mathf.PI;
        float reflected = f * cosineIntegral;
        return (f, reflected);
    }

    public static HemisphereResult HemisphereCosine(int strips)
    {
        float dTheta = (Mathf.PI / 2f) / strips;
        float[] thetas = new float[strips];
        float[] rings = new float[strips];
        float[] cosines = new float[strips];
        float[] parts = new float[strips];
        float sum = 0f;
        float hemisphere = 0f;
        for (int i = 0; i < strips; i++)
        {
            float theta = (i + 0.5f) * dTheta;
            float ring = 2f * Mathf.PI * Mathf.Sin(theta) * dTheta;
            thetas[i] = theta;
            rings[i] = ring;
            cosines[i] = Mathf.Cos(theta);
            parts[i] = Mathf.Cos(theta) * ring;
            sum += Mathf.Cos(theta) * ring;
            hemisphere += ring;
        }
        float exact = Mathf.PI;
        float error = sum - exact;
        HemisphereResult result = new HemisphereResult();
        result.dTheta = dTheta; result.thetas = thetas; result.rings = rings; result.cosines = cosines; result.parts = parts;
        result.sum = sum; result.hemisphere = hemisphere; result.exact = exact; result.error = error;
        return result;
    }
    #endregion

    #region The rendering equation at a point
    // Lo = Le + the sum over incoming directions of f * Li * cos(theta) * dOmega. With a few small lights each one enters as the product
    // Li*dOmega, and a matte surface has the constant f = rho/pi. A light below the horizon has a negative cosine and contributes nothing.
    public static (float f, float[] cosines, float[] angles, float[] terms, float sum, float Lo) RenderingTerms(float rho, Vector3 normal, Vector3[] dirs, float[] lightIn, float emitted)
    {
        float f = rho / Mathf.PI;
        float[] cosines = new float[dirs.Length];
        float[] angles = new float[dirs.Length];
        float[] terms = new float[dirs.Length];
        float sum = 0f;
        for (int i = 0; i < dirs.Length; i++)
        {
            float c = Vector3.Dot(normal, dirs[i].normalized);
            float cosTheta = Mathf.Max(0f, c);
            cosines[i] = cosTheta;
            angles[i] = Mathf.Acos(Mathf.Max(-1f, Mathf.Min(1f, c))) * 180f / Mathf.PI;
            terms[i] = f * lightIn[i] * cosTheta;
            sum += f * lightIn[i] * cosTheta;
        }
        float Lo = emitted + sum;
        return (f, cosines, angles, terms, sum, Lo);
    }
    #endregion

    #region Bounces add up
    // In a closed room where every surface reflects a fraction rho and the light spreads evenly, the direct light arrives once, a
    // fraction rho of it arrives again after one bounce, rho squared after two. The total is the geometric series 1/(1 - rho).
    // A renderer that stops after `depth` bounces keeps the first depth + 1 terms and loses the rest.
    public static (float[] terms, float sum, float limit, float fraction) BounceSeries(float rho, int depth)
    {
        float[] terms = new float[depth + 1];
        float sum = 0f;
        float power = 1f;
        for (int k = 0; k <= depth; k++)
        {
            terms[k] = power;
            sum += power;
            power *= rho;
        }
        float limit = 1f / (1f - rho);
        float fraction = sum / limit;
        return (terms, sum, limit, fraction);
    }
    #endregion

    #region Sampling the light by area
    // Pick a point on the light uniformly by area, density pA = 1/A. The rendering equation integrates over solid angle, so the density
    // changes: p(omega) = pA r^2 / cos(theta_light), since a patch of the light subtends less solid angle as r^2 grows or as it
    // turns edge-on. The estimate is f * Le * G / pA, with the geometry term G = cos(theta_surface) cos(theta_light) / r^2.
    public static (float pdfArea, float pdfSolidAngle, float G, float weight) AreaLightSample(float lightArea, float r, float cosSurface, float cosLight, float Le)
    {
        float pdfArea = 1f / lightArea;
        float pdfSolidAngle = cosLight > Eps ? pdfArea * r * r / cosLight : float.PositiveInfinity;
        float G = cosSurface * cosLight / (r * r);
        float weight = Le * G / pdfArea;
        return (pdfArea, pdfSolidAngle, G, weight);
    }
    #endregion

    #region The Cornell box
    // A box 3 wide, 3 tall and 3 deep with its front open: a red left wall, a green right wall, a white floor, ceiling and back wall,
    // two white spheres, and a square light just under the ceiling facing down. A wall is an axis, a position along it, and which way
    // it faces. Albedo is the fraction of light a surface reflects. The light's power is fixed, so a smaller light is brighter.
    public const float Half = 1.5f;
    public const float LightPower = 10f;
    public static readonly Vector3 Eye = new Vector3(0f, 0f, 5.2f);
    public static readonly float TanHalfFov = Mathf.Tan(21f * Mathf.PI / 180f);

    static Wall MakeWall(int axis, float at, int facing, Vector3 albedo)
    {
        Wall w = new Wall();
        w.axis = axis; w.at = at; w.facing = facing; w.albedo = albedo;
        return w;
    }

    static Sphere MakeSphere(Vector3 center, float radius, Vector3 albedo)
    {
        Sphere s = new Sphere();
        s.center = center; s.radius = radius; s.albedo = albedo;
        return s;
    }

    public static Scene MakeCornell(float lightSide)
    {
        float lightArea = lightSide * lightSide;
        float emission = LightPower / lightArea;
        Vector3 white = new Vector3(0.75f, 0.75f, 0.75f);
        Wall[] walls = {
            MakeWall(0, -Half, 1, new Vector3(0.75f, 0.15f, 0.15f)),
            MakeWall(0, Half, -1, new Vector3(0.15f, 0.6f, 0.15f)),
            MakeWall(1, -Half, 1, white),
            MakeWall(1, Half, -1, white),
            MakeWall(2, -Half, 1, white),
        };
        Sphere[] spheres = {
            MakeSphere(new Vector3(-0.6f, -1.0f, -0.4f), 0.5f, new Vector3(0.8f, 0.8f, 0.8f)),
            MakeSphere(new Vector3(0.6f, -1.1f, 0.4f), 0.4f, new Vector3(0.8f, 0.8f, 0.8f)),
        };
        Scene scene = new Scene();
        scene.lightSide = lightSide; scene.lightArea = lightArea; scene.lightY = 1.49f; scene.emission = emission;
        scene.walls = walls; scene.spheres = spheres;
        return scene;
    }

    public static (Vector3 origin, Vector3 direction) CameraRay(int px, int py, int size, float jx, float jy)
    {
        float sx = ((px + jx) / size * 2f - 1f) * TanHalfFov;
        float sy = (1f - (py + jy) / size * 2f) * TanHalfFov;
        Vector3 direction = new Vector3(sx, sy, -1f).normalized;
        return (Eye, direction);
    }
    #endregion

    #region Intersecting the box
    // The nearest surface along a ray: each wall is a plane cut off at the box's edges, each sphere solves a quadratic, and the light
    // is a square seen only from below. The result names the surface (id 0-4 walls, 5-6 spheres, 7 the light), the hit point, the
    // normal, the albedo and the emission. A ray that leaves through the open front hits nothing. A wall is cut off 1e-4 past the
    // box's edge, so a ray through a corner cannot slip through the crack between two walls.
    public static Hit Intersect(Scene scene, Vector3 o, Vector3 d)
    {
        float t = float.PositiveInfinity;
        int id = -1;
        Vector3 n = Vector3.zero;
        Vector3 albedo = Vector3.zero;
        float emission = 0f;
        for (int i = 0; i < scene.walls.Length; i++)
        {
            Wall w = scene.walls[i];
            if (Mathf.Abs(d[w.axis]) < Eps) continue;
            float tw = (w.at - o[w.axis]) / d[w.axis];
            if (tw <= 1e-4f || tw >= t) continue;
            Vector3 p = o + d * tw;
            bool inside = true;
            for (int k = 0; k < 3; k++)
            {
                if (k != w.axis && Mathf.Abs(p[k]) > Half + 1e-4f) inside = false;
            }
            if (!inside) continue;
            t = tw;
            id = i;
            n = new Vector3(w.axis == 0 ? w.facing : 0, w.axis == 1 ? w.facing : 0, w.axis == 2 ? w.facing : 0);
            albedo = w.albedo;
            emission = 0f;
        }
        for (int i = 0; i < scene.spheres.Length; i++)
        {
            Sphere s = scene.spheres[i];
            Vector3 oc = o - s.center;
            float b = Vector3.Dot(oc, d);
            float disc = b * b - (Vector3.Dot(oc, oc) - s.radius * s.radius);
            if (disc < 0f) continue;
            float root = Mathf.Sqrt(disc);
            float ts = -b - root;
            if (ts <= 1e-4f) ts = -b + root;
            if (ts <= 1e-4f || ts >= t) continue;
            t = ts;
            id = 5 + i;
            n = (o + d * ts - s.center) / s.radius;
            albedo = s.albedo;
            emission = 0f;
        }
        if (d.y > Eps)
        {
            float tl = (scene.lightY - o.y) / d.y;
            Vector3 q = o + d * tl;
            float half = scene.lightSide / 2f;
            if (tl > 1e-4f && tl < t && Mathf.Abs(q.x) <= half && Mathf.Abs(q.z) <= half)
            {
                t = tl;
                id = 7;
                n = new Vector3(0f, -1f, 0f);
                albedo = Vector3.zero;
                emission = scene.emission;
            }
        }
        bool hit = id >= 0;
        Vector3 point = hit ? o + d * t : Vector3.zero;
        Hit result = new Hit();
        result.hit = hit; result.t = t; result.id = id; result.p = point; result.n = n; result.albedo = albedo; result.emission = emission;
        return result;
    }
    #endregion

    #region Russian roulette
    // Stop a path at random and boost the survivors: continue with probability q and divide what the rest of the path contributes by q,
    // so the expected value is q * (X/q) + (1 - q) * 0 = X, unchanged; only the variance grows. Roulette starts after two bounces.
    // mode "fixed" uses q = 0.7; mode "throughput" uses q = the luminance of the throughput so far, so dark paths die young (with a
    // floor of 0.05 so that no boost exceeds 20); "off" never stops. The chance of still walking after `bounces` more is q^bounces.
    public static (float reach, float extra) RouletteReach(float q, int bounces)
    {
        float reach = Mathf.Pow(q, bounces);
        float extra = q / (1f - q);
        return (reach, extra);
    }

    public static (float q, float boost, float luminance) RouletteQ(string mode, int depth, Vector3 throughput)
    {
        float lum = Luminance(throughput);
        float q = 1f;
        if (mode == "fixed" && depth >= 2) q = 0.7f;
        if (mode == "throughput" && depth >= 2) q = Mathf.Min(0.95f, Mathf.Max(0.05f, lum));
        float boost = 1f / q;
        return (q, boost, lum);
    }
    #endregion

    #region Next-event estimation
    // At a surface point, one more estimate of the light that arrives straight from the light: a random point on it, a shadow ray to
    // that point, and the area-to-solid-angle weight from areaLightSample. A blocked shadow ray, or a point facing away, contributes 0.
    public static NextEvent NextEventEstimate(Scene scene, Vector3 p, Vector3 n, Vector3 albedo, float u1, float u2)
    {
        float half = scene.lightSide / 2f;
        Vector3 lightPoint = new Vector3(-half + u1 * scene.lightSide, scene.lightY, -half + u2 * scene.lightSide);
        Vector3 toLight = lightPoint - p;
        float r = toLight.magnitude;
        Vector3 wi = toLight / r;
        float cosSurface = Mathf.Max(0f, Vector3.Dot(n, wi));
        float cosLight = Mathf.Max(0f, wi.y);
        Hit shadow = Intersect(scene, p + n * Offset, wi);
        bool clear = !shadow.hit || shadow.t > r - 0.01f;
        bool visible = clear && cosSurface > 0f && cosLight > 0f;
        var light = AreaLightSample(scene.lightArea, r, cosSurface, cosLight, scene.emission);
        Vector3 contribution = visible ? albedo * (light.weight / Mathf.PI) : Vector3.zero;
        NextEvent result = new NextEvent();
        result.lightPoint = lightPoint; result.wi = wi; result.r = r; result.cosSurface = cosSurface; result.cosLight = cosLight;
        result.visible = visible; result.pdfArea = light.pdfArea; result.pdfSolidAngle = light.pdfSolidAngle; result.G = light.G;
        result.contribution = contribution;
        return result;
    }
    #endregion

    #region One path
    // Kajiya's estimator, one sample. At each hit: add the light a shadow ray finds (next-event estimation), or, without it, the
    // emission when the path lands on the light; then take one cosine-weighted bounce, which for a diffuse surface multiplies the
    // throughput by the albedo (f cos/p = albedo). Roulette may end the walk and boosts the survivors by 1/q. maxDepth counts the
    // bounces: 0 is direct light only. options.forced may name a bounce direction for a depth (a zero vector leaves it random).
    public static PathVertex NewVertex(Hit hit, Vector3 throughput)
    {
        PathVertex v = new PathVertex();
        v.id = hit.id; v.p = hit.p; v.n = hit.n;
        v.albedo = hit.albedo; v.emission = hit.emission;
        v.throughput = throughput; v.throughputOut = Vector3.zero;
        v.lightPoint = Vector3.zero; v.visible = false;
        v.direct = Vector3.zero; v.contribution = Vector3.zero;
        v.q = 1f; v.direction = Vector3.zero; v.stop = "none";
        return v;
    }

    public static PathResult TracePath(Scene scene, Vector3 origin, Vector3 direction, Rng rng, PathOptions options)
    {
        List<PathVertex> vertices = new List<PathVertex>();
        float[] byBounce = new float[options.maxDepth + 1];
        int last = options.nee ? options.maxDepth : options.maxDepth + 1;
        Vector3 o = origin;
        Vector3 d = direction;
        Vector3 throughput = new Vector3(1f, 1f, 1f);
        Vector3 radiance = Vector3.zero;
        int rays = 1;
        bool escaped = false;
        bool hitLight = false;
        for (int depth = 0; depth <= last; depth++)
        {
            Hit hit = Intersect(scene, o, d);
            if (!hit.hit) { escaped = true; break; }
            PathVertex v = NewVertex(hit, throughput);
            vertices.Add(v);
            if (hit.emission > 0f)
            {
                hitLight = true;
                v.stop = "light";
                if (depth == 0 || !options.nee)
                {
                    v.contribution = throughput * hit.emission;
                    radiance = radiance + v.contribution;
                    byBounce[options.nee ? 0 : Mathf.Max(0, depth - 1)] += Luminance(v.contribution);
                }
                break;
            }
            if (options.nee)
            {
                NextEvent ne = NextEventEstimate(scene, hit.p, hit.n, hit.albedo, NextRandom(rng), NextRandom(rng));
                rays += 1;
                v.lightPoint = ne.lightPoint;
                v.visible = ne.visible;
                v.direct = ne.contribution;
                v.contribution = Vector3.Scale(throughput, ne.contribution);
                radiance = radiance + v.contribution;
                byBounce[depth] += Luminance(v.contribution);
            }
            v.throughputOut = Vector3.Scale(throughput, hit.albedo);
            if (depth >= last) { v.stop = "depth"; break; }
            var roulette = RouletteQ(options.roulette, depth, throughput);
            v.q = roulette.q;
            if (roulette.q < 1f && NextRandom(rng) > roulette.q) { v.stop = "roulette"; break; }
            bool aimed = options.forced != null && depth < options.forced.Length && options.forced[depth].magnitude > 0.5f;
            var bounce = CosineDirection(NextRandom(rng), NextRandom(rng));
            v.direction = aimed ? options.forced[depth] : ToWorld(hit.n, bounce.dir).dir;
            throughput = v.throughputOut * roulette.boost;
            o = hit.p + hit.n * Offset;
            d = v.direction;
            rays += 1;
        }
        float peak = Mathf.Max(radiance.x, Mathf.Max(radiance.y, radiance.z));
        bool clamped = options.clamp > 0f && peak > options.clamp;
        Vector3 rawRadiance = radiance;
        if (clamped) radiance = radiance * (options.clamp / peak);
        int bounces = Mathf.Max(0, vertices.Count - 1);
        PathResult result = new PathResult();
        result.vertices = vertices.ToArray(); result.radiance = radiance; result.rawRadiance = rawRadiance; result.byBounce = byBounce;
        result.rays = rays; result.bounces = bounces; result.escaped = escaped; result.hitLight = hitLight; result.clamped = clamped;
        return result;
    }
    #endregion

    #region Direct light, two ways
    // The light that arrives straight from the light, at a point p with normal n and albedo rho, estimated by sampling the light's area
    // (next-event estimation) or by a cosine-weighted bounce that counts only if it lands on the light (f cos/p = rho, times Le).
    // exactDirect adds up a fine grid of points on the light for the reference; measureDirect repeats an estimate to measure its error.
    public static (float[] samples, Vector3[] hits, float mean) EstimateDirect(Scene scene, Vector3 p, Vector3 n, float rho, string strategy, int count, Rng rng)
    {
        Vector3 white = new Vector3(rho, rho, rho);
        float[] samples = new float[count];
        Vector3[] hits = new Vector3[count];
        float total = 0f;
        for (int i = 0; i < count; i++)
        {
            float value = 0f;
            Vector3 hitPoint = Vector3.zero;
            if (strategy == "light")
            {
                NextEvent ne = NextEventEstimate(scene, p, n, white, NextRandom(rng), NextRandom(rng));
                value = ne.contribution.x;
                hitPoint = ne.lightPoint;
            }
            else
            {
                var bounce = CosineDirection(NextRandom(rng), NextRandom(rng));
                Vector3 dir = ToWorld(n, bounce.dir).dir;
                Hit h = Intersect(scene, p + n * Offset, dir);
                if (h.hit && h.emission > 0f) { value = rho * h.emission; hitPoint = h.p; }
            }
            samples[i] = value;
            hits[i] = hitPoint;
            total += value;
        }
        float average = total / count;
        return (samples, hits, average);
    }

    public static float ExactDirect(Scene scene, Vector3 p, Vector3 n, float rho, int grid)
    {
        Vector3 white = new Vector3(rho, rho, rho);
        float total = 0f;
        for (int i = 0; i < grid; i++)
        {
            for (int j = 0; j < grid; j++)
            {
                NextEvent ne = NextEventEstimate(scene, p, n, white, (i + 0.5f) / grid, (j + 0.5f) / grid);
                total += ne.contribution.x;
            }
        }
        return total / (grid * grid);
    }

    public static (float exact, float[] estimates, float mean, float stdDev, float rmsRelError, float meanStdErr) MeasureDirect(Scene scene, Vector3 p, Vector3 n, float rho, string strategy, int count, int trials, int seed)
    {
        Rng rng = MakeRng(seed);
        float exact = ExactDirect(scene, p, n, rho, 48);
        float[] estimates = new float[trials];
        float total = 0f;
        for (int t = 0; t < trials; t++)
        {
            float e = EstimateDirect(scene, p, n, rho, strategy, count, rng).mean;
            estimates[t] = e;
            total += e;
        }
        float mean = total / trials;
        float spread = 0f;
        float miss = 0f;
        for (int t = 0; t < trials; t++)
        {
            spread += (estimates[t] - mean) * (estimates[t] - mean);
            miss += (estimates[t] - exact) * (estimates[t] - exact);
        }
        float stdDev = Mathf.Sqrt(spread / trials);
        float rmsRelError = exact > 0f ? Mathf.Sqrt(miss / trials) / exact : 0f;
        float meanStdErr = stdDev / Mathf.Sqrt(trials);
        return (exact, estimates, mean, stdDev, rmsRelError, meanStdErr);
    }
    #endregion

    #region Noise, measured
    // A pixel's value is the mean of its samples, and the spread of the samples gives the error of that mean: the standard error
    // sqrt(variance/N), which falls as 1/sqrt(N). The image's noise is the root-mean-square standard error over the pixels, relative to
    // the image's mean value. sums holds each pixel's total of the sample values, squares its total of their squares.
    public static (float mean, float standardError, float noise) ImageNoise(float[] sums, float[] squares, int n)
    {
        int pixels = sums.Length;
        float meanTotal = 0f;
        float seSquares = 0f;
        for (int i = 0; i < pixels; i++)
        {
            float m = sums[i] / n;
            float variance = n > 1 ? Mathf.Max(0f, squares[i] / n - m * m) * n / (n - 1) : 0f;
            meanTotal += m;
            seSquares += variance / n;
        }
        float mean = meanTotal / pixels;
        float standardError = Mathf.Sqrt(seSquares / pixels);
        float noise = mean > 0f && n > 1 ? standardError / mean : 0f;
        return (mean, standardError, noise);
    }
    #endregion

    #region Fireflies
    // A path that reaches a small, bright light by a bounce chosen at random scores enormously. A light of solid angle w and radiance
    // Le is hit by a uniform direction with probability w/(2 pi), and that one sample is worth Le/p = Le * 2 pi, while the true value
    // of the pixel is about 1. Averaging removes the spike only slowly; clamping removes it and adds bias.
    public static (float pdf, float probability, float sample, float oneIn) FireflyValue(float radiance, float solidAngle)
    {
        float pdf = 1f / (2f * Mathf.PI);
        float probability = solidAngle / (2f * Mathf.PI);
        float sample = radiance / pdf;
        float oneIn = 1f / probability;
        return (pdf, probability, sample, oneIn);
    }
    #endregion
}
