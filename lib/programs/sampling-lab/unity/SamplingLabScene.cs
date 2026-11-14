using System.Globalization;
using UnityEngine;

// SamplingLabScene.cs: a zone plate, one pixel at a time, in Unity. SamplingLab.cs computes each pixel (ZonePixel: the mean of
// n x n samples inside it); this script puts the pixels in a Texture2D, ten rows per frame, and draws it with a status line.
// Setup: put this script on an empty GameObject and press Play. It is compiled against the course's stand-in for the Unity API
// (tools/unity-program-shim/) and has not been run in the Unity editor.
// Keys: up and down arrows change n (1 to 16, so 1 to 256 samples per pixel), J switches between a regular grid of samples and
// jittered ones. With one sample per pixel the rings beyond the radius where the pattern passes the Nyquist frequency are
// aliases; with more samples that region turns to gray.
// The same scene, step for step, is scene.js in ../webgl/.
public class SamplingLabScene : MonoBehaviour
{
    #region The texture and the settings
    const int Size = SamplingLab.ZoneSize;
    const int Scale = 3;                                  // each pixel of the plate is shown 3 x 3 screen pixels
    Texture2D plate;
    int n = 1;
    bool jitter = false;
    int row = 0;                                          // the next row to compute
    #endregion

    #region Rendering in chunks
    // A few rows per frame keep the game responsive when n is large: 16 x 16 samples is 256 per pixel, 10 million in all.
    void Restart()
    {
        row = 0;
    }

    void RenderRows(int rows)
    {
        for (int k = 0; k < rows && row < Size; k++)
        {
            for (int x = 0; x < Size; x++)
            {
                var pixel = SamplingLab.ZonePixel(x, row, n, jitter, Size, SamplingLab.ZoneK);
                plate.SetPixel(x, Size - 1 - row, new Color(pixel.value, pixel.value, pixel.value));     // Unity counts rows from the bottom
            }
            row += 1;
        }
        plate.Apply();
    }
    #endregion

    #region Input and the status line
    void Keys()
    {
        if (Input.GetKeyDown(KeyCode.UpArrow)) n = Mathf.Min(16, n + 1);
        else if (Input.GetKeyDown(KeyCode.DownArrow)) n = Mathf.Max(1, n - 1);
        else if (Input.GetKeyDown(KeyCode.J)) jitter = !jitter;
        else return;
        Restart();
    }

    string StatusText()
    {
        float radius = SamplingLab.ZoneRadius(0.5f, Size, SamplingLab.ZoneK);
        string done = row >= Size ? "" : "   rendering " + Mathf.RoundToInt(100f * row / Size) + " %";
        return n + " x " + n + " = " + n * n + " samples per pixel, " + (jitter ? "jittered" : "regular grid")
            + "   Nyquist along an axis at r = " + radius.ToString("F1", CultureInfo.InvariantCulture) + " px   up/down J" + done;
    }

    void Start()
    {
        plate = new Texture2D(Size, Size);
        plate.filterMode = FilterMode.Point;
        Restart();
    }

    void Update()
    {
        Keys();
        RenderRows(10);
    }

    void OnGUI()
    {
        GUI.DrawTexture(new Rect((Screen.width - Size * Scale) / 2, 12, Size * Scale, Size * Scale), plate);
        GUI.Label(new Rect(10, Screen.height - 50, Screen.width - 20, 40), StatusText());
    }
    #endregion
}
