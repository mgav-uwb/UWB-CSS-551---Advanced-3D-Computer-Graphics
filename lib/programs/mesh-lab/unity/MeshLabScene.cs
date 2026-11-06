using System.Globalization;
using UnityEngine;

// MeshLabScene.cs: an icosahedron as two arrays, in Unity. MeshLab.cs computes; this script hands the arrays to a Mesh
// (vertices, normals, triangles), draws one highlighted triangle, and writes a status line.
// Setup: put this script on an empty GameObject and press Play. (A directional light and a camera are made if the scene
// has none.) It is compiled against the course's stand-in for the Unity API (tools/unity-program-shim/) and has not been
// run in the Unity editor.
// Keys: left and right arrows pick the selected triangle, F reverses its winding, C cycles the culling (off, back, front),
// S subdivides onto the sphere (up to level 3), R starts again. Right-drag orbits the camera, the scroll wheel zooms (the
// Input Manager: Project Settings > Player > Active Input Handling, "Both" or "Input Manager (Old)").
// Culling: Unity's default material (the Standard shader) culls back faces and has no switch to change that at run time.
// So each mesh is drawn as two objects: the triangles as stored, and a copy with every winding reversed and every normal
// negated. A triangle's back face is the reversed copy's front face. Culling "back" shows the first object only,
// "front" shows the reversed copy only, "off" shows both. The selected triangle is drawn the same way, lifted 0.01 off
// the surface on the side it faces. A mesh keeps three corners per triangle, so each triangle takes its own flat normal.
// The same scene, step for step, is scene.js in ../webgl/. Unity's axes are left-handed and it keeps clockwise triangles
// as front: the same indices face the same way, and the picture is the mirror image.
public class MeshLabScene : MonoBehaviour
{
    #region The mesh: two arrays, and one selected triangle
    // positions and tris come from MeshLab.cs and are replaced, never edited: ReverseTriangle and Subdivide return new arrays.
    Vector3[] positions;
    int[][] tris;
    int level;
    int selected;
    int culling;                                          // 0 off, 1 back, 2 front
    static readonly string[] CullNames = { "off", "back", "front" };

    void Restart()
    {
        var ico = MeshLab.Icosahedron();
        positions = ico.positions;
        tris = ico.tris;
        level = 0;
        selected = 0;
        culling = 1;
    }

    // Three corners per triangle, each with the triangle's own unit normal. A reversed copy flips every winding and every
    // normal, and lifts the corners the other way.
    void BuildMesh(Mesh mesh, int[][] list, bool reversed, float lift)
    {
        float side = reversed ? -1f : 1f;
        Vector3[] vertices = new Vector3[3 * list.Length];
        Vector3[] normals = new Vector3[3 * list.Length];
        int[] indices = new int[3 * list.Length];
        for (int t = 0; t < list.Length; t++)
        {
            Vector3 a = positions[list[t][0]];
            Vector3 b = positions[list[t][1]];
            Vector3 c = positions[list[t][2]];
            Vector3 n = MeshLab.FaceNormal(a, b, c).nHat * side;
            Vector3[] corners = { a, b, c };
            for (int k = 0; k < 3; k++)
            {
                vertices[3 * t + k] = corners[k] + n * lift;
                normals[3 * t + k] = n;
            }
            indices[3 * t] = 3 * t;
            indices[3 * t + 1] = reversed ? 3 * t + 2 : 3 * t + 1;
            indices[3 * t + 2] = reversed ? 3 * t + 1 : 3 * t + 2;
        }
        mesh.Clear();
        mesh.vertices = vertices;                         // vertices first: a Mesh refuses triangles past its vertex count
        mesh.normals = normals;
        mesh.triangles = indices;
        mesh.RecalculateBounds();
    }
    #endregion

    #region The objects
    // Four objects: the solid mesh and the selected triangle, each as stored and reversed.
    Mesh solidMesh, solidBackMesh, pickMesh, pickBackMesh;
    GameObject solidObject, solidBackObject, pickObject, pickBackObject;
    string summary = "";

    GameObject MakeObject(string objectName, Mesh mesh, Color color)
    {
        var o = new GameObject(objectName);
        o.AddComponent<MeshFilter>().mesh = mesh;
        var material = new Material(Shader.Find("Standard"));
        material.color = color;
        o.AddComponent<MeshRenderer>().material = material;
        return o;
    }

    void Rebuild()
    {
        int[][] one = { tris[selected] };
        BuildMesh(solidMesh, tris, false, 0f);
        BuildMesh(solidBackMesh, tris, true, 0f);
        BuildMesh(pickMesh, one, false, 0.01f);
        BuildMesh(pickBackMesh, one, true, 0.01f);
        solidObject.SetActive(culling != 2);              // culling front hides the triangles as stored
        pickObject.SetActive(culling != 2);
        solidBackObject.SetActive(culling != 1);          // culling back hides the reversed copy
        pickBackObject.SetActive(culling != 1);

        var euler = MeshLab.EulerCheck(positions.Length, tris);
        int[] tri = tris[selected];
        Vector3 normal = MeshLab.FaceNormal(positions[tri[0]], positions[tri[1]], positions[tri[2]]).nHat;
        var winding = MeshLab.WindingCheck(tris);
        summary = "V " + euler.V + "  E " + euler.E + "  F " + euler.F + "  chi " + euler.chi
            + "   triangle " + selected + " = (" + tri[0] + ", " + tri[1] + ", " + tri[2] + "), normal " + Text(normal)
            + "   winding " + (winding.consistent ? "consistent" : "inconsistent, " + winding.count + " bad edges")
            + "   culling " + CullNames[culling] + "   level " + level;
    }

    string Text(Vector3 v)
    {
        CultureInfo inv = CultureInfo.InvariantCulture;
        return "(" + v.x.ToString("F3", inv) + ", " + v.y.ToString("F3", inv) + ", " + v.z.ToString("F3", inv) + ")";
    }
    #endregion

    #region Input: select, reverse, cull, subdivide
    void Keys()
    {
        bool changed = true;
        if (Input.GetKeyDown(KeyCode.RightArrow)) selected = (selected + 1) % tris.Length;
        else if (Input.GetKeyDown(KeyCode.LeftArrow)) selected = (selected + tris.Length - 1) % tris.Length;
        else if (Input.GetKeyDown(KeyCode.F)) tris = MeshLab.ReverseTriangle(tris, selected).tris;
        else if (Input.GetKeyDown(KeyCode.C)) culling = (culling + 1) % 3;
        else if (Input.GetKeyDown(KeyCode.S))
        {
            if (level >= 3) return;
            var finer = MeshLab.Subdivide(positions, tris, positions[0].magnitude);      // onto the sphere the corners lie on
            positions = finer.positions;
            tris = finer.tris;
            level += 1;
            selected = 4 * selected;                      // the first of the four triangles made from the old one
        }
        else if (Input.GetKeyDown(KeyCode.R)) Restart();
        else changed = false;
        if (changed) Rebuild();
    }
    #endregion

    #region Orbit: right-drag to turn, scroll to zoom
    // The camera sits on a sphere around the target: azimuth about y, elevation above the equator, distance.
    Camera cam;
    Vector3 target = Vector3.zero;
    float azimuth = 0.6f, elevation = 0.4f, distance = 7f;

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
    void Start()
    {
        solidMesh = new Mesh();
        solidBackMesh = new Mesh();
        pickMesh = new Mesh();
        pickBackMesh = new Mesh();
        Color blue = new Color(0.29f, 0.56f, 0.85f);
        Color amber = new Color(1f, 0.65f, 0.34f);
        solidObject = MakeObject("mesh", solidMesh, blue);
        solidBackObject = MakeObject("mesh reversed", solidBackMesh, blue);
        pickObject = MakeObject("selected triangle", pickMesh, amber);
        pickBackObject = MakeObject("selected triangle reversed", pickBackMesh, amber);

        if (FindFirstObjectByType<Light>() == null)
        {
            var lightObject = new GameObject("light");
            lightObject.AddComponent<Light>().type = LightType.Directional;
            lightObject.transform.position = new Vector3(2f, 4f, 3f);
            lightObject.transform.LookAt(Vector3.zero);
        }
        cam = Camera.main != null ? Camera.main : new GameObject("camera").AddComponent<Camera>();
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.043f, 0.047f, 0.063f);
        cam.fieldOfView = 50f;
        Restart();
        Rebuild();
    }

    void Update()
    {
        Keys();
        Orbit();
    }

    void OnGUI()
    {
        GUI.Label(new Rect(10, Screen.height - 50, Screen.width - 20, 40), summary + "   left/right F C S R");
    }
    #endregion
}
