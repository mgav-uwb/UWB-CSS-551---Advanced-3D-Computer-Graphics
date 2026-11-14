using System.Globalization;
using UnityEngine;

// RayLabScene.cs: the chapter's Whitted scene rendered by RayLab.cs into a Texture2D, 96 x 60 pixels, a few rows per frame, drawn
// with OnGUI. Click a pixel to see its tree of rays: each ray's kind, what it hit, its weight and its share of the pixel's color.
// Setup: put this script on an empty GameObject and press Play. It is compiled against the course's stand-in for the Unity API
// (tools/unity-program-shim/) and has not been run in the Unity editor.
// Keys: up and down change the depth limit (0 to 4), left and right the offset epsilon (a power of ten), S stores hit points as
// 32-bit floats or leaves them 64-bit (a C# float is always 32-bit, so here the switch only labels the status line), M switches
// the cure for acne between an offset origin and a minimum t, C changes the scene (chapter, acne), B builds a bounding-volume
// hierarchy over 200 seeded triangles and prints its test counts against brute force. Changing anything stops the render in
// progress and starts again. (The Input Manager: Project Settings > Player > Active Input Handling, "Both" or "Input Manager (Old)".)
// The same scene, step for step, is scene.js in ../webgl/. Unity's texture rows count from the bottom, so row y of the image is
// row (height - 1 - y) of the texture.
public class RayLabScene : MonoBehaviour
{
    #region Settings
    // The scene, the image size (the scene's camera), and the options every ray carries: the depth limit, the epsilon, how it is
    // applied ('offset' moves the origin along the normal, 'tmin' ignores hits with t below it), and whether hit points are rounded
    // to 32 bits. ROWS is how many rows one frame renders.
    static readonly string[] SceneNames = { "chapter", "acne" };
    const int Rows = 4;
    int sceneIndex = 0;
    RayLab.Scene scene;
    int maxDepth = 4;
    int epsExponent = -4;                                 // eps = 10^epsExponent, or 0 at -10
    string mode = "offset";
    bool single = false;
    bool hasSelected = false;                             // the clicked pixel
    int selectedX, selectedY;
    string report = "";
    string tree = "Click a pixel to see its tree of rays.";
    int nextRow = 0;
    int rays = 0;

    RayLab.Options Options()
    {
        RayLab.Options opt = new RayLab.Options();
        opt.maxDepth = maxDepth;
        opt.eps = epsExponent <= -10 ? 0f : Mathf.Pow(10f, epsExponent);
        opt.mode = mode;
        opt.single = single;
        return opt;
    }
    #endregion

    #region The image
    // Render a few rows each frame into the texture. A change restarts at row 0; the old image stays until it is overwritten, so a
    // change shows at once from the top down.
    Texture2D picture;

    float Gamma(float value)
    {
        return Mathf.Pow(Mathf.Clamp01(value), 1f / 2.2f);
    }

    void RenderBlock()
    {
        RayLab.RayCamera camera = scene.camera;
        int y1 = Mathf.Min(nextRow + Rows, camera.height);
        RayLab.RenderResult block = RayLab.RenderRows(scene, nextRow, y1, Options());
        int at = 0;
        for (int y = nextRow; y < y1; y++)
        {
            for (int x = 0; x < camera.width; x++)
            {
                picture.SetPixel(x, camera.height - 1 - y, new Color(Gamma(block.pixels[at]), Gamma(block.pixels[at + 1]), Gamma(block.pixels[at + 2])));
                at += 3;
            }
        }
        rays += block.rays;
        nextRow = y1;
        picture.Apply();
    }

    void Restart()
    {
        nextRow = 0;
        rays = 0;
        if (hasSelected) Describe();
    }
    #endregion

    #region The tree of one pixel
    // The same Shade() that rendered the pixel, called again for it, then RayTree() lists the rays and each one's share of the color.
    string Text(Vector3 v)
    {
        CultureInfo inv = CultureInfo.InvariantCulture;
        return "(" + v.x.ToString("F3", inv) + ", " + v.y.ToString("F3", inv) + ", " + v.z.ToString("F3", inv) + ")";
    }

    void Describe()
    {
        CultureInfo inv = CultureInfo.InvariantCulture;
        RayLab.RayNode node = RayLab.TracePixel(scene, selectedX, selectedY, Options());
        RayLab.TreeResult result = RayLab.RayTree(node);
        string lines = "pixel (" + selectedX + ", " + selectedY + "): " + result.rays + " rays, " + result.shadowRays + " of them shadow rays\n";
        foreach (RayLab.TreeRow row in result.rows)
        {
            string indent = new string(' ', 2 * row.level);
            if (row.isShadow) lines += indent + "shadow ray: " + (row.node.shadow.blocked ? "blocked" : "reaches the light") + "\n";
            else lines += indent + row.kind + " ray hits " + row.node.material + ", weight " + row.weight.ToString("F3", inv) + ", accumulated "
                + row.accum.ToString("F3", inv) + ", adds " + Text(row.contribution) + "\n";
        }
        tree = lines + "pixel color " + Text(result.sum);
    }

    void Click()
    {
        Rect box = ImageRect();
        Vector3 mouse = Input.mousePosition;
        float u = (mouse.x - box.x) / box.width;
        float v = (Screen.height - mouse.y - box.y) / box.height;                    // mousePosition counts from the bottom
        if (u < 0f || u >= 1f || v < 0f || v >= 1f) return;
        selectedX = (int)(u * scene.camera.width);
        selectedY = (int)(v * scene.camera.height);
        hasSelected = true;
        Describe();
    }
    #endregion

    #region The BVH report
    // 200 triangles from a seeded Park-Miller generator, a ray along x, the median-split tree: the numbers the lab's BVH views show.
    int seed;

    float Next()
    {
        seed = (int)((long)seed * 16807L % 2147483647L);
        return seed / 2147483647f;
    }

    string BvhReport()
    {
        CultureInfo inv = CultureInfo.InvariantCulture;
        seed = 20261105;
        Vector3[][] tris = new Vector3[200][];
        for (int i = 0; i < 200; i++)
        {
            Vector3 c = new Vector3(Next() * 6f - 3f, Next() * 6f - 3f, Next() * 6f - 3f);
            tris[i] = new Vector3[3];
            for (int k = 0; k < 3; k++) tris[i][k] = c + new Vector3((Next() - 0.5f) * 0.45f, (Next() - 0.5f) * 0.45f, (Next() - 0.5f) * 0.45f);
        }
        Vector3 o = new Vector3(-5f, 0f, 0f);
        Vector3 d = new Vector3(1f, 0.05f, 0.02f).normalized;
        RayLab.Bvh bvh = RayLab.BuildBvh(tris, 4, 12, "median");
        RayLab.Traversal trace = RayLab.TraverseBvh(bvh, tris, o, d, true);
        RayLab.BruteResult brute = RayLab.BruteForce(tris, o, d);
        return "BVH over 200 triangles: " + bvh.nodeCount + " nodes; this ray: " + trace.boxTests + " box tests and " + trace.triTests
            + " triangle tests, against " + brute.tests + " triangle tests by brute force; "
            + (trace.t < Mathf.Infinity ? "nearest hit t = " + trace.t.ToString("F3", inv) : "the ray hits nothing");
    }
    #endregion

    #region Input: depth, epsilon, precision, mode, scene
    void Keys()
    {
        bool changed = true;
        if (Input.GetKeyDown(KeyCode.UpArrow)) maxDepth = Mathf.Min(maxDepth + 1, 4);
        else if (Input.GetKeyDown(KeyCode.DownArrow)) maxDepth = Mathf.Max(maxDepth - 1, 0);
        else if (Input.GetKeyDown(KeyCode.RightArrow)) epsExponent = Mathf.Min(epsExponent + 1, 0);
        else if (Input.GetKeyDown(KeyCode.LeftArrow)) epsExponent = Mathf.Max(epsExponent - 1, -10);
        else if (Input.GetKeyDown(KeyCode.S)) single = !single;
        else if (Input.GetKeyDown(KeyCode.M)) mode = mode == "offset" ? "tmin" : "offset";
        else if (Input.GetKeyDown(KeyCode.C))
        {
            sceneIndex = (sceneIndex + 1) % SceneNames.Length;
            scene = SceneNames[sceneIndex] == "chapter" ? RayLab.ChapterScene() : RayLab.AcneScene();
        }
        else if (Input.GetKeyDown(KeyCode.B)) report = BvhReport();
        else changed = false;
        if (changed) Restart();
    }
    #endregion

    #region The frame and the status line
    // Start, Update (keys, the click, a block of rows) and OnGUI (the image over the left of the screen, the tree on the right).
    Rect ImageRect()
    {
        return new Rect(10, 40, 576, 360);
    }

    void Start()
    {
        scene = RayLab.ChapterScene();
        picture = new Texture2D(scene.camera.width, scene.camera.height, TextureFormat.RGBA32, false);
        picture.filterMode = FilterMode.Point;
    }

    void Update()
    {
        Keys();
        if (Input.GetMouseButtonDown(0)) Click();
        if (nextRow < scene.camera.height) RenderBlock();
    }

    void OnGUI()
    {
        bool done = nextRow >= scene.camera.height;
        string epsText = epsExponent <= -10 ? "0" : "1e" + epsExponent;
        GUI.Label(new Rect(10, 8, Screen.width - 20, 30), SceneNames[sceneIndex] + " scene   depth " + maxDepth + "   epsilon " + epsText + " (" + mode
            + ")   hit points " + (single ? "32-bit" : "64-bit") + "   " + (done ? "done, " : "row " + nextRow + ", ") + rays + " rays   up/down left/right S M C B"
            + (report != "" ? "   " + report : ""));
        GUI.DrawTexture(ImageRect(), picture);
        GUI.Label(new Rect(600, 40, Screen.width - 610, Screen.height - 50), tree);
    }
    #endregion
}
