using UnityEngine;

// ShadingLabScene.cs: a disk and a sphere under one light, in Unity. ShadingLab.cs computes every pixel of both pictures; this
// script copies them into two textures and draws them side by side with GUI.DrawTexture.
// Setup: put this script on an empty GameObject and press Play. It is compiled against the course's stand-in for the Unity API
// (tools/unity-program-shim/) and has not been run in the Unity editor.
// Keys: left and right arrows swing the light, up and down raise and lower it, S toggles the shading between frozen and lit,
// T steps through the textures. The same scene, step for step, is scene.js in ../webgl/.
public class ShadingLabScene : MonoBehaviour
{
    #region The model: one light, two shapes, one texture
    const int Size = 256;
    static readonly string[] Textures = { "plain", "checker", "planet" };
    float az = 40f;
    float el = 35f;
    float amount = 0f;
    int texture = 2;
    const float Ka = 0.1f;
    Texture2D disk;
    Texture2D sphere;
    string summary = "";
    #endregion

    #region Two textures, each holding one picture
    void Start()
    {
        disk = new Texture2D(Size, Size, TextureFormat.RGBA32, false);
        sphere = new Texture2D(Size, Size, TextureFormat.RGBA32, false);
        Refresh();
    }

    // codes come top row first; a Texture2D counts rows from the bottom
    static void Fill(Texture2D target, int[] codes)
    {
        for (int row = 0; row < Size; row++)
        {
            for (int col = 0; col < Size; col++)
            {
                int at = (row * Size + col) * 3;
                target.SetPixel(col, Size - 1 - row, new Color(codes[at] / 255f, codes[at + 1] / 255f, codes[at + 2] / 255f, 1f));
            }
        }
        target.Apply();
    }
    #endregion

    #region Input
    void Refresh()
    {
        Vector3 L = ShadingLab.LightFromAngles(az, el);
        int[] a = ShadingLab.RenderPicture("disk", L, Ka, amount, 0f, Textures[texture], Size);
        int[] b = ShadingLab.RenderPicture("sphere", L, Ka, amount, 0f, Textures[texture], Size);
        Fill(disk, a);
        Fill(sphere, b);
        var row = ShadingLab.MiddleRow(L, Ka, amount, 81);
        summary = "light az " + az + " el " + el + "   shading " + amount + "   " + Textures[texture]
            + "   middle row: disk " + row.disk[0].ToString("F2") + ", sphere " + row.sphereLow.ToString("F2") + " to " + row.sphereHigh.ToString("F2")
            + "   pixels that differ " + ShadingLab.CountDifferent(a, b).count;
    }

    void Update()
    {
        bool changed = true;
        if (Input.GetKeyDown(KeyCode.LeftArrow)) az -= 10f;
        else if (Input.GetKeyDown(KeyCode.RightArrow)) az += 10f;
        else if (Input.GetKeyDown(KeyCode.UpArrow)) el = Mathf.Min(90f, el + 10f);
        else if (Input.GetKeyDown(KeyCode.DownArrow)) el = Mathf.Max(-90f, el - 10f);
        else if (Input.GetKeyDown(KeyCode.S)) amount = amount == 0f ? 1f : 0f;
        else if (Input.GetKeyDown(KeyCode.T)) texture = (texture + 1) % Textures.Length;
        else changed = false;
        if (changed) Refresh();
    }
    #endregion

    #region Draw
    void OnGUI()
    {
        float side = Mathf.Min(Screen.width / 2f - 30f, Screen.height - 80f);
        GUI.DrawTexture(new Rect(20f, 20f, side, side), disk);
        GUI.DrawTexture(new Rect(40f + side, 20f, side, side), sphere);
        GUI.Label(new Rect(20f, 30f + side, Screen.width - 40f, 40f), summary);
    }
    #endregion
}
