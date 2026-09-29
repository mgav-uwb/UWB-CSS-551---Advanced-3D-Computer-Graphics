// CSS 551 · HW1 checks and scene (GIVEN; do not submit changes to this file). Add it to an
// empty GameObject in a new scene and press Play: the Console prints every check, and the
// scene shows a cube drawn with your TrsMatrix, an aimed arrow, and an orbiting target.
using System.Collections.Generic;
using System.Text;
using UnityEngine;

namespace CSS551.HW01
{
    public class Checks : MonoBehaviour
    {
        [Header("Model (the controller writes it)")]
        public float tx = 0f;
        [Range(0f, 360f)] public float ry = 30f;
        [Range(0.25f, 2.5f)] public float s = 1f;
        [Range(10f, 120f)] public float simulatedFps = 60f;

        GameObject cube, arrow, target;
        Vector3 angle; // the orbit angle rides in x
        float acc;
        static readonly Vector3 AimPos = new Vector3(1.5f, 0.6f, 1.5f);

        static double[] F(Vector3 v) => new double[] { v.x, v.y, v.z };
        static double[] F(Matrix4x4 m) { var o = new double[16]; for (int c = 0; c < 4; c++) for (int r = 0; r < 4; r++) o[c * 4 + r] = m[r, c]; return o; }

        static Vector3 Repeat(float speed, int fps)
        {
            Vector3 p = Vector3.zero;
            for (int i = 0; i < fps; i++) p = HW.Advance(p, new Vector3(speed, 0, 0), 1f / fps);
            return p;
        }

        // Every check reads Inputs.cs (the published inputs; grading swaps in a hidden set).
        double[] Run(string id)
        {
            switch (id)
            {
                case "step60": return F(Repeat(Inputs.speed, 60));
                case "step20": return F(Repeat(Inputs.speed, 20));
                case "trs": return F(HW.TrsMatrix(Inputs.trs_t, Inputs.trs_ry, Inputs.trs_s));
                case "trsPoint": return F(HW.TrsMatrix(Inputs.trs_t, Inputs.trs_ry, Inputs.trs_s).MultiplyPoint3x4(Inputs.point));
            }
            HW.OrientBasis(Inputs.aim_pos, Inputs.aim_target, Inputs.aim_up, out var x, out var y, out var z);
            return id == "aimZ" ? F(z) : id == "aimX" ? F(x) : F(y);
        }

        void Start()
        {
            CheckReport.Print("HW1", Expected.Checks, Run);
            cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
            arrow = GameObject.CreatePrimitive(PrimitiveType.Cube);
            arrow.transform.localScale = new Vector3(0.3f, 0.2f, 0.8f);
            target = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            target.transform.localScale = Vector3.one * 0.3f;
        }

        void Update()
        {
            // the cube is placed from YOUR matrix (position, rotation, scale read back from it)
            Matrix4x4 m = HW.TrsMatrix(new Vector3(tx, 0, 0), ry, s);
            cube.transform.SetPositionAndRotation(m.GetPosition(), m.rotation);
            cube.transform.localScale = m.lossyScale;

            // the loop at a simulated frame rate: the orbit speed must not depend on it
            acc += Mathf.Min(0.25f, Time.deltaTime);
            float dt = 1f / simulatedFps;
            while (acc >= dt) { angle = HW.Advance(angle, new Vector3(1, 0, 0), dt); acc -= dt; }
            var tp = new Vector3(2.2f * Mathf.Cos(angle.x), 1.2f + 0.4f * Mathf.Sin(2 * angle.x), 2.2f * Mathf.Sin(angle.x));
            target.transform.position = tp;
            HW.OrientBasis(AimPos, tp, Vector3.up, out var x, out var y, out var z);
            var b = new Matrix4x4(new Vector4(x.x, x.y, x.z, 0), new Vector4(y.x, y.y, y.z, 0), new Vector4(z.x, z.y, z.z, 0), new Vector4(0, 0, 0, 1));
            arrow.transform.SetPositionAndRotation(AimPos, b.rotation);
        }
    }

    // Prints the checks as a table and the score on the published inputs.
    public static class CheckReport
    {
        public static void Print(string hw, Check[] checks, System.Func<string, double[]> run)
        {
            var sb = new StringBuilder();
            int score = 0;
            foreach (var c in checks)
            {
                double[] got = null; string err = null;
                try { got = run(c.Id); } catch (System.Exception e) { err = e.Message; }
                bool pass = err == null && Same(got, c.Want, c.Tol);
                if (pass) score += c.Points;
                sb.AppendLine($"{(pass ? "PASS" : "FAIL")}  {c.Id,-10} {c.Points,3} pts  yours {Fmt(got)}{(err != null ? "  threw: " + err : "")}  expected {Fmt(c.Want)}");
            }
            Debug.Log($"{hw}: {score} / 100 on the published inputs\n{sb}");
        }

        static bool Same(double[] got, double[] want, double tol)
        {
            if (want == null || got == null) return want == got;
            if (got.Length != want.Length) return false;
            for (int i = 0; i < want.Length; i++) if (double.IsNaN(got[i]) || System.Math.Abs(got[i] - want[i]) > tol) return false;
            return true;
        }

        static string Fmt(double[] v)
        {
            if (v == null) return "null";
            var parts = new List<string>();
            foreach (var x in v) parts.Add(System.Math.Round(x, 4).ToString(System.Globalization.CultureInfo.InvariantCulture));
            return "(" + string.Join(", ", parts) + ")";
        }
    }
}
