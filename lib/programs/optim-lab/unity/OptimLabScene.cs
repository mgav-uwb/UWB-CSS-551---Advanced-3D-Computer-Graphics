using UnityEngine;

// OptimLabScene.cs: a loss surface as a height field, and the walk of one optimizer down it, in Unity. OptimLab.cs computes the
// loss, the gradient and every step; this script hands the surface to a Mesh, draws the path with a LineRenderer and a ball at its
// end, and writes a status line.
// Setup: put this script on an empty GameObject and press Play. (A directional light and a camera are made if the scene has none.)
// It is compiled against the course's stand-in for the Unity API (tools/unity-program-shim/) and has not been run in the Unity editor.
// Keys: 1 to 6 pick the surface (bowl, ill-conditioned bowl, saddle, valley, minima, perceptron), G, M and A pick gradient descent,
// momentum or Adam, up and down arrows change the learning rate, space takes the next step, Return runs to the end, R starts
// again. Left-click the surface to start there. Right-drag orbits the camera, the scroll wheel zooms (the Input Manager:
// Project Settings > Player > Active Input Handling, "Both" or "Input Manager (Old)").
// The same scene, step for step, is scene.js in ../webgl/. Unity's axes are left-handed: the same numbers, a mirror image.
public class OptimLabScene : MonoBehaviour
{
    #region The surfaces
    // Each surface has a name for LossAt, a square-ish domain, and a start. Height is a logarithm of the loss above its lowest
    // value, so a steep wall and a flat floor both show: height = HEIGHT log(1 + (L - floor) / scale).
    static readonly string[] Names = { "bowl", "ill-conditioned", "saddle", "valley", "minima", "perceptron" };
    static readonly float[][] Domains = {
        new float[] { -3f, 3f, -3f, 3f }, new float[] { -3f, 3f, -3f, 3f }, new float[] { -2.2f, 2.2f, -1.8f, 1.8f },
        new float[] { -2f, 2f, -0.5f, 3.5f }, new float[] { -5f, 5f, -5f, 5f }, new float[] { -4f, 4f, -2.5f, 2.5f } };
    static readonly float[] Floors = { 0f, 0f, -0.25f, 0f, 0f, 0f };
    static readonly float[][] Starts = {
        new float[] { -2.5f, 1.8f }, new float[] { -2.5f, 1.5f }, new float[] { 1.5f, 0.05f },
        new float[] { -1.5f, 2f }, new float[] { 2.5f, 2.2f }, new float[] { 1f, 0.8f } };
    static readonly float[] Rates = { 0.4f, 0.19f, 0.1f, 0.08f, 0.2f, 0.1f };
    const float Height = 1.1f;
    const float Scale = 1.5f;

    float HeightOf(int surface, float loss)
    {
        return Height * Mathf.Log(1f + Mathf.Max(0f, loss - Floors[surface]) / Scale);
    }

    Mesh BuildSurface(int surface)
    {
        int n = 80;
        float[] d = Domains[surface];
        Vector3[] vertices = new Vector3[(n + 1) * (n + 1)];
        Color[] colors = new Color[(n + 1) * (n + 1)];
        int[] index = new int[n * n * 6];
        int at = 0;
        for (int j = 0; j <= n; j++)
        {
            for (int i = 0; i <= n; i++)
            {
                float x = d[0] + ((float)i / n) * (d[1] - d[0]);
                float y = d[2] + ((float)j / n) * (d[3] - d[2]);
                float loss = OptimLab.LossAt(Names[surface], x, y).loss;
                float h = HeightOf(surface, loss);
                int v = j * (n + 1) + i;
                vertices[v] = new Vector3(x, h, -y);
                float band = 0.5f + 0.5f * Mathf.Sin(h * 9f);
                colors[v] = new Color(0.1f + 0.05f * band + 0.1f * h, 0.35f + 0.15f * band, 0.55f - 0.05f * h);
                if (i < n && j < n)
                {
                    int a = v;
                    index[at++] = a; index[at++] = a + 1; index[at++] = a + n + 1;
                    index[at++] = a + 1; index[at++] = a + n + 2; index[at++] = a + n + 1;
                }
            }
        }
        Mesh mesh = new Mesh();
        mesh.vertices = vertices;                         // vertices first: a Mesh refuses triangles past its vertex count
        mesh.colors = colors;
        mesh.triangles = index;
        mesh.RecalculateNormals();
        return mesh;
    }
    #endregion

    #region The walk
    // The path is recomputed by RunOptimizer from the start, with as many steps as have been taken; the ball sits at its end.
    int surface = 0;
    string kind = "gd";
    float eta = 0.4f;
    float[] start = { -2.5f, 1.8f };
    int taken = 0;
    const int MaxSteps = 150;

    MeshFilter surfaceFilter;
    LineRenderer pathLine;
    GameObject ball;
    string summary = "";

    void RebuildSurface()
    {
        surfaceFilter.mesh = BuildSurface(surface);
    }

    void Restart()
    {
        start = Starts[surface];
        eta = Rates[surface];
        taken = 0;
    }

    void UpdateWalk()
    {
        var run = OptimLab.RunOptimizer(Names[surface], kind, start, eta, 0.9f, taken);
        Vector3[] points = new Vector3[run.count];
        for (int i = 0; i < run.count; i++) points[i] = new Vector3(run.xs[i], HeightOf(surface, run.losses[i]) + 0.06f, -run.ys[i]);
        pathLine.positionCount = run.count;
        pathLine.SetPositions(points);
        ball.transform.position = points[run.count - 1];
        int last = run.count - 1;
        summary = Names[surface] + ", " + kind + ", eta " + eta.ToString("F2") + ", step " + last
            + ", theta (" + run.xs[last].ToString("F3") + ", " + run.ys[last].ToString("F3") + "), loss " + run.losses[last].ToString("G4")
            + (run.diverged ? ", DIVERGED" : "");
    }
    #endregion

    #region Input: surface, optimizer, rate, steps, click to start
    KeyCode[] digits = { KeyCode.Alpha1, KeyCode.Alpha2, KeyCode.Alpha3, KeyCode.Alpha4, KeyCode.Alpha5, KeyCode.Alpha6 };

    void Keys()
    {
        bool changed = true;
        int digit = -1;
        for (int k = 0; k < digits.Length; k++) if (Input.GetKeyDown(digits[k])) digit = k;
        if (digit >= 0) { surface = digit; RebuildSurface(); Restart(); }
        else if (Input.GetKeyDown(KeyCode.G)) { kind = "gd"; taken = 0; }
        else if (Input.GetKeyDown(KeyCode.M)) { kind = "momentum"; taken = 0; }
        else if (Input.GetKeyDown(KeyCode.A)) { kind = "adam"; taken = 0; }
        else if (Input.GetKeyDown(KeyCode.UpArrow)) { eta = Mathf.Min(1f, eta + 0.01f); taken = 0; }
        else if (Input.GetKeyDown(KeyCode.DownArrow)) { eta = Mathf.Max(0.01f, eta - 0.01f); taken = 0; }
        else if (Input.GetKeyDown(KeyCode.Space)) taken = Mathf.Min(MaxSteps, taken + 1);
        else if (Input.GetKeyDown(KeyCode.Return)) taken = MaxSteps;
        else if (Input.GetKeyDown(KeyCode.R)) Restart();
        else changed = false;
        if (changed) UpdateWalk();
    }

    // A click: march the ray until it passes under the surface, and start there.
    void Click()
    {
        if (!Input.GetMouseButtonDown(0)) return;
        Ray ray = cam.ScreenPointToRay(Input.mousePosition);
        float[] d = Domains[surface];
        for (int s = 0; s < 900; s++)
        {
            Vector3 p = ray.GetPoint(s * 0.05f);
            float x = p.x;
            float y = -p.z;
            if (x < d[0] || x > d[1] || y < d[2] || y > d[3]) continue;
            bool below = p.y <= HeightOf(surface, OptimLab.LossAt(Names[surface], x, y).loss);
            if (below)
            {
                start = new float[] { Mathf.Round(x * 10f) / 10f, Mathf.Round(y * 10f) / 10f };
                taken = 0;
                UpdateWalk();
                return;
            }
        }
    }
    #endregion

    #region Orbit: right-drag to turn, scroll to zoom
    // The camera sits on a sphere around the target: azimuth about y, elevation above the equator, distance.
    Camera cam;
    Vector3 target = new Vector3(0f, 0.6f, 0f);
    float azimuth = 0.6f, elevation = 0.75f, distance = 14f;

    void Orbit()
    {
        if (Input.GetMouseButton(1))
        {
            azimuth += Input.GetAxis("Mouse X") * 0.1f;
            elevation = Mathf.Clamp(elevation - Input.GetAxis("Mouse Y") * 0.1f, 0.05f, 1.5f);
        }
        distance = Mathf.Clamp(distance * Mathf.Exp(-Input.mouseScrollDelta.y * 0.1f), 3f, 40f);
        cam.transform.position = target + distance * new Vector3(
            Mathf.Cos(elevation) * Mathf.Sin(azimuth), Mathf.Sin(elevation), Mathf.Cos(elevation) * Mathf.Cos(azimuth));
        cam.transform.LookAt(target);
    }
    #endregion

    #region The frame and the status line
    void Start()
    {
        GameObject surfaceObject = new GameObject("surface");
        surfaceFilter = surfaceObject.AddComponent<MeshFilter>();
        Material material = new Material(Shader.Find("Standard"));
        surfaceObject.AddComponent<MeshRenderer>().material = material;
        GameObject pathObject = new GameObject("path");
        pathLine = pathObject.AddComponent<LineRenderer>();
        pathLine.startWidth = 0.05f;
        pathLine.endWidth = 0.05f;
        pathLine.useWorldSpace = true;
        ball = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        ball.transform.localScale = new Vector3(0.24f, 0.24f, 0.24f);

        if (FindFirstObjectByType<Light>() == null)
        {
            var lightObject = new GameObject("light");
            lightObject.AddComponent<Light>().type = LightType.Directional;
            lightObject.transform.position = new Vector3(2f, 6f, 3f);
            lightObject.transform.LookAt(Vector3.zero);
        }
        cam = Camera.main != null ? Camera.main : new GameObject("camera").AddComponent<Camera>();
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.043f, 0.047f, 0.063f);
        cam.fieldOfView = 50f;
        RebuildSurface();
        Restart();
        UpdateWalk();
    }

    void Update()
    {
        Keys();
        Click();
        Orbit();
    }

    void OnGUI()
    {
        GUI.Label(new Rect(10, Screen.height - 50, Screen.width - 20, 40), summary + "   keys 1-6 G M A up/down space Return R");
    }
    #endregion
}
