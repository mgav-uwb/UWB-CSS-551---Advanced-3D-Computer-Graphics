using System;
using System.Collections.Generic;
using UnityEngine;

// RayLab.cs: a ray tracer's parts. The ray through a pixel; a ray against a sphere, a triangle and a box; reflection, Snell's law
// and Fresnel; Whitted's recursion over a small scene (shadow rays, mirror and glass, a depth limit) and the tree of rays one
// pixel makes; shadow acne and the offset that cures it; and a bounding-volume hierarchy (BVH) over triangles, built by the
// median or by the surface area heuristic, with a stepped traversal and its test counts. Plain C#, no MonoBehaviour: colors are
// Vector3 (r, g, b), triangles are Vector3[3], a list of triangles is Vector3[][]. RayLabScene.cs draws the image. No method
// changes its arguments (the BVH builder changes the lists it makes for itself and says so).
// A result with more than seven fields is a small struct declared below, with the field names and the order of the object
// raylab.js returns, because mono's compiler rejects tuples over 7 fields; the tree of rays is made of RayNode objects.
// The same functions, line for line where the languages allow, are raylab.js in ../webgl/
// (lib/tests/programs/ray-lab.test.mjs runs both on the same inputs and compares the numbers).
public static class RayLab
{
    // ---- the results and the scene, as structs and classes
    public struct Basis { public Vector3 u, v, w; }
    public struct PixelRayResult { public float sx, sy, tanHalf; public Vector3 toward, dir; }
    public struct SphereHit { public Vector3 m; public float a, b, cPrime, disc, t0, t1; public string kind; public float t; public Vector3 hit, n, facing; }
    public struct TriangleHit { public Vector3 e1, e2, s, p, q; public float det, u, v, t; public string kind, edge; public Vector3 hit, bary, n; }
    public struct BoxHit { public float[] x, y, z; public float tEnter, tExit; public int axis; public string kind; public float t; public Vector3 hit, n; }
    public struct SnellResult { public float cosI, eta, k; public bool tir; public float thetaI, thetaT; public Vector3 reflected, refracted; public float f0, fSchlick, fExact, critical, kReflect, kRefract; }
    public struct Sphere { public Vector3 c; public float r; public string kind; public Vector3 color; public float kr, ior; }
    public class RayCamera { public Vector3 eye, look; public float fovDeg; public int width, height; }
    public class Scene { public Sphere[] spheres; public float floorY; public bool floorTwoSided, checker; public Vector3 light; public float ambient; public RayCamera camera; }
    public struct Options { public int maxDepth; public float eps; public string mode; public bool single; }
    public struct SceneHit { public float t; public int index; }
    public struct Offset { public Vector3 origin; public float tMin, moved; }
    public struct ShadowResult { public Vector3 origin, aim; public float tMin, blockerT; public int blocker; public bool blocked; public float side; }
    public class RayNode
    {
        public string kind; public int level; public Vector3 o, d; public float t; public int index; public Vector3 p, n; public bool entering;
        public string material; public Vector3 albedo; public bool hasShadow; public ShadowResult shadow; public Vector3 toLight;
        public float lit, nDotL, spec; public Vector3 local; public float wReflect, wRefract; public bool truncated;
        public RayNode reflection, refraction; public Vector3 color; public int rays;
        public Vector3 outward, mirrorDir; public float glint; public Vector3 lambert, surface; public bool hasBend; public SnellResult bend; public bool spawn;
        public Vector3 outDir, inDir, fromReflection, fromRefraction;
    }
    public class TreeRow
    {
        public int id, parent; public string kind; public int level; public float weight, accum; public Vector3 local, contribution; public RayNode node; public bool isShadow;
        public TreeRow(int id, int parent, string kind, int level, float weight, float accum, Vector3 local, Vector3 contribution, RayNode node, bool isShadow)
        {
            this.id = id; this.parent = parent; this.kind = kind; this.level = level; this.weight = weight; this.accum = accum;
            this.local = local; this.contribution = contribution; this.node = node; this.isShadow = isShadow;
        }
    }
    public struct TreeResult { public TreeRow[] rows; public Vector3 sum; public int shadowRays, truncatedRays, rays; }
    public struct RenderResult { public int y0, y1; public float[] pixels; public int rays; }
    public struct TriBox { public Vector3 lo, hi; }
    public struct SahResult { public float pLeft, pRight, costLeft, costRight, cost, leafCost; public bool worthIt; }
    public struct Sweep { public int[] sorted; public float areaParent; public float[] areaLeft, areaRight, costs; public int best; public float bestCost; public int medianK; public float medianCost, leafCost; }
    public struct Split { public int axis, k; public bool leaf; public Split(int axis, int k, bool leaf) { this.axis = axis; this.k = k; this.leaf = leaf; } }
    public struct Bvh { public Vector3[] lo, hi; public int[] left, right, first, count, depth, order; public int nodeCount; }
    public struct BruteResult { public int tests; public float t; public int tri; }
    public struct Traversal { public int[] node; public string[] kind; public int[] tri; public float[] at, best; public int steps, boxTests, triTests; public float t; public int hitTri; }
    public struct FrameCostResult { public float rays, brute; public int levels; public float withTree, speedup; }

    #region Settings and vector helpers
    // Below EPS a length or a determinant counts as zero. The local shading model is the illumination topic's: ambient, a diffuse
    // term and a Phong highlight. NONE and FLOOR are the two values of a hit's index that are not a sphere.
    public const float Eps = 1e-6f;
    public const int None = -2;
    public const int Floor = -1;
    public const float Kd = 0.85f;
    public const float Ks = 0.4f;
    public const float Shininess = 40f;

    // Unity's Vector3 has add, subtract, scale, Dot, Cross, magnitude and normalized built in.
    public static Vector3 Reflect(Vector3 d, Vector3 n) { return d - n * (2f * Vector3.Dot(d, n)); }
    public static Vector3 MinPoint(Vector3 a, Vector3 b) { return new Vector3(Mathf.Min(a.x, b.x), Mathf.Min(a.y, b.y), Mathf.Min(a.z, b.z)); }
    public static Vector3 MaxPoint(Vector3 a, Vector3 b) { return new Vector3(Mathf.Max(a.x, b.x), Mathf.Max(a.y, b.y), Mathf.Max(a.z, b.z)); }
    // A graphics processing unit (GPU) or Unity stores a position as a 32-bit float: 24 bits of mantissa, so a point near 1 moves in steps of 1.2e-7.
    // C# floats are already on that grid, so nothing is left to round; raylab.js rounds with Math.fround.
    static Vector3 Single3(Vector3 v, bool on) { return v; }
    static Vector3 Inf3(float s) { return new Vector3(s, s, s); }
    #endregion

    #region The ray through a pixel
    // A ray is r(t) = o + t d. The camera has eye e and basis u (right), v (up), w (backward). The pixel (px, py) of a width by
    // height image has center (sx, sy) in [-1, 1]; the ray runs from the eye through that point of the image plane, one unit in
    // front of the eye. This is the projection run backward: no matrix and no divide, the perspective is in the fan of directions.
    public static Basis LookAtBasis(Vector3 eye, Vector3 target, Vector3 up)
    {
        Vector3 w = (eye - target).normalized;
        Vector3 u = Vector3.Cross(up, w).normalized;
        Vector3 v = Vector3.Cross(w, u);
        return new Basis { u = u, v = v, w = w };
    }

    public static PixelRayResult PixelRay(Vector3 eye, Basis basis, float fovDeg, int width, int height, int px, int py)
    {
        float tanHalf = Mathf.Tan(fovDeg * Mathf.PI / 360f);
        float sx = (2f * (px + 0.5f)) / width - 1f;
        float sy = 1f - (2f * (py + 0.5f)) / height;
        Vector3 across = basis.u * (sx * tanHalf * ((float)width / height));
        Vector3 upward = basis.v * (sy * tanHalf);
        Vector3 toward = across + upward - basis.w;
        Vector3 dir = toward.normalized;
        return new PixelRayResult { sx = sx, sy = sy, tanHalf = tanHalf, toward = toward, dir = dir };
    }
    #endregion

    #region Ray against a sphere
    // Put r(t) into |p - c|^2 = r^2. With m = o - c this is a t^2 + 2 b t + c' = 0 with a = d.d, b = m.d, c' = m.m - r^2, so
    // t = (-b -/+ sqrt(b^2 - a c')) / a. A negative discriminant is a miss. Otherwise the smaller root is the entry; if only the
    // larger root is past tMin the origin is inside and the hit is the exit. No hit is t = Infinity.
    public static SphereHit RaySphere(Vector3 o, Vector3 d, Vector3 c, float r, float tMin)
    {
        Vector3 m = o - c;
        float a = Vector3.Dot(d, d);
        float b = Vector3.Dot(m, d);
        float cPrime = Vector3.Dot(m, m) - r * r;
        float disc = b * b - a * cPrime;
        float root = Mathf.Sqrt(Mathf.Max(disc, 0f));
        float t0 = disc >= 0f ? (-b - root) / a : Mathf.Infinity;
        float t1 = disc >= 0f ? (-b + root) / a : Mathf.Infinity;
        string kind = "miss";
        if (disc >= 0f && t0 > tMin) kind = "hit";
        else if (disc >= 0f && t1 > tMin) kind = "inside";
        else if (disc >= 0f) kind = "behind";
        float t = kind == "hit" ? t0 : kind == "inside" ? t1 : Mathf.Infinity;
        Vector3 hit = kind == "hit" || kind == "inside" ? o + d * t : Vector3.zero;
        Vector3 n = kind == "hit" || kind == "inside" ? (hit - c) * (1f / r) : Vector3.zero;
        Vector3 facing = Vector3.Dot(d, n) > 0f ? n * -1f : n;
        return new SphereHit { m = m, a = a, b = b, cPrime = cPrime, disc = disc, t0 = t0, t1 = t1, kind = kind, t = t, hit = hit, n = n, facing = facing };
    }
    #endregion

    #region Ray against a triangle
    // Solve o + t d = A + u e1 + v e2 for t, u and v at once, by Cramer's rule (Moller and Trumbore, 1997). The ray is parallel to
    // the triangle's plane when the determinant is zero. Otherwise it hits when u >= 0, v >= 0, u + v <= 1 and t > 0; the weights
    // (1 - u - v, u, v) are the barycentric weights of the hit, as in the rasterizer.
    public static TriangleHit RayTriangle(Vector3 o, Vector3 d, Vector3 A, Vector3 B, Vector3 C)
    {
        Vector3 e1 = B - A;
        Vector3 e2 = C - A;
        Vector3 s = o - A;
        Vector3 p = Vector3.Cross(d, e2);
        Vector3 q = Vector3.Cross(s, e1);
        float det = Vector3.Dot(e1, p);
        bool parallel = Mathf.Abs(det) < Eps;
        float u = parallel ? 0f : Vector3.Dot(s, p) / det;
        float v = parallel ? 0f : Vector3.Dot(d, q) / det;
        float t = parallel ? 0f : Vector3.Dot(e2, q) / det;
        bool inside = !parallel && u >= 0f && v >= 0f && u + v <= 1f;
        string kind = "hit";
        if (parallel) kind = "parallel";
        else if (!inside) kind = "outside";
        else if (t <= Eps) kind = "behind";
        string edge = "";
        if (kind == "outside") edge = u < 0f ? "AC" : v < 0f ? "AB" : "BC";
        Vector3 hit = parallel ? Vector3.zero : o + d * t;
        Vector3 bary = new Vector3(1f - u - v, u, v);
        Vector3 n = Vector3.Cross(e1, e2).normalized;
        return new TriangleHit { e1 = e1, e2 = e2, s = s, p = p, q = q, det = det, u = u, v = v, t = t, kind = kind, edge = edge, hit = hit, bary = bary, n = n };
    }
    #endregion

    #region Ray against a box
    // An axis-aligned box is three slabs (Kay and Kajiya, 1986). Along each axis the ray is between the two planes for t from (lo - o) / d to (hi - o) / d,
    // sorted. It is inside the box where the three intervals overlap: it enters at the largest lower bound and leaves at the
    // smallest upper bound. A zero component of d gives every t if o is between the planes and none if it is not.
    static float[] Slab(float o, float d, float lo, float hi)
    {
        if (Mathf.Abs(d) < 1e-12f) return o >= lo && o <= hi ? new float[] { -Mathf.Infinity, Mathf.Infinity } : new float[] { Mathf.Infinity, -Mathf.Infinity };
        float ta = (lo - o) / d;
        float tb = (hi - o) / d;
        return ta < tb ? new float[] { ta, tb } : new float[] { tb, ta };
    }

    public static BoxHit RayBox(Vector3 o, Vector3 d, Vector3 lo, Vector3 hi)
    {
        float[] x = Slab(o.x, d.x, lo.x, hi.x);
        float[] y = Slab(o.y, d.y, lo.y, hi.y);
        float[] z = Slab(o.z, d.z, lo.z, hi.z);
        float tEnter = Mathf.Max(x[0], y[0], z[0]);
        float tExit = Mathf.Min(x[1], y[1], z[1]);
        int axisEnter = x[0] >= y[0] && x[0] >= z[0] ? 0
            : y[0] >= z[0] ? 1 : 2;
        int axisExit = x[1] <= y[1] && x[1] <= z[1] ? 0
            : y[1] <= z[1] ? 1 : 2;
        string kind = "hit";
        if (tEnter > tExit) kind = "miss";
        else if (tExit <= 0f) kind = "behind";
        else if (tEnter <= 0f) kind = "inside";
        float t = kind == "hit" ? tEnter : kind == "inside" ? tExit : Mathf.Infinity;
        int axis = kind == "inside" ? axisExit : axisEnter;
        Vector3 hit = t < Mathf.Infinity ? o + d * t : Vector3.zero;
        Vector3 n = Vector3.zero;
        float heading = d[axis] > 0f ? 1f : -1f;
        if (t < Mathf.Infinity) n[axis] = kind == "inside" ? heading : -heading;
        return new BoxHit { x = x, y = y, z = z, tEnter = tEnter, tExit = tExit, axis = axis, kind = kind, t = t, hit = hit, n = n };
    }
    #endregion

    #region Reflection and refraction
    // Reflection flips the part of d along the normal: r = d - 2 (d.n) n. Refraction obeys Snell's law n1 sin(theta1) = n2 sin(theta2).
    // With eta = n1 / n2 and cos(theta1) = -d.n, the refracted direction is t = eta d + (eta cos(theta1) - sqrt(k)) n, where
    // k = 1 - eta^2 (1 - cos^2(theta1)). A negative k is total internal reflection: no refracted ray. The share that reflects is
    // Fresnel's F, here Schlick's approximation (1994) F0 + (1 - F0) (1 - cos(theta1))^5 with F0 = ((n1 - n2) / (n1 + n2))^2,
    // and 1 on total internal reflection. fExact is the Fresnel equations for unpolarized light, which Schlick approximates.
    public static SnellResult SnellFresnel(Vector3 d, Vector3 n, float n1, float n2)
    {
        float cosI = -Vector3.Dot(d, n);
        float eta = n1 / n2;
        float k = 1f - eta * eta * (1f - cosI * cosI);
        bool tir = k < 0f;
        float cosT = Mathf.Sqrt(Mathf.Max(k, 0f));
        float thetaI = Mathf.Acos(Mathf.Min(cosI, 1f)) * 180f / Mathf.PI;
        float sinT = eta * Mathf.Sqrt(1f - cosI * cosI);
        float thetaT = tir ? 90f : Mathf.Asin(Mathf.Min(sinT, 1f)) * 180f / Mathf.PI;
        Vector3 reflected = Reflect(d, n);
        Vector3 refracted = tir ? Vector3.zero : d * eta + n * (eta * cosI - cosT);
        float ratio = (n1 - n2) / (n1 + n2);
        float f0 = ratio * ratio;
        float m = 1f - cosI;
        float fSchlick = f0 + (1f - f0) * m * m * m * m * m;
        float rs = (n1 * cosI - n2 * cosT) / (n1 * cosI + n2 * cosT);
        float rp = (n1 * cosT - n2 * cosI) / (n1 * cosT + n2 * cosI);
        float fExact = tir ? 1f : (rs * rs + rp * rp) / 2f;
        float critical = n1 > n2 ? Mathf.Asin(n2 / n1) * 180f / Mathf.PI : 90f;
        float kReflect = tir ? 1f : fSchlick;
        float kRefract = tir ? 0f : 1f - fSchlick;
        return new SnellResult { cosI = cosI, eta = eta, k = k, tir = tir, thetaI = thetaI, thetaT = thetaT, reflected = reflected, refracted = refracted, f0 = f0, fSchlick = fSchlick, fExact = fExact, critical = critical, kReflect = kReflect, kRefract = kRefract };
    }
    #endregion

    #region The scenes
    // A scene is spheres (center c, radius r, kind 'diffuse', 'mirror' or 'glass', a color, a mirror's share kr, a glass's index
    // of refraction ior), the floor plane y = floorY, one point light, and a camera. chapterScene is the course text's picture
    // (rt-whitted.png): a mirror, a glass and a diffuse sphere over a checkered floor. figureScene is its flat figure
    // (rt-whitted-2d.svg), drawn in the plane z = 0. acneScene has a plain floor, for shadow acne.
    static Sphere MakeSphere(Vector3 c, float r, string kind, Vector3 color, float kr, float ior)
    {
        return new Sphere { c = c, r = r, kind = kind, color = color, kr = kr, ior = ior };
    }

    static RayCamera MakeCamera(Vector3 eye, Vector3 look, float fovDeg)
    {
        return new RayCamera { eye = eye, look = look, fovDeg = fovDeg, width = 96, height = 60 };
    }

    public static Scene ChapterScene()
    {
        Scene scene = new Scene();
        scene.spheres = new Sphere[] {
            MakeSphere(new Vector3(-1.1f, 0f, -0.3f), 1f, "mirror", new Vector3(0.9f, 0.9f, 0.9f), 0.9f, 1f),
            MakeSphere(new Vector3(1.2f, -0.2f, 0.6f), 0.8f, "glass", new Vector3(1f, 1f, 1f), 0f, 1.5f),
            MakeSphere(new Vector3(0.2f, -0.55f, -2f), 0.45f, "diffuse", new Vector3(0.85f, 0.3f, 0.25f), 0f, 1f),
        };
        scene.floorY = -1f; scene.floorTwoSided = true; scene.checker = true; scene.light = new Vector3(2f, 5f, 4f); scene.ambient = 0.15f;
        scene.camera = MakeCamera(new Vector3(0f, 0.8f, 5.5f), new Vector3(0f, -0.2f, 0f), 40f);
        return scene;
    }

    public static Scene FigureScene()
    {
        Scene scene = new Scene();
        scene.spheres = new Sphere[] {
            MakeSphere(new Vector3(-1.3f, 0.1f, 0f), 0.8f, "mirror", new Vector3(0.9f, 0.9f, 0.9f), 0.9f, 1f),
            MakeSphere(new Vector3(1.2f, 0f, 0f), 0.75f, "glass", new Vector3(1f, 1f, 1f), 0f, 1.5f),
        };
        scene.floorY = -1.6f; scene.floorTwoSided = false; scene.checker = false; scene.light = new Vector3(0.3f, 2.6f, 0f); scene.ambient = 0.15f;
        scene.camera = MakeCamera(new Vector3(-0.2f, -3.4f, 0f), new Vector3(0f, 0f, 0f), 40f);
        return scene;
    }

    public static Scene AcneScene()
    {
        Scene scene = new Scene();
        scene.spheres = new Sphere[] {
            MakeSphere(new Vector3(-0.6f, -0.4f, 0f), 0.6f, "diffuse", new Vector3(0.8f, 0.8f, 0.85f), 0f, 1f),
            MakeSphere(new Vector3(0.9f, -0.62f, 0.5f), 0.38f, "diffuse", new Vector3(0.85f, 0.45f, 0.35f), 0f, 1f),
        };
        scene.floorY = -1f; scene.floorTwoSided = true; scene.checker = false; scene.light = new Vector3(3f, 3.5f, 3f); scene.ambient = 0.15f;
        scene.camera = MakeCamera(new Vector3(0f, 1.4f, 5f), new Vector3(0f, -0.4f, 0f), 38f);
        return scene;
    }
    #endregion

    #region Whitted: the nearest hit
    // The nearest of the spheres and the floor with a parameter t between tMin and tMax. The floor of a one-sided scene is seen
    // only from above. A shadow ray asks a different question, "is anything between here and the light?", and uses the same test
    // with tMax = 1. The result is t and the index of what was hit: a sphere's index, FLOOR or NONE.
    public static SceneHit IntersectScene(Scene scene, Vector3 o, Vector3 d, float tMin, float tMax)
    {
        float t = tMax;
        int index = None;
        for (int i = 0; i < scene.spheres.Length; i++)
        {
            Sphere sphere = scene.spheres[i];
            SphereHit hit = RaySphere(o, d, sphere.c, sphere.r, tMin);
            if (hit.t < t)
            {
                t = hit.t;
                index = i;
            }
        }
        bool seen = scene.floorTwoSided || d.y < 0f;
        float tFloor = Mathf.Abs(d.y) > Eps ? (scene.floorY - o.y) / d.y : Mathf.Infinity;
        if (seen && tFloor > tMin && tFloor < t)
        {
            t = tFloor;
            index = Floor;
        }
        return new SceneHit { t = t, index = index };
    }
    #endregion

    #region Shadow acne: offsetting the origin
    // A ray that starts exactly on the surface it just hit can hit that surface again at a t near zero: the hit point was rounded
    // when it was stored, so it sits a hair inside or outside the surface. Two cures. 'offset' moves the origin a distance eps
    // along the normal, to the side the ray goes. 'tmin' keeps the origin and ignores hits with t < eps. Too small an eps leaves
    // speckle; too large moves the origin past thin objects and detaches shadows from the things that cast them.
    public static Offset OffsetOrigin(Vector3 p, Vector3 n, float side, float eps, string mode)
    {
        float moved = mode == "offset" ? eps : 0f;
        Vector3 origin = p + n * (side * moved);
        float tMin = mode == "offset" ? 0f : eps;
        return new Offset { origin = origin, tMin = tMin, moved = moved };
    }
    #endregion

    #region Whitted: the shadow ray
    // From the hit point toward the light, starting on the light's side of the surface. The direction is not normalized, so the
    // light is at t = 1 and the test is "is anything in (tMin, 1)?": a sphere behind the light must not count. The first blocker
    // found is enough; its shading is never needed.
    public static ShadowResult ShadowRay(Scene scene, Vector3 p, Vector3 n, Options opt)
    {
        float side = Vector3.Dot(n, scene.light - p) >= 0f ? 1f : -1f;
        Offset start = OffsetOrigin(p, n, side, opt.eps, opt.mode);
        Vector3 origin = start.origin;
        Vector3 aim = scene.light - origin;
        SceneHit hit = IntersectScene(scene, origin, aim, start.tMin, 1f);
        bool blocked = hit.index != None;
        return new ShadowResult { origin = origin, aim = aim, tMin = start.tMin, blockerT = hit.t, blocker = hit.index, blocked = blocked, side = side };
    }
    #endregion

    #region Whitted: shade a ray
    // Whitted (1980). Find the nearest hit. Send a shadow ray to the light and add the diffuse and specular terms only if nothing
    // blocks it. A mirror sends a reflected ray, glass sends a reflected and a refracted ray weighted by Fresnel's F and 1 - F, and
    // each is traced by this same function one level deeper, until opt.maxDepth. The result is a tree: every node holds its own
    // local term, its children, and the color it passes to its parent, local + wReflect * reflection + wRefract * refraction.
    static Vector3 FloorColor(Scene scene, Vector3 p)
    {
        int cell = ((int)Mathf.Floor(p.x) + (int)Mathf.Floor(p.z)) % 2;
        return scene.checker && cell != 0 ? new Vector3(0.25f, 0.3f, 0.4f) : new Vector3(0.85f, 0.85f, 0.85f);
    }

    static Vector3 Sky(Vector3 d)
    {
        float k = Mathf.Min(Mathf.Max(0.5f * (d.y + 1f), 0f), 1f);
        return new Vector3(0.75f + 0.2f * k, 0.85f + 0.1f * k, 1f);
    }

    // A ray that leaves the scene returns the background and nothing else: no shadow ray, no secondary rays.
    static RayNode MissNode(string kind, int level, Vector3 o, Vector3 d, Vector3 background)
    {
        Vector3 none = Vector3.zero;
        return new RayNode { kind = kind, level = level, o = o, d = d, t = Mathf.Infinity, index = None, p = o, n = none, entering = true, material = "sky", albedo = background, hasShadow = false, toLight = none, lit = 0f, nDotL = 0f, spec = 0f, local = background, wReflect = 0f, wRefract = 0f, truncated = false, reflection = null, refraction = null, color = background, rays = 1, outward = none, mirrorDir = none, glint = 0f, lambert = none, surface = none, hasBend = false, spawn = false, outDir = none, inDir = none, fromReflection = none, fromRefraction = none };
    }

    public static RayNode Shade(Scene scene, Vector3 o, Vector3 d, float tMin, int level, string kind, Options opt)
    {
        SceneHit hit = IntersectScene(scene, o, d, tMin, Mathf.Infinity);
        if (hit.index == None) return MissNode(kind, level, o, d, Sky(d));
        bool onSphere = hit.index >= 0;
        Sphere sphere = onSphere ? scene.spheres[hit.index] : new Sphere();
        Vector3 p = Single3(o + d * hit.t, opt.single);
        Vector3 outward = onSphere ? (p - sphere.c) * (1f / sphere.r) : new Vector3(0f, 1f, 0f);
        bool entering = Vector3.Dot(d, outward) < 0f;
        Vector3 n = entering ? outward : outward * -1f;
        string material = onSphere ? sphere.kind : "diffuse";
        Vector3 albedo = onSphere ? sphere.color : FloorColor(scene, p);
        ShadowResult shadow = ShadowRay(scene, p, n, opt);
        Vector3 toLight = (scene.light - p).normalized;
        float lit = shadow.blocked ? 0f : 1f;
        float nDotL = Mathf.Max(Vector3.Dot(n, toLight), 0f);
        Vector3 mirrorDir = n * (2f * nDotL) - toLight;
        float spec = Mathf.Pow(Mathf.Max(Vector3.Dot(mirrorDir, d * -1f), 0f), Shininess);
        float glint = lit * Ks * spec;
        Vector3 lambert = albedo * (scene.ambient + lit * Kd * nDotL);
        Vector3 surface = lambert + new Vector3(glint, glint, glint);
        Vector3 local = material == "diffuse" ? surface
            : material == "mirror" ? surface * (1f - sphere.kr) : new Vector3(glint, glint, glint);
        bool glass = material == "glass";
        SnellResult bend = glass ? SnellFresnel(d, n, entering ? 1f : sphere.ior, entering ? sphere.ior : 1f) : new SnellResult();
        float wReflect = material == "mirror" ? sphere.kr : glass ? bend.kReflect : 0f;
        float wRefract = glass ? bend.kRefract : 0f;
        bool spawn = level < opt.maxDepth;
        bool truncated = !spawn && (wReflect > 0f || wRefract > 0f);
        Vector3 outDir = glass ? bend.reflected : Reflect(d, n).normalized;
        Offset outStart = OffsetOrigin(p, n, 1f, opt.eps, opt.mode);
        Offset inStart = OffsetOrigin(p, n, -1f, opt.eps, opt.mode);
        RayNode reflection = spawn && wReflect > 0f
            ? Shade(scene, outStart.origin, outDir, outStart.tMin,
                level + 1, "reflection", opt) : null;
        Vector3 inDir = glass ? bend.refracted.normalized : outDir;
        RayNode refraction = spawn && wRefract > 0f
            ? Shade(scene, inStart.origin, inDir, inStart.tMin,
                level + 1, "refraction", opt) : null;
        Vector3 fromReflection = (reflection != null ? reflection.color : Vector3.zero) * wReflect;
        Vector3 fromRefraction = (refraction != null ? refraction.color : Vector3.zero) * wRefract;
        Vector3 color = local + fromReflection + fromRefraction;
        int below = (reflection != null ? reflection.rays : 0)
            + (refraction != null ? refraction.rays : 0);
        int rays = 2 + below;
        return new RayNode { kind = kind, level = level, o = o, d = d, t = hit.t, index = hit.index, p = p, n = n, entering = entering, material = material, albedo = albedo, hasShadow = true, shadow = shadow, toLight = toLight, lit = lit, nDotL = nDotL, spec = spec, local = local, wReflect = wReflect, wRefract = wRefract, truncated = truncated, reflection = reflection, refraction = refraction, color = color, rays = rays, outward = outward, mirrorDir = mirrorDir, glint = glint, lambert = lambert, surface = surface, hasBend = glass, bend = bend, spawn = spawn, outDir = outDir, inDir = inDir, fromReflection = fromReflection, fromRefraction = fromRefraction };
    }
    #endregion

    #region Whitted: the tree of one pixel
    // The pixel's color is a sum over the tree. A node's accumulated weight is the product of the weights on the path from the
    // root (1 for the primary ray, then kr or F or 1 - F at each step), and it contributes accum x local. The shadow rays add no
    // color of their own: they gate the local term of the node that sent them. Rows come in the order primary, its shadow ray,
    // its reflection's subtree, its refraction's subtree.
    static void AddRows(List<TreeRow> rows, RayNode node, int parent, float weight, float accum)
    {
        int id = rows.Count;
        Vector3 contribution = node.local * accum;
        rows.Add(new TreeRow(id, parent, node.kind, node.level, weight,
            accum, node.local, contribution, node, false));
        if (node.hasShadow)
        {
            Vector3 gone = Vector3.zero;
            rows.Add(new TreeRow(id + 1, id, "shadow", node.level,
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
            if (rows[i].isShadow) shadowRays += 1;
            if (!rows[i].isShadow && rows[i].node.truncated) truncatedRays += 1;
        }
        return new TreeResult { rows = rows.ToArray(), sum = sum, shadowRays = shadowRays, truncatedRays = truncatedRays, rays = root.rays };
    }
    #endregion

    #region Whitted: render the image
    // One pixel is one primary ray into shade(). A block of rows is rendered at a time, so a caller can stop between blocks when
    // the scene changes. opt = { maxDepth, eps, mode, single }.
    public static RayNode TracePixel(Scene scene, int px, int py, Options opt)
    {
        RayCamera cam = scene.camera;
        Basis basis = LookAtBasis(cam.eye, cam.look, Vector3.up);
        PixelRayResult ray = PixelRay(cam.eye, basis, cam.fovDeg, cam.width, cam.height, px, py);
        return Shade(scene, cam.eye, ray.dir, 0f, 0, "primary", opt);
    }

    public static RenderResult RenderRows(Scene scene, int y0, int y1, Options opt)
    {
        RayCamera cam = scene.camera;
        Basis basis = LookAtBasis(cam.eye, cam.look, Vector3.up);
        float[] pixels = new float[(y1 - y0) * cam.width * 3];
        int rays = 0;
        int at = 0;
        for (int py = y0; py < y1; py++)
        {
            for (int px = 0; px < cam.width; px++)
            {
                PixelRayResult ray = PixelRay(cam.eye, basis, cam.fovDeg, cam.width, cam.height, px, py);
                RayNode node = Shade(scene, cam.eye, ray.dir, 0f, 0, "primary", opt);
                pixels[at] = node.color.x; pixels[at + 1] = node.color.y; pixels[at + 2] = node.color.z;
                at += 3;
                rays += node.rays;
            }
        }
        return new RenderResult { y0 = y0, y1 = y1, pixels = pixels, rays = rays };
    }
    #endregion

    #region BVH: boxes and areas
    // A node of a bounding-volume hierarchy holds the axis-aligned box of everything below it. The surface area of a box,
    // 2 (dx dy + dy dz + dz dx), decides how likely a random ray that hits the parent is to hit the child.
    public static TriBox TriBounds(Vector3[] tri)
    {
        Vector3 lo = MinPoint(MinPoint(tri[0], tri[1]), tri[2]);
        Vector3 hi = MaxPoint(MaxPoint(tri[0], tri[1]), tri[2]);
        return new TriBox { lo = lo, hi = hi };
    }

    public static float BoxArea(Vector3 lo, Vector3 hi)
    {
        float dx = hi.x - lo.x;
        float dy = hi.y - lo.y;
        float dz = hi.z - lo.z;
        float area = 2f * (dx * dy + dy * dz + dz * dx);
        return area;
    }
    #endregion

    #region BVH: the surface area heuristic
    // Where to split a node? A random ray that hits the parent hits a child with probability about (child area) / (parent area)
    // (MacDonald and Booth, 1990). The expected cost of a split is the cost of visiting the node plus each child's chance times
    // its triangle count times the cost of one triangle test: cost = cTrav + pL nL cTri + pR nR cTri. Not splitting costs
    // n cTri. sweepSplits tries every split between neighbors along the sorted centroids of one axis.
    public static SahResult SahCost(float areaParent, float areaLeft, float areaRight, int countLeft, int countRight, float cTrav, float cTri)
    {
        float pLeft = areaParent > 0f ? areaLeft / areaParent : 0.5f;
        float pRight = areaParent > 0f ? areaRight / areaParent : 0.5f;
        float costLeft = pLeft * countLeft * cTri;
        float costRight = pRight * countRight * cTri;
        float cost = cTrav + costLeft + costRight;
        float leafCost = (countLeft + countRight) * cTri;
        bool worthIt = cost < leafCost;
        return new SahResult { pLeft = pLeft, pRight = pRight, costLeft = costLeft, costRight = costRight, cost = cost, leafCost = leafCost, worthIt = worthIt };
    }

    // Ids sorted by one coordinate of their centroid, ties in their given order. A copy: the argument stays as it was.
    static int[] SortIds(int[] ids, Vector3[] centroid, int axis)
    {
        int[] sorted = (int[])ids.Clone();
        for (int i = 1; i < sorted.Length; i++)
        {
            int id = sorted[i];
            int j = i - 1;
            while (j >= 0 && centroid[sorted[j]][axis] > centroid[id][axis])
            {
                sorted[j + 1] = sorted[j];
                j -= 1;
            }
            sorted[j + 1] = id;
        }
        return sorted;
    }

    public static Sweep SweepSplits(Vector3[] lo, Vector3[] hi, Vector3[] centroid, int[] ids, int axis, float cTrav, float cTri)
    {
        int n = ids.Length;
        int[] sorted = SortIds(ids, centroid, axis);
        float[] prefix = new float[n];
        Vector3 boxLo = Inf3(Mathf.Infinity);
        Vector3 boxHi = Inf3(-Mathf.Infinity);
        for (int i = 0; i < n; i++)
        {
            boxLo = MinPoint(boxLo, lo[sorted[i]]);
            boxHi = MaxPoint(boxHi, hi[sorted[i]]);
            prefix[i] = BoxArea(boxLo, boxHi);
        }
        float[] suffix = new float[n];
        boxLo = Inf3(Mathf.Infinity);
        boxHi = Inf3(-Mathf.Infinity);
        for (int i = n - 1; i >= 0; i--)
        {
            boxLo = MinPoint(boxLo, lo[sorted[i]]);
            boxHi = MaxPoint(boxHi, hi[sorted[i]]);
            suffix[i] = BoxArea(boxLo, boxHi);
        }
        float areaParent = prefix[n - 1];
        float[] areaLeft = new float[n - 1];
        float[] areaRight = new float[n - 1];
        float[] costs = new float[n - 1];
        int best = 1;
        for (int k = 1; k < n; k++)
        {
            areaLeft[k - 1] = prefix[k - 1];
            areaRight[k - 1] = suffix[k];
            SahResult split = SahCost(areaParent, areaLeft[k - 1], areaRight[k - 1],
                k, n - k, cTrav, cTri);
            costs[k - 1] = split.cost;
            if (costs[k - 1] < costs[best - 1]) best = k;
        }
        int medianK = n / 2;
        float bestCost = costs[best - 1];
        float medianCost = costs[medianK - 1];
        float leafCost = n * cTri;
        return new Sweep { sorted = sorted, areaParent = areaParent, areaLeft = areaLeft, areaRight = areaRight, costs = costs, best = best, bestCost = bestCost, medianK = medianK, medianCost = medianCost, leafCost = leafCost };
    }
    #endregion

    #region BVH: build
    // Split a node's triangles in two and recurse. The median method sorts them by centroid along the box's longest axis and cuts at
    // the middle. The surface area method takes the cheapest sahCost over all three axes, and makes a leaf when no split beats it.
    // A node is also a leaf at leafSize triangles or at maxDepth. The nodes are parallel lists; a node's triangles are
    // order[first .. first + count). The builder fills lists it made for itself, not the caller's.
    sealed class BuildState
    {
        public Vector3[] lo, hi, centroid;
        public int[] order;
        public List<Vector3> nodeLo = new List<Vector3>(), nodeHi = new List<Vector3>();
        public List<int> left = new List<int>(), right = new List<int>(), first = new List<int>(), count = new List<int>(), depth = new List<int>();
        public int leafSize, maxDepth;
        public string method;
        public float cTrav, cTri;
        public BuildState(Vector3[] lo, Vector3[] hi, Vector3[] centroid, int[] order, int leafSize, int maxDepth, string method)
        {
            this.lo = lo; this.hi = hi; this.centroid = centroid; this.order = order;
            this.leafSize = leafSize; this.maxDepth = maxDepth; this.method = method; cTrav = 1f; cTri = 1f;
        }
    }

    static int[] Slice(int[] list, int first, int count)
    {
        int[] part = new int[count];
        for (int i = 0; i < count; i++) part[i] = list[first + i];
        return part;
    }

    static Split ChooseSplit(BuildState state, int first, int count, Vector3 lo, Vector3 hi)
    {
        int[] ids = Slice(state.order, first, count);
        Vector3 size = hi - lo;
        int longest = size.x >= size.y && size.x >= size.z ? 0
            : size.y >= size.z ? 1 : 2;
        if (state.method == "median")
        {
            return new Split(longest, count / 2, false);
        }
        int axis = 0;
        Sweep found = SweepSplits(state.lo, state.hi, state.centroid, ids, 0,
            state.cTrav, state.cTri);
        for (int a = 1; a < 3; a++)
        {
            Sweep sweep = SweepSplits(state.lo, state.hi, state.centroid, ids, a,
                state.cTrav, state.cTri);
            if (sweep.bestCost < found.bestCost)
            {
                found = sweep;
                axis = a;
            }
        }
        return new Split(axis, found.best, found.bestCost >= found.leafCost);
    }

    static int BuildNode(BuildState state, int first, int count, int depth)
    {
        int id = state.nodeLo.Count;
        Vector3 lo = Inf3(Mathf.Infinity);
        Vector3 hi = Inf3(-Mathf.Infinity);
        for (int i = first; i < first + count; i++)
        {
            lo = MinPoint(lo, state.lo[state.order[i]]);
            hi = MaxPoint(hi, state.hi[state.order[i]]);
        }
        state.nodeLo.Add(lo);
        state.nodeHi.Add(hi);
        state.left.Add(-1);
        state.right.Add(-1);
        state.first.Add(first);
        state.count.Add(count);
        state.depth.Add(depth);
        if (count <= state.leafSize || depth >= state.maxDepth) return id;
        Split split = ChooseSplit(state, first, count, lo, hi);
        if (split.leaf) return id;
        int[] sorted = SortIds(Slice(state.order, first, count), state.centroid, split.axis);
        for (int i = 0; i < count; i++) state.order[first + i] = sorted[i];
        state.left[id] = BuildNode(state, first, split.k, depth + 1);
        state.right[id] = BuildNode(state, first + split.k, count - split.k, depth + 1);
        return id;
    }

    public static Bvh BuildBvh(Vector3[][] tris, int leafSize, int maxDepth, string method)
    {
        Vector3[] lo = new Vector3[tris.Length];
        Vector3[] hi = new Vector3[tris.Length];
        Vector3[] centroid = new Vector3[tris.Length];
        int[] order = new int[tris.Length];
        for (int i = 0; i < tris.Length; i++)
        {
            TriBox box = TriBounds(tris[i]);
            lo[i] = box.lo;
            hi[i] = box.hi;
            centroid[i] = (tris[i][0] + tris[i][1] + tris[i][2]) * (1f / 3f);
            order[i] = i;
        }
        BuildState state = new BuildState(lo, hi, centroid, order, leafSize, maxDepth, method);
        BuildNode(state, 0, tris.Length, 0);
        return new Bvh { lo = state.nodeLo.ToArray(), hi = state.nodeHi.ToArray(), left = state.left.ToArray(), right = state.right.ToArray(), first = state.first.ToArray(),
            count = state.count.ToArray(), depth = state.depth.ToArray(), order = order, nodeCount = state.nodeLo.Count };
    }
    #endregion

    #region BVH: traverse a ray
    // Test the root's box. A ray that misses a box skips everything below it. A ray that hits an inner node descends into both
    // children, the left first. At a leaf it tests the leaf's triangles. With prune on, a box whose entry is farther than the
    // nearest hit so far is skipped too. Every box test and every triangle test is recorded as a step, in order.
    public static BruteResult BruteForce(Vector3[][] tris, Vector3 o, Vector3 d)
    {
        float t = Mathf.Infinity;
        int tri = -1;
        for (int i = 0; i < tris.Length; i++)
        {
            TriangleHit hit = RayTriangle(o, d, tris[i][0], tris[i][1], tris[i][2]);
            if (hit.kind == "hit" && hit.t < t)
            {
                t = hit.t;
                tri = i;
            }
        }
        return new BruteResult { tests = tris.Length, t = t, tri = tri };
    }

    public static Traversal TraverseBvh(Bvh bvh, Vector3[][] tris, Vector3 o, Vector3 d, bool prune)
    {
        List<int> stack = new List<int>();
        stack.Add(0);
        List<int> node = new List<int>();
        List<string> kind = new List<string>();
        List<int> tri = new List<int>();
        List<float> at = new List<float>();
        List<float> best = new List<float>();
        float nearest = Mathf.Infinity;
        int nearestTri = -1;
        int boxTests = 0;
        int triTests = 0;
        while (stack.Count > 0)
        {
            int id = stack[stack.Count - 1];
            stack.RemoveAt(stack.Count - 1);
            BoxHit box = RayBox(o, d, bvh.lo[id], bvh.hi[id]);
            float entry = Mathf.Max(box.tEnter, 0f);
            bool reached = box.kind == "hit" || box.kind == "inside";
            bool leaf = bvh.left[id] < 0;
            boxTests += 1;
            string what = "miss";
            if (reached && prune && entry > nearest) what = "skipped";
            else if (reached) what = leaf ? "leaf" : "descend";
            node.Add(id); kind.Add(what); tri.Add(-1); at.Add(entry); best.Add(nearest);
            if (what == "descend")
            {
                stack.Add(bvh.right[id]);
                stack.Add(bvh.left[id]);
            }
            if (what != "leaf") continue;
            for (int i = bvh.first[id]; i < bvh.first[id] + bvh.count[id]; i++)
            {
                int index = bvh.order[i];
                TriangleHit hit = RayTriangle(o, d, tris[index][0], tris[index][1], tris[index][2]);
                triTests += 1;
                string result = "tri-miss";
                if (hit.kind == "hit" && hit.t < nearest)
                {
                    result = "tri-nearest";
                    nearest = hit.t;
                    nearestTri = index;
                }
                else if (hit.kind == "hit") result = "tri-farther";
                node.Add(id); kind.Add(result); tri.Add(index); at.Add(hit.kind == "hit" ? hit.t : Mathf.Infinity); best.Add(nearest);
            }
        }
        return new Traversal { node = node.ToArray(), kind = kind.ToArray(), tri = tri.ToArray(), at = at.ToArray(), best = best.ToArray(), steps = node.Count,
            boxTests = boxTests, triTests = triTests, t = nearest, hitTri = nearestTri };
    }
    #endregion

    #region BVH: what the tree buys
    // A frame casts raysPerPixel rays through each pixel. Brute force tests every triangle for every ray. A balanced tree of
    // triangles has about log2(T) levels, rounded up, and a ray tests about two boxes per level it passes through.
    public static FrameCostResult FrameCost(int triangles, int pixels, int raysPerPixel)
    {
        float rays = (float)pixels * raysPerPixel;
        float brute = rays * triangles;
        int levels = (int)Mathf.Ceil(Mathf.Log(triangles, 2f));
        float withTree = rays * 2f * levels;
        float speedup = brute / withTree;
        return new FrameCostResult { rays = rays, brute = brute, levels = levels, withTree = withTree, speedup = speedup };
    }
    #endregion
}
