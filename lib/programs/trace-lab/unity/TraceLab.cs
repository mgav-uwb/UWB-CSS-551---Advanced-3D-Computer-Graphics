using System.Collections.Generic;
using UnityEngine;

// TraceLab.cs: one Cornell box traced two ways. The box of the path lab (red and green walls, a square light under the ceiling)
// holds a mirror sphere, a glass sphere and a tall white box. Whitted's tracer follows mirror and refraction rays and sends shadow
// rays to the light (one to its center, or N spread over it: Cook's distributed rays). The path tracer follows one random path
// per sample, with next-event estimation, Russian roulette, and mirror and glass bounces, and finds what Whitted cannot: color
// bleeding, caustics, light around corners. Both use the same direct-light formula, so their images differ only where the
// lecture says they differ. Plain C#, no MonoBehaviour: vectors and colors are Vector3. TraceLabScene.cs draws the two images.
// No method changes its arguments, except that a random number generator advances when it is asked for a number.
// A result with more than seven fields is a small struct or class declared below, with the field names and the order of the
// object tracelab.js returns, because mono's compiler rejects tuples over 7 fields.
// The same functions, line for line where the languages allow, are tracelab.js in ../webgl/
// (lib/tests/programs/trace-lab.test.mjs runs both on the same inputs and compares the numbers).
public static class TraceLab
{
    // ---- the results and the scene, as structs and classes
    public class Rng { public long state; }
    public struct Basis { public Vector3 u, v, w; }
    public struct PixelRayResult { public float sx, sy, tanHalf; public Vector3 toward, dir; }
    public class Wall { public int axis; public float at; public int facing; public Vector3 albedo; }
    public class MirrorSphere { public Vector3 center; public float radius, reflectance; }
    public class GlassSphere { public Vector3 center; public float radius, ior; }
    public class TurnedBox { public Vector3 center, half, lo; public float radius, cos, sin; public Vector3 albedo; }
    public class Scene
    {
        public float lightX, lightZ, lightSide, lightArea, lightY, emission, power; public Wall[] walls;
        public MirrorSphere mirror; public GlassSphere glass; public TurnedBox box;
    }
    public class RayCamera { public Vector3 eye, look; public float fovDeg; public int width, height; }
    public struct BoxHit { public float tEnter, tExit; public int axis; public string kind; public float t; public Vector3 n; }
    public struct TurnedBoxHit { public Vector3 oLocal, dLocal; public string kind; public float t; public int axis; public Vector3 n; }
    public struct Hit { public bool hit; public float t; public int id; public string material; public Vector3 p, n, albedo; public float emission; }
    public class SnellResult { public float cosI, eta, k; public bool tir; public Vector3 reflected, refracted; public float f0, fSchlick, kReflect, kRefract; }
    public struct LightSample { public float pdfArea, Le, pdfSolidAngle, G, weight; }
    public struct NextEvent { public Vector3 lightPoint, wi; public float r, cosSurface, cosLight; public bool visible; public int blocker; public float blockerT, G; public Vector3 contribution; }
    public class DirectResult { public int count; public NextEvent[] samples; public int lit; public float fraction; public Vector3 contribution; }
    public struct ExactResult { public Vector3 contribution; public float fraction; }
    public struct WhittedOptions { public int maxDepth, shadowRays; }
    public class RayNode
    {
        public string kind; public int level; public Vector3 o, d; public float t; public int id; public string material; public Vector3 p, n;
        public bool entering; public DirectResult direct; public Vector3 local; public SnellResult bend; public float wReflect, wRefract;
        public bool truncated; public RayNode reflection, refraction; public Vector3 color; public int rays;
    }
    public class TreeRow { public int id, parent; public string kind; public int level; public float weight, accum; public Vector3 local, contribution; public RayNode node; public bool isShadow; }
    public struct TreeResult { public TreeRow[] rows; public Vector3 sum; public int shadowRays, truncatedRays, rays; }
    public struct RenderResult { public int y0, y1; public float[] pixels; public int rays; }
    public class PathOptions { public int maxDepth; public string roulette; public bool nee; }
    public class PathVertex
    {
        public int id; public string material; public Vector3 p, n, albedo; public float emission; public Vector3 throughput, throughputOut, lightPoint;
        public bool visible; public int blocker; public Vector3 direct, contribution; public float q, F; public string @event; public Vector3 direction; public string stop;
    }
    public class PathResult { public PathVertex[] vertices; public Vector3 radiance; public int rays, bounces; public bool escaped, hitLight; }
    public struct LightPathsResult { public string word; public string[] names; public Vector3[] contributions; public bool[] viaRed, caustic; }
    public struct PixelSampleResult { public int k; public float jx, jy, sx, sy; public Vector3 dir; public PathResult path; }
    public class Totals { public int count; public Vector3 sum; public float sumLum, sumSquares; public Vector3 red, caustic; public int causticPaths, zeroPaths; public float[] running; }
    public struct Estimate { public int n; public Vector3 mean; public float meanLum, variance, standardError, redShare, causticShare, redOverGreen; }
    public struct PassResult { public int k, first, last; public float[] pixels; public int rays; }

    #region Settings and vector helpers
    // Below EPS a length counts as zero. A ray that leaves a surface starts OFFSET off it, along the normal, so it cannot hit the
    // surface it leaves. Unity's Vector3 has add, subtract, scale, Dot, Cross and Scale (the product of components) built in.
    public const float Eps = 1e-6f;
    public const float Offset = 1e-3f;

    public static Vector3 Normalize(Vector3 a)
    {
        float l = a.magnitude;
        return l > Eps ? a * (1f / l) : Vector3.zero;
    }
    public static Vector3 Reflect(Vector3 d, Vector3 n) { return d - n * (2f * Vector3.Dot(d, n)); }
    public static float Luminance(Vector3 c) { return 0.2126f * c.x + 0.7152f * c.y + 0.0722f * c.z; }
    #endregion

    #region Random numbers
    // A seeded generator (Park and Miller, 1988): the same seed gives the same numbers in both tracks. Each call returns a number
    // strictly between 0 and 1 and advances the state. Path k of pixel (px, py) has its own seed, so any path can be traced again
    // alone: the three numbers become one integer, and an integer hash (Wellons' lowbias32) scrambles its bits, so that neighboring
    // pixels and neighboring paths do not start their generators on neighboring states.
    public static Rng MakeRng(long seed)
    {
        Rng rng = new Rng();
        rng.state = (System.Math.Abs(seed) % 2147483646L) + 1;
        return rng;
    }

    public static float NextRandom(Rng rng)
    {
        rng.state = (rng.state * 16807L) % 2147483647L;
        return (float)((double)rng.state / 2147483647.0);
    }

    public static long PathSeed(int px, int py, int k)
    {
        uint h = (uint)((long)k * 65536 + py * 256 + px);    // one integer per pixel and path: px, py < 256, k < 65536
        h = (h ^ (h >> 16)) * 0x7feb352dU;
        h = (h ^ (h >> 15)) * 0x846ca68bU;
        h = h ^ (h >> 16);
        return h;
    }
    #endregion

    #region The ray through a pixel
    // The camera has eye e and basis u (right), v (up), w (backward). Pixel (px, py) of a width by height image is the square
    // [px, px + 1] x [py, py + 1]; the point (jx, jy) inside it (0.5, 0.5 is its center) has screen coordinates (sx, sy) in [-1, 1].
    // The ray runs from the eye through that point of the image plane, one unit in front of the eye. Whitted's tracer sends one ray
    // through each pixel's center; the path tracer starts each path at a random point of the pixel's square, which antialiases.
    public static Basis LookAtBasis(Vector3 eye, Vector3 target, Vector3 up)
    {
        Basis b;
        b.w = Normalize(eye - target);
        b.u = Normalize(Vector3.Cross(up, b.w));
        b.v = Vector3.Cross(b.w, b.u);
        return b;
    }

    public static PixelRayResult PixelRay(Vector3 eye, Basis basis, float fovDeg, int width, int height, int px, int py, float jx, float jy)
    {
        PixelRayResult r;
        r.tanHalf = Mathf.Tan(fovDeg * Mathf.PI / 360f);
        r.sx = 2f * (px + jx) / width - 1f;
        r.sy = 1f - 2f * (py + jy) / height;
        Vector3 across = basis.u * (r.sx * r.tanHalf * ((float)width / height));
        Vector3 upward = basis.v * (r.sy * r.tanHalf);
        r.toward = across + upward - basis.w;    // the point on the image plane, from the eye
        r.dir = Normalize(r.toward);
        return r;
    }
    #endregion

    #region The Cornell box and its three objects
    // The path lab's box: 3 wide, 3 tall and 3 deep, open at the front, a red left wall, a green right wall, white floor, ceiling and
    // back wall, with the textbook's albedos (the fraction of light a surface reflects). In it: a mirror sphere that reflects 90 %,
    // a glass sphere of index 1.5, and a tall white box turned about y so that one face looks at the red wall. The light is a square
    // just under the ceiling, facing down, centered at (lightX, lightZ). Its power Le A is fixed, so a smaller light is brighter; side 0
    // is a point light. Surfaces are numbered: walls 0 to 4, mirror 5, glass 6, box 7, light 8.
    public const float Half = 1.5f;
    public const float LightPower = 10f;
    public const float LightY = 1.49f;
    public const int RedWall = 0;
    public const int GreenWall = 1;
    public const int Floor = 2;
    public const int Ceiling = 3;
    public const int BackWall = 4;
    public const int Mirror = 5;
    public const int Glass = 6;
    public const int Box = 7;
    public const int Light = 8;

    static Wall MakeWall(int axis, float at, int facing, Vector3 albedo)
    {
        Wall w = new Wall();
        w.axis = axis; w.at = at; w.facing = facing; w.albedo = albedo;
        return w;
    }

    public static Scene MakeScene(float lightX, float lightZ, float lightSide)
    {
        Scene s = new Scene();
        s.lightX = lightX; s.lightZ = lightZ; s.lightSide = lightSide;
        s.lightArea = lightSide * lightSide;
        s.emission = s.lightArea > 0f ? LightPower / s.lightArea : 0f;
        Vector3 white = new Vector3(0.75f, 0.75f, 0.75f);
        s.walls = new Wall[] {
            MakeWall(0, -Half, 1, new Vector3(0.75f, 0.15f, 0.15f)),
            MakeWall(0, Half, -1, new Vector3(0.15f, 0.6f, 0.15f)),
            MakeWall(1, -Half, 1, white),
            MakeWall(1, Half, -1, white),
            MakeWall(2, -Half, 1, white),
        };
        s.mirror = new MirrorSphere(); s.mirror.center = new Vector3(0.1f, -1.05f, -0.85f); s.mirror.radius = 0.45f; s.mirror.reflectance = 0.9f;
        s.glass = new GlassSphere(); s.glass.center = new Vector3(0.65f, -1f, 0.65f); s.glass.radius = 0.5f; s.glass.ior = 1.5f;
        float turn = 40f * Mathf.PI / 180f;
        Vector3 half = new Vector3(0.33f, 0.8f, 0.33f);
        s.box = new TurnedBox(); s.box.center = new Vector3(-0.8f, -0.7f, -0.55f); s.box.half = half; s.box.lo = -half; s.box.radius = half.magnitude;
        s.box.cos = Mathf.Cos(turn); s.box.sin = Mathf.Sin(turn); s.box.albedo = white;
        s.lightY = LightY;
        s.power = LightPower;
        return s;
    }
    #endregion

    #region Ray against a box turned about y
    // An axis-aligned box is three slabs (Kay and Kajiya, 1986): along each axis the ray is between the two planes for t from
    // (lo - o) / d to (hi - o) / d, and it is inside the box where the three intervals overlap. A box turned by an angle about y is
    // the same test in the box's own frame: move the ray's origin by -center and turn origin and direction by -angle; t does not
    // change, and the normal found there is turned back by +angle.
    static Vector2 Slab(float o, float d, float lo, float hi)
    {
        if (Mathf.Abs(d) < 1e-12f) return o >= lo && o <= hi ? new Vector2(-Mathf.Infinity, Mathf.Infinity) : new Vector2(Mathf.Infinity, -Mathf.Infinity);
        float ta = (lo - o) / d;
        float tb = (hi - o) / d;
        return ta < tb ? new Vector2(ta, tb) : new Vector2(tb, ta);
    }

    public static BoxHit RayBox(Vector3 o, Vector3 d, Vector3 lo, Vector3 hi)
    {
        Vector2 x = Slab(o.x, d.x, lo.x, hi.x);
        Vector2 y = Slab(o.y, d.y, lo.y, hi.y);
        Vector2 z = Slab(o.z, d.z, lo.z, hi.z);
        BoxHit r;
        r.tEnter = Mathf.Max(x.x, Mathf.Max(y.x, z.x));
        r.tExit = Mathf.Min(x.y, Mathf.Min(y.y, z.y));
        int axisEnter = x.x >= y.x && x.x >= z.x ? 0
            : y.x >= z.x ? 1 : 2;
        int axisExit = x.y <= y.y && x.y <= z.y ? 0
            : y.y <= z.y ? 1 : 2;
        r.kind = "hit";
        if (r.tEnter > r.tExit) r.kind = "miss";
        else if (r.tExit <= 0f) r.kind = "behind";
        else if (r.tEnter <= 0f) r.kind = "inside";
        r.t = r.kind == "hit" ? r.tEnter : r.kind == "inside" ? r.tExit : Mathf.Infinity;
        r.axis = r.kind == "inside" ? axisExit : axisEnter;
        r.n = Vector3.zero;
        float heading = d[r.axis] > 0f ? 1f : -1f;
        if (r.t < Mathf.Infinity) r.n[r.axis] = r.kind == "inside" ? heading : -heading;
        return r;
    }

    public static TurnedBoxHit RayTurnedBox(Vector3 o, Vector3 d, TurnedBox box)
    {
        Vector3 rel = o - box.center;
        TurnedBoxHit r;
        r.oLocal = new Vector3(box.cos * rel.x - box.sin * rel.z, rel.y, box.sin * rel.x + box.cos * rel.z);
        r.dLocal = new Vector3(box.cos * d.x - box.sin * d.z, d.y, box.sin * d.x + box.cos * d.z);
        BoxHit local = RayBox(r.oLocal, r.dLocal, box.lo, box.half);
        Vector3 m = local.n;
        r.n = new Vector3(box.cos * m.x + box.sin * m.z, m.y, box.cos * m.z - box.sin * m.x);
        r.kind = local.kind; r.t = local.t; r.axis = local.axis;
        return r;
    }
    #endregion

    #region The nearest hit
    // The nearest surface along a ray of unit direction: each wall is a plane cut off at the box's edges, each sphere solves a
    // quadratic, the turned box is three slabs, and the light is a square seen only from below (a point light, side 0, is never
    // hit). The result names the surface (its number), the material (diffuse, mirror, glass, light), the hit point, the normal
    // (outward for the spheres and the box, inward for the walls), the albedo and the emission. A ray that leaves through the open
    // front hits nothing. A wall is cut off 1e-4 past the box's edge, so a ray through a corner cannot slip between two walls.
    public static Hit Intersect(Scene scene, Vector3 o, Vector3 d)
    {
        float t = Mathf.Infinity;
        int id = -1;
        Vector3 n = Vector3.zero;
        for (int i = 0; i < scene.walls.Length; i++)
        {
            Wall w = scene.walls[i];
            if (Mathf.Abs(d[w.axis]) < Eps) continue;
            float tw = (w.at - o[w.axis]) / d[w.axis];
            if (tw <= 1e-4f || tw >= t) continue;
            bool inside = true;
            for (int k = 0; k < 3; k++)
            {
                if (k != w.axis && Mathf.Abs(o[k] + tw * d[k]) > Half + 1e-4f) inside = false;
            }
            if (!inside) continue;
            t = tw;
            id = i;
            n = new Vector3(w.axis == 0 ? w.facing : 0, w.axis == 1 ? w.facing : 0, w.axis == 2 ? w.facing : 0);
        }
        Vector3[] centers = { scene.mirror.center, scene.glass.center };
        float[] radii = { scene.mirror.radius, scene.glass.radius };
        for (int i = 0; i < 2; i++)
        {
            Vector3 oc = o - centers[i];
            float b = Vector3.Dot(oc, d);
            float disc = b * b - (Vector3.Dot(oc, oc) - radii[i] * radii[i]);
            if (disc < 0f) continue;
            float root = Mathf.Sqrt(disc);
            float ts = -b - root;
            if (ts <= 1e-4f) ts = -b + root;     // the origin is inside: the far side
            if (ts <= 1e-4f || ts >= t) continue;
            t = ts;
            id = Mirror + i;
            n = (o + d * ts - centers[i]) * (1f / radii[i]);
        }
        TurnedBox box = scene.box;
        Vector3 boc = o - box.center;
        float bb = Vector3.Dot(boc, d);
        bool reaches = bb * bb - (Vector3.Dot(boc, boc) - box.radius * box.radius) >= 0f;   // the box's bounding sphere first
        if (reaches)
        {
            TurnedBoxHit slabs = RayTurnedBox(o, d, box);
            if ((slabs.kind == "hit" || slabs.kind == "inside") && slabs.t > 1e-4f && slabs.t < t)
            {
                t = slabs.t;
                id = Box;
                n = slabs.n;
            }
        }
        if (d.y > Eps && scene.lightArea > 0f)
        {
            float tl = (scene.lightY - o.y) / d.y;
            Vector3 q = o + d * tl;
            float half = scene.lightSide / 2f;
            if (tl > 1e-4f && tl < t && Mathf.Abs(q.x - scene.lightX) <= half && Mathf.Abs(q.z - scene.lightZ) <= half)
            {
                t = tl;
                id = Light;
                n = new Vector3(0f, -1f, 0f);
            }
        }
        Hit h;
        h.hit = id >= 0;
        h.t = t;
        h.id = id;
        h.p = h.hit ? o + d * t : Vector3.zero;
        h.n = n;
        h.material = "none";
        h.albedo = Vector3.zero;
        if (id >= 0 && id <= 4) { h.material = "diffuse"; h.albedo = scene.walls[id].albedo; }
        if (id == Box) { h.material = "diffuse"; h.albedo = scene.box.albedo; }
        if (id == Mirror) h.material = "mirror";
        if (id == Glass) h.material = "glass";
        if (id == Light) h.material = "light";
        h.emission = id == Light ? scene.emission : 0f;
        return h;
    }
    #endregion

    #region Reflection and refraction
    // Reflection flips the part of d along the normal: r = d - 2 (d.n) n. Refraction obeys Snell's law n1 sin(theta1) = n2 sin(theta2).
    // With eta = n1 / n2 and cos(theta1) = -d.n, the refracted direction is t = eta d + (eta cos(theta1) - sqrt(k)) n, where
    // k = 1 - eta^2 (1 - cos^2(theta1)). A negative k is total internal reflection: no refracted ray. The share that reflects is
    // Fresnel's F, here Schlick's approximation (1994) F0 + (1 - F0) (1 - cos(theta1))^5 with F0 = ((n1 - n2) / (n1 + n2))^2,
    // and 1 on total internal reflection.
    public static SnellResult SnellFresnel(Vector3 d, Vector3 n, float n1, float n2)
    {
        SnellResult r = new SnellResult();
        r.cosI = -Vector3.Dot(d, n);
        r.eta = n1 / n2;
        r.k = 1f - r.eta * r.eta * (1f - r.cosI * r.cosI);
        r.tir = r.k < 0f;
        float cosT = Mathf.Sqrt(Mathf.Max(r.k, 0f));
        r.reflected = Reflect(d, n);
        r.refracted = r.tir ? Vector3.zero : d * r.eta + n * (r.eta * r.cosI - cosT);
        float ratio = (n1 - n2) / (n1 + n2);
        r.f0 = ratio * ratio;
        float m = 1f - r.cosI;
        r.fSchlick = r.f0 + (1f - r.f0) * m * m * m * m * m;
        r.kReflect = r.tir ? 1f : r.fSchlick;
        r.kRefract = r.tir ? 0f : 1f - r.fSchlick;
        return r;
    }
    #endregion

    #region Sampling the light by area
    // A point on the light chosen uniformly by area has density pA = 1/A. The rendering equation integrates over solid angle, so
    // the density changes: p(omega) = pA r^2 / cos(theta_light). The estimate of the light arriving is f Le G / pA, with the geometry
    // term G = cos(theta_surface) cos(theta_light) / r^2. Since Le / pA = Le A, the light's fixed power, the estimate keeps its value
    // as the light shrinks: a light of side 0 is a point light, whose estimate is f (Le A) G for the one point there is.
    public static LightSample AreaLightSample(float lightArea, float power, float r, float cosSurface, float cosLight)
    {
        LightSample s;
        s.pdfArea = lightArea > 0f ? 1f / lightArea : Mathf.Infinity;
        s.Le = lightArea > 0f ? power / lightArea : Mathf.Infinity;
        s.pdfSolidAngle = cosLight > Eps ? s.pdfArea * r * r / cosLight : Mathf.Infinity;
        s.G = cosSurface * cosLight / (r * r);
        s.weight = lightArea > 0f ? s.Le * s.G / s.pdfArea : power * s.G;
        return s;
    }
    #endregion

    #region Next-event estimation
    // At a diffuse point, the light that arrives straight from the light: a point on it (u1, u2 in [0, 1) across its square), a
    // shadow ray to that point, and the weight of areaLightSample, times the diffuse BRDF albedo / pi. A blocked shadow ray, or a
    // point facing away, gives 0. Glass and the mirror block a shadow ray like anything else: the ray would have to bend to reach
    // the light, and a straight line cannot.
    public static NextEvent NextEventEstimate(Scene scene, Vector3 p, Vector3 n, Vector3 albedo, float u1, float u2)
    {
        float half = scene.lightSide / 2f;
        NextEvent e;
        e.lightPoint = new Vector3(scene.lightX - half + u1 * scene.lightSide, scene.lightY, scene.lightZ - half + u2 * scene.lightSide);
        Vector3 toLight = e.lightPoint - p;
        e.r = toLight.magnitude;
        e.wi = toLight * (1f / e.r);
        e.cosSurface = Mathf.Max(0f, Vector3.Dot(n, e.wi));
        e.cosLight = Mathf.Max(0f, e.wi.y);
        Hit shadow = Intersect(scene, p + n * Offset, e.wi);
        bool clear = !shadow.hit || shadow.t > e.r - 0.01f;
        e.visible = clear && e.cosSurface > 0f && e.cosLight > 0f;
        e.blocker = clear ? -1 : shadow.id;
        e.blockerT = clear ? e.r : shadow.t;
        LightSample light = AreaLightSample(scene.lightArea, scene.power, e.r, e.cosSurface, e.cosLight);
        e.G = light.G;
        e.contribution = e.visible ? albedo * (light.weight / Mathf.PI) : Vector3.zero;
        return e;
    }
    #endregion

    #region Whitted: the shadow rays
    // Whitted (1980) sends one shadow ray to a point light. Here count = 1 sends it to the light's center: the shadow is hard. Cook,
    // Porter and Carpenter (1984) send several: the light is cut into side x side squares and one shadow ray goes to a random point
    // of each (stratified), and the estimates are averaged, so a point that sees part of the light gets part of its light: the
    // penumbra. exactDirect replaces the random points by the centers of a fine grid, for the value the estimates scatter around.
    public static DirectResult DirectLight(Scene scene, Vector3 p, Vector3 n, Vector3 albedo, int count, Rng rng)
    {
        int side = Mathf.Max(1, Mathf.RoundToInt(Mathf.Sqrt(count)));
        int total = side * side;
        List<NextEvent> samples = new List<NextEvent>();
        Vector3 sum = Vector3.zero;
        int lit = 0;
        for (int a = 0; a < side; a++)
        {
            for (int b = 0; b < side; b++)
            {
                float u1 = total == 1 ? 0.5f : (a + NextRandom(rng)) / side;
                float u2 = total == 1 ? 0.5f : (b + NextRandom(rng)) / side;
                NextEvent ne = NextEventEstimate(scene, p, n, albedo, u1, u2);
                samples.Add(ne);
                sum = sum + ne.contribution;
                if (ne.visible) lit += 1;
            }
        }
        DirectResult r = new DirectResult();
        r.count = total; r.samples = samples.ToArray(); r.lit = lit;
        r.fraction = (float)lit / total;
        r.contribution = sum * (1f / total);
        return r;
    }

    public static ExactResult ExactDirect(Scene scene, Vector3 p, Vector3 n, Vector3 albedo, int grid)
    {
        Vector3 sum = Vector3.zero;
        int lit = 0;
        for (int a = 0; a < grid; a++)
        {
            for (int b = 0; b < grid; b++)
            {
                NextEvent ne = NextEventEstimate(scene, p, n, albedo, (a + 0.5f) / grid, (b + 0.5f) / grid);
                sum = sum + ne.contribution;
                if (ne.visible) lit += 1;
            }
        }
        ExactResult r;
        r.contribution = sum * (1f / (grid * grid));
        r.fraction = (float)lit / (grid * grid);
        return r;
    }
    #endregion

    #region Whitted: shade a ray
    // Find the nearest hit. A diffuse surface returns its direct light (the shadow rays above) and nothing else: no ambient term,
    // no bounce. A mirror sends a reflected ray weighted by its reflectance; glass sends a reflected and a refracted ray weighted by
    // Fresnel's F and 1 - F; each is traced by this same function one level deeper, until opt.maxDepth. A ray that reaches the light
    // returns its emission Le. The result is a tree: every node holds its own local term, its children, and the color it passes to
    // its parent, local + wReflect * reflection + wRefract * refraction.
    public static RayNode Shade(Scene scene, Vector3 o, Vector3 d, int level, string kind, WhittedOptions opt, Rng rng)
    {
        Hit hit = Intersect(scene, o, d);
        RayNode node = new RayNode();
        node.kind = kind; node.level = level; node.o = o; node.d = d;
        if (!hit.hit)
        {
            node.t = Mathf.Infinity; node.id = -1; node.material = "none"; node.p = o; node.n = Vector3.zero; node.entering = true;
            node.local = Vector3.zero; node.color = Vector3.zero; node.rays = 1;
            return node;
        }
        node.t = hit.t; node.id = hit.id; node.material = hit.material; node.p = hit.p;
        node.entering = Vector3.Dot(d, hit.n) < 0f;
        node.n = node.entering ? hit.n : -hit.n;
        node.local = Vector3.zero;
        if (hit.material == "light") node.local = new Vector3(hit.emission, hit.emission, hit.emission);
        if (hit.material == "diffuse")
        {
            node.direct = DirectLight(scene, hit.p, node.n, hit.albedo, opt.shadowRays, rng);
            node.local = node.direct.contribution;
        }
        float ior = scene.glass.ior;
        node.bend = hit.material == "glass" ? SnellFresnel(d, node.n, node.entering ? 1f : ior, node.entering ? ior : 1f) : null;
        node.wReflect = hit.material == "mirror" ? scene.mirror.reflectance : node.bend != null ? node.bend.kReflect : 0f;
        node.wRefract = node.bend != null ? node.bend.kRefract : 0f;
        bool spawn = level < opt.maxDepth;
        node.truncated = !spawn && (node.wReflect > 0f || node.wRefract > 0f);
        Vector3 outDir = Normalize(Reflect(d, node.n));
        node.reflection = spawn && node.wReflect > 0f
            ? Shade(scene, hit.p + node.n * Offset, outDir, level + 1, "reflection", opt, rng) : null;
        Vector3 inDir = node.bend != null ? Normalize(node.bend.refracted) : outDir;
        node.refraction = spawn && node.wRefract > 0f
            ? Shade(scene, hit.p - node.n * Offset, inDir, level + 1, "refraction", opt, rng) : null;
        Vector3 fromReflection = (node.reflection != null ? node.reflection.color : Vector3.zero) * node.wReflect;
        Vector3 fromRefraction = (node.refraction != null ? node.refraction.color : Vector3.zero) * node.wRefract;
        node.color = node.local + fromReflection + fromRefraction;
        int below = (node.reflection != null ? node.reflection.rays : 0) + (node.refraction != null ? node.refraction.rays : 0);
        node.rays = 1 + (node.direct != null ? node.direct.count : 0) + below;
        return node;
    }
    #endregion

    #region Whitted: the tree of one pixel
    // The pixel's color is a sum over the tree. A node's accumulated weight is the product of the weights on the path from the root
    // (1 for the primary ray, then the mirror's reflectance, or F, or 1 - F, at each step), and it contributes accum x local. The shadow
    // rays add no color of their own: they decide the local term of the node that sent them. Rows come in the order primary, its
    // shadow rays, its reflection's subtree, its refraction's subtree.
    static TreeRow MakeRow(int id, int parent, string kind, int level, float weight, float accum, Vector3 local, Vector3 contribution, RayNode node, bool isShadow)
    {
        TreeRow row = new TreeRow();
        row.id = id; row.parent = parent; row.kind = kind; row.level = level; row.weight = weight; row.accum = accum;
        row.local = local; row.contribution = contribution; row.node = node; row.isShadow = isShadow;
        return row;
    }

    static void AddRows(List<TreeRow> rows, RayNode node, int parent, float weight, float accum)
    {
        int id = rows.Count;
        Vector3 contribution = node.local * accum;
        rows.Add(MakeRow(id, parent, node.kind, node.level, weight,
            accum, node.local, contribution, node, false));
        if (node.direct != null)
        {
            Vector3 gone = Vector3.zero;
            rows.Add(MakeRow(id + 1, id, "shadow", node.level,
                1f, accum, gone, gone, node, true));
        }
        if (node.reflection != null)
        {
            AddRows(rows, node.reflection, id, node.wReflect, accum * node.wReflect);
        }
        if (node.refraction != null)
        {
            AddRows(rows, node.refraction, id, node.wRefract, accum * node.wRefract);
        }
    }

    public static TreeResult RayTree(RayNode root)
    {
        List<TreeRow> rows = new List<TreeRow>();
        AddRows(rows, root, -1, 1f, 1f);
        Vector3 sum = Vector3.zero;
        int shadowRays = 0;
        int truncatedRays = 0;
        for (int i = 0; i < rows.Count; i++)
        {
            sum = sum + rows[i].contribution;
            if (rows[i].isShadow) shadowRays += rows[i].node.direct.count;
            if (!rows[i].isShadow && rows[i].node.truncated) truncatedRays += 1;
        }
        TreeResult r;
        r.rows = rows.ToArray(); r.sum = sum; r.shadowRays = shadowRays; r.truncatedRays = truncatedRays; r.rays = root.rays;
        return r;
    }
    #endregion

    #region Whitted: render the image
    // One pixel is one primary ray, through the pixel's center, into shade(). A pixel's generator, for the random points of its
    // shadow rays, is seeded by pathSeed(px, py, 0), so a pixel traced alone matches the image. A block of rows is rendered at a time,
    // so a caller can stop between blocks when the scene changes. camera = { eye, look, fovDeg, width, height };
    // opt = { maxDepth, shadowRays }.
    public static RayNode TracePixel(Scene scene, RayCamera camera, int px, int py, WhittedOptions opt)
    {
        Basis basis = LookAtBasis(camera.eye, camera.look, new Vector3(0f, 1f, 0f));
        PixelRayResult ray = PixelRay(camera.eye, basis, camera.fovDeg, camera.width, camera.height, px, py, 0.5f, 0.5f);
        Rng rng = MakeRng(PathSeed(px, py, 0));
        return Shade(scene, camera.eye, ray.dir, 0, "primary", opt, rng);
    }

    public static RenderResult RenderRows(Scene scene, RayCamera camera, int y0, int y1, WhittedOptions opt)
    {
        List<float> pixels = new List<float>();
        int rays = 0;
        for (int py = y0; py < y1; py++)
        {
            for (int px = 0; px < camera.width; px++)
            {
                RayNode node = TracePixel(scene, camera, px, py, opt);
                pixels.Add(node.color.x); pixels.Add(node.color.y); pixels.Add(node.color.z);
                rays += node.rays;
            }
        }
        RenderResult r;
        r.y0 = y0; r.y1 = y1; r.pixels = pixels.ToArray(); r.rays = rays;
        return r;
    }
    #endregion

    #region Russian roulette
    // Stop a path at random and boost the survivors: continue with probability q and divide what the rest of the path carries by q,
    // so the expected value is q (X / q) + (1 - q) 0 = X, unchanged; only the variance grows. Roulette starts after two bounces.
    // Mode "fixed" uses q = 0.7; mode "throughput" uses q = the luminance of the throughput so far (between 0.05 and 0.95), so dark
    // paths die young; "off" never stops.
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

    #region Path tracing: one path
    // Kajiya's estimator, one sample, walked from the eye. At a diffuse vertex: add the light a shadow ray finds (next-event
    // estimation), then take one cosine-weighted bounce, which multiplies the throughput by the albedo (f cos / p = albedo). At the
    // mirror: reflect, times its reflectance. At glass: reflect with probability F, refract with probability 1 - F; the weight F / F
    // is 1, so the throughput is unchanged. Landing on the light adds throughput x Le only when nothing has counted that light yet:
    // straight from the eye, after a mirror or glass bounce (next-event estimation is not done there: a shadow ray cannot bend), or
    // with next-event estimation off. Roulette may end the walk and boosts the survivors by 1/q. maxDepth counts the bounces: 0 is
    // direct light only; a path after its last bounce only looks for the light.
    public static (Vector3 dir, float pdf) CosineDirection(float u1, float u2)
    {
        float r = Mathf.Sqrt(u1);
        float phi = 2f * Mathf.PI * u2;
        float cosTheta = Mathf.Sqrt(Mathf.Max(0f, 1f - u1));
        Vector3 dir = new Vector3(r * Mathf.Cos(phi), r * Mathf.Sin(phi), cosTheta);
        float pdf = cosTheta / Mathf.PI;
        return (dir, pdf);
    }

    public static (Vector3 tangent, Vector3 bitangent, Vector3 dir) ToWorld(Vector3 normal, Vector3 local)
    {
        Vector3 helper = Mathf.Abs(normal.x) > 0.9f ? new Vector3(0f, 1f, 0f) : new Vector3(1f, 0f, 0f);
        Vector3 tangent = Normalize(Vector3.Cross(helper, normal));
        Vector3 bitangent = Vector3.Cross(normal, tangent);
        Vector3 dir = tangent * local.x + bitangent * local.y + normal * local.z;
        return (tangent, bitangent, dir);
    }

    public static PathVertex NewVertex(Hit hit, Vector3 n, Vector3 throughput)
    {
        PathVertex v = new PathVertex();
        v.id = hit.id; v.material = hit.material; v.p = hit.p; v.n = n;
        v.albedo = hit.albedo; v.emission = hit.emission;
        v.throughput = throughput; v.throughputOut = Vector3.zero;
        v.lightPoint = Vector3.zero; v.visible = false; v.blocker = -1;
        v.direct = Vector3.zero; v.contribution = Vector3.zero;
        v.q = 1f; v.F = 0f; v.@event = "none"; v.direction = Vector3.zero; v.stop = "none";
        return v;
    }

    public static PathResult TracePath(Scene scene, Vector3 origin, Vector3 direction, Rng rng, PathOptions options)
    {
        List<PathVertex> vertices = new List<PathVertex>();
        Vector3 o = origin;
        Vector3 d = direction;
        Vector3 throughput = new Vector3(1f, 1f, 1f);
        Vector3 radiance = Vector3.zero;
        int rays = 1;
        bool escaped = false;
        bool hitLight = false;
        bool specular = false;      // was the bounce into this vertex a mirror or glass one?
        for (int depth = 0; depth <= options.maxDepth + 1; depth++)
        {
            Hit hit = Intersect(scene, o, d);
            if (!hit.hit) { escaped = true; break; }
            bool entering = Vector3.Dot(d, hit.n) < 0f;
            Vector3 n = entering ? hit.n : -hit.n;
            PathVertex v = NewVertex(hit, n, throughput);
            vertices.Add(v);
            if (hit.material == "light")
            {
                hitLight = true;
                v.stop = "light";
                if (depth == 0 || specular || !options.nee)
                {
                    v.contribution = throughput * hit.emission;
                    radiance = radiance + v.contribution;
                }
                break;
            }
            if (depth > options.maxDepth) { v.stop = "depth"; break; }
            if (hit.material == "diffuse")
            {
                if (options.nee)
                {
                    NextEvent ne = NextEventEstimate(scene, hit.p, n, hit.albedo, NextRandom(rng), NextRandom(rng));
                    rays += 1;
                    v.lightPoint = ne.lightPoint;
                    v.visible = ne.visible;
                    v.blocker = ne.blocker;
                    v.direct = ne.contribution;
                    v.contribution = Vector3.Scale(throughput, ne.contribution);
                    radiance = radiance + v.contribution;
                }
                v.throughputOut = Vector3.Scale(throughput, hit.albedo);
                if (options.nee && depth == options.maxDepth) { v.stop = "depth"; break; }
            }
            else if (hit.material == "mirror")
            {
                v.throughputOut = throughput * scene.mirror.reflectance;
            }
            else
            {
                v.throughputOut = throughput;
            }
            var roulette = RouletteQ(options.roulette, depth, throughput);
            v.q = roulette.q;
            if (roulette.q < 1f && NextRandom(rng) > roulette.q) { v.stop = "roulette"; break; }
            float side = 1f;
            if (hit.material == "diffuse")
            {
                var bounce = CosineDirection(NextRandom(rng), NextRandom(rng));
                v.direction = ToWorld(n, bounce.dir).dir;
                v.@event = "bounce";
            }
            else if (hit.material == "mirror")
            {
                v.direction = Normalize(Reflect(d, n));
                v.@event = "mirror";
            }
            else
            {
                float ior = scene.glass.ior;
                SnellResult bend = SnellFresnel(d, n, entering ? 1f : ior, entering ? ior : 1f);
                v.F = bend.kReflect;
                if (NextRandom(rng) < bend.kReflect)
                {
                    v.direction = Normalize(bend.reflected);
                    v.@event = "reflect";
                }
                else
                {
                    v.direction = Normalize(bend.refracted);
                    v.@event = "refract";
                    side = -1f;                // the refracted ray goes through the surface
                }
            }
            throughput = v.throughputOut * roulette.boost;
            specular = hit.material != "diffuse";
            o = hit.p + n * (side * Offset);
            d = v.direction;
            rays += 1;
        }
        PathResult r = new PathResult();
        r.vertices = vertices.ToArray(); r.radiance = radiance; r.rays = rays;
        r.bounces = Mathf.Max(0, vertices.Count - 1); r.escaped = escaped; r.hitLight = hitLight;
        return r;
    }
    #endregion

    #region Light paths: what one path carries
    // A walk with next-event estimation carries several light paths at once: one per shadow ray that reached the light (eye, the
    // vertices up to that one, the light) and one if it lands on the light. Heckbert (1990) names a path by its vertices: E the eye,
    // D a diffuse bounce, S a mirror or glass one, L the light, here read from the eye. E D L is direct light; E D D L reaches the
    // light after two diffuse bounces; E D S S L is a caustic: light focused by glass onto a diffuse surface. A light path goes by way
    // of the red wall if a vertex after the first is the red wall: that is the light the wall passes on, color bleeding.
    public static LightPathsResult LightPaths(PathResult path)
    {
        List<string> names = new List<string>();
        List<Vector3> contributions = new List<Vector3>();
        List<bool> viaRed = new List<bool>();
        List<bool> caustic = new List<bool>();
        string word = "E";
        bool red = false;
        for (int k = 0; k < path.vertices.Length; k++)
        {
            PathVertex v = path.vertices[k];
            string letter = v.material == "light" ? "L" : v.material == "diffuse" ? "D" : "S";
            word += " " + letter;
            if (k > 0 && v.id == RedWall) red = true;
            Vector3 c = v.contribution;
            if (c.x > 0f || c.y > 0f || c.z > 0f)
            {
                string name = letter == "L" ? word : word + " L";
                names.Add(name);
                contributions.Add(c);
                viaRed.Add(red);
                caustic.Add(name.IndexOf("D S") >= 0 && name.LastIndexOf("S L") == name.Length - 3);
            }
        }
        LightPathsResult r;
        r.word = word; r.names = names.ToArray(); r.contributions = contributions.ToArray(); r.viaRed = viaRed.ToArray(); r.caustic = caustic.ToArray();
        return r;
    }
    #endregion

    #region Path tracing: the paths through one pixel
    // Path k of pixel (px, py) seeds its generator with pathSeed(px, py, k), starts at a random point (jx, jy) of the pixel's square,
    // and is traced by tracePath. pixelPaths adds paths first .. first + count - 1 to running totals and returns the new totals (the
    // ones given are not changed): the sum of the samples, of their luminance and its square, the running mean after each path, and
    // the light that came by way of the red wall and by caustic paths. pixelEstimate turns the totals into the mean, its standard
    // error sqrt(variance / N), which falls as 1/sqrt(N), and the shares.
    public static PixelSampleResult PixelSample(Scene scene, RayCamera camera, int px, int py, int k, PathOptions options)
    {
        Rng rng = MakeRng(PathSeed(px, py, k));
        PixelSampleResult s;
        s.k = k;
        s.jx = NextRandom(rng);
        s.jy = NextRandom(rng);
        Basis basis = LookAtBasis(camera.eye, camera.look, new Vector3(0f, 1f, 0f));
        PixelRayResult ray = PixelRay(camera.eye, basis, camera.fovDeg, camera.width, camera.height, px, py, s.jx, s.jy);
        s.sx = ray.sx; s.sy = ray.sy; s.dir = ray.dir;
        s.path = TracePath(scene, camera.eye, ray.dir, rng, options);
        return s;
    }

    public static Totals EmptyTotals()
    {
        Totals t = new Totals();
        t.running = new float[0];
        return t;
    }

    public static Totals PixelPaths(Scene scene, RayCamera camera, int px, int py, int first, int count, PathOptions options, Totals totals)
    {
        Totals t = new Totals();
        t.sum = totals.sum; t.sumLum = totals.sumLum; t.sumSquares = totals.sumSquares;
        t.red = totals.red; t.caustic = totals.caustic; t.causticPaths = totals.causticPaths; t.zeroPaths = totals.zeroPaths;
        List<float> running = new List<float>(totals.running);
        for (int k = first; k < first + count; k++)
        {
            PixelSampleResult sample = PixelSample(scene, camera, px, py, k, options);
            Vector3 L = sample.path.radiance;
            float lum = Luminance(L);
            t.sum = t.sum + L;
            t.sumLum += lum;
            t.sumSquares += lum * lum;
            if (lum == 0f) t.zeroPaths += 1;
            LightPathsResult parts = LightPaths(sample.path);
            bool found = false;
            for (int i = 0; i < parts.names.Length; i++)
            {
                if (parts.viaRed[i]) t.red = t.red + parts.contributions[i];
                if (parts.caustic[i]) { t.caustic = t.caustic + parts.contributions[i]; found = true; }
            }
            if (found) t.causticPaths += 1;
            running.Add(t.sumLum / (totals.count + k - first + 1));
        }
        t.count = totals.count + count;
        t.running = running.ToArray();
        return t;
    }

    public static Estimate PixelEstimate(Totals totals)
    {
        Estimate e;
        e.n = totals.count;
        e.mean = totals.sum * (e.n > 0 ? 1f / e.n : 0f);
        e.meanLum = e.n > 0 ? totals.sumLum / e.n : 0f;
        e.variance = e.n > 1 ? Mathf.Max(0f, totals.sumSquares / e.n - e.meanLum * e.meanLum) * e.n / (e.n - 1) : 0f;
        e.standardError = e.n > 0 ? Mathf.Sqrt(e.variance / e.n) : 0f;
        e.redShare = totals.sumLum > 0f ? Luminance(totals.red) / totals.sumLum : 0f;
        e.causticShare = totals.sumLum > 0f ? Luminance(totals.caustic) / totals.sumLum : 0f;
        e.redOverGreen = e.mean.y > 0f ? e.mean.x / e.mean.y : 0f;
        return e;
    }
    #endregion

    #region Path tracing: render the image
    // One pass gives every pixel one more sample: pass k traces path k of each pixel, so the image after N passes is the mean of
    // paths 0 .. N - 1 of every pixel, the same paths pixelPaths traces for one pixel. A range of pixels (index py * width + px) is
    // done at a time, so a caller can stop between ranges when the scene changes. options = { maxDepth, roulette, nee }.
    public static PassResult RenderPass(Scene scene, RayCamera camera, int k, int first, int last, PathOptions options)
    {
        List<float> pixels = new List<float>();
        int rays = 0;
        for (int i = first; i < last; i++)
        {
            int px = i % camera.width;
            int py = i / camera.width;
            PixelSampleResult sample = PixelSample(scene, camera, px, py, k, options);
            Vector3 L = sample.path.radiance;
            pixels.Add(L.x); pixels.Add(L.y); pixels.Add(L.z);
            rays += sample.path.rays;
        }
        PassResult r;
        r.k = k; r.first = first; r.last = last; r.pixels = pixels.ToArray(); r.rays = rays;
        return r;
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
}
