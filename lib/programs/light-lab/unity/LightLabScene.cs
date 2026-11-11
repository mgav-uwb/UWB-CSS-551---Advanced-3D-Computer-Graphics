using UnityEngine;

// LightLabScene.cs: the chapter's marked point on a sphere, in Unity. LightLab.cs computes; this script colors each vertex of a
// sphere mesh with ShadeSurface and logs the numbers at the marked point.
// Setup: put this script on an empty GameObject and press Play. It is compiled against the course's stand-in for the Unity API
// (tools/unity-program-shim/) and has not been run in the Unity editor. The sphere is a plain Unity sphere whose mesh gets a
// color per vertex; give its material a shader that shows vertex colors unlit (the course's Unlit/Vertex-color shader, or any
// "vertex color" shader), since Unity's default material would light it a second time.
// Keys: left and right arrows swing the light, up and down change the shininess, M switches Phong and Blinn, N the normalized lobe.
// The same scene, step for step, is scene.js in ../webgl/. Unity's axes are left-handed: the numbers are the same, the picture a mirror image.
public class LightLabScene : MonoBehaviour
{
    #region The model: one light, one eye, one material
    const float Radius = 1.2f;
    static readonly Vector3 Eye = new Vector3(3f, 3f, 6f);
    static readonly Vector3 Kd = new Vector3(0.86f, 0.36f, 0.3f);
    static readonly Vector3 Ks = new Vector3(0.5f, 0.5f, 0.5f);
    float azimuth = 45f;
    float shininess = 30f;
    string model = "phong";
    bool normalized = false;
    Mesh mesh;

    Vector3 LightPosition()
    {
        float a = azimuth * Mathf.Deg2Rad;
        float e = Mathf.PI / 6f;
        return new Vector3(Mathf.Cos(e) * Mathf.Sin(a), Mathf.Sin(e), Mathf.Cos(e) * Mathf.Cos(a)) * 3f;
    }
    #endregion

    #region The sphere: one color per vertex
    void Start()
    {
        GameObject sphere = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        sphere.transform.localScale = Vector3.one * (2f * Radius);
        mesh = sphere.GetComponent<MeshFilter>().mesh;
        Refresh();
    }

    void ColorSphere()
    {
        Vector3[] vertices = mesh.vertices;
        Color[] colors = new Color[vertices.Length];
        Vector3[] lights = { LightPosition() };
        Vector3[] white = { Vector3.one };
        for (int i = 0; i < vertices.Length; i++)
        {
            Vector3 p = vertices[i].normalized * Radius;
            var lit = LightLab.ShadeSurface(p, p.normalized, Eye, lights, white, Vector3.one, 0.12f, Kd, Ks, shininess, model, normalized);
            colors[i] = new Color(Mathf.Min(1f, lit.color.x), Mathf.Min(1f, lit.color.y), Mathf.Min(1f, lit.color.z));
        }
        mesh.colors = colors;
    }
    #endregion

    #region The numbers at the marked point
    void Refresh()
    {
        ColorSphere();
        Vector3 marked = new Vector3(1f, 1f, 1f).normalized;
        Vector3 p = marked * Radius;
        var lit = LightLab.ShadeSurface(p, marked, Eye, new Vector3[] { LightPosition() }, new Vector3[] { Vector3.one }, Vector3.one, 0.12f, Kd, Ks, shininess, model, normalized);
        Debug.Log("N.L " + lit.nDotLs[0] + "  cosine " + lit.cosines[0] + "  color " + lit.color.x + ", " + lit.color.y + ", " + lit.color.z);
    }
    #endregion

    #region Input
    void Update()
    {
        if (Input.GetKeyDown(KeyCode.LeftArrow)) azimuth -= 5f;
        else if (Input.GetKeyDown(KeyCode.RightArrow)) azimuth += 5f;
        else if (Input.GetKeyDown(KeyCode.UpArrow)) shininess = Mathf.Min(128f, shininess + 2f);
        else if (Input.GetKeyDown(KeyCode.DownArrow)) shininess = Mathf.Max(1f, shininess - 2f);
        else if (Input.GetKeyDown(KeyCode.M)) model = model == "phong" ? "blinn" : "phong";
        else if (Input.GetKeyDown(KeyCode.N)) normalized = !normalized;
        else return;
        Refresh();
    }
    #endregion
}
