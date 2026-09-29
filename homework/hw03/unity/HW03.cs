// CSS 551 · HW3 · Affine transformations and scene graphs · Unity track. YOUR FILE.
//
// Unity's Matrix4x4 is indexed m[row, col]; points are column vectors, so column 3 is the
// translation, exactly as in the text. Allowed: Matrix4x4 * Matrix4x4, MultiplyPoint3x4,
// setting entries, Mathf. Off limits: Matrix4x4.TRS / Translate / Rotate / Scale / inverse,
// Transform parenting, TransformPoint / InverseTransformPoint.
using UnityEngine;

namespace CSS551.HW03
{
    public struct Pose { public float baseRy, armBend, handRy, armT; }

    public static class HW
    {
        public static Matrix4x4 Translation(Vector3 t) { return Matrix4x4.identity; } // TODO
        public static Matrix4x4 RotationY(float deg) { return Matrix4x4.identity; } // TODO: right-handed formula, column 0 = (c, 0, -s)
        public static Matrix4x4 RotationZ(float deg) { return Matrix4x4.identity; } // TODO: column 0 = (c, s, 0)
        public static Matrix4x4 Scaling(Vector3 s) { return Matrix4x4.identity; } // TODO

        // Rotate by deg about +y around the point p: T(p) · R_y · T(-p).
        public static Matrix4x4 PivotRotateY(Vector3 p, float deg) { return Matrix4x4.identity; } // TODO

        // The inverse of a rigid [R | t]: [R^T | -R^T t]. No general inverse.
        public static Matrix4x4 RigidInverse(Matrix4x4 m) { return Matrix4x4.identity; } // TODO

        // The arm's local matrices (the scene-graph demo's chain):
        //   L_base = T(0, 0.2, 0) · R_y(baseRy)
        //   L_arm  = T(0, 0.2, 0) · T(0, armT, 0) · R_z(armBend) · T(0, 0.7, 0)
        //   L_hand = T(0, 0.7, 0) · R_y(handRy)
        public static void LocalMatrices(Pose pose, out Matrix4x4 lBase, out Matrix4x4 lArm, out Matrix4x4 lHand)
        {
            lBase = lArm = lHand = Matrix4x4.identity; // TODO
        }

        // World matrices: W_child = W_parent · L_child, the base the root.
        public static void WorldMatrices(Pose pose, out Matrix4x4 wBase, out Matrix4x4 wArm, out Matrix4x4 wHand)
        {
            wBase = wArm = wHand = Matrix4x4.identity; // TODO
        }

        // A world point expressed in the frame whose (rigid) world matrix is w.
        public static Vector3 WorldToLocal(Matrix4x4 w, Vector3 p) { return p; } // TODO
    }
}
