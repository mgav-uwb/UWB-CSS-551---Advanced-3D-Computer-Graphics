using UnityEngine;

// ImageLabScene.cs: a generated 64 by 64 color picture beside its JPEG. ImageLab.cs computes; this script copies the picture and the decoded
// result into two Texture2D objects on two quads and writes a status line with the measured size and the PSNR.
// Setup: put this script on an empty GameObject and press Play. (A camera is made if the scene has none.) It is compiled against the course's
// stand-in for the Unity API (tools/unity-program-shim/) and has not been run in the Unity editor.
// Keys: up and down arrows change the quality by 5 (1 to 100), C switches the color planes between 4:2:0 and 4:4:4 (the Input Manager:
// Project Settings > Player > Active Input Handling, "Both" or "Input Manager (Old)").
// Each picture is a quad with a point-filtered texture, so every pixel is a visible square. The camera is orthographic. Unity's texture rows run
// bottom to top, so the rows are written flipped to match scene.js in ../webgl/. The same scene, step for step, is scene.js.
public class ImageLabScene : MonoBehaviour
{
    #region The picture and its JPEG
    // ImageLab.cs makes the picture (0 to 1) and JpegColor codes it (0 to 255). The right-hand texture is rebuilt on every key.
    const int Size = 64;
    ImageLab.ColorPlanes picture;
    int quality = 50;
    bool subsample = true;
    Texture2D originalTexture;
    Texture2D codedTexture;
    string status = "";

    Texture2D MakeTexture(double[] r, double[] g, double[] b, double scale)
    {
        Texture2D texture = new Texture2D(Size, Size, TextureFormat.RGBA32, false);
        for (int y = 0; y < Size; y++)
        {
            for (int x = 0; x < Size; x++)
            {
                int k = (Size - 1 - y) * Size + x;
                texture.SetPixel(x, y, new Color((float)(r[k] * scale), (float)(g[k] * scale), (float)(b[k] * scale), 1f));
            }
        }
        texture.filterMode = FilterMode.Point;
        texture.Apply();
        return texture;
    }

    double[] Scaled(double[] plane, double scale)
    {
        double[] result = new double[plane.Length];
        for (int k = 0; k < plane.Length; k++) result[k] = plane[k] * scale;
        return result;
    }

    void Code()
    {
        ImageLab.ColorResult j = ImageLab.JpegColor(Scaled(picture.r, 255), Scaled(picture.g, 255), Scaled(picture.b, 255), Size, Size, quality, subsample);
        codedTexture = MakeTexture(j.r, j.g, j.b, 1.0 / 255.0);
        codedQuad.GetComponent<MeshRenderer>().material.mainTexture = codedTexture;
        status = "quality " + quality + (subsample ? "  4:2:0" : "  4:4:4") + "   " + j.bitsPerPixel.ToString("F2")
            + " bits per pixel (24 uncompressed), ratio " + j.ratio.ToString("F1") + " : 1, PSNR " + j.psnr.ToString("F1") + " dB   up/down: quality   C: chroma";
    }
    #endregion

    #region Quads, camera and input
    GameObject originalQuad;
    GameObject codedQuad;

    GameObject MakeQuad(float x, Texture2D texture)
    {
        GameObject quad = GameObject.CreatePrimitive(PrimitiveType.Quad);
        quad.transform.position = new Vector3(x, 0f, 0f);
        Material material = new Material(Shader.Find("Unlit/Texture"));
        material.mainTexture = texture;
        quad.GetComponent<MeshRenderer>().material = material;
        return quad;
    }

    void Start()
    {
        picture = ImageLab.MakeColorScene(Size);
        originalTexture = MakeTexture(picture.r, picture.g, picture.b, 1.0);
        codedTexture = originalTexture;
        Camera cam = Camera.main != null ? Camera.main : new GameObject("camera").AddComponent<Camera>();
        cam.orthographic = true;
        cam.orthographicSize = 0.66f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.043f, 0.047f, 0.063f);
        cam.transform.position = new Vector3(0f, 0f, -2f);
        originalQuad = MakeQuad(-0.55f, originalTexture);
        codedQuad = MakeQuad(0.55f, codedTexture);
        Code();
    }

    void Update()
    {
        if (Input.GetKeyDown(KeyCode.UpArrow)) quality = Mathf.Min(100, quality + 5);
        else if (Input.GetKeyDown(KeyCode.DownArrow)) quality = Mathf.Max(1, quality - 5);
        else if (Input.GetKeyDown(KeyCode.C)) subsample = !subsample;
        else return;
        Code();
    }

    void OnGUI()
    {
        GUI.Label(new Rect(10, Screen.height - 50, Screen.width - 20, 40), status);
    }
    #endregion
}
