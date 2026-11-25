// Controlled payloads, no WPD/USB operations. Compile with local/windows/SonyIso.cs.
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

internal static class SonyIsoTests
{
    private static int passed;
    private static readonly byte[] Extended = Hex("c8 00 01 00 00 00 1e d2 00 00 00 00");

    private static byte[] Hex(string text)
    {
        return text.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(s => Convert.ToByte(s, 16)).ToArray();
    }

    private static byte[] All(params byte[][] records)
    {
        using (var bytes = new MemoryStream())
        using (var writer = new BinaryWriter(bytes))
        {
            writer.Write(records.Length);
            writer.Write(0);
            foreach (byte[] record in records) writer.Write(record);
            return bytes.ToArray();
        }
    }

    // Enumeration default 100. The current setting and available list occupy
    // separate fields. 0xD21E and the UINT32 representation are documented
    // in libgphoto2's sony-a6400.txt; these bytes are constructed examples.
    private static byte[] Iso(uint current)
    {
        using (var bytes = new MemoryStream())
        using (var writer = new BinaryWriter(bytes))
        {
            writer.Write(Hex("1e d2 06 00 00 02 64 00 00 00"));
            writer.Write(current);
            writer.Write(Hex("02 03 00 ff ff ff 00 90 01 00 00 e2 04 00 00"));
            return bytes.ToArray();
        }
    }

    private static string Read(byte[] properties)
    {
        return SonyIso.Read(delegate(ushort opcode, uint[] args)
        {
            if (opcode == 0x9202) return Extended;
            if (opcode == 0x9209) return properties;
            return new byte[8];
        });
    }

    private static void Check(bool value, string label)
    {
        if (!value) throw new Exception(label);
        passed++;
    }

    private static void Invalid(Action action, string label)
    {
        try { action(); }
        catch (InvalidDataException) { passed++; return; }
        throw new Exception("Expected invalid data: " + label);
    }

    private static void WpdSelection()
    {
        const string sony = @"USB\VID_054C&PID_0CAA\example";
        const string foreign = @"USB\VID_1234&PID_5678\example";
        var empty = new List<string>();
        var standard = new List<string> { "opaque" };
        var privateIds = new List<string> { "vendor-endpoint" };
        Func<string, string, bool> model = (endpoint, usb) => true;
        Func<string, string> resolve = id => id == "vendor-endpoint" ? sony : foreign;
        Check(Wpd.SelectEndpoint(standard, privateIds, resolve, model) == "vendor-endpoint", "private opaque Sony endpoint");
        Check(Wpd.SelectEndpoint(standard, privateIds, id => sony, model) == "opaque", "two aliases of one USB camera");
        Check(Wpd.SelectEndpoint(new List<string> { sony }, empty, id => null, model) == sony, "direct ID fallback");
        Check(Wpd.SelectEndpoint(standard, privateIds, id => sony, (id, usb) => id == "vendor-endpoint")
            == "vendor-endpoint", "only the alias with confirmed model");
        foreach (var probe in new Action[] {
            () => Wpd.SelectEndpoint(empty, empty, resolve, model),
            () => Wpd.SelectEndpoint(standard, privateIds, id => null, model),
            () => Wpd.SelectEndpoint(new List<string> { sony }, empty, id => foreign, model),
            () => Wpd.SelectEndpoint(standard, privateIds, id => sony + id, model),
            () => Wpd.SelectEndpoint(standard, privateIds, resolve, (id, usb) => false)
        }) {
            try { probe(); }
            catch (InvalidOperationException) { passed++; continue; }
            throw new Exception("WPD selected an unconfirmed endpoint");
        }
    }

    private static int Main()
    {
        var calls = new List<string>();
        string value = SonyIso.Read(delegate(ushort code, uint[] args)
        {
            calls.Add(code.ToString("X4") + "/" + String.Join(",", args));
            if (code == 0x9202) return Extended;
            if (code == 0x9209) return All(Iso(400));
            return new byte[8];
        });
        Check(calls.SequenceEqual(new[] { "9201/1,0,0", "9201/2,0,0", "9202/300", "9201/3,0,0", "9209/0" }), "session order");
        Check(value == "400", "camera current, not factory default or available value");
        Check(Read(All(Iso(0xFFFFFF))) == "auto", "Auto ISO sentinel");
        Check(Read(All(Iso(1250))) == "1250", "dump's numeric ISO 1250");
        Invalid(() => Read(All(Iso(0x01000190))), "MFNR is a distinct ISO mode");
        Invalid(() => Read(All(Iso(0))), "no ISO");
        Invalid(() => Read(All(Iso(204800))), "outside ILCE-6400 bounds");

        // A string contains D21E and an array contains 400. Neither is ISO.
        byte[] str = Hex("01 d2 ff ff 00 00 00 02 1e d2 00 00 00");
        byte[] array = Hex("02 d2 04 40 00 02 00 00 00 00 01 00 00 00 90 01 00");
        byte[] range = Hex("03 d2 04 00 00 01 01 00 02 00 01 00 00 64 00 01 00");
        Check(Read(All(array, range, str, Iso(800))) == "800", "typed offsets before ISO");
        Invalid(() => Read(All(array, range, str)), "missing property");
        Invalid(() => Read(All(Iso(400), Iso(800))), "duplicate property");
        byte[] truncated = All(Iso(400), array);
        Array.Resize(ref truncated, truncated.Length - 2);
        Invalid(() => Read(truncated), "truncated suffix after a valid ISO");
        Invalid(() => Read(All(Iso(400)).Concat(new byte[1]).ToArray()), "unexpected trailing bytes");
        Invalid(() => Read(All(Hex("1e d2 04 00 00 01 64 00 90 01 00"))), "wrong ISO type");
        Invalid(() => Read(All(Hex("02 d2 04 40 00 02 ff ff ff ff"))), "unbounded array length");
        Invalid(() => Read(Hex("01 00 00 00 00 00 00 00")), "missing record");
        Invalid(() => Read(null), "no payload");

        int extQueries = 0;
        Check(SonyIso.Read(delegate(ushort code, uint[] args)
        {
            if (code == 0x9202) return ++extQueries == 1 ? new byte[0] : Extended;
            return code == 0x9209 ? All(Iso(640)) : new byte[8];
        }) == "640" && extQueries == 2, "camera becoming ready");
        foreach (var invalidInfo in new[] { Hex("2c 01"), Hex("c8 00 ff ff ff ff") })
        {
            bool readProperties = false;
            Invalid(() => SonyIso.Read(delegate(ushort code, uint[] args)
            {
                if (code == 0x9202) return invalidInfo;
                if (code == 0x9209) readProperties = true;
                return new byte[8];
            }), "invalid extended-info response");
            Check(!readProperties, "incorrect protocol response stops before property read");
        }
        foreach(string id in new[]{@"USB\VID_054C&PID_0CAA\fake", @"\\?\usb#vid_054c&pid_0caa#fake",
            @"\\?\SWD#WPDBUSENUM#_??_USB#VID_054C&PID_0CAA#test", @"SWD\WPDBUSENUM\_??_USB\VID_054C&PID_0CAA&MI_00\test"})
            if (!Wpd.IsSonyUsbId(id)) throw new Exception("Expected Sony PnP ID");
        foreach(string id in new[]{null, "", @"USB\VID_054C&PID_0CAA1", @"USB\VID_054C&PID_0CAB",
            @"SWD\OTHER\_??_USB#VID_054C&PID_0CAA", @"USB\VID_ffff&PID_0CAA\USB\VID_054C&PID_0CAA"})
            if (Wpd.IsSonyUsbId(id)) throw new Exception("Unexpected Sony PnP ID");
        WpdSelection();
        Console.WriteLine("WPD: 10 device ID checks passed.");
        Console.WriteLine("Sony ISO / WPD selection: {0} checks passed.", passed);
        return 0;
    }
}
