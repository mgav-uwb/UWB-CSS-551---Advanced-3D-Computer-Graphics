// CSS 551 · HW1 · The loop, MVC, and orientation · Unity track. YOUR FILE: fill in every
// TODO and submit the project (see the homework page). Checks.cs runs the checks on Play.
//
// Allowed: Vector3.Dot, Vector3.Cross, .normalized, .magnitude, component access, + - * /,
// Mathf. Off limits (implement and replace): Matrix4x4.TRS / Rotate, Quaternion.Euler /
// AngleAxis / LookRotation, Transform.LookAt / Rotate.
using UnityEngine;

namespace CSS551.HW01
{
    public static class HW
    {
        // The position one frame later: velocity is in units per SECOND, dt in seconds.
        public static Vector3 Advance(Vector3 p, Vector3 velocity, float dt)
        {
            // TODO
            return p;
        }

        // T(t) · R_y(ryDeg) · S(s, s, s), built entry by entry. m[row, col]; column 3 is t.
        public static Matrix4x4 TrsMatrix(Vector3 t, float ryDeg, float s)
        {
            // TODO
            return Matrix4x4.identity;
        }

        // The unit axes of an object at pos whose +z points at target; x is perpendicular to
        // up and z (x = up × z, normalized), y = z × x.
        public static void OrientBasis(Vector3 pos, Vector3 target, Vector3 up, out Vector3 x, out Vector3 y, out Vector3 z)
        {
            // TODO
            x = Vector3.right; y = Vector3.up; z = Vector3.forward;
        }
    }
}
