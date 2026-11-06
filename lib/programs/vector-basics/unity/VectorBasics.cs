using UnityEngine;

// VectorBasics.cs: points, vectors and the questions a dot and a cross answer, on Unity's Vector3. No drawing here:
// VectorBasicsScene.cs draws it.
//   Points and vectors, frames, normalizing, the operations, the dot product and what it answers, the cross product
//   and what it answers, lines and planes defined several ways, relative position tests, interpolation.
// Every method returns its named intermediate results as a tuple. Vector3 is a value type and its operators make new
// vectors, so nothing here changes an argument (vectorbasics.js needs clone() calls for that).
// Unity's axes are left-handed: Vector3.Cross uses the same formula as three.js, so the numbers are the same and the
// picture is the mirror image (a x b follows the left hand).
// The same functions, line for line where the languages allow, are vectorbasics.js in ../webgl/
// (lib/tests/programs/vector-basics.test.mjs runs both on the same inputs and compares the numbers).
public static class VectorBasics
{
    #region Settings
    // Below Eps a length, a dot product or a signed distance counts as zero. Unity's floats have about 7 digits, so the
    // two tracks share a value that rounding does not reach for vectors of ordinary size.
    public const float Eps = 1e-4f;
    #endregion

    // Most methods return a named tuple. These five return more values than the tuples mono's compiler accepts (7), so
    // each has a small struct, with the same field names and order as vectorbasics.js returns.
    public struct CrossResult { public float cx, cy, cz; public Vector3 c, flipped; public float dotA, dotB, theta; }
    public struct LineLineResult { public Vector3 n; public float nn; public bool parallel; public float gap, t1, t2; public Vector3 c1, c2; public string kind; }
    public struct SegmentTriangleResult { public Vector3 n; public float sa, sb, t; public Vector3 hit; public float wa, wb, wc; public string kind; }
    public struct PlanePlaneResult { public float c1, c2; public Vector3 d; public float dd; public bool parallel; public Vector3 p; public float gap, angle; public string kind; }
    public struct SlerpResult { public Vector3 aHat, bHat; public float cosT, theta, sinT, w0, w1; public Vector3 slerp, chord, nlerp; }

    #region Points and vectors: subtract, add, move the origin
    // point - point = vector; point + vector = point. Moving the origin changes the coordinates of P and Q, and not v.
    public static (Vector3 v, Vector3 r, Vector3 pFromO, Vector3 qFromO, Vector3 vFromO) PointsAndVectors(Vector3 p, Vector3 q, Vector3 o)
    {
        Vector3 v = q - p;
        Vector3 r = p + v;
        Vector3 pFromO = p - o;
        Vector3 qFromO = q - o;
        Vector3 vFromO = qFromO - pFromO;
        return (v, r, pFromO, qFromO, vFromO);
    }
    #endregion

    #region Points and vectors: what adds and what does not
    // Adding two points adds their coordinates, and those depend on the origin. Weights that sum to 1 cancel the origin:
    // (1 - t)(P - O) + t(Q - O) + O = (1 - t)P + tQ, for every O.
    public static (Vector3 pFromO, Vector3 qFromO, Vector3 sum, Vector3 mix) AffineCombination(Vector3 p, Vector3 q, Vector3 o, float t)
    {
        Vector3 pFromO = p - o;
        Vector3 qFromO = q - o;
        Vector3 sum = o + pFromO + qFromO;
        Vector3 mix = (1f - t) * p + t * q;
        return (pFromO, qFromO, sum, mix);
    }
    #endregion

    #region Points and vectors: w = 1 and w = 0
    // A 4 x 4 matrix multiplies (x, y, z, w). The translation column is scaled by w, so it moves a point (w = 1) and not
    // a vector (w = 0). This is the whole difference in a transform.
    public static (Vector3 pMoved, Vector3 vMoved) Homogeneous(Vector3 p, Vector3 v, Vector3 move)
    {
        Matrix4x4 m = Matrix4x4.Translate(move);
        Vector3 pMoved = m.MultiplyPoint3x4(p);
        Vector3 vMoved = m.MultiplyVector(v);
        return (pMoved, vMoved);
    }
    #endregion

    #region Frames: build one from two vectors
    // Gram-Schmidt: u is a's direction, v is what is left of b after removing its part along u, and the cross product
    // gives the third axis. b parallel to a leaves nothing across: no frame. Unity: Vector3.OrthoNormalize(ref a, ref b).
    public static (Vector3 u, Vector3 along, Vector3 across, float acrossLen, Vector3 v, Vector3 w) BuildFrame(Vector3 a, Vector3 b)
    {
        Vector3 u = a.normalized;
        Vector3 along = Vector3.Dot(b, u) * u;
        Vector3 across = b - along;
        float acrossLen = across.magnitude;
        Vector3 v = across.normalized;
        Vector3 w = Vector3.Cross(u, v);
        return (u, along, across, acrossLen, v, w);
    }
    #endregion

    #region Frames: a point's coordinates in a frame
    // With orthonormal axes each coordinate is a dot product with the arrow from the frame's origin to the point.
    // Unity: transform.InverseTransformPoint(p), which also undoes the transform's scale.
    public static (Vector3 r, float x, float y, float z, Vector3 back) PointInFrame(Vector3 p, Vector3 o, Vector3 u, Vector3 v, Vector3 w)
    {
        Vector3 r = p - o;
        float x = Vector3.Dot(r, u);
        float y = Vector3.Dot(r, v);
        float z = Vector3.Dot(r, w);
        Vector3 back = o + x * u + y * v + z * w;
        return (r, x, y, z, back);
    }
    #endregion

    #region Normalizing: length and direction
    // Length is Pythagoras twice. Dividing by it leaves the direction; scaling by s > 0 leaves that direction alone and
    // s < 0 reverses it. The zero vector has no direction: v.normalized returns zero below length 1e-5, and in HLSL
    // normalize(float3(0, 0, 0)) gives NaN.
    public static (float floor, float len, Vector3 unit, float unitLen, Vector3 scaled, Vector3 scaledUnit) NormalizeVector(Vector3 v, float s)
    {
        float floor = Mathf.Sqrt(v.x * v.x + v.z * v.z);
        float len = Mathf.Sqrt(floor * floor + v.y * v.y);
        Vector3 unit = v.normalized;
        float unitLen = unit.magnitude;
        Vector3 scaled = s * v;
        Vector3 scaledUnit = scaled.normalized;
        return (floor, len, unit, unitLen, scaled, scaledUnit);
    }
    #endregion

    #region Operations: add
    // Component by component; the arrows go tip to tail, in either order.
    public static (Vector3 sum, Vector3 sumOther) AddVectors(Vector3 a, Vector3 b)
    {
        Vector3 sum = a + b;
        Vector3 sumOther = b + a;
        return (sum, sumOther);
    }
    #endregion

    #region Operations: subtract
    // a - b runs from b's tip to a's tip, and equals a + (-b).
    public static (Vector3 diff, Vector3 negB, Vector3 viaNeg) SubtractVectors(Vector3 a, Vector3 b)
    {
        Vector3 diff = a - b;
        Vector3 negB = -b;
        Vector3 viaNeg = a + negB;
        return (diff, negB, viaNeg);
    }
    #endregion

    #region Operations: scale
    // Multiplies each component, so the length by |s|. A negative s reverses the arrow.
    public static (Vector3 scaled, float lenA, float lenScaled) ScaleVector(Vector3 a, float s)
    {
        Vector3 scaled = s * a;
        float lenA = a.magnitude;
        float lenScaled = scaled.magnitude;
        return (scaled, lenA, lenScaled);
    }
    #endregion

    #region Operations: linear combination
    // s a + t b reaches every point of the plane through the origin that holds a and b, and leaves that plane never:
    // c . (a x b) is 0 for every s and t.
    public static (Vector3 sa, Vector3 tb, Vector3 c, Vector3 normal, float offPlane) LinearCombination(Vector3 a, Vector3 b, float s, float t)
    {
        Vector3 sa = s * a;
        Vector3 tb = t * b;
        Vector3 c = sa + tb;
        Vector3 normal = Vector3.Cross(a, b);
        float offPlane = Vector3.Dot(c, normal);
        return (sa, tb, c, normal, offPlane);
    }
    #endregion

    #region Dot: the angle between two vectors
    // a . b = |a||b|cos(theta). The clamp keeps rounding from pushing acos out of range; a zero vector gives NaN (no
    // direction, no angle). Unity: Vector3.Angle(a, b), in degrees, and Vector3.SignedAngle(a, b, axis). HLSL: dot(a, b).
    public static (float d, float lenA, float lenB, float cosT, float theta, float rebuilt) AngleBetween(Vector3 a, Vector3 b)
    {
        float d = a.x * b.x + a.y * b.y + a.z * b.z;
        float lenA = a.magnitude;
        float lenB = b.magnitude;
        float cosT = d / (lenA * lenB);
        float theta = Mathf.Acos(Mathf.Clamp(cosT, -1f, 1f));
        float rebuilt = lenA * lenB * Mathf.Cos(theta);
        return (d, lenA, lenB, cosT, theta, rebuilt);
    }
    #endregion

    #region Dot: projection
    // A dot with a unit vector is a signed length along it, |a|cos(theta). The shadow is that length times the direction;
    // what is left is square to b. Unity: Vector3.Project(a, b), Vector3.ProjectOnPlane(a, n).
    public static (Vector3 bHat, float scalar, Vector3 proj, Vector3 rej, float check) ProjectOnto(Vector3 a, Vector3 b)
    {
        Vector3 bHat = b.normalized;
        float scalar = Vector3.Dot(a, bHat);
        Vector3 proj = scalar * bHat;
        Vector3 rej = a - proj;
        float check = Vector3.Dot(rej, b);
        return (bHat, scalar, proj, rej, check);
    }
    #endregion

    #region Dot: in front, behind, inside a cone
    // The sign of a dot says which half space a direction is in. Comparing it with cos(half the field of view) tests a
    // cone without an acos. A back face is the same test: the normal against the direction to the eye.
    public static (Vector3 fHat, Vector3 tHat, float cosT, bool ahead, float cosHalf, bool inCone) Facing(Vector3 f, Vector3 t, float fovDeg)
    {
        Vector3 fHat = f.normalized;
        Vector3 tHat = t.normalized;
        float cosT = Vector3.Dot(fHat, tHat);
        bool ahead = cosT > 0f;
        float cosHalf = Mathf.Cos(fovDeg * 0.5f * Mathf.Deg2Rad);
        bool inCone = cosT > cosHalf;
        return (fHat, tHat, cosT, ahead, cosHalf, inCone);
    }
    #endregion

    #region Dot: Lambert shading
    // Light on a surface falls off with the cosine of the angle to the normal, and is zero past 90 degrees. Both vectors
    // must be unit length. In a shader: saturate(dot(n, l)), or max(dot(n, l), 0).
    public static (Vector3 nHat, Vector3 lHat, float cosT, float diffuse) Lambert(Vector3 n, Vector3 l)
    {
        Vector3 nHat = n.normalized;
        Vector3 lHat = l.normalized;
        float cosT = Vector3.Dot(nHat, lHat);
        float diffuse = Mathf.Max(0f, cosT);
        return (nHat, lHat, cosT, diffuse);
    }
    #endregion

    #region Dot: reflection
    // Reverse the part along the normal, keep the part across it: r = d - 2(d . n)n, for a unit n. Unity:
    // Vector3.Reflect(d, n). HLSL: reflect(d, n).
    public static (Vector3 nHat, float dn, Vector3 along, Vector3 across, Vector3 r) ReflectVector(Vector3 d, Vector3 n)
    {
        Vector3 nHat = n.normalized;
        float dn = Vector3.Dot(d, nHat);
        Vector3 along = dn * nHat;
        Vector3 across = d - along;
        Vector3 r = across - along;
        return (nHat, dn, along, across, r);
    }
    #endregion

    #region Cross: the product and its checks
    // Each component takes the other two in cyclic order. The result is square to both inputs, and b x a is its opposite.
    // atan2 of the two products gives the angle accurately near 0 and 180 degrees, where acos loses digits. HLSL:
    // cross(a, b).
    public static CrossResult CrossProduct(Vector3 a, Vector3 b)
    {
        float cx = a.y * b.z - a.z * b.y;
        float cy = a.z * b.x - a.x * b.z;
        float cz = a.x * b.y - a.y * b.x;
        Vector3 c = Vector3.Cross(a, b);
        Vector3 flipped = Vector3.Cross(b, a);
        float dotA = Vector3.Dot(c, a);
        float dotB = Vector3.Dot(c, b);
        float theta = Mathf.Atan2(c.magnitude, Vector3.Dot(a, b));
        return new CrossResult { cx = cx, cy = cy, cz = cz, c = c, flipped = flipped, dotA = dotA, dotB = dotB, theta = theta };
    }
    #endregion

    #region Cross: area
    // |a x b| = |a||b|sin(theta): the base |b| times the height |a|sin(theta). A triangle on the same two edges is half.
    public static (Vector3 c, float area, float triArea, float baseLen, float height, float sinT) AreaFromCross(Vector3 a, Vector3 b)
    {
        Vector3 c = Vector3.Cross(a, b);
        float area = c.magnitude;
        float triArea = area / 2f;
        float baseLen = b.magnitude;
        float height = baseLen > Eps ? area / baseLen : 0f;
        float sinT = area / (a.magnitude * baseLen);
        return (c, area, triArea, baseLen, height, sinT);
    }
    #endregion

    #region Cross: a triangle's normal
    // Two edges from one corner, crossed. Swapping two corners reverses the winding and the normal, which is how a
    // renderer tells a front face from a back face. Collinear corners give the zero vector.
    public static (Vector3 e1, Vector3 e2, Vector3 n, float area, Vector3 nHat, float d) TriangleNormal(Vector3 p0, Vector3 p1, Vector3 p2)
    {
        Vector3 e1 = p1 - p0;
        Vector3 e2 = p2 - p0;
        Vector3 n = Vector3.Cross(e1, e2);
        float area = n.magnitude / 2f;
        Vector3 nHat = n.normalized;
        float d = Vector3.Dot(nHat, p0);
        return (e1, e2, n, area, nHat, d);
    }
    #endregion

    #region Cross: which side of an edge
    // Seen from the side up points to, s > 0 means p is to the left of the edge from a to b in right-handed axes. In
    // Unity's left-handed axes the same numbers mean the right. Same sign at every edge of a convex polygon: inside.
    public static (Vector3 e, Vector3 r, Vector3 c, float s) SideOfEdge(Vector3 a, Vector3 b, Vector3 p, Vector3 up)
    {
        Vector3 e = b - a;
        Vector3 r = p - a;
        Vector3 c = Vector3.Cross(e, r);
        float s = Vector3.Dot(c, up);
        return (e, r, c, s);
    }
    #endregion

    #region Cross: triple product
    // a . (b x c) is the signed volume of the box on three edges; zero means the three vectors lie in one plane. Its
    // sign says whether (a, b, c) has the handedness of the axes.
    public static (Vector3 bc, float volume, float size, bool coplanar) TripleProduct(Vector3 a, Vector3 b, Vector3 c)
    {
        Vector3 bc = Vector3.Cross(b, c);
        float volume = Vector3.Dot(a, bc);
        float size = Mathf.Abs(volume);
        bool coplanar = size < Eps;
        return (bc, volume, size, coplanar);
    }
    #endregion

    #region Lines: a point and a direction
    // X(t) = P + t d. Every real t is on the line, t >= 0 is a ray, and with d = B - A the range 0 <= t <= 1 is a segment.
    public static (Vector3 x, float along) LineFromPointDirection(Vector3 p, Vector3 d, float t)
    {
        Vector3 x = p + t * d;
        float along = t * d.magnitude;
        return (x, along);
    }
    #endregion

    #region Lines: two points
    // The direction is the difference. t = 0 is at A and t = 1 is at B.
    public static (Vector3 d, float len, Vector3 x) LineFromTwoPoints(Vector3 a, Vector3 b, float t)
    {
        Vector3 d = b - a;
        float len = d.magnitude;
        Vector3 x = a + t * d;
        return (d, len, x);
    }
    #endregion

    #region Lines: where two planes meet
    // With planes n1 . X = c1 and n2 . X = c2, the line runs along n1 x n2, square to both normals. This p satisfies both
    // equations and is the point of the line nearest the origin. Parallel planes give d = 0: no line.
    public static (Vector3 d, float dd, Vector3 t1, Vector3 t2, Vector3 p) LineFromTwoPlanes(Vector3 n1, float c1, Vector3 n2, float c2)
    {
        Vector3 d = Vector3.Cross(n1, n2);
        float dd = Vector3.Dot(d, d);
        Vector3 t1 = c1 * Vector3.Cross(n2, d);
        Vector3 t2 = c2 * Vector3.Cross(d, n1);
        Vector3 p = (t1 + t2) / dd;
        return (d, dd, t1, t2, p);
    }
    #endregion

    #region Lines: direction and moment
    // Pluecker coordinates (d : m) with m = P x d. m is the same for every point P of the line, so the pair names the line
    // and not a point on it. d . m = 0 always, and |m| / |d| is the line's distance from the origin.
    public static (Vector3 m, float dd, Vector3 near, float dist, float check) LineMoment(Vector3 p, Vector3 d)
    {
        Vector3 m = Vector3.Cross(p, d);
        float dd = Vector3.Dot(d, d);
        Vector3 near = Vector3.Cross(d, m) / dd;
        float dist = m.magnitude / Mathf.Sqrt(dd);
        float check = Vector3.Dot(d, m);
        return (m, dd, near, dist, check);
    }
    #endregion

    #region Lines: in the plane, ax + by = c
    // (a, b) is the line's normal, and (b, -a) its direction. y = mx + k is the same line unless b = 0, where the slope
    // does not exist, which is why graphics code prefers this form.
    public static (Vector3 n, float nn, Vector3 near, Vector3 dir, bool vertical, float slope, float intercept) Line2D(float a, float b, float c)
    {
        Vector3 n = new Vector3(a, b, 0f);
        float nn = Vector3.Dot(n, n);
        Vector3 near = (c / nn) * n;
        Vector3 dir = new Vector3(b, -a, 0f);
        bool vertical = Mathf.Abs(b) < Eps;
        float slope = -a / b;
        float intercept = c / b;
        return (n, nn, near, dir, vertical, slope, intercept);
    }
    #endregion

    #region Planes: a point and a normal
    // n . (X - Q) = 0: the arrow from Q to any point of the plane is square to n. Expanded, n . X = d with d = n . Q.
    // Unity: new Plane(n, q), which stores n . X + distance = 0 with n normalized, so its distance is -d / |n|.
    public static (Vector3 nHat, float d, Vector3 toX, float s) PlaneFromPointNormal(Vector3 q, Vector3 n, Vector3 x)
    {
        Vector3 nHat = n.normalized;
        float d = Vector3.Dot(n, q);
        Vector3 toX = x - q;
        float s = Vector3.Dot(toX, nHat);
        return (nHat, d, toX, s);
    }
    #endregion

    #region Planes: three points
    // Two edges crossed give the normal; collinear points give zero and no plane. Unity: new Plane(a, b, c), with this
    // same cross product, normalized.
    public static (Vector3 u, Vector3 v, Vector3 n, float d, bool collinear) PlaneFromThreePoints(Vector3 a, Vector3 b, Vector3 c)
    {
        Vector3 u = b - a;
        Vector3 v = c - a;
        Vector3 n = Vector3.Cross(u, v);
        float d = Vector3.Dot(n, a);
        bool collinear = n.magnitude < Eps;
        return (u, v, n, d, collinear);
    }
    #endregion

    #region Planes: a point and two directions
    // X(s, t) = Q + s u + t v covers the plane, and n = u x v turns it into the implicit form. The check is 0 for all s, t.
    public static (Vector3 n, Vector3 x, float d, float check) PlaneFromPointDirections(Vector3 q, Vector3 u, Vector3 v, float s, float t)
    {
        Vector3 n = Vector3.Cross(u, v);
        Vector3 x = q + s * u + t * v;
        float d = Vector3.Dot(n, q);
        float check = Vector3.Dot(n, x) - d;
        return (n, x, d, check);
    }
    #endregion

    #region Planes: ax + by + cz = d
    // (a, b, c) is the normal. Dividing through by its length gives the normal form nHat . X = dist, where dist is the
    // signed distance from the origin and q the plane's point nearest the origin.
    public static (Vector3 n, float len, Vector3 nHat, float dist, Vector3 q) PlaneFromImplicit(float a, float b, float c, float d)
    {
        Vector3 n = new Vector3(a, b, c);
        float len = n.magnitude;
        Vector3 nHat = n.normalized;
        float dist = d / len;
        Vector3 q = dist * nHat;
        return (n, len, nHat, dist, q);
    }
    #endregion

    #region Tests: point and plane
    // The signed distance: positive on the side n points to, zero on the plane. Removing it leaves the foot.
    // three.js: plane.distanceToPoint(p). Unity: plane.GetDistanceToPoint(p).
    public static (Vector3 nHat, float s, Vector3 foot, string side) PointPlane(Vector3 p, Vector3 q, Vector3 n)
    {
        Vector3 nHat = n.normalized;
        float s = Vector3.Dot(p - q, nHat);
        Vector3 foot = p - s * nHat;
        string side = "on";
        if (s > Eps) side = "front";
        else if (s < -Eps) side = "behind";
        return (nHat, s, foot, side);
    }
    #endregion

    #region Tests: point and line
    // The dot finds the foot; the cross gives the same distance without it, as the parallelogram's area over its base.
    public static (Vector3 r, float t, Vector3 foot, float dist, float crossDist) PointLine(Vector3 p, Vector3 a, Vector3 d)
    {
        Vector3 r = p - a;
        float t = Vector3.Dot(r, d) / Vector3.Dot(d, d);
        Vector3 foot = a + t * d;
        float dist = Vector3.Distance(p, foot);
        float crossDist = Vector3.Cross(d, r).magnitude / d.magnitude;
        return (r, t, foot, dist, crossDist);
    }
    #endregion

    #region Tests: point and segment
    // The line's parameter, clamped to the segment: past an end, the nearest point is that end.
    public static (Vector3 d, float dd, float raw, float t, Vector3 near, float dist) PointSegment(Vector3 p, Vector3 a, Vector3 b)
    {
        Vector3 d = b - a;
        float dd = Vector3.Dot(d, d);
        float raw = dd > Eps ? Vector3.Dot(p - a, d) / dd : 0f;
        float t = Mathf.Clamp01(raw);
        Vector3 near = a + t * d;
        float dist = Vector3.Distance(p, near);
        return (d, dd, raw, t, near, dist);
    }
    #endregion

    #region Tests: point and triangle
    // Each barycentric weight is the signed area of the sub-triangle opposite that corner, over the whole area. All three
    // non-negative: the point's foot on the plane is inside. Unity has no triangle type; a Physics.Raycast hit reports
    // RaycastHit.barycentricCoordinate against a MeshCollider.
    public static (Vector3 n, float nn, float wa, float wb, float wc, float height, bool inside) PointTriangle(Vector3 p, Vector3 a, Vector3 b, Vector3 c)
    {
        Vector3 n = Vector3.Cross(b - a, c - a);
        float nn = Vector3.Dot(n, n);
        Vector3 ra = a - p;
        Vector3 rb = b - p;
        Vector3 rc = c - p;
        float wa = Vector3.Dot(Vector3.Cross(rb, rc), n) / nn;
        float wb = Vector3.Dot(Vector3.Cross(rc, ra), n) / nn;
        float wc = Vector3.Dot(Vector3.Cross(ra, rb), n) / nn;
        float height = Vector3.Dot(p - a, n) / Mathf.Sqrt(nn);
        bool inside = wa >= 0f && wb >= 0f && wc >= 0f;
        return (n, nn, wa, wb, wc, height, inside);
    }
    #endregion

    #region Tests: point and polygon
    // A ray from p along +x crosses the polygon's edges: an odd count is inside (even-odd). Counting each crossing +1 or
    // -1 by the edge's direction gives the winding number; the two rules differ only where a polygon crosses itself.
    // The polygon lies in the plane y = 0, and p is read by its x and z.
    public static (int crossings, int winding, bool evenOdd, bool nonZero) PointPolygon(Vector3 p, Vector3[] verts)
    {
        int crossings = 0;
        int winding = 0;
        for (int i = 0; i < verts.Length; i++)
        {
            Vector3 v0 = verts[i];
            Vector3 v1 = verts[(i + 1) % verts.Length];
            if ((v0.z > p.z) != (v1.z > p.z))
            {
                float t = (p.z - v0.z) / (v1.z - v0.z);
                if (v0.x + t * (v1.x - v0.x) > p.x)
                {
                    crossings += 1;
                    winding += v1.z > v0.z ? 1 : -1;
                }
            }
        }
        bool evenOdd = crossings % 2 == 1;
        bool nonZero = winding != 0;
        return (crossings, winding, evenOdd, nonZero);
    }
    #endregion

    #region Tests: is a polygon convex
    // Walk the corners and cross each edge with the next. One sign all the way round: convex. Only then does the shorter
    // test apply, the same side of every edge.
    public static (int positive, int negative, bool convex) PolygonConvex(Vector3[] verts)
    {
        int positive = 0;
        int negative = 0;
        for (int i = 0; i < verts.Length; i++)
        {
            Vector3 v0 = verts[i];
            Vector3 v1 = verts[(i + 1) % verts.Length];
            Vector3 v2 = verts[(i + 2) % verts.Length];
            Vector3 e0 = v1 - v0;
            Vector3 e1 = v2 - v1;
            float turn = Vector3.Cross(e0, e1).y;
            if (turn > Eps) positive += 1;
            if (turn < -Eps) negative += 1;
        }
        bool convex = positive == 0 || negative == 0;
        return (positive, negative, convex);
    }
    #endregion

    #region Tests: line and line
    // d1 x d2 = 0: parallel. Otherwise n = d1 x d2 is square to both lines, and the part of the gap along n is the distance
    // between them: zero means they meet, anything else means skew. In 3D, most pairs of lines are skew.
    public static LineLineResult LineLine(Vector3 p1, Vector3 d1, Vector3 p2, Vector3 d2)
    {
        Vector3 n = Vector3.Cross(d1, d2);
        float nn = Vector3.Dot(n, n);
        Vector3 r = p2 - p1;
        bool parallel = nn < Eps;
        float offset = Vector3.Cross(r, d1).magnitude / d1.magnitude;
        float gap = parallel ? offset : Vector3.Dot(r, n) / Mathf.Sqrt(nn);
        float t1 = parallel ? 0f : Vector3.Dot(Vector3.Cross(r, d2), n) / nn;
        float t2 = parallel ? 0f : Vector3.Dot(Vector3.Cross(r, d1), n) / nn;
        Vector3 c1 = p1 + t1 * d1;
        Vector3 c2 = p2 + t2 * d2;
        string kind = "skew";
        if (parallel) kind = offset < Eps ? "same line" : "parallel";
        else if (Mathf.Abs(gap) < Eps) kind = "intersecting";
        return new LineLineResult { n = n, nn = nn, parallel = parallel, gap = gap, t1 = t1, t2 = t2, c1 = c1, c2 = c2, kind = kind };
    }
    #endregion

    #region Tests: segment and segment
    // Minimize the distance over s and t in [0, 1]: solve for the two lines, clamp s, compute t, and if t leaves its range
    // clamp it and recompute s. Zero-length and parallel segments fall through the guards. (Ericson, Real-Time Collision
    // Detection, section 5.1.9.)
    public static (float s, float t, Vector3 c1, Vector3 c2, float dist) SegmentSegment(Vector3 a, Vector3 b, Vector3 c, Vector3 d)
    {
        Vector3 d1 = b - a;
        Vector3 d2 = d - c;
        Vector3 r = a - c;
        float aa = Vector3.Dot(d1, d1);
        float ee = Vector3.Dot(d2, d2);
        float ff = Vector3.Dot(d2, r);
        float cc = Vector3.Dot(d1, r);
        float bb = Vector3.Dot(d1, d2);
        float denom = aa * ee - bb * bb;
        float s = denom > Eps ? Mathf.Clamp01((bb * ff - cc * ee) / denom) : 0f;
        float t = ee > Eps ? (bb * s + ff) / ee : 0f;
        if (t < 0f)
        {
            t = 0f;
            s = aa > Eps ? Mathf.Clamp01(-cc / aa) : 0f;
        }
        else if (t > 1f)
        {
            t = 1f;
            s = aa > Eps ? Mathf.Clamp01((bb - cc) / aa) : 0f;
        }
        Vector3 c1 = a + s * d1;
        Vector3 c2 = c + t * d2;
        float dist = Vector3.Distance(c1, c2);
        return (s, t, c1, c2, dist);
    }
    #endregion

    #region Tests: line and plane
    // t = n . (Q - O) / (n . d). A zero denominator means the line runs parallel to the plane, and then the numerator says
    // whether it lies in it. t < 0: the line meets the plane, a ray from O does not. three.js: ray.intersectPlane.
    // Unity: plane.Raycast(ray, out enter).
    public static (float denom, float num, bool parallel, float t, Vector3 hit, string kind) LinePlane(Vector3 o, Vector3 d, Vector3 q, Vector3 n)
    {
        float denom = Vector3.Dot(n, d);
        float num = Vector3.Dot(n, q - o);
        bool parallel = Mathf.Abs(denom) < Eps;
        float t = parallel ? 0f : num / denom;
        Vector3 hit = o + t * d;
        string kind = "hit ahead";
        if (parallel) kind = Mathf.Abs(num) < Eps ? "in the plane" : "parallel";
        else if (t < 0f) kind = "hit behind";
        return (denom, num, parallel, t, hit, kind);
    }
    #endregion

    #region Tests: segment and plane
    // Opposite signed distances at the two ends: the segment crosses, at the fraction sa / (sa - sb) of its length. No
    // square root is needed, so n need not be unit length.
    public static (float sa, float sb, bool crosses, float t, Vector3 hit, string kind) SegmentPlane(Vector3 a, Vector3 b, Vector3 q, Vector3 n)
    {
        float sa = Vector3.Dot(a - q, n);
        float sb = Vector3.Dot(b - q, n);
        bool crosses = sa * sb < 0f;
        float t = crosses ? sa / (sa - sb) : 0f;
        Vector3 hit = Vector3.Lerp(a, b, t);
        string kind = "same side";
        if (crosses) kind = "crosses";
        else if (Mathf.Abs(sa) < Eps && Mathf.Abs(sb) < Eps) kind = "in the plane";
        else if (Mathf.Abs(sa) < Eps || Mathf.Abs(sb) < Eps) kind = "touches";
        return (sa, sb, crosses, t, hit, kind);
    }
    #endregion

    #region Tests: segment and triangle
    // Two tests composed: the segment crosses the triangle's plane, and the crossing point's barycentric weights are all
    // non-negative. This is a ray tracer's or a mouse pick's inner loop. Unity: Physics.Raycast against a MeshCollider.
    public static SegmentTriangleResult SegmentTriangle(Vector3 a, Vector3 b, Vector3 p0, Vector3 p1, Vector3 p2)
    {
        Vector3 n = Vector3.Cross(p1 - p0, p2 - p0);
        var plane = SegmentPlane(a, b, p0, n);
        var tri = PointTriangle(plane.hit, p0, p1, p2);
        string kind = plane.kind;
        if (plane.crosses) kind = tri.inside ? "hit" : "outside the triangle";
        return new SegmentTriangleResult { n = n, sa = plane.sa, sb = plane.sb, t = plane.t, hit = plane.hit, wa = tri.wa, wb = tri.wb, wc = tri.wc, kind = kind };
    }
    #endregion

    #region Tests: segment and polygon
    // The same composition with the polygon's own inside test: the plane first, then the crossing number at the hit point.
    // The polygon lies in y = 0, so n is the y axis.
    public static (float sa, float sb, float t, Vector3 hit, int crossings, string kind) SegmentPolygon(Vector3 a, Vector3 b, Vector3[] verts)
    {
        Vector3 n = new Vector3(0f, 1f, 0f);
        var plane = SegmentPlane(a, b, verts[0], n);
        var test = PointPolygon(plane.hit, verts);
        string kind = plane.kind;
        if (plane.crosses) kind = test.evenOdd ? "hit" : "outside the polygon";
        return (plane.sa, plane.sb, plane.t, plane.hit, test.crossings, kind);
    }
    #endregion

    #region Tests: triangle and plane
    // The three corners' signed distances decide it. A corner on the plane is a cut point, and so is each edge whose ends
    // have opposite signs: a triangle crossing a plane is cut along a segment.
    public static (float s0, float s1, float s2, int cuts, Vector3 cut0, Vector3 cut1, string kind) TrianglePlane(Vector3 p0, Vector3 p1, Vector3 p2, Vector3 q, Vector3 n)
    {
        Vector3[] verts = { p0, p1, p2 };
        float s0 = Vector3.Dot(p0 - q, n);
        float s1 = Vector3.Dot(p1 - q, n);
        float s2 = Vector3.Dot(p2 - q, n);
        float[] s = { s0, s1, s2 };
        Vector3 cut0 = Vector3.zero;
        Vector3 cut1 = Vector3.zero;
        int cuts = 0;
        for (int i = 0; i < 3; i++)
        {
            int j = (i + 1) % 3;
            Vector3 point = Vector3.zero;
            bool found = false;
            if (Mathf.Abs(s[i]) < Eps)
            {
                point = verts[i];
                found = true;
            }
            else if (Mathf.Abs(s[j]) >= Eps && s[i] * s[j] < 0f)
            {
                point = Vector3.Lerp(verts[i], verts[j], s[i] / (s[i] - s[j]));
                found = true;
            }
            if (found && cuts == 0) cut0 = point;
            if (found && cuts == 1) cut1 = point;
            if (found) cuts += 1;
        }
        float lo = Mathf.Min(s0, Mathf.Min(s1, s2));
        float hi = Mathf.Max(s0, Mathf.Max(s1, s2));
        string kind = "crosses";
        if (lo > Eps) kind = "all in front";
        else if (hi < -Eps) kind = "all behind";
        else if (lo > -Eps && hi < Eps) kind = "in the plane";
        else if (lo > -Eps || hi < Eps) kind = "touches";
        return (s0, s1, s2, cuts, cut0, cut1, kind);
    }
    #endregion

    #region Tests: plane and plane
    // Normals not parallel: the planes meet in a line, at the angle between the normals. Parallel: the gap along the normal
    // tells the same plane from two separate ones.
    public static PlanePlaneResult PlanePlane(Vector3 q1, Vector3 n1, Vector3 q2, Vector3 n2)
    {
        float c1 = Vector3.Dot(n1, q1);
        float c2 = Vector3.Dot(n2, q2);
        var line = LineFromTwoPlanes(n1, c1, n2, c2);
        bool parallel = line.dd < Eps;
        float gap = Vector3.Dot(q2 - q1, n1.normalized);
        float angle = Mathf.Atan2(Mathf.Sqrt(line.dd), Vector3.Dot(n1, n2));
        string kind = "meet in a line";
        if (parallel) kind = Mathf.Abs(gap) < Eps ? "same plane" : "parallel";
        return new PlanePlaneResult { c1 = c1, c2 = c2, d = line.d, dd = line.dd, parallel = parallel, p = line.p, gap = gap, angle = angle, kind = kind };
    }
    #endregion

    #region Tests: triangle and triangle
    // First the early out: every corner of one triangle on one side of the other's plane. Then each triangle's edges
    // against the other triangle: two triangles intersect exactly when an edge of one pierces the other. Triangles in one
    // plane need a different test: an edge pair that touches, or one corner inside the other triangle.
    static int EdgesHitting(Vector3 p0, Vector3 p1, Vector3 p2, Vector3 q0, Vector3 q1, Vector3 q2)
    {
        int hits = 0;
        if (SegmentTriangle(q0, q1, p0, p1, p2).kind == "hit") hits += 1;
        if (SegmentTriangle(q1, q2, p0, p1, p2).kind == "hit") hits += 1;
        if (SegmentTriangle(q2, q0, p0, p1, p2).kind == "hit") hits += 1;
        return hits;
    }

    static bool CoplanarOverlap(Vector3[] a, Vector3[] b)
    {
        for (int i = 0; i < 3; i++)
        {
            for (int j = 0; j < 3; j++)
            {
                var pair = SegmentSegment(a[i], a[(i + 1) % 3], b[j], b[(j + 1) % 3]);
                if (pair.dist < Eps) return true;
            }
        }
        return PointTriangle(b[0], a[0], a[1], a[2]).inside || PointTriangle(a[0], b[0], b[1], b[2]).inside;
    }

    public static (Vector3 n, float s0, float s1, float s2, int hits, string kind) TriangleTriangle(Vector3 a0, Vector3 a1, Vector3 a2, Vector3 b0, Vector3 b1, Vector3 b2)
    {
        Vector3 n = Vector3.Cross(a1 - a0, a2 - a0);
        float s0 = Vector3.Dot(b0 - a0, n);
        float s1 = Vector3.Dot(b1 - a0, n);
        float s2 = Vector3.Dot(b2 - a0, n);
        float lo = Mathf.Min(s0, Mathf.Min(s1, s2));
        float hi = Mathf.Max(s0, Mathf.Max(s1, s2));
        int hits = 0;
        string kind = "no contact";
        if (lo > Eps || hi < -Eps)
        {
            kind = "one side of the plane";
        }
        else if (lo > -Eps && hi < Eps)
        {
            kind = CoplanarOverlap(new[] { a0, a1, a2 }, new[] { b0, b1, b2 }) ? "coplanar, overlapping" : "coplanar, apart";
        }
        else
        {
            hits = EdgesHitting(a0, a1, a2, b0, b1, b2) + EdgesHitting(b0, b1, b2, a0, a1, a2);
            if (hits > 0) kind = "intersecting";
        }
        return (n, s0, s1, s2, hits, kind);
    }
    #endregion

    #region Interpolation: lerp
    // Weights 1 - t and t that sum to 1. The result moves at constant speed along the chord, so its length dips between two
    // directions. Unity: Vector3.LerpUnclamped(a, b, t), since Vector3.Lerp clamps t to [0, 1]. HLSL: lerp(a, b, t).
    // three.js: a.clone().lerp(b, t). GLSL: mix(a, b, t).
    public static (float w0, float w1, Vector3 x, float len) LerpVector(Vector3 a, Vector3 b, float t)
    {
        float w0 = 1f - t;
        float w1 = t;
        Vector3 x = w0 * a + w1 * b;
        float len = x.magnitude;
        return (w0, w1, x, len);
    }
    #endregion

    #region Interpolation: lerp, nlerp and slerp
    // Lerp cuts the chord. Normalizing it (nlerp) puts it back on the sphere but at uneven speed. Slerp weights by sines to
    // turn at constant speed; at 0 and 180 degrees sin(theta) is 0, so it falls back to lerp's weights. At 180 degrees no
    // single plane holds the turn. Unity has Vector3.Slerp; three.js has no slerp for Vector3 (only for Quaternion).
    public static SlerpResult SlerpVector(Vector3 a, Vector3 b, float t)
    {
        Vector3 aHat = a.normalized;
        Vector3 bHat = b.normalized;
        float cosT = Mathf.Clamp(Vector3.Dot(aHat, bHat), -1f, 1f);
        float theta = Mathf.Acos(cosT);
        float sinT = Mathf.Sin(theta);
        float w0 = sinT > Eps ? Mathf.Sin((1f - t) * theta) / sinT : 1f - t;
        float w1 = sinT > Eps ? Mathf.Sin(t * theta) / sinT : t;
        Vector3 slerp = w0 * aHat + w1 * bHat;
        Vector3 chord = Vector3.Lerp(aHat, bHat, t);
        Vector3 nlerp = chord.normalized;
        return new SlerpResult { aHat = aHat, bHat = bHat, cosT = cosT, theta = theta, sinT = sinT, w0 = w0, w1 = w1, slerp = slerp, chord = chord, nlerp = nlerp };
    }
    #endregion

    #region Interpolation: across a triangle
    // Barycentric weights interpolate anything stored at the corners. A rasterizer does this for normals, colors and
    // texture coordinates. Interpolated unit normals are shorter than 1, so a fragment shader normalizes them again.
    public static (float w0, float w1, float w2, Vector3 x, Vector3 xHat) BarycentricInterpolate(Vector3 p, Vector3 p0, Vector3 p1, Vector3 p2, Vector3 v0, Vector3 v1, Vector3 v2)
    {
        var tri = PointTriangle(p, p0, p1, p2);
        float w0 = tri.wa;
        float w1 = tri.wb;
        float w2 = tri.wc;
        Vector3 x = w0 * v0 + w1 * v1 + w2 * v2;
        Vector3 xHat = x.normalized;
        return (w0, w1, w2, x, xHat);
    }
    #endregion

    #region Interpolation: across a quad
    // Bilinear: lerp along two opposite edges by s, then between those results by t. This is how a texture sample blends
    // four texels. The result is a curved patch when the four points do not lie in one plane.
    public static (Vector3 bottom, Vector3 top, Vector3 x) BilinearPatch(Vector3 p00, Vector3 p10, Vector3 p01, Vector3 p11, float s, float t)
    {
        Vector3 bottom = Vector3.Lerp(p00, p10, s);
        Vector3 top = Vector3.Lerp(p01, p11, s);
        Vector3 x = Vector3.Lerp(bottom, top, t);
        return (bottom, top, x);
    }
    #endregion
}
