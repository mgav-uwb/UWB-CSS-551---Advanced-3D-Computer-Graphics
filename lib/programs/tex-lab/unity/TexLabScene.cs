using UnityEngine;

// TexLabScene.cs: a tilted checker floor, drawn by Unity's own sampler. TexLab.cs computes; this script hands it the checker as a
// Texture2D, lets you change the filter, the tilt and the tile count, and writes a status line with the level TexLab.cs picks
// for one pixel. Unity's sampler and TexLab.cs are two implementations of the same filters, so the picture and the number can be
// compared.
// Setup: put this script on an empty GameObject and press Play. (A camera is made if the scene has none.) It is compiled
// against the course's stand-in for the Unity API (tools/unity-program-shim/) and has not been run in the Unity editor.
// Keys: F cycles the filter (point, bilinear, trilinear), A cycles the anisotropy limit (1, 4, 16), up and down arrows change the
// tilt, left and right arrows change the tiles (the Input Manager: Project Settings > Player > Active Input Handling, "Both"
// or "Input Manager (Old)").
// The camera sits at the origin and looks along +z with a 50 degree field of view; the floor passes through (0, 0, 1) and is
// rotated about the x axis by the tilt. Unity's axes are left-handed, so the picture is the mirror image of scene.js in
// ../webgl/ about the z axis; the numbers are the same. The same scene, step for step, is scene.js.
public class TexLabScene : MonoBehaviour
{
    #region The texture
    // A 64 by 64 checker of 4-texel squares from TexLab.cs, copied into a Texture2D with a mip chain. Repeat wrap.
    const int Size = 64;
    float[] baseLevel;
    Texture2D texture;
    // Unity's FilterMode.Trilinear has the value 2.
    static readonly FilterMode[] Filters = { FilterMode.Point, FilterMode.Bilinear, (FilterMode)2 };
    static readonly string[] FilterNames = { "point", "bilinear", "trilinear" };
    static readonly int[] Aniso = { 1, 4, 16 };

    void MakeTexture()
    {
        baseLevel = TexLab.MakeChecker(Size, 4, 0.12f, 0.9f);
        texture = new Texture2D(Size, Size, TextureFormat.RGBA32, true);
        for (int j = 0; j < Size; j++)
        {
            for (int i = 0; i < Size; i++)
            {
                float gray = baseLevel[j * Size + i];
                texture.SetPixel(i, j, new Color(gray, gray, gray, 1f));
            }
        }
        texture.wrapMode = TextureWrapMode.Repeat;
        texture.Apply();
    }
    #endregion

    #region The floor
    // A large quad through (0, 0, 1). One texture repeat is 2 * halfWidth / tiles world units, as in FloorPixel, and the image
    // center is the middle of a repeat, u = v = 0.5.
    GameObject floor;
    Camera cam;
    float tilt = 66f;
    float tiles = 10f;
    int filterIndex = 0;
    int anisoIndex = 2;

    void PlaceFloor()
    {
        float halfHeight = Mathf.Tan(TexLab.FovDegrees * Mathf.PI / 360f);
        float halfWidth = halfHeight * cam.aspect;
        float tileSize = 2f * halfWidth / tiles;
        float repeat = 60f / tileSize;
        floor.GetComponent<MeshRenderer>().material.mainTextureScale = new Vector2(repeat, repeat);
        floor.GetComponent<MeshRenderer>().material.mainTextureOffset = new Vector2(0.5f - 0.5f * repeat, 0.5f - 0.5f * repeat);
        floor.transform.position = new Vector3(0f, 0f, 1f);
        floor.transform.eulerAngles = new Vector3(tilt, 0f, 0f);
    }

    void ApplyFilter()
    {
        texture.filterMode = Filters[filterIndex];
        texture.anisoLevel = filterIndex == 2 ? Aniso[anisoIndex] : 1;
    }
    #endregion

    #region The status line
    // TexLab.cs reads one pixel of the 200 by 150 floor it models, near the bottom of the middle column, and reports the level.
    string status = "";

    void Describe()
    {
        var pyramid = TexLab.BuildMipmap(baseLevel, Size);
        var f = TexLab.FloorFootprint(100, 110, 200, 150, tilt, tiles);
        var fp = TexLab.FootprintLevel(f.dudx, f.dvdx, f.dudy, f.dvdy, Size, pyramid.levels);
        string lambda = f.hit ? fp.lambda.ToString("F2") : "sky";
        status = "filter " + FilterNames[filterIndex] + "   anisotropy " + texture.anisoLevel + "   tilt " + tilt
            + "   tiles " + tiles + "   TexLab.cs: lambda " + lambda + " at pixel (100, 110)   F A arrows";
    }
    #endregion

    #region Input and the frame
    void Start()
    {
        MakeTexture();
        cam = Camera.main != null ? Camera.main : new GameObject("camera").AddComponent<Camera>();
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.078f, 0.102f, 0.157f);
        cam.fieldOfView = TexLab.FovDegrees;
        cam.transform.position = Vector3.zero;
        floor = GameObject.CreatePrimitive(PrimitiveType.Quad);
        floor.transform.localScale = new Vector3(60f, 60f, 1f);
        Material material = new Material(Shader.Find("Unlit/Texture"));
        material.mainTexture = texture;
        floor.GetComponent<MeshRenderer>().material = material;
        ApplyFilter();
        PlaceFloor();
        Describe();
    }

    void Update()
    {
        bool changed = true;
        if (Input.GetKeyDown(KeyCode.F)) filterIndex = (filterIndex + 1) % Filters.Length;
        else if (Input.GetKeyDown(KeyCode.A)) anisoIndex = (anisoIndex + 1) % Aniso.Length;
        else if (Input.GetKeyDown(KeyCode.UpArrow)) tilt = Mathf.Min(80f, tilt + 2f);
        else if (Input.GetKeyDown(KeyCode.DownArrow)) tilt = Mathf.Max(0f, tilt - 2f);
        else if (Input.GetKeyDown(KeyCode.RightArrow)) tiles = Mathf.Min(24f, tiles + 1f);
        else if (Input.GetKeyDown(KeyCode.LeftArrow)) tiles = Mathf.Max(1f, tiles - 1f);
        else changed = false;
        if (changed)
        {
            ApplyFilter();
            PlaceFloor();
            Describe();
        }
    }

    void OnGUI()
    {
        GUI.Label(new Rect(10, Screen.height - 50, Screen.width - 20, 40), status);
    }
    #endregion
}
