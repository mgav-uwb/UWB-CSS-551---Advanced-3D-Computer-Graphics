using UnityEngine;

// AttentionLabScene.cs: the lecture's three tokens through one attention layer, in Unity. AttentionLab.cs computes the queries,
// keys, values, scores, weights and outputs; this script draws them and writes a status line. The left plane holds the keys (each
// a line from the origin to a colored sphere) and the chosen query (a gold line); the right plane holds the values, each as a
// sphere whose size is its weight, and the output y as a gold sphere at the weighted sum.
// Setup: put this script on an empty GameObject and press Play. (A directional light and a camera are made if the scene has none.)
// It is compiled against the course's stand-in for the Unity API (tools/unity-program-shim/) and has not been run in the Unity editor.
// Keys: 1, 2, 3 choose the query token; up and down arrows change the temperature; D divides the scores by sqrt(d) or not.
// Right-drag orbits the camera, the scroll wheel zooms (the Input Manager: Project Settings > Player > Active Input Handling,
// "Both" or "Input Manager (Old)").
// The same scene, step for step, is scene.js in ../webgl/. Unity's axes are left-handed: the same numbers, a mirror image.
public class AttentionLabScene : MonoBehaviour
{
    #region The tokens
    // The lecture's example: x = (1, 0), (0, 1), (1, 1); W_q = W_k = I; W_v = [0.5 1; 1 0.5]. Keys are drawn in the plane at x = -3.5
    // and values at x = +3.5, each plane lying flat, so a vector (a, b) is the point (offset + a, 0, -b).
    static readonly float[][] X = { new float[] { 1f, 0f }, new float[] { 0f, 1f }, new float[] { 1f, 1f } };
    static readonly float[][] Wq = { new float[] { 1f, 0f }, new float[] { 0f, 1f } };
    static readonly float[][] Wk = { new float[] { 1f, 0f }, new float[] { 0f, 1f } };
    static readonly float[][] Wv = { new float[] { 0.5f, 1f }, new float[] { 1f, 0.5f } };
    static readonly Color[] Colors = { new Color(1f, 0.48f, 0.45f), new Color(0.47f, 0.75f, 1f), new Color(0.49f, 0.91f, 0.53f) };
    const float KeyOffset = -3.5f;
    const float ValueOffset = 3.5f;
    const float Scale = 1.4f;
    int query = 2;
    float temperature = 1f;
    bool scaled = true;
    string summary = "";

    GameObject[] keySpheres = new GameObject[3];
    LineRenderer[] keyLines = new LineRenderer[3];
    GameObject[] valueSpheres = new GameObject[3];
    LineRenderer queryLine;
    GameObject outputSphere;

    Vector3 Place(float offset, float[] v)
    {
        return new Vector3(offset + Scale * v[0], 0f, -Scale * v[1]);
    }

    GameObject MakeSphere(Color color, float size)
    {
        GameObject sphere = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        sphere.GetComponent<Renderer>().material.color = color;
        sphere.transform.localScale = new Vector3(size, size, size);
        return sphere;
    }

    LineRenderer MakeLine(Color color, float width)
    {
        GameObject lineObject = new GameObject("line");
        LineRenderer line = lineObject.AddComponent<LineRenderer>();
        line.positionCount = 2;
        line.startWidth = width;
        line.endWidth = width;
        line.useWorldSpace = true;
        line.material.color = color;
        return line;
    }
    #endregion

    #region Attention
    void UpdateAttention()
    {
        AttentionLab.AttendResult result = AttentionLab.Attend(X, X, Wq, Wk, Wv, temperature, scaled);
        AttentionLab.RowResult row = AttentionLab.AttendRow(result.Q[query], result.K, result.V, temperature, scaled);
        for (int j = 0; j < X.Length; j++)
        {
            Vector3 key = Place(KeyOffset, result.K[j]);
            keySpheres[j].transform.position = key;
            keyLines[j].SetPosition(0, new Vector3(KeyOffset, 0f, 0f));
            keyLines[j].SetPosition(1, key);
            valueSpheres[j].transform.position = Place(ValueOffset, result.V[j]);
            float diameter = 2f * (0.06f + 0.3f * row.weights[j]);
            valueSpheres[j].transform.localScale = new Vector3(diameter, diameter, diameter);
        }
        queryLine.SetPosition(0, new Vector3(KeyOffset, 0.05f, 0f));
        queryLine.SetPosition(1, Place(KeyOffset, result.Q[query]) + new Vector3(0f, 0.05f, 0f));
        outputSphere.transform.position = Place(ValueOffset, row.y);
        summary = "token " + (query + 1) + ", temperature " + temperature.ToString("F2") + (scaled ? ", scores / sqrt(d)" : ", scores raw")
            + ", scores (" + row.scores[0].ToString("F3") + ", " + row.scores[1].ToString("F3") + ", " + row.scores[2].ToString("F3") + ")"
            + ", weights (" + row.weights[0].ToString("F3") + ", " + row.weights[1].ToString("F3") + ", " + row.weights[2].ToString("F3") + ")"
            + ", y (" + row.y[0].ToString("F3") + ", " + row.y[1].ToString("F3") + ")";
    }
    #endregion

    #region Input: the query token, the temperature, the scaling
    void Keys()
    {
        bool changed = true;
        if (Input.GetKeyDown(KeyCode.Alpha1)) query = 0;
        else if (Input.GetKeyDown(KeyCode.Alpha2)) query = 1;
        else if (Input.GetKeyDown(KeyCode.Alpha3)) query = 2;
        else if (Input.GetKeyDown(KeyCode.UpArrow)) temperature = Mathf.Min(4f, temperature + 0.05f);
        else if (Input.GetKeyDown(KeyCode.DownArrow)) temperature = Mathf.Max(0.05f, temperature - 0.05f);
        else if (Input.GetKeyDown(KeyCode.D)) scaled = !scaled;
        else changed = false;
        if (changed) UpdateAttention();
    }
    #endregion

    #region Orbit: right-drag to turn, scroll to zoom
    // The camera sits on a sphere around the target: azimuth about y, elevation above the equator, distance.
    Camera cam;
    Vector3 target = new Vector3(0f, 0f, 0f);
    float azimuth = 0.3f, elevation = 0.9f, distance = 13f;

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
        for (int j = 0; j < X.Length; j++)
        {
            keySpheres[j] = MakeSphere(Colors[j], 0.2f);
            keyLines[j] = MakeLine(Colors[j], 0.04f);
            valueSpheres[j] = MakeSphere(Colors[j], 0.2f);
        }
        queryLine = MakeLine(new Color(1f, 0.82f, 0.4f), 0.07f);
        outputSphere = MakeSphere(new Color(1f, 0.82f, 0.4f), 0.32f);

        if (FindFirstObjectByType<Light>() == null)
        {
            var lightObject = new GameObject("light");
            lightObject.AddComponent<Light>().type = LightType.Directional;
            lightObject.transform.position = new Vector3(2f, 6f, 4f);
            lightObject.transform.LookAt(Vector3.zero);
        }
        cam = Camera.main != null ? Camera.main : new GameObject("camera").AddComponent<Camera>();
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.043f, 0.047f, 0.063f);
        cam.fieldOfView = 50f;
        UpdateAttention();
    }

    void Update()
    {
        Keys();
        Orbit();
    }

    void OnGUI()
    {
        GUI.Label(new Rect(10, Screen.height - 50, Screen.width - 20, 40), summary + "   keys 1-3 up/down D");
    }
    #endregion
}
