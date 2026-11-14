using System.Diagnostics;
using UnityEngine;

// VolumeLabScene.cs: a small volume of Gaussian blobs rendered one ray per pixel in Unity. VolumeLab.cs computes; this script makes the
// camera ray for each row of a 128 x 128 image, renders it with the volume-rendering sum in slices of a few milliseconds per frame,
// copies it to a Texture2D, and draws the texture and a status line in OnGUI. Nothing here needs a camera or a mesh.
// Setup: put this script on an empty GameObject and press Play. It is compiled against the course's stand-in for the Unity API
// (tools/unity-program-shim/) and has not been run in the Unity editor.
// Keys: N cycles the samples per ray (8, 16, 32, 64), S switches regular and stratified samples, B switches a black and a white
// background, A and D turn the camera, Space starts again.
// The same scene, step for step, is scene.js in ../webgl/.
public class VolumeLabScene : MonoBehaviour
{
    #region Settings
    // The render is SIZE x SIZE pixels, seen from DISTANCE with field of view FOV; each ray runs from NEAR to FAR.
    const int Size = 128;
    const float Fov = 0.6911f;
    const float Distance = 4f;
    const float Near = 2.2f;
    const float Far = 5.8f;
    const long SliceMs = 12;
    static readonly int[] Counts = { 8, 16, 32, 64 };
    static readonly float[] Blobs = {
        0.0f, 0.0f, 0.0f, 0.5f, 1.5f, 0.9f, 0.2f, 0.2f,
        0.5f, 0.3f, -0.2f, 0.35f, 3.0f, 0.2f, 0.9f, 0.3f,
        -0.45f, -0.25f, 0.3f, 0.3f, 5.0f, 0.3f, 0.4f, 0.95f,
    };
    int count = 2;
    bool stratified = false;
    bool white = false;
    float azimuth = 0.5f;
    #endregion

    #region The image
    // Per pixel: the color of its ray. The texture shows it as is, with 1.0 as full brightness.
    Texture2D texture;
    VolumeLab.Rng rng;
    int nextRow;

    void Restart()
    {
        rng = VolumeLab.MakeRng(1);
        nextRow = 0;
    }

    // Pixel (i, j) looks through the pixel's corner, as in the lecture's formula.
    VolumeLab.RayResult RenderPixel(int i, int j)
    {
        VolumeLab.CameraResult camera = VolumeLab.CameraRay(i, j, Size, Fov, azimuth, 0.3f, Distance);
        string mode = stratified ? "stratified" : "regular";
        Vector3 background = white ? new Vector3(1f, 1f, 1f) : new Vector3(0f, 0f, 0f);
        return VolumeLab.RenderVolumeRay(Blobs, camera.origin, camera.direction, Near, Far, Counts[count], mode, 0.5f, rng, background);
    }

    void RenderRow(int j)
    {
        for (int i = 0; i < Size; i++)
        {
            VolumeLab.RayResult ray = RenderPixel(i, j);
            // the texture's row 0 is the bottom, the image's row 0 is the top
            texture.SetPixel(i, Size - 1 - j, new Color(Mathf.Clamp01(ray.pixel.x), Mathf.Clamp01(ray.pixel.y), Mathf.Clamp01(ray.pixel.z)));
        }
    }
    #endregion

    #region The loop
    // A slice of rows per frame, then draw. When every row is done the work stops until a key changes something.
    void Start()
    {
        texture = new Texture2D(Size, Size);
        texture.filterMode = FilterMode.Point;
        Restart();
    }

    void Update()
    {
        if (Input.GetKeyDown(KeyCode.N)) { count = (count + 1) % Counts.Length; Restart(); }
        else if (Input.GetKeyDown(KeyCode.S)) { stratified = !stratified; Restart(); }
        else if (Input.GetKeyDown(KeyCode.B)) { white = !white; Restart(); }
        else if (Input.GetKeyDown(KeyCode.A)) { azimuth -= 0.2f; Restart(); }
        else if (Input.GetKeyDown(KeyCode.D)) { azimuth += 0.2f; Restart(); }
        else if (Input.GetKeyDown(KeyCode.Space)) Restart();
        Stopwatch clock = Stopwatch.StartNew();
        while (clock.ElapsedMilliseconds < SliceMs && nextRow < Size)
        {
            RenderRow(nextRow);
            nextRow += 1;
        }
        texture.Apply();
    }

    void OnGUI()
    {
        GUI.DrawTexture(new Rect(10, 10, 512, 512), texture);
        GUI.Label(new Rect(10, 530, 900, 24), Counts[count] + " samples per ray, " + (stratified ? "stratified" : "regular") + ", "
            + (white ? "white" : "black") + " background, " + (100 * nextRow / Size) + " % rendered");
    }
    #endregion
}
