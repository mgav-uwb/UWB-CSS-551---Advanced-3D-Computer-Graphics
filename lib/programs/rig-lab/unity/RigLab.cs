using System;
using UnityEngine;

// RigLab.cs: skeletons and skins: forward kinematics on a chain of bones, inverse kinematics (the two-link law of cosines, cyclic
// coordinate descent, the Jacobian pseudo-inverse), linear blend skinning with its bind pose and inverse bind matrices, the
// candy-wrapper collapse and dual quaternion skinning, blend shapes, blend trees and retargeting. Plain C#, no MonoBehaviour:
// points are Vector3, matrices are float[16] in column-major order (entry m[4 * column + row], as in the WebGL track, not Unity's
// Matrix4x4, whose rigid inverse and rotation the course's stand-in does not model), quaternions are float[4] as x, y, z, w,
// angles are in degrees. RigLabScene.cs draws a skinned tube. No method changes its arguments.
// Each method returns its named intermediate results as a tuple, with the field names and the order of the object riglab.js
// returns. mono's compiler rejects tuples over 7 fields, so the two results with more are small structs declared below. A result
// with a single field (paintWeights, bulgeOffsets, flattenOffsets) is that field itself, since C# has no one-element tuple.
// The same functions, line for line where the languages allow, are riglab.js in ../webgl/
// (lib/tests/programs/rig-lab.test.mjs runs both on the same inputs and compares the numbers).
public static class RigLab
{
    public struct TwoLinkResult
    {
        public float distance;
        public bool reachable;
        public float cos2, clamped, theta2, direction, correction, theta1;
        public Vector3 elbow, tip;
        public float error;
    }

    public struct PseudoInverseResult
    {
        public Vector2[] columns;
        public Vector2 error, goal;
        public float dampedDet;
        public bool singular;
        public float[] deltas, angles;
        public Vector3 newTip;
        public float remaining;
    }

    #region Settings and matrix helpers
    // A matrix is 16 numbers, column by column: the translation of a transform sits in m[12], m[13], m[14]. The iterative solvers
    // never move the end effector more than MAX_STEP toward the target in one step. Unity's Vector3 has the vector operations built in.
    public const float Eps = 1e-6f;
    public const float Deg = Mathf.Deg2Rad;
    public const float MaxStep = 0.25f;

    public static float[] Identity()
    {
        return new float[] { 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 };
    }
    public static float[] Multiply(float[] a, float[] b)
    {
        float[] r = new float[16];
        for (int col = 0; col < 4; col++)
        {
            for (int row = 0; row < 4; row++)
            {
                float sum = 0;
                for (int k = 0; k < 4; k++) sum += a[4 * k + row] * b[4 * col + k];
                r[4 * col + row] = sum;
            }
        }
        return r;
    }
    public static float[] Translation(float x, float y, float z)
    {
        float[] m = Identity();
        m[12] = x;
        m[13] = y;
        m[14] = z;
        return m;
    }
    public static float[] RotationZ(float degrees)
    {
        float c = Mathf.Cos(degrees * Deg);
        float s = Mathf.Sin(degrees * Deg);
        return new float[] { c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 };
    }
    public static float[] RotationX(float degrees)
    {
        float c = Mathf.Cos(degrees * Deg);
        float s = Mathf.Sin(degrees * Deg);
        return new float[] { 1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1 };
    }
    public static Vector3 TransformPoint(float[] m, Vector3 p)
    {
        return new Vector3(
            m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12],
            m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13],
            m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14]);
    }
    // The inverse of a rigid transform (a rotation and a translation): transpose the rotation, and turn the translation around.
    public static float[] RigidInverse(float[] m)
    {
        float[] r = Identity();
        for (int col = 0; col < 3; col++)
        {
            for (int row = 0; row < 3; row++) r[4 * col + row] = m[4 * row + col];
        }
        for (int row = 0; row < 3; row++)
        {
            r[12 + row] = -(r[row] * m[12] + r[4 + row] * m[13] + r[8 + row] * m[14]);
        }
        return r;
    }
    #endregion

    #region Forward kinematics: the chain as a scene graph
    // A bone is a node. Its local matrix moves to the end of the parent bone and turns about the joint there, and its world matrix is
    // the parent's world matrix times its local one: the composite rule of the scene graph. The end effector is the far end of the last
    // bone, (length, 0, 0) in that bone's own frame.
    public static (float[][] locals, float[][] worlds, Vector3[] joints, Vector3 tip) ForwardKinematics(float[] lengths, float[] angles)
    {
        float[][] locals = new float[lengths.Length][];
        float[][] worlds = new float[lengths.Length][];
        Vector3[] joints = new Vector3[lengths.Length];
        float[] world = Identity();
        for (int i = 0; i < lengths.Length; i++)
        {
            float offset = i == 0 ? 0 : lengths[i - 1];
            float[] local = Multiply(Translation(offset, 0, 0), RotationZ(angles[i]));
            world = Multiply(world, local);
            locals[i] = local;
            worlds[i] = world;
            joints[i] = new Vector3(world[12], world[13], world[14]);
        }
        int last = lengths.Length - 1;
        Vector3 tip = TransformPoint(worlds[last], new Vector3(lengths[last], 0, 0));
        return (locals, worlds, joints, tip);
    }
    #endregion

    #region Forward kinematics: by hand
    // Each bone points along the sum of the joint angles up to it, so the end effector is the sum of the bones, each at its own heading.
    // No matrices: it must land on the same point as the product of the matrices.
    public static (float heading, Vector3 tip) TipByHand(float[] lengths, float[] angles)
    {
        float x = 0;
        float y = 0;
        float heading = 0;
        for (int i = 0; i < lengths.Length; i++)
        {
            heading += angles[i];
            x += lengths[i] * Mathf.Cos(heading * Deg);
            y += lengths[i] * Mathf.Sin(heading * Deg);
        }
        Vector3 tip = new Vector3(x, y, 0);
        return (heading, tip);
    }
    #endregion

    #region Two-link IK: the law of cosines
    // Two bones and a target at distance d form a triangle with sides l1, l2 and d. The law of cosines gives the elbow, and the
    // shoulder is the target's direction minus the angle the second bone adds. The sign of bend picks the elbow (+1 bends the way
    // the lecture's elbow-down solution does, -1 the other way). A target out of reach makes the cosine pass 1 or -1: it is
    // clamped, and the arm stretches straight at the target.
    public static TwoLinkResult TwoLinkIK(float l1, float l2, Vector3 target, float bend)
    {
        float distance = Mathf.Sqrt(target.x * target.x + target.y * target.y);
        bool reachable = distance <= l1 + l2 + Eps && distance >= Mathf.Abs(l1 - l2) - Eps;
        float cos2 = (distance * distance - l1 * l1 - l2 * l2) / (2 * l1 * l2);
        float clamped = Mathf.Min(1, Mathf.Max(-1, cos2));
        float theta2 = (bend * Mathf.Acos(clamped)) / Deg;
        float direction = Mathf.Atan2(target.y, target.x) / Deg;
        float correction = Mathf.Atan2(l2 * Mathf.Sin(theta2 * Deg), l1 + l2 * Mathf.Cos(theta2 * Deg)) / Deg;
        float theta1 = direction - correction;
        var chain = ForwardKinematics(new float[] { l1, l2 }, new float[] { theta1, theta2 });
        Vector3 elbow = chain.joints[1];
        Vector3 tip = chain.tip;
        float error = (tip - new Vector3(target.x, target.y, 0)).magnitude;
        TwoLinkResult result = new TwoLinkResult();
        result.distance = distance;
        result.reachable = reachable;
        result.cos2 = cos2;
        result.clamped = clamped;
        result.theta2 = theta2;
        result.direction = direction;
        result.correction = correction;
        result.theta1 = theta1;
        result.elbow = elbow;
        result.tip = tip;
        result.error = error;
        return result;
    }
    #endregion

    #region Cyclic coordinate descent: one joint
    // Stand at one joint and look at the end effector and at the target. Turning that joint by the signed angle between the two
    // directions points the end effector at the target. The end effector's distance from the target can only shrink: it ends as
    // far from the joint as before, on the target's side.
    public static (Vector3 pivot, Vector3 toEnd, Vector3 toTarget, float delta, float[] angles, Vector3 tip, float error) CcdJoint(float[] lengths, float[] angles, Vector3 target, int joint)
    {
        var before = ForwardKinematics(lengths, angles);
        Vector3 pivot = before.joints[joint];
        Vector3 toEnd = before.tip - pivot;
        Vector3 toTarget = target - pivot;
        float turn = toEnd.x * toTarget.y - toEnd.y * toTarget.x;
        float along = toEnd.x * toTarget.x + toEnd.y * toTarget.y;
        float delta = Mathf.Atan2(turn, along) / Deg;
        float[] next = (float[])angles.Clone();
        next[joint] += delta;
        var after = ForwardKinematics(lengths, next);
        Vector3 tip = after.tip;
        float error = (tip - target).magnitude;
        return (pivot, toEnd, toTarget, delta, next, tip, error);
    }
    #endregion

    #region Cyclic coordinate descent: a sweep
    // One sweep visits every joint once, from the one nearest the end effector back to the base, each time pointing the end
    // effector at the target from that joint.
    public static (float[] angles, float[] deltas, float[] errors) CcdSweep(float[] lengths, float[] angles, Vector3 target)
    {
        float[] current = (float[])angles.Clone();
        float[] deltas = new float[lengths.Length];
        float[] errors = new float[lengths.Length];
        int at = 0;
        for (int joint = lengths.Length - 1; joint >= 0; joint--)
        {
            var step = CcdJoint(lengths, current, target, joint);
            current = step.angles;
            deltas[at] = step.delta;
            errors[at] = step.error;
            at += 1;
        }
        return (current, deltas, errors);
    }
    #endregion

    #region Jacobian: the columns
    // Turning joint j by a small angle moves the end effector along z x (tip - joint), perpendicular to the line from the joint to the
    // tip, by that distance per radian. These vectors are the columns of the Jacobian J, which holds the derivative of the end
    // effector's position with respect to each joint angle. J J^T is the 2 x 2 matrix [a b; b c], and det is zero when every
    // column points the same way, which happens when the chain is straight.
    public static (Vector2[] columns, Vector3 tip, float a, float b, float c, float det) Jacobian(float[] lengths, float[] angles)
    {
        var chain = ForwardKinematics(lengths, angles);
        Vector3 tip = chain.tip;
        Vector2[] columns = new Vector2[lengths.Length];
        float a = 0;
        float b = 0;
        float c = 0;
        for (int j = 0; j < lengths.Length; j++)
        {
            Vector3 r = tip - chain.joints[j];
            Vector2 column = new Vector2(-r.y, r.x);
            columns[j] = column;
            a += column.x * column.x;
            b += column.x * column.y;
            c += column.y * column.y;
        }
        float det = a * c - b * b;
        return (columns, tip, a, b, c, det);
    }
    #endregion

    #region Jacobian: a pseudo-inverse step
    // To move the end effector by e, change the angles by J^T (J J^T)^-1 e: the smallest change in the angles, in the least-squares
    // sense, that does it to first order. The move is limited to maxStep so the linear model holds. Near a singular chain J J^T
    // has almost no inverse and the angles jump; adding damping^2 to its diagonal (damped least squares, Wampler 1986, Nakamura and
    // Hanafusa 1986) keeps the step finite. Exactly singular, the step is zero.
    public static PseudoInverseResult PseudoInverseStep(float[] lengths, float[] angles, Vector3 target, float damping, float maxStep)
    {
        var jac = Jacobian(lengths, angles);
        Vector2 error = new Vector2(target.x - jac.tip.x, target.y - jac.tip.y);
        float size = Mathf.Sqrt(error.x * error.x + error.y * error.y);
        float limit = size > maxStep ? maxStep / size : 1;
        Vector2 goal = new Vector2(error.x * limit, error.y * limit);
        float dampedA = jac.a + damping * damping;
        float dampedC = jac.c + damping * damping;
        float dampedDet = dampedA * dampedC - jac.b * jac.b;
        bool singular = dampedDet < Eps;
        Vector2 y = singular ? new Vector2(0, 0) : new Vector2((dampedC * goal.x - jac.b * goal.y) / dampedDet, (dampedA * goal.y - jac.b * goal.x) / dampedDet);
        float[] deltas = new float[lengths.Length];
        float[] next = (float[])angles.Clone();
        for (int j = 0; j < lengths.Length; j++)
        {
            float delta = (jac.columns[j].x * y.x + jac.columns[j].y * y.y) / Deg;
            deltas[j] = delta;
            next[j] += delta;
        }
        var after = ForwardKinematics(lengths, next);
        Vector3 newTip = after.tip;
        float remaining = (newTip - target).magnitude;
        PseudoInverseResult result = new PseudoInverseResult();
        result.columns = jac.columns;
        result.error = error;
        result.goal = goal;
        result.dampedDet = dampedDet;
        result.singular = singular;
        result.deltas = deltas;
        result.angles = next;
        result.newTip = newTip;
        result.remaining = remaining;
        return result;
    }
    #endregion

    #region Iterating until close
    // Repeat one step, a joint rotation for CCD or a pseudo-inverse step for the Jacobian, until the end effector is within tolerance
    // of the target or the budget runs out. errors[0] is the error before any step, and errors[k] the error after k steps.
    public static (float[] angles, float[] errors, int iterations, bool converged) SolveIterative(string method, float[] lengths, float[] angles, Vector3 target, int maxIterations, float tolerance, float damping)
    {
        float[] current = (float[])angles.Clone();
        float[] errors = new float[maxIterations + 1];
        errors[0] = (ForwardKinematics(lengths, current).tip - target).magnitude;
        int iterations = 0;
        int joint = lengths.Length - 1;
        while (iterations < maxIterations && errors[iterations] > tolerance)
        {
            if (method == "ccd")
            {
                var step = CcdJoint(lengths, current, target, joint);
                current = step.angles;
                errors[iterations + 1] = step.error;
                joint = joint == 0 ? lengths.Length - 1 : joint - 1;
            }
            else
            {
                var step = PseudoInverseStep(lengths, current, target, damping, MaxStep);
                if (step.singular) break;
                current = step.angles;
                errors[iterations + 1] = step.remaining;
            }
            iterations += 1;
        }
        bool converged = errors[iterations] <= tolerance;
        float[] used = new float[iterations + 1];
        Array.Copy(errors, used, iterations + 1);
        return (current, used, iterations, converged);
    }
    #endregion

    #region Skinning: bind pose and inverse bind matrices
    // The mesh is modeled in the bind pose, and each bone's world matrix B there is recorded. The inverse bind matrix B^-1 takes a
    // point of the bind-pose mesh into the bone's own frame. The skinning matrix W B^-1 takes it from there to where the bone is now
    // (world matrix W): one matrix per bone per frame.
    public static (float[][] inverseBinds, float[][] skins) SkinningMatrices(float[][] binds, float[][] poses)
    {
        float[][] inverseBinds = new float[binds.Length][];
        float[][] skins = new float[binds.Length][];
        for (int i = 0; i < binds.Length; i++)
        {
            inverseBinds[i] = RigidInverse(binds[i]);
            skins[i] = Multiply(poses[i], inverseBinds[i]);
        }
        return (inverseBinds, skins);
    }
    #endregion

    #region Skinning: one vertex
    // Each bone carries the vertex rigidly to a candidate place: into the bone's frame with B^-1, then out with W. The skin is the
    // weighted sum of the candidates, v' = sum of w W B^-1 v, with the weights adding to 1.
    public static (Vector3[] local, Vector3[] candidates, Vector3 blended, float weightSum) SkinVertex(Vector3 vertex, float[] weights, float[][] inverseBinds, float[][] poses)
    {
        Vector3[] local = new Vector3[weights.Length];
        Vector3[] candidates = new Vector3[weights.Length];
        Vector3 blended = Vector3.zero;
        float weightSum = 0;
        for (int i = 0; i < weights.Length; i++)
        {
            Vector3 inBone = TransformPoint(inverseBinds[i], vertex);
            Vector3 carried = TransformPoint(poses[i], inBone);
            local[i] = inBone;
            candidates[i] = carried;
            blended = blended + carried * weights[i];
            weightSum += weights[i];
        }
        return (local, candidates, blended, weightSum);
    }
    #endregion

    #region Skinning: a mesh
    // The GPU does the same sum with the skinning matrices K = W B^-1 computed once per bone: each vertex is carried by every bone
    // it has weight for, and the results are added with the weights.
    public static (float[][] skins, Vector3[] posed) SkinMesh(Vector3[] positions, float[][] weights, float[][] inverseBinds, float[][] poses)
    {
        float[][] skins = new float[poses.Length][];
        for (int i = 0; i < poses.Length; i++) skins[i] = Multiply(poses[i], inverseBinds[i]);
        Vector3[] posed = new Vector3[positions.Length];
        for (int v = 0; v < positions.Length; v++)
        {
            Vector3 p = Vector3.zero;
            for (int i = 0; i < skins.Length; i++)
            {
                p = p + TransformPoint(skins[i], positions[v]) * weights[v][i];
            }
            posed[v] = p;
        }
        return (skins, posed);
    }
    #endregion

    #region The tube
    // A closed tube along the x axis from 0 to span: rings of vertices (ring r at x = span r / (rings - 1), sides vertices
    // each), a fan of triangles closing each end, and counter-clockwise triangles seen from outside. Vertex rings * sides is the
    // center of the start cap, and the one after it the center of the end cap.
    public static (Vector3[] positions, int[][] tris, int startCenter, int endCenter) MakeTube(float span, float radius, int rings, int sides)
    {
        Vector3[] positions = new Vector3[rings * sides + 2];
        for (int r = 0; r < rings; r++)
        {
            float x = (span * r) / (rings - 1);
            for (int s = 0; s < sides; s++)
            {
                float phi = (2 * Mathf.PI * s) / sides;
                positions[r * sides + s] = new Vector3(x, radius * Mathf.Cos(phi), radius * Mathf.Sin(phi));
            }
        }
        int startCenter = rings * sides;
        positions[startCenter] = new Vector3(0, 0, 0);
        int endCenter = startCenter + 1;
        positions[endCenter] = new Vector3(span, 0, 0);
        int[][] tris = new int[2 * (rings - 1) * sides + 2 * sides][];
        int count = 0;
        for (int r = 0; r < rings - 1; r++)
        {
            for (int s = 0; s < sides; s++)
            {
                int a = r * sides + s;
                int b = r * sides + ((s + 1) % sides);
                tris[count++] = new int[] { a, b, a + sides };
                tris[count++] = new int[] { b, b + sides, a + sides };
            }
        }
        int last = (rings - 1) * sides;
        for (int s = 0; s < sides; s++)
        {
            int next = (s + 1) % sides;
            tris[count++] = new int[] { startCenter, next, s };
            tris[count++] = new int[] { endCenter, last + s, last + next };
        }
        return (positions, tris, startCenter, endCenter);
    }
    #endregion

    #region Weights painted by falloff
    // Bone 0 owns the mesh up to the first joint, and each joint hands the mesh on to the next bone over a ramp of the given width
    // centered on it (smoothstep: slope zero at both ends). At every x the weights add to 1: what one ramp takes, the next bone gets.
    static float Smoothstep(float t)
    {
        float c = Mathf.Min(1, Mathf.Max(0, t));
        return c * c * (3 - 2 * c);
    }
    public static float[][] PaintWeights(Vector3[] positions, float[] joints, float width)
    {
        float[][] weights = new float[positions.Length][];
        for (int v = 0; v < positions.Length; v++)
        {
            float[] row = new float[joints.Length + 1];
            float previous = 1;
            for (int i = 0; i < joints.Length; i++)
            {
                float t = Smoothstep((positions[v].x - (joints[i] - width / 2)) / width);
                row[i] = previous - t;
                previous = t;
            }
            row[joints.Length] = previous;
            weights[v] = row;
        }
        return weights;
    }
    #endregion

    #region Candy wrapper: a twisted joint
    // Two bones along the x axis, the second starting at x = 1. In the bind pose both sit still. In the pose the second bone turns
    // about its own axis, the x axis, by the twist angle: a forearm turning its hand.
    public static (float[][] binds, float[][] poses) TwistBones(float twistDegrees)
    {
        float[][] binds = { Identity(), Translation(1, 0, 0) };
        float[][] poses = { Identity(), Multiply(Translation(1, 0, 0), RotationX(twistDegrees)) };
        return (binds, poses);
    }
    #endregion

    #region Candy wrapper: measuring the collapse
    // The volume of a closed triangle mesh is the sum, over its triangles, of the signed volume of the tetrahedron the triangle makes
    // with the origin: a . (b x c) / 6. The collapse is the share of the rest volume that is gone.
    public static float MeshVolume(Vector3[] positions, int[][] tris)
    {
        float volume = 0;
        for (int t = 0; t < tris.Length; t++)
        {
            Vector3 a = positions[tris[t][0]];
            Vector3 b = positions[tris[t][1]];
            Vector3 c = positions[tris[t][2]];
            volume += Vector3.Dot(a, Vector3.Cross(b, c)) / 6;
        }
        return volume;
    }
    public static (float restVolume, float posedVolume, float ratio, float collapse) MeasureCollapse(Vector3[] restPositions, Vector3[] posedPositions, int[][] tris)
    {
        float restVolume = MeshVolume(restPositions, tris);
        float posedVolume = MeshVolume(posedPositions, tris);
        float ratio = posedVolume / restVolume;
        float collapse = 1 - ratio;
        return (restVolume, posedVolume, ratio, collapse);
    }
    #endregion

    #region Candy wrapper: the closed form
    // A vertex at radius r from the axis, with weight w on the twisted bone, goes to (1 - w) v + w R v. Both v and R v have length r,
    // and the angle between them is the twist, so the blended length is r times the square root of (1 - w)^2 + w^2 + 2 w (1 - w) cos(twist).
    // At w = 1/2 that is r |cos(twist / 2)|: nothing is left at a twist of 180 degrees. The cross-section's area goes as the square.
    public static (float radius, float area) TwistRatio(float twistDegrees, float weight)
    {
        float w = weight;
        float radius = Mathf.Sqrt((1 - w) * (1 - w) + w * w + 2 * w * (1 - w) * Mathf.Cos(twistDegrees * Deg));
        float area = radius * radius;
        return (radius, area);
    }
    #endregion

    #region Quaternions: the helpers
    // A quaternion [x, y, z, w] with x, y, z = sin(angle / 2) times the axis and w = cos(angle / 2) is a rotation. Multiplying two
    // composes their rotations, and the rotation of a point p is q p q*, with q* the conjugate. quatFromMatrix reads the rotation
    // out of the upper 3 x 3 of a rigid matrix.
    public static float[] QuatFromAxisAngle(Vector3 axis, float degrees)
    {
        float s = Mathf.Sin((degrees * Deg) / 2);
        return new float[] { axis.x * s, axis.y * s, axis.z * s, Mathf.Cos((degrees * Deg) / 2) };
    }
    public static float[] QuatMultiply(float[] a, float[] b)
    {
        return new float[] {
            a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
            a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
            a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
            a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
        };
    }
    public static float[] QuatConjugate(float[] q)
    {
        return new float[] { -q[0], -q[1], -q[2], q[3] };
    }
    public static Vector3 QuatRotate(float[] q, Vector3 p)
    {
        float[] r = QuatMultiply(QuatMultiply(q, new float[] { p.x, p.y, p.z, 0 }), QuatConjugate(q));
        return new Vector3(r[0], r[1], r[2]);
    }
    public static float[] QuatFromMatrix(float[] m)
    {
        float trace = m[0] + m[5] + m[10];
        if (trace > 0)
        {
            float s = 2 * Mathf.Sqrt(trace + 1);
            return new float[] { (m[6] - m[9]) / s, (m[8] - m[2]) / s, (m[1] - m[4]) / s, s / 4 };
        }
        if (m[0] > m[5] && m[0] > m[10])
        {
            float s = 2 * Mathf.Sqrt(1 + m[0] - m[5] - m[10]);
            return new float[] { s / 4, (m[4] + m[1]) / s, (m[8] + m[2]) / s, (m[6] - m[9]) / s };
        }
        if (m[5] > m[10])
        {
            float s = 2 * Mathf.Sqrt(1 + m[5] - m[0] - m[10]);
            return new float[] { (m[4] + m[1]) / s, s / 4, (m[9] + m[6]) / s, (m[8] - m[2]) / s };
        }
        float s2 = 2 * Mathf.Sqrt(1 + m[10] - m[0] - m[5]);
        return new float[] { (m[8] + m[2]) / s2, (m[9] + m[6]) / s2, s2 / 4, (m[1] - m[4]) / s2 };
    }
    #endregion

    #region Quaternions: slerp
    // Spherical linear interpolation walks the shortest arc between two rotations at constant speed:
    // sin((1 - t) omega) / sin(omega) a + sin(t omega) / sin(omega) b, with omega the angle between the quaternions as points on a
    // sphere. q and -q are the same rotation, so a negative dot product means one is flipped first.
    public static (float[] q, float cosine, float omega, float w0, float w1) QuatSlerp(float[] a, float[] b, float t)
    {
        float cosine = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
        float sign = 1;
        if (cosine < 0)
        {
            sign = -1;
            cosine = -cosine;
        }
        float omega = Mathf.Acos(Mathf.Min(1, cosine));
        float w0 = 1 - t;
        float w1 = t;
        if (omega > 1e-4f)
        {
            w0 = Mathf.Sin((1 - t) * omega) / Mathf.Sin(omega);
            w1 = Mathf.Sin(t * omega) / Mathf.Sin(omega);
        }
        float[] q = new float[] { 0, 0, 0, 0 };
        for (int k = 0; k < 4; k++) q[k] = w0 * a[k] + sign * w1 * b[k];
        return (q, cosine, omega, w0, w1);
    }
    #endregion

    #region Dual quaternions: from a rigid transform
    // A rigid transform (rotation q, translation t) is the pair of quaternions real = q and dual = 1/2 (t, 0) q: eight numbers,
    // [real x, y, z, w, dual x, y, z, w]. Unlike a matrix, a blend of these can be normalized back to a rigid transform.
    public static float[] DualQuaternion(float[] m)
    {
        float[] real = QuatFromMatrix(m);
        float[] half = QuatMultiply(new float[] { m[12] / 2, m[13] / 2, m[14] / 2, 0 }, real);
        return new float[] { real[0], real[1], real[2], real[3], half[0], half[1], half[2], half[3] };
    }
    #endregion

    #region Dual quaternions: blend
    // Add the weighted dual quaternions (each flipped to the same side as the first, since q and -q are one rotation), then divide by
    // the length of the real part and take the part of the dual along the real out, which makes the result a unit dual quaternion:
    // the blend of rigid transforms is rigid. This is the dual linear blend of Kavan and others (2007).
    public static float[] BlendDualQuaternions(float[][] dqs, float[] weights)
    {
        float[] sum = new float[] { 0, 0, 0, 0, 0, 0, 0, 0 };
        for (int i = 0; i < dqs.Length; i++)
        {
            float sign = 1;
            if (dqs[i][0] * dqs[0][0] + dqs[i][1] * dqs[0][1] + dqs[i][2] * dqs[0][2] + dqs[i][3] * dqs[0][3] < 0) sign = -1;
            for (int k = 0; k < 8; k++) sum[k] += sign * weights[i] * dqs[i][k];
        }
        float norm = Mathf.Sqrt(sum[0] * sum[0] + sum[1] * sum[1] + sum[2] * sum[2] + sum[3] * sum[3]);
        float[] dq = new float[] { 0, 0, 0, 0, 0, 0, 0, 0 };
        for (int k = 0; k < 8; k++) dq[k] = sum[k] / norm;
        float along = dq[0] * dq[4] + dq[1] * dq[5] + dq[2] * dq[6] + dq[3] * dq[7];
        for (int k = 4; k < 8; k++) dq[k] -= along * dq[k - 4];
        return dq;
    }
    #endregion

    #region Dual quaternions: skin a vertex
    // Turn each bone's skinning matrix W B^-1 into a dual quaternion, blend them with the vertex's weights, and apply the result:
    // rotate the point by the real part, then add the translation 2 (dual real*) read off the vector part.
    public static (float[][] dqs, float[] blend, Vector3 rotated, Vector3 blended) SkinVertexDQ(Vector3 vertex, float[] weights, float[][] skins)
    {
        float[][] dqs = new float[skins.Length][];
        for (int i = 0; i < skins.Length; i++) dqs[i] = DualQuaternion(skins[i]);
        float[] blend = BlendDualQuaternions(dqs, weights);
        float[] real = new float[] { blend[0], blend[1], blend[2], blend[3] };
        float[] dual = new float[] { blend[4], blend[5], blend[6], blend[7] };
        Vector3 rotated = QuatRotate(real, vertex);
        float[] t = QuatMultiply(dual, QuatConjugate(real));
        Vector3 blended = new Vector3(rotated.x + 2 * t[0], rotated.y + 2 * t[1], rotated.z + 2 * t[2]);
        return (dqs, blend, rotated, blended);
    }
    #endregion

    #region Blend shapes: the targets
    // A blend shape stores an offset for every vertex. Two targets on the tube: a bulge (radius up near the middle of its length)
    // and a flattening (the z coordinate squeezed toward the axis).
    public static Vector3[] BulgeOffsets(Vector3[] positions, float span, float amount)
    {
        Vector3[] offsets = new Vector3[positions.Length];
        for (int v = 0; v < positions.Length; v++)
        {
            float bump = Mathf.Sin((Mathf.PI * positions[v].x) / span);
            offsets[v] = new Vector3(0, positions[v].y * amount * bump, positions[v].z * amount * bump);
        }
        return offsets;
    }
    public static Vector3[] FlattenOffsets(Vector3[] positions, float amount)
    {
        Vector3[] offsets = new Vector3[positions.Length];
        for (int v = 0; v < positions.Length; v++) offsets[v] = new Vector3(0, 0, -positions[v].z * amount);
        return offsets;
    }
    #endregion

    #region Blend shapes: the weighted sum
    // The posed shape is the neutral shape plus the weighted offsets: the skinning sum, applied to positions instead of matrices.
    // Two targets that move the same vertices add, whether or not the sum is a shape anyone modeled.
    public static (Vector3[] posed, float moved) BlendShapes(Vector3[] neutral, Vector3[][] offsets, float[] weights)
    {
        Vector3[] posed = new Vector3[neutral.Length];
        float moved = 0;
        for (int v = 0; v < neutral.Length; v++)
        {
            Vector3 p = neutral[v];
            for (int k = 0; k < offsets.Length; k++) p = p + offsets[k][v] * weights[k];
            posed[v] = p;
            moved = Mathf.Max(moved, (p - neutral[v]).magnitude);
        }
        return (posed, moved);
    }
    #endregion

    #region Blend trees: weights from a parameter
    // A one-parameter blend tree: clips sorted by the parameter value they were made for (speed). Between two neighbors the weight
    // of the faster one rises linearly from 0 to 1; outside the range the end clip has the whole weight.
    public static (int lower, float t, float[] weights) BlendTreeWeights(float[] clipSpeeds, float speed)
    {
        int lower = 0;
        while (lower < clipSpeeds.Length - 2 && speed > clipSpeeds[lower + 1]) lower += 1;
        float t = Mathf.Min(1, Mathf.Max(0, (speed - clipSpeeds[lower]) / (clipSpeeds[lower + 1] - clipSpeeds[lower])));
        float[] weights = new float[clipSpeeds.Length];
        weights[lower] = 1 - t;
        weights[lower + 1] = t;
        return (lower, t, weights);
    }
    #endregion

    #region Blend trees: sample a looping clip
    // A looping clip is a list of poses keyed at evenly spaced phases of one stride: key i at phase i / n. Between two keys each joint's
    // angle follows the Catmull-Rom spline through the four nearest keys, wrapping past the last key to the first, so the loop has no seam.
    public static float[] SampleClip(float[][] keys, float phase)
    {
        int n = keys.Length;
        float u = (phase - Mathf.Floor(phase)) * n;
        int i = (int)Mathf.Floor(u) % n;
        float s = u - Mathf.Floor(u);
        float[] k0 = keys[(i + n - 1) % n];
        float[] k1 = keys[i];
        float[] k2 = keys[(i + 1) % n];
        float[] k3 = keys[(i + 2) % n];
        float[] pose = new float[k1.Length];
        for (int j = 0; j < k1.Length; j++)
        {
            float a = k0[j], b = k1[j], c = k2[j], d = k3[j];
            pose[j] = 0.5f * (2 * b + (c - a) * s + (2 * a - 5 * b + 4 * c - d) * s * s + (3 * b - a - 3 * c + d) * s * s * s);
        }
        return pose;
    }
    #endregion

    #region Blend trees: blend a pose
    // A pose is one angle per joint, each a rotation about z. Each joint's two rotations are blended as quaternions with slerp, and
    // the blended quaternion is read back as an angle. About one shared axis this equals interpolating the angles.
    public static (float[][] quaternions, float[] angles, float[] linear) BlendPose(float[] poseA, float[] poseB, float t)
    {
        float[][] quaternions = new float[poseA.Length][];
        float[] angles = new float[poseA.Length];
        float[] linear = new float[poseA.Length];
        for (int j = 0; j < poseA.Length; j++)
        {
            float[] qa = QuatFromAxisAngle(new Vector3(0, 0, 1), poseA[j]);
            float[] qb = QuatFromAxisAngle(new Vector3(0, 0, 1), poseB[j]);
            var mix = QuatSlerp(qa, qb, t);
            float angle = (2 * Mathf.Atan2(mix.q[2], mix.q[3])) / Deg;
            if (angle > 180) angle -= 360;
            if (angle < -180) angle += 360;
            quaternions[j] = mix.q;
            angles[j] = angle;
            linear[j] = poseA[j] + t * (poseB[j] - poseA[j]);
        }
        return (quaternions, angles, linear);
    }
    #endregion

    #region Retargeting a leg
    // The hip is hipDegrees from vertical. Copying the performer's angle to a shorter thigh puts the knee at thigh * sin(hip): the
    // bone keeps its length. Copying the knee's position instead would stretch the thigh by the ratio of the lengths.
    public static (float kneeCopyAngle, float kneeCopyPosition, float stretch) RetargetLeg(float performerThigh, float characterThigh, float hipDegrees)
    {
        float s = Mathf.Sin(hipDegrees * Deg);
        float kneeCopyAngle = characterThigh * s;
        float kneeCopyPosition = performerThigh * s;
        float stretch = performerThigh / characterThigh - 1;
        return (kneeCopyAngle, kneeCopyPosition, stretch);
    }
    #endregion
}
