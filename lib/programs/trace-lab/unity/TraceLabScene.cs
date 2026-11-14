using System.Diagnostics;
using UnityEngine;

// TraceLabScene.cs: the Cornell box of TraceLab.cs rendered twice in Unity, by Whitted's tracer and by the path tracer, side by side.
// TraceLab.cs computes; this script renders Whitted's image a few rows per frame and the path tracer's one pass at a time (each pass
// gives every pixel one more sample), in slices of a few milliseconds, copies both to Texture2Ds at the same exposure, and draws them
// and a status line in OnGUI. Nothing here needs a camera or a mesh: the pictures are the result.
// Setup: put this script on an empty GameObject and press Play. It is compiled against the course's stand-in for the Unity API
// (tools/unity-program-shim/) and has not been run in the Unity editor.
// Keys: S cycles Whitted's shadow rays (1, 4, 16, 64), L cycles the light's side (0, a point light; 0.3; 0.6; 1.0),
// N turns next-event estimation on and off, Space starts again. The path image stops at 1024 samples per pixel.
// The same scene, step for step, is scene.js in ../webgl/.
public class TraceLabScene : MonoBehaviour
{
    #region Settings
    // The images are WIDTH x HEIGHT pixels, 4:3. The camera is the path lab's: eye (0, 0, 5.2), looking down -z, a 42 degree field of view.
    const int Width = 64;
    const int Height = 48;
    const int Samples = 1024;
    const long SliceMs = 10;
    const float Exposure = 1.5f;
    static readonly int[] ShadowRays = { 1, 4, 16, 64 };
    static readonly float[] LightSides = { 0f, 0.3f, 0.6f, 1.0f };
    int shadowRays = 16;
    int light = 2;
    bool nee = true;
    TraceLab.RayCamera camera;
    #endregion

    #region The images
    // Whitted's image is finished row by row; the path image keeps the running sum of each pixel's samples and shows sum / passes.
    Texture2D whittedTexture;
    Texture2D pathTexture;
    Vector3[] sums = new Vector3[Width * Height];
    TraceLab.Scene scene;
    int row;
    int pass;
    int nextPixel;

    TraceLab.WhittedOptions WhittedOptions()
    {
        TraceLab.WhittedOptions options;
        options.maxDepth = 5;
        options.shadowRays = shadowRays;
        return options;
    }

    TraceLab.PathOptions PathOptions()
    {
        TraceLab.PathOptions options = new TraceLab.PathOptions();
        options.maxDepth = 6;
        options.roulette = "fixed";
        options.nee = nee;
        return options;
    }

    void Restart()
    {
        scene = TraceLab.MakeScene(0.3f, -0.5f, LightSides[light]);
        for (int i = 0; i < sums.Length; i++) sums[i] = Vector3.zero;
        row = 0;
        pass = 0;
        nextPixel = 0;
    }

    float ToByte(float value)
    {
        return Mathf.Pow(Mathf.Clamp01(value * Exposure), 1f / 2.2f);
    }

    // the texture's row 0 is the bottom, the image's row 0 is the top
    void PutPixel(Texture2D texture, int i, Vector3 color)
    {
        texture.SetPixel(i % Width, Height - 1 - i / Width, new Color(ToByte(color.x), ToByte(color.y), ToByte(color.z)));
    }
    #endregion

    #region The loop
    // A slice of work per frame: Whitted's rows first, then path samples; a path pass is drawn when it is complete.
    void Start()
    {
        camera = new TraceLab.RayCamera();
        camera.eye = new Vector3(0f, 0f, 5.2f);
        camera.look = Vector3.zero;
        camera.fovDeg = 42f;
        camera.width = Width;
        camera.height = Height;
        whittedTexture = new Texture2D(Width, Height);
        whittedTexture.filterMode = FilterMode.Point;
        pathTexture = new Texture2D(Width, Height);
        pathTexture.filterMode = FilterMode.Point;
        Restart();
    }

    void Update()
    {
        if (Input.GetKeyDown(KeyCode.S)) { shadowRays = ShadowRays[(System.Array.IndexOf(ShadowRays, shadowRays) + 1) % ShadowRays.Length]; Restart(); }
        else if (Input.GetKeyDown(KeyCode.L)) { light = (light + 1) % LightSides.Length; Restart(); }
        else if (Input.GetKeyDown(KeyCode.N)) { nee = !nee; Restart(); }
        else if (Input.GetKeyDown(KeyCode.Space)) Restart();
        Stopwatch clock = Stopwatch.StartNew();
        while (row < Height && clock.ElapsedMilliseconds < SliceMs)
        {
            TraceLab.RenderResult rendered = TraceLab.RenderRows(scene, camera, row, row + 1, WhittedOptions());
            for (int x = 0; x < Width; x++) PutPixel(whittedTexture, row * Width + x, new Vector3(rendered.pixels[3 * x], rendered.pixels[3 * x + 1], rendered.pixels[3 * x + 2]));
            row += 1;
        }
        whittedTexture.Apply();
        while (pass < Samples && clock.ElapsedMilliseconds < SliceMs)
        {
            int last = Mathf.Min(Width * Height, nextPixel + 32);
            TraceLab.PassResult traced = TraceLab.RenderPass(scene, camera, pass, nextPixel, last, PathOptions());
            for (int i = nextPixel; i < last; i++)
            {
                int at = (i - nextPixel) * 3;
                sums[i] = sums[i] + new Vector3(traced.pixels[at], traced.pixels[at + 1], traced.pixels[at + 2]);
            }
            nextPixel = last;
            if (nextPixel == Width * Height)
            {
                pass += 1;
                nextPixel = 0;
                for (int i = 0; i < Width * Height; i++) PutPixel(pathTexture, i, sums[i] / pass);
                pathTexture.Apply();
            }
        }
    }

    void OnGUI()
    {
        GUI.DrawTexture(new Rect(10, 10, 384, 288), whittedTexture);
        GUI.DrawTexture(new Rect(406, 10, 384, 288), pathTexture);
        GUI.Label(new Rect(10, 304, 900, 24), "light side " + LightSides[light] + ", Whitted " + shadowRays + " shadow rays per hit, next-event estimation "
            + (nee ? "on" : "off") + ": Whitted row " + row + " of " + Height + ", path tracer " + pass + " samples per pixel");
    }
    #endregion
}
