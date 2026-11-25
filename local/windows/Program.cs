using System;
using System.IO;
using System.Globalization;
using System.Linq;
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
            if (args.Length == 1 && args[0] == "--read-profile")
            {
                using (Wpd camera = Wpd.OpenSony())
                    Console.WriteLine(ProfileJson(camera.DeviceKey, SonyIso.Preview(camera.ReadData)));
                return 0;
            }
            if (args.Length > 0 && args[0] == "--write-profile")
            {
                WriteProfile(args);
                return 0;
            }

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

    internal static string ProfileJson(string id, SonyIso.Snapshot state)
    {
        if (!Regex.IsMatch(id, @"\A[0-9a-f]{64}\z")) throw new InvalidDataException("Ungültige Kamerakennung.");
        var result = new StringBuilder();
        result.Append("{\"id\":\"").Append(id).Append("\",\"guard\":\"").Append(state.ProfileGuard())
            .Append("\",\"mode\":\"").Append(state.Mode).Append("\",\"fields\":{");
        foreach (SonyIso.Field field in Enum.GetValues(typeof(SonyIso.Field)))
        {
            if (field != SonyIso.Field.Iso) result.Append(',');
            var cap = state.GetProfileField(field);
            result.Append('"').Append(field.ToString().ToLowerInvariant()).Append("\":{\"current\":")
                .Append(cap.Current.HasValue ? cap.Current.Value.ToString(CultureInfo.InvariantCulture) : "null")
                .Append(",\"choices\":[").Append(String.Join(",", cap.Choices.Select(n => n.ToString(CultureInfo.InvariantCulture))))
                .Append("],\"relative\":").Append(cap.Relative ? "true" : "false")
                .Append(",\"writable\":").Append(cap.Writable ? "true" : "false").Append('}');
        }
        return result.Append("}}").ToString();
    }

    private static void WriteProfile(string[] args)
    {
        uint expected, target;
        if (args.Length != 7 || !Regex.IsMatch(args[1], @"\A[0-9a-f]{64}\z") ||
            !Regex.IsMatch(args[6], @"\A[0-9a-f]{64}\z") ||
            (args[2] != "A" && args[2] != "M") ||
            !UInt32.TryParse(args[4], NumberStyles.None, CultureInfo.InvariantCulture, out expected) ||
            !UInt32.TryParse(args[5], NumberStyles.None, CultureInfo.InvariantCulture, out target))
            throw new InvalidOperationException("Ungültiger Profilauftrag für Windows.");
        SonyIso.Field field;
        switch (args[3])
        {
            case "iso": field = SonyIso.Field.Iso; break;
            case "aperture": field = SonyIso.Field.Aperture; break;
            case "shutter": field = SonyIso.Field.Shutter; break;
            default: throw new InvalidOperationException("Unbekanntes Profilfeld.");
        }
        Wpd camera = null;
        try
        {
            Func<SonyIso.Snapshot> open = delegate
            {
                if (camera != null) camera.Dispose();
                camera = null;
                camera = Wpd.OpenSony();
                RequireSameDevice(camera, args[1]);
                return SonyIso.Preview(camera.ReadData);
            };
            var start = open();
            uint result = SonyIso.WriteProfile(start, args[6], args[2], field, expected, target,
                (selected, dir) => camera.Step(selected, dir),
                () => SonyIso.Refresh(camera.ReadData), open, Thread.Sleep);
            Console.WriteLine(result.ToString(CultureInfo.InvariantCulture));
        }
        finally { if (camera != null) camera.Dispose(); }
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
