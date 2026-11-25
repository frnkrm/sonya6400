using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Text.RegularExpressions;

internal static class Program
{
    [MTAThread]
    private static int Main(string[] args)
    {
        Console.OutputEncoding = new UTF8Encoding(false);
        try
        {
            SonyIso.Field field;
            bool step;
            ParseCommand(args, out field, out step);
            if (step)
                Console.WriteLine("0x{0:X8}", StepAndConfirm(field, args[1]));
            else
            {
                using (Wpd camera = Wpd.OpenSony())
                {
                    var state = SonyIso.Preview(camera.ReadData);
                    uint? value = field == SonyIso.Field.Iso ? state.Iso : state.GetValue(field);
                    if (!value.HasValue) Console.WriteLine("unavailable");
                    else
                    {
                        string block = state.GetStepBlock(field);
                        // Preserve the existing ISO output for values outside normal ISO 400.
                        string suffix = block == null ? " " + camera.DeviceKey :
                            field == SonyIso.Field.Iso && value.Value != 400 ? "" : " !" + block;
                        Console.WriteLine("0x{0:X8}{1}", value.Value, suffix);
                    }
                }
            }
            return 0;
        }
        catch (Exception error)
        {
            // Erwartete Meldungen des Adapters enthalten nur Prüfschritt und Fehlercode.
            string message = error is InvalidOperationException || error is InvalidDataException
                ? error.Message
                : String.Format("Windows-Kameraabfrage fehlgeschlagen ({0}, 0x{1:X8}).",
                    error.GetType().Name, error.HResult);
            Console.Error.WriteLine("WPD: " + message);
            return 1;
        }
    }

    private static void ParseCommand(string[] args, out SonyIso.Field field, out bool step)
    {
        field = SonyIso.Field.Iso;
        step = false;
        if (args.Length == 0) return;
        switch (args[0])
        {
            case "--step-400-500": step = true; break;
            case "--read-aperture": field = SonyIso.Field.Aperture; break;
            case "--step-aperture": field = SonyIso.Field.Aperture; step = true; break;
            case "--read-shutter": field = SonyIso.Field.Shutter; break;
            case "--step-shutter": field = SonyIso.Field.Shutter; step = true; break;
            default: throw new InvalidOperationException("Unbekannter Windows-Kameraauftrag.");
        }
        if (args.Length != (step ? 2 : 1) || (step && !Regex.IsMatch(args[1], @"\A[0-9a-f]{64}\z")))
            throw new InvalidOperationException("Ungültige Parameter für den Windows-Kameraauftrag.");
    }

    private static uint StepAndConfirm(SonyIso.Field field, string expectedKey)
    {
        using (Wpd camera = Wpd.OpenSony())
        {
            RequireSameDevice(camera, expectedKey);
            uint? confirmed = SonyIso.Step(camera.ReadData, delegate { camera.StepUp(field); }, field);
            if (confirmed.HasValue) return confirmed.Value;
        }
        // v9 hardware observation: the screen showed 500 while this session still read 400.
        // Give the camera time to settle, then run the normal read handshake on a new handle.
        Thread.Sleep(750);
        using (Wpd camera = Wpd.OpenSony())
        {
            RequireSameDevice(camera, expectedKey);
            return SonyIso.ConfirmInFreshSession(camera.ReadData, field);
        }
    }

    private static void RequireSameDevice(Wpd camera, string expectedKey)
    {
        if (!String.Equals(camera.DeviceKey, expectedKey, StringComparison.Ordinal))
            throw new InvalidOperationException("Die Kamera hat sich seit der Vorschau geändert. Erneut lesen.");
    }
}
