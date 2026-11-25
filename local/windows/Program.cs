using System;
using System.IO;
using System.Text;

internal static class Program
{
    [MTAThread]
    private static int Main(string[] args)
    {
        Console.OutputEncoding = new UTF8Encoding(false);
        try
        {
            bool step = args.Length == 2 && args[0] == "--step-400-500";
            if (args.Length != 0 && (!step || !System.Text.RegularExpressions.Regex.IsMatch(args[1], @"\A[0-9a-f]{64}\z")))
                throw new InvalidOperationException("Unbekannter Windows-Kameraauftrag.");
            using (Wpd camera = Wpd.OpenSony())
            {
                if (step)
                {
                    if (!String.Equals(camera.DeviceKey, args[1], StringComparison.Ordinal))
                        throw new InvalidOperationException("Die Kamera hat sich seit der Vorschau geändert. Erneut lesen.");
                    uint confirmed = SonyIso.Step(camera.ReadData, camera.StepIsoUp);
                    Console.WriteLine("0x{0:X8}", confirmed);
                }
                else
                {
                    var state = SonyIso.Preview(camera.ReadData);
                    string preview = state.CanStep ? " " + camera.DeviceKey : "";
                    if (state.Iso == 400 && !state.CanStep) preview = " !" + state.StepBlock;
                    Console.WriteLine("0x{0:X8}{1}", state.Iso, preview);
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
}
