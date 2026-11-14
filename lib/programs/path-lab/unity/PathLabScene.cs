using System.Diagnostics;
using UnityEngine;

// PathLabScene.cs: a Cornell box path-traced in Unity, progressively. PathLab.cs computes; this script traces one sample at a
// time for each pixel of a 128 x 128 image in slices of a few milliseconds per frame, keeps the running mean of each pixel,
// copies it to a Texture2D, and draws the texture and a status line in OnGUI. Nothing here needs a camera or a mesh.
// Setup: put this script on an empty GameObject and press Play. It is compiled against the course's stand-in for the Unity API
// (tools/unity-program-shim/) and has not been run in the Unity editor.
// Keys: D cycles the maximum depth (0 to 8), R cycles Russian roulette (off, q = 0.7, q = throughput), N turns next-event
// estimation on and off, L cycles the light's size, Space starts again. The render stops at 256 samples per pixel.
// The same scene, step for step, is scene.js in ../webgl/.
public class PathLabScene : MonoBehaviour
{
    #region Settings
    // The render is SIZE x SIZE pixels. Each pixel gets one more sample per pass, up to SAMPLES.
    const int Size = 128;
    const int Samples = 256;
    const long SliceMs = 12;
    const float Exposure = 2.2f;
    static readonly string[] RouletteModes = { "off", "fixed", "throughput" };
    static readonly float[] LightSides = { 0.25f, 0.5f, 1.0f };
    int maxDepth = 6;
    string roulette = "fixed";
    bool nee = true;
    int light = 1;
    #endregion

    #region The image
    // Per pixel: the running sum of the sample colors (r, g, b) and how many samples it has. The texture shows sum / count.
    Texture2D texture;
    Vector3[] sums = new Vector3[Size * Size];
    int[] counts = new int[Size * Size];
    PathLab.Scene scene;
    PathLab.Rng rng;
    int nextPixel;
    long rays;
    long samples;

    void Restart()
    {
        scene = PathLab.MakeCornell(LightSides[light]);
        rng = PathLab.MakeRng(1);
        for (int i = 0; i < sums.Length; i++) { sums[i] = Vector3.zero; counts[i] = 0; }
        nextPixel = 0;
        rays = 0;
        samples = 0;
    }

    PathLab.PathOptions MakeOptions()
    {
        PathLab.PathOptions options = new PathLab.PathOptions();
        options.maxDepth = maxDepth;
        options.roulette = roulette;
        options.nee = nee;
        options.clamp = 0f;
        options.forced = null;
        return options;
    }

    // One sample for the next pixel in the list; a pass is complete when every pixel has one more.
    void TraceNext()
    {
        int x = nextPixel % Size;
        int y = nextPixel / Size;
        var ray = PathLab.CameraRay(x, y, Size, PathLab.NextRandom(rng), PathLab.NextRandom(rng));
        PathLab.PathResult path = PathLab.TracePath(scene, ray.origin, ray.direction, rng, MakeOptions());
        sums[nextPixel] = sums[nextPixel] + path.radiance;
        counts[nextPixel] += 1;
        rays += path.rays;
        samples += 1;
        nextPixel = (nextPixel + 1) % (Size * Size);
    }

    float ToByte(float value)
    {
        return Mathf.Pow(Mathf.Clamp01(value * Exposure), 1f / 2.2f);
    }

    void Paint()
    {
        for (int i = 0; i < Size * Size; i++)
        {
            Vector3 mean = sums[i] / Mathf.Max(1, counts[i]);
            // the texture's row 0 is the bottom, the image's row 0 is the top
            texture.SetPixel(i % Size, Size - 1 - i / Size, new Color(ToByte(mean.x), ToByte(mean.y), ToByte(mean.z)));
        }
        texture.Apply();
    }
    #endregion

    #region The loop
    // A slice of work per frame, then draw. When every pixel has SAMPLES samples the work stops.
    void Start()
    {
        texture = new Texture2D(Size, Size);
        texture.filterMode = FilterMode.Point;
        Restart();
    }

    void Update()
    {
        if (Input.GetKeyDown(KeyCode.D)) { maxDepth = (maxDepth + 1) % 9; Restart(); }
        else if (Input.GetKeyDown(KeyCode.R)) { roulette = RouletteModes[(System.Array.IndexOf(RouletteModes, roulette) + 1) % 3]; Restart(); }
        else if (Input.GetKeyDown(KeyCode.N)) { nee = !nee; Restart(); }
        else if (Input.GetKeyDown(KeyCode.L)) { light = (light + 1) % LightSides.Length; Restart(); }
        else if (Input.GetKeyDown(KeyCode.Space)) Restart();
        Stopwatch clock = Stopwatch.StartNew();
        while (clock.ElapsedMilliseconds < SliceMs && counts[nextPixel] < Samples) TraceNext();
        Paint();
    }

    void OnGUI()
    {
        GUI.DrawTexture(new Rect(10, 10, 512, 512), texture);
        float perPixel = (float)samples / (Size * Size);
        float perSample = (float)rays / Mathf.Max(1, (int)samples);
        GUI.Label(new Rect(10, 530, 900, 24), "depth " + maxDepth + ", roulette " + roulette + ", next-event " + (nee ? "on" : "off")
            + ", light " + LightSides[light] + " wide: " + perPixel.ToString("F1") + " samples per pixel, " + perSample.ToString("F2") + " rays per sample");
    }
    #endregion
}
