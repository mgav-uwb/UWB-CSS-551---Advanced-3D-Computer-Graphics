using System.Collections.Generic;
using UnityEngine;

// VectorBasicsScene.cs: one picture per topic, in Unity. VectorBasics.cs computes; this script draws arrows and writes
// a status line. An arrow is a thin stretched cube (the shaft) and a small cube at the tip, so no line or gizmo setup
// is needed.
// Setup: put this script on an empty GameObject and press Play.
// Keys: 1 to 9 pick the topic (points, frames, normalize, operations, dot, cross, line, tests, interpolation); V
// switches which vector the other keys move (a or b); the arrows move it in x and y, Z and X in z; R starts again;
// right-drag orbits the camera, the scroll wheel zooms (the Input Manager: Project Settings > Player > Active Input
// Handling, "Both" or "Input Manager (Old)").
// The same scene, step for step, is scene.js in ../webgl/. Unity's axes are left-handed: the numbers are the same, the
// picture is the mirror image.
public class VectorBasicsScene : MonoBehaviour
{
    #region The arrows
    // A pool of arrows, reused every frame: Show() places the next one, and whatever the frame did not use is hidden. A
    // vector of length 0 has no direction, so it gets no arrow.
    static readonly Color Red = new Color(1f, 0.48f, 0.45f), Blue = new Color(0.47f, 0.75f, 1f), Green = new Color(0.49f, 0.91f, 0.53f);
    static readonly Color Amber = new Color(1f, 0.65f, 0.34f), Purple = new Color(0.82f, 0.66f, 1f), Gray = new Color(0.55f, 0.58f, 0.65f);
    readonly List<Transform> shafts = new List<Transform>();
    readonly List<Transform> tips = new List<Transform>();
    int used = 0;

    Transform MakeCube(string label)
    {
        GameObject cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
        cube.name = label;
        return cube.transform;
    }

    void Place(Transform part, Vector3 p, Vector3 q, float width, Color color)
    {
        Vector3 d = q - p;
        part.gameObject.SetActive(true);
        part.position = (p + q) * 0.5f;
        part.rotation = Quaternion.LookRotation(d.normalized);
        part.localScale = new Vector3(width, width, d.magnitude);
        part.gameObject.GetComponent<Renderer>().material.color = color;
    }

    void Show(Vector3 from, Vector3 to, Color color)
    {
        Vector3 d = to - from;
        float len = d.magnitude;
        if (len < VectorBasics.Eps) return;
        if (used == shafts.Count)
        {
            shafts.Add(MakeCube("shaft"));
            tips.Add(MakeCube("tip"));
        }
        Vector3 dir = d / len;
        float head = Mathf.Min(0.2f, 0.4f * len);
        Place(shafts[used], from, to - dir * head, 0.04f, color);
        Place(tips[used], to - dir * head, to, 0.14f, color);
        used += 1;
    }

    void HideUnused()
    {
        for (int i = used; i < shafts.Count; i++)
        {
            shafts[i].gameObject.SetActive(false);
            tips[i].gameObject.SetActive(false);
        }
    }
    #endregion

    #region The nine topics
    // Each draws one picture from the two vectors and returns the numbers for the status line.
    Vector3 a = new Vector3(2f, 1f, 0f);
    Vector3 b = new Vector3(1f, 2f, 1f);
    int topic = 5;

    string Text(Vector3 v)
    {
        return "(" + v.x.ToString("F2") + ", " + v.y.ToString("F2") + ", " + v.z.ToString("F2") + ")";
    }

    string DrawTopic(float time)
    {
        Show(Vector3.zero, a, Red);
        Show(Vector3.zero, b, Blue);
        if (topic == 1)
        {
            var r = VectorBasics.PointsAndVectors(a, b, Vector3.zero);
            Show(a, b, Green);
            return "points P = a, Q = b: Q - P = " + Text(r.v) + " (drawn from P to Q)";
        }
        if (topic == 2)
        {
            var r = VectorBasics.BuildFrame(a, b);
            Show(Vector3.zero, r.u, Amber);
            Show(Vector3.zero, r.v, Green);
            Show(Vector3.zero, r.w, Purple);
            return "frame from a, b: u = " + Text(r.u) + ", v = " + Text(r.v) + ", w = " + Text(r.w);
        }
        if (topic == 3)
        {
            var r = VectorBasics.NormalizeVector(a, 1f);
            Show(Vector3.zero, r.unit, Amber);
            return "|a| = " + r.len.ToString("F3") + ", a / |a| = " + Text(r.unit) + ", its length " + r.unitLen.ToString("F3");
        }
        if (topic == 4)
        {
            var r = VectorBasics.AddVectors(a, b);
            Show(a, r.sum, Blue);
            Show(Vector3.zero, r.sum, Green);
            return "a + b = " + Text(r.sum);
        }
        if (topic == 5)
        {
            var r = VectorBasics.AngleBetween(a, b);
            var p = VectorBasics.ProjectOnto(a, b);
            Show(Vector3.zero, p.proj, Amber);
            Show(p.proj, a, Gray);
            return "a . b = " + r.d.ToString("F3") + " = |a||b|cos(theta) = " + r.lenA.ToString("F3") + " x " + r.lenB.ToString("F3")
                + " x " + r.cosT.ToString("F3") + ", theta = " + (r.theta * Mathf.Rad2Deg).ToString("F1") + " deg";
        }
        if (topic == 6)
        {
            var r = VectorBasics.CrossProduct(a, b);
            Show(Vector3.zero, r.c, Green);
            return "a x b = " + Text(r.c) + ", square to both: " + r.dotA.ToString("F3") + ", " + r.dotB.ToString("F3");
        }
        if (topic == 7)
        {
            float t = Mathf.Sin(time) * 2f;
            var r = VectorBasics.LineFromPointDirection(a, b, t);
            Show(a - 2f * b, a + 2f * b, Gray);
            Show(Vector3.zero, r.x, Amber);
            return "X(t) = a + t b: t = " + t.ToString("F2") + ", X = " + Text(r.x);
        }
        if (topic == 8)
        {
            Vector3 n = new Vector3(0f, 1f, 0f);
            var r = VectorBasics.SegmentPlane(a, -b, Vector3.zero, n);
            Show(a, -b, Gray);
            Show(Vector3.zero, n, Green);
            return "segment a to -b against the ground: " + r.kind + ", sa = " + r.sa.ToString("F2") + ", sb = " + r.sb.ToString("F2")
                + ", hit " + Text(r.hit);
        }
        float blend = 0.5f + 0.5f * Mathf.Sin(time);
        var lerp = VectorBasics.LerpVector(a, b, blend);
        var s = VectorBasics.SlerpVector(a, b, blend);
        Show(Vector3.zero, lerp.x, Amber);
        Show(Vector3.zero, s.slerp, Green);
        return "t = " + blend.ToString("F2") + ": lerp " + Text(lerp.x) + " (length " + lerp.len.ToString("F2") + "), slerp " + Text(s.slerp);
    }
    #endregion

    #region Input: which vector, and where it goes
    // One vector at a time is moved, 0.1 per key press.
    bool movingA = true;

    void Keys()
    {
        for (int k = 1; k <= 9; k++)
        {
            if (Input.GetKeyDown(KeyCode.Alpha0 + k)) topic = k;
        }
        Vector3 v = movingA ? a : b;
        if (Input.GetKeyDown(KeyCode.V)) movingA = !movingA;
        if (Input.GetKeyDown(KeyCode.RightArrow)) v.x += 0.1f;
        if (Input.GetKeyDown(KeyCode.LeftArrow)) v.x -= 0.1f;
        if (Input.GetKeyDown(KeyCode.UpArrow)) v.y += 0.1f;
        if (Input.GetKeyDown(KeyCode.DownArrow)) v.y -= 0.1f;
        if (Input.GetKeyDown(KeyCode.Z)) v.z += 0.1f;
        if (Input.GetKeyDown(KeyCode.X)) v.z -= 0.1f;
        if (Input.GetKeyDown(KeyCode.R)) { a = new Vector3(2f, 1f, 0f); b = new Vector3(1f, 2f, 1f); return; }
        if (movingA) a = v; else b = v;        // Vector3 is a struct: v was a copy
    }
    #endregion

    #region Orbit: right-drag to turn, scroll to zoom
    // The camera sits on a sphere around the target: azimuth about y, elevation above the grid, distance.
    Camera cam;
    Vector3 target = new Vector3(0.5f, 0.5f, 0f);
    float azimuth = 0.6f, elevation = 0.4f, distance = 9f;

    void Orbit()
    {
        if (Input.GetMouseButton(1))
        {
            azimuth += Input.GetAxis("Mouse X") * 0.1f;
            elevation = Mathf.Clamp(elevation - Input.GetAxis("Mouse Y") * 0.1f, -1.5f, 1.5f);
        }
        distance = Mathf.Clamp(distance * Mathf.Exp(-Input.mouseScrollDelta.y * 0.1f), 2f, 30f);
        cam.transform.position = target + distance * new Vector3(
            Mathf.Cos(elevation) * Mathf.Sin(azimuth), Mathf.Sin(elevation), Mathf.Cos(elevation) * Mathf.Cos(azimuth));
        cam.transform.LookAt(target);
    }
    #endregion

    #region The frame and the status line
    string numbers = "";

    void Start()
    {
        cam = Camera.main != null ? Camera.main : new GameObject("camera").AddComponent<Camera>();
    }

    void Update()
    {
        Keys();
        used = 0;
        numbers = DrawTopic(Time.time);
        HideUnused();
        Orbit();
    }

    void OnGUI()
    {
        GUI.Label(new Rect(10, Screen.height - 50, Screen.width - 20, 40),
            "topic " + topic + " (1-9)   moving " + (movingA ? "a" : "b") + " (V)   a = " + Text(a) + "   b = " + Text(b)
            + "   " + numbers + "   R restarts");
    }
    #endregion
}
