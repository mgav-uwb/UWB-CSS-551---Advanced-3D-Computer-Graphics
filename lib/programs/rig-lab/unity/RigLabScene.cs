using System.Globalization;
using UnityEngine;

// RigLabScene.cs: a tube on two bones, skinned in Unity. RigLab.cs computes; this script hands the skinned positions to a Mesh
// (vertices, normals, triangles) and writes a status line.
// Setup: put this script on an empty GameObject and press Play. (A directional light and a camera are made if the scene
// has none.) It is compiled against the course's stand-in for the Unity API (tools/unity-program-shim/) and has not been
// run in the Unity editor.
// Keys: left and right arrows turn the second bone about the tube's axis by 15 degrees (the twist), D switches between linear
// blend skinning and dual quaternion skinning, R starts again. Right-drag orbits the camera, the scroll wheel zooms (the Input
// Manager: Project Settings > Player > Active Input Handling, "Both" or "Input Manager (Old)").
// Each frame the skinned positions are written into the mesh and its normals are recomputed; the status line gives the twist, the
// method, the radius of the ring at the joint and the tube's volume against its volume at rest.
// The same scene, step for step, is scene.js in ../webgl/. Unity's axes are left-handed and it keeps clockwise triangles
// as front: the same indices face the same way, and the picture is the mirror image.
public class RigLabScene : MonoBehaviour
{
    #region The tube, its weights and the state
    // Two bones along x: bone A over x from 0 to 1, bone B from 1 to 2. The weights ramp from A to B over 0.6 around the joint.
    Vector3[] rest;
    int[][] tris;
    float[][] weights;
    float twist;                                          // degrees, bone B about its own axis
    bool dual;                                            // false: linear blend skinning, true: dual quaternions
    const int Ring = 16 * 16;                             // the first vertex of the ring at x = 1, the joint

    void Restart()
    {
        twist = 0;
        dual = false;
    }
    #endregion

    #region Skin the tube
    // Linear blending sums the bones' skinning matrices applied to the vertex; dual quaternion skinning blends their dual quaternions.
    Vector3[] Skin()
    {
        var bones = RigLab.TwistBones(twist);
        var sm = RigLab.SkinningMatrices(bones.binds, bones.poses);
        if (!dual) return RigLab.SkinMesh(rest, weights, sm.inverseBinds, bones.poses).posed;
        Vector3[] posed = new Vector3[rest.Length];
        for (int i = 0; i < rest.Length; i++)
        {
            posed[i] = RigLab.SkinVertexDQ(rest[i], weights[i], sm.skins).blended;
        }
        return posed;
    }
    #endregion

    #region The objects
    Mesh mesh;
    string summary = "";

    void Rebuild()
    {
        Vector3[] posed = Skin();
        mesh.vertices = posed;
        mesh.RecalculateNormals();
        mesh.RecalculateBounds();

        var measure = RigLab.MeasureCollapse(rest, posed, tris);
        float radius = Mathf.Sqrt(posed[Ring].y * posed[Ring].y + posed[Ring].z * posed[Ring].z);
        CultureInfo inv = CultureInfo.InvariantCulture;
        summary = "twist " + twist.ToString("F0", inv) + " deg   " + (dual ? "dual quaternion" : "linear blend")
            + "   ring at the joint: radius " + radius.ToString("F3", inv) + " (rest 0.400)"
            + "   volume " + (100f * measure.ratio).ToString("F1", inv) + " % of rest";
    }
    #endregion

    #region Input: twist, switch method, restart
    void Keys()
    {
        bool changed = true;
        if (Input.GetKeyDown(KeyCode.RightArrow)) twist = (twist + 15f) % 360f;
        else if (Input.GetKeyDown(KeyCode.LeftArrow)) twist = (twist + 345f) % 360f;
        else if (Input.GetKeyDown(KeyCode.D)) dual = !dual;
        else if (Input.GetKeyDown(KeyCode.R)) Restart();
        else changed = false;
        if (changed) Rebuild();
    }
    #endregion

    #region Orbit: right-drag to turn, scroll to zoom
    // The camera sits on a sphere around the target: azimuth about y, elevation above the equator, distance.
    Camera cam;
    Vector3 target = new Vector3(1f, 0f, 0f);
    float azimuth = 0.5f, elevation = 0.35f, distance = 5f;

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
        var tube = RigLab.MakeTube(2f, 0.4f, 33, 16);
        rest = tube.positions;
        tris = tube.tris;
        weights = RigLab.PaintWeights(rest, new float[] { 1f }, 0.6f);
        int[] indices = new int[3 * tris.Length];
        for (int t = 0; t < tris.Length; t++)
        {
            indices[3 * t] = tris[t][0];
            indices[3 * t + 1] = tris[t][1];
            indices[3 * t + 2] = tris[t][2];
        }
        mesh = new Mesh();
        mesh.vertices = rest;                             // vertices first: a Mesh refuses triangles past its vertex count
        mesh.triangles = indices;
        var o = new GameObject("tube");
        o.AddComponent<MeshFilter>().mesh = mesh;
        var material = new Material(Shader.Find("Standard"));
        material.color = new Color(0.29f, 0.56f, 0.85f);
        o.AddComponent<MeshRenderer>().material = material;

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
        GUI.Label(new Rect(10, Screen.height - 50, Screen.width - 20, 40), summary + "   left/right D R");
    }
    #endregion
}
