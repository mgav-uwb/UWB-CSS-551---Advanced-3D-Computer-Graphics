using UnityEngine;

// ParticleLabScene.cs: one spring, stepped four ways, in Unity. ParticleLab.cs computes every step; this script draws five masses
// on five springs (the exact motion on top, then explicit Euler, semi-implicit Euler, Verlet and implicit Euler) and a status line.
// Setup: put this script on an empty GameObject and press Play. The camera should look along +z at the origin, orthographic, size
// 2.6. It is compiled against the course's stand-in for the Unity API (tools/unity-program-shim/) and has not been run in the
// Unity editor.
// Keys: space or right arrow takes one step, P plays and pauses, R starts again, up and down arrows change the step h by 0.01.
// A mass is drawn at most 3 m from its rest position, so an integrator that blows up leaves the picture and the status line keeps
// the number. A spring is drawn as a flat bar from the wall to the mass (the coil of the WebGL track is a line mesh).
// The same scene, step for step, is scene.js in ../webgl/.
public class ParticleLabScene : MonoBehaviour
{
    #region The model: one spring, five tracks
    // k = 100 N/m and m = 1 kg as on the lecture's slide, released from x = 1 m. Track 0 is the exact motion; tracks 1 to 4 are the
    // integrators, each a run of SpringStep or VerletStep from the same start.
    static readonly string[] Kinds = { "exact", "explicit", "semi", "verlet", "implicit" };
    static readonly Color[] Colors = {
        new Color(0.67f, 0.70f, 0.77f), new Color(1f, 0.48f, 0.45f), new Color(0.49f, 0.91f, 0.53f),
        new Color(0.34f, 0.83f, 0.86f), new Color(0.82f, 0.66f, 1f) };
    const double K = 100;
    const double M = 1;
    const double C = 0;
    const float Wall = -3f;
    double h = 0.1;
    int taken = 0;
    bool playing = false;
    float nextTick = 0f;
    string status = "";
    #endregion

    #region Five masses on five springs
    GameObject[] masses = new GameObject[5];
    GameObject[] bars = new GameObject[5];

    void Start()
    {
        for (int i = 0; i < Kinds.Length; i++)
        {
            float y = 1.9f - i * 0.95f;
            masses[i] = GameObject.CreatePrimitive(PrimitiveType.Cube);
            masses[i].transform.localScale = new Vector3(0.4f, 0.4f, 0.4f);
            masses[i].transform.position = new Vector3(0f, y, 0f);
            masses[i].GetComponent<MeshRenderer>().material.color = Colors[i];
            bars[i] = GameObject.CreatePrimitive(PrimitiveType.Cube);
            bars[i].GetComponent<MeshRenderer>().material.color = Colors[i];
        }
        Refresh();
    }
    #endregion

    #region Stepping
    // Each refresh reruns every integrator from the start for `taken` steps, so the picture is always the program's own run.
    void Refresh()
    {
        string line = "h = " + h.ToString("F2") + " s, step " + taken + ", t = " + (taken * h).ToString("F2") + " s";
        for (int i = 0; i < Kinds.Length; i++)
        {
            double x = 0;
            if (i == 0)
            {
                x = ParticleLab.ExactSpring(K, M, C, 1, 0, taken * h).x;
            }
            else
            {
                ParticleLab.Run run = ParticleLab.RunSpring(Kinds[i], K, M, C, h, 1, 0, taken);
                x = run.xs[taken];
                line += "   " + Kinds[i] + " x " + x.ToString("G3") + " E " + run.energies[taken].ToString("G3");
            }
            float shown = Mathf.Max(-3f, Mathf.Min(3f, (float)x));
            float massX = shown * 0.9f + 0.3f;
            float y = 1.9f - i * 0.95f;
            masses[i].transform.position = new Vector3(massX, y, 0f);
            bars[i].transform.position = new Vector3((Wall + massX) / 2f, y, 0f);
            bars[i].transform.localScale = new Vector3(massX - Wall - 0.4f, 0.05f, 0.05f);
        }
        status = line;
    }

    void Update()
    {
        bool changed = true;
        if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.RightArrow)) taken++;
        else if (Input.GetKeyDown(KeyCode.P)) playing = !playing;
        else if (Input.GetKeyDown(KeyCode.R)) taken = 0;
        else if (Input.GetKeyDown(KeyCode.UpArrow)) h = System.Math.Min(0.3, System.Math.Round(h + 0.01, 2));
        else if (Input.GetKeyDown(KeyCode.DownArrow)) h = System.Math.Max(0.01, System.Math.Round(h - 0.01, 2));
        else changed = false;
        if (playing && Time.time >= nextTick)
        {
            taken++;
            nextTick = Time.time + 0.25f;
            changed = true;
        }
        if (changed) Refresh();
    }
    #endregion

    #region Draw
    void OnGUI()
    {
        GUI.Label(new Rect(20f, 10f, Screen.width - 40f, 40f), status);
    }
    #endregion
}
