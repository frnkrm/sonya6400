using System;
using System.IO;
using System.Text;

internal static class Program
{
    [MTAThread]
    private static int Main()
    {
        Console.OutputEncoding = new UTF8Encoding(false);
        try
        {
            using (Wpd camera = Wpd.OpenSony())
                Console.WriteLine(SonyIso.Read(camera.ReadData));
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
