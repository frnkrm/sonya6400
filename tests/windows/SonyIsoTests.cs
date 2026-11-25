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

    private static byte[] Capabilities(uint current = 400, byte access = 0, byte enabled = 1,
        uint[] choices = null, ushort mode = 1, bool includeMode = true)
    {
        using (var bytes = new MemoryStream())
        using (var writer = new BinaryWriter(bytes))
        {
            writer.Write((ushort)0xD21E);
            writer.Write((ushort)6);
            writer.Write(access);
            writer.Write(enabled);
            writer.Write(100u);
            writer.Write(current);
            var values = choices ?? new uint[] { 0xFFFFFF, 320, 400, 500, 640, 0x01000190 };
            writer.Write((byte)2);
            writer.Write((ushort)values.Length);
            foreach (uint v in values) writer.Write(v);
            byte[] iso = bytes.ToArray();

            if (!includeMode) return All(iso);
            var program = Hex("0e 50 04 00 00 02 02 00 00 00 00");
            program[8] = (byte)mode;
            program[9] = (byte)(mode >> 8);
            return All(iso, program);
        }
    }

    private sealed class Session
    {
        private readonly Queue<byte[]> snapshots;
        internal readonly List<string> Commands = new List<string>();

        internal Session(params byte[][] data) { snapshots = new Queue<byte[]>(data); }

        internal byte[] Receive(ushort code, uint[] args)
        {
            Commands.Add(code.ToString("X4") + "/" + String.Join(",", args));
            switch (code)
            {
                case 0x9201: return new byte[8];
                case 0x9202: return Extended;
                case 0x9209: return snapshots.Dequeue();
                default: throw new Exception("Unexpected operation");
            }
        }

        internal void StepUp() { Commands.Add("step"); }
    }

    private static void StepTests()
    {
        string[] preview = { "9201/1,0,0", "9201/2,0,0", "9202/300", "9201/3,0,0", "9209/0" };
        var start = Capabilities();
        var target = Capabilities(500);
        Check(SonyIso.Preview(new Session(Capabilities(mode: 3)).Receive).StepBlock == "mode", "explain exposure mode");
        Check(SonyIso.Preview(new Session(Capabilities(enabled: 2)).Receive).StepBlock == "access", "explain access");
        Check(SonyIso.Preview(new Session(Capabilities(choices: new uint[] {400, 640})).Receive).StepBlock == "choices", "explain choices");
        foreach (byte flag in new byte[] {0, 1, 0x82})
        {
            var session = new Session(Capabilities(access: flag));
            var result = SonyIso.Preview(session.Receive);
            Check(result.Iso == 400 && result.ExposureMode == 1 && result.CanStep,
                "enabled ordinary Sony ISO / notch");
            Check(session.Commands.SequenceEqual(preview), "preview only reads");
        }
        foreach (var notReady in new[] {
            Capabilities(current: 500), Capabilities(current: 0x01000190), Capabilities(current: 0xFFFFFF),
            Capabilities(enabled: 0), Capabilities(enabled: 2), Capabilities(access: 0x81), Capabilities(mode: 3),
            Capabilities(includeMode: false), Capabilities(choices: new uint[] { 500, 400 }),
            Capabilities(choices: new uint[] { 400, 500, 500 }), Capabilities(choices: new uint[] { 400 }),
            Capabilities(choices: new uint[] { 400, 450, 500 }), Capabilities(choices: new uint[] { 400, 500, 450 }),
            Capabilities(choices: new uint[] { 400, 0x010001F4 }),
            All(Iso(400)), All(Iso(400), Hex("0e 50 04 00 00 00 00 00 01 00 00"))
        })
        {
            // A previously eligible preview cannot authorize a later ineligible session.
            var session = new Session(notReady);
            try
            {
                SonyIso.Step(session.Receive, session.StepUp);
                throw new Exception("Unexpected eligibility");
            }
            catch (InvalidOperationException) { Check(session.Commands.SequenceEqual(preview), "blocked before write"); }
        }

        var delayed = new Session(start, start, target);
        Check(SonyIso.Step(delayed.Receive, delayed.StepUp) == 500, "delayed readback");
        Check(delayed.Commands.SequenceEqual(preview.Concat(new[] {"step", "9209/0", "9209/0"})),
            "one write, same connection, no repeated handshake");
        foreach (var after in new[] { Capabilities(current: 640), Capabilities(current: 0x010001F4),
            Capabilities(current: 500, mode: 2), Capabilities(current: 500, includeMode: false) })
        {
            var session = new Session(start, after);
            try { SonyIso.Step(session.Receive, session.StepUp); throw new Exception("False confirmation"); }
            catch (InvalidOperationException) {
                Check(session.Commands.SequenceEqual(preview.Concat(new[] {"step", "9209/0"})),
                    "unexpected result stops without another write");
            }
        }
        var stale = new Session(start, start, start, start);
        Check(!SonyIso.Step(stale.Receive, stale.StepUp).HasValue, "old session cannot confirm 400 as success");
        Check(stale.Commands.SequenceEqual(preview.Concat(new[] {"step", "9209/0", "9209/0", "9209/0"})),
            "one write and bounded readbacks on unchanged ISO");
        var reopened = new Session(start, target);
        Check(SonyIso.ConfirmInFreshSession(reopened.Receive) == 500, "fresh M session confirms delayed fixed ISO");
        Check(reopened.Commands.SequenceEqual(preview.Concat(new[] {"9209/0"})), "fresh session only reads");
        foreach (var snapshots in new[] { new[] { start, start, start }, new[] { Capabilities(640) },
            new[] { Capabilities(0x010001F4) }, new[] { Capabilities(500, mode: 3) } })
        {
            var unchanged = new Session(snapshots);
            try { SonyIso.ConfirmInFreshSession(unchanged.Receive); throw new Exception("False fresh confirmation"); }
            catch (InvalidOperationException) { Check(!unchanged.Commands.Contains("step"), "unconfirmed fresh read"); }
        }
        var partial = new Session(start, Hex("01 00"));
        Invalid(() => SonyIso.Step(partial.Receive, partial.StepUp), "truncated readback");
        Check(partial.Commands.Count(c => c == "step") == 1, "no retry after partial read");
        var lost = new Session(start);
        try {
            SonyIso.Step(lost.Receive, delegate { lost.StepUp(); throw new IOException("USB disconnected"); });
            throw new Exception("Lost write response became success");
        }
        catch (IOException) { Check(lost.Commands.SequenceEqual(preview.Concat(new[] {"step"})), "lost acknowledgement"); }
    }

    private static byte[] ExposureField(SonyIso.Field field, uint value, byte form = 0,
        uint[] options = null, byte access = 0, byte enabled = 1)
    {
        // Native Sony units. Aperture is UINT16 hundredths; shutter is
        // UINT32 with numerator above denominator.
        bool aperture = field == SonyIso.Field.Aperture;
        using (var bytes = new MemoryStream())
        using (var writer = new BinaryWriter(bytes))
        {
            Action<uint> number = delegate(uint n)
            {
                if (aperture) writer.Write(checked((ushort)n)); else writer.Write(n);
            };
            writer.Write((ushort)(aperture ? 0x5007 : 0xD20D));
            writer.Write((ushort)(aperture ? 4 : 6));
            writer.Write(access);
            writer.Write(enabled);
            number(0);
            number(value);
            writer.Write(form);
            if (form == 2) writer.Write((ushort)options.Length);
            if (options != null) foreach (uint n in options) number(n);
            return bytes.ToArray();
        }
    }

    private static void ExposureStepTests()
    {
        byte[] manual = Hex("0e 50 04 00 00 02 02 00 01 00 00");
        byte[] otherMode = Hex("0e 50 04 00 00 02 02 00 03 00 00");
        foreach (var field in new[] {SonyIso.Field.Aperture, SonyIso.Field.Shutter})
        {
            bool aperture = field == SonyIso.Field.Aperture;
            uint start = aperture ? 800u : 0x0001007Du;
            uint target = aperture ? 900u : 0x000100A0u;
            uint inside = aperture ? 850u : 0x0001008Cu;
            uint other = aperture ? 1100u : 0x000100FAu;
            uint wide = aperture ? ushort.MaxValue : uint.MaxValue;
            var plain = ExposureField(field, start);
            var range = ExposureField(field, start, 1, new[] {0u, wide, 1u});
            var targetRecord = ExposureField(field, target);
            Check(SonyIso.Preview(new Session(All(plain, manual)).Receive).GetValue(field) == start,
                "read raw exposure even if ISO is absent");
            foreach (var allow in new[] {plain, range, ExposureField(field, start, 2, new[] {start, target, other}),
                ExposureField(field, start, 2, new[] {other, target, start})})
            {
                var before = All(allow, manual);
                var eligible = SonyIso.Preview(new Session(before).Receive);
                Check(eligible.GetStepBlock(field) == null, "valid enabled manual stop");
                var session = new Session(before, All(targetRecord, manual));
                Check(SonyIso.Step(session.Receive, session.StepUp, field) == target
                    && session.Commands.Count(c => c == "step") == 1, "relative step with exact readback");
            }
            foreach (var invalid in new[] {
                ExposureField(field, start, 2, new uint[0]),
                ExposureField(field, start, 2, new[] {start, other}),
                ExposureField(field, start, 2, new[] {start, inside, target}),
                ExposureField(field, start, 2, new[] {start, target, start}),
                ExposureField(field, start, 2, new[] {start, target, inside}),
                ExposureField(field, start, 1, new[] {0u, wide, 2u}),
                ExposureField(field, start, 1, new[] {start, start, 1u})
            }) {
                var session = new Session(All(invalid, manual));
                Check(SonyIso.Preview(session.Receive).GetStepBlock(field) == "choices", "respect reported limits");
            }
            var noAccess = SonyIso.Preview(new Session(All(ExposureField(field, start, enabled: 2), manual)).Receive);
            Check(noAccess.GetStepBlock(field) == "access", "display-only property");
            Check(SonyIso.Preview(new Session(All(plain, otherMode)).Receive).GetStepBlock(field) == "mode", "M required");
            foreach (var blocked in new[] {
                All(manual), All(plain, plain, manual), All(plain, otherMode), All(plain),
                All(targetRecord, manual), All(ExposureField(field, start, access: 0x81), manual)
            }) {
                var session = new Session(blocked);
                try { SonyIso.Step(session.Receive, session.StepUp, field); throw new Exception("Unexpected write"); }
                catch (InvalidOperationException) { Check(!session.Commands.Contains("step"), "blocked before write"); }
            }
            var wrong = new Session(All(plain, manual), All(ExposureField(field, other), manual));
            try { SonyIso.Step(wrong.Receive, wrong.StepUp, field); throw new Exception("Unexpected confirmation"); }
            catch (InvalidOperationException) { Check(wrong.Commands.Count(c => c == "step") == 1, "no second step"); }
            foreach (var mismatch in new[] {All(targetRecord, otherMode), All(manual), All(ExposureField(field, other), manual)})
            {
                var session = new Session(mismatch);
                try { SonyIso.ConfirmInFreshSession(session.Receive, field); throw new Exception("Unexpected fresh confirmation"); }
                catch (InvalidOperationException) { Check(!session.Commands.Contains("step"), "fresh check is read only"); }
            }
            var fresh = new Session(All(plain, manual), All(targetRecord, manual));
            Check(SonyIso.ConfirmInFreshSession(fresh.Receive, field) == target, "fresh session delayed confirmation");
        }
        var apertureField = SonyIso.Field.Aperture;
        var changed = new Session(All(manual, ExposureField(apertureField, 800)), All(manual, ExposureField(apertureField, 950)));
        try { SonyIso.Step(changed.Receive, changed.StepUp, apertureField); throw new Exception("Unexpected f/9.5 confirmation"); }
        catch (InvalidOperationException error) {
            Check(error.Message.Contains("f/9,5") && error.Message.Contains("Erwartet war f/9.")
                && changed.Commands.Count(c => c == "step") == 1, "report actual aperture after one step");
        }
        const SonyIso.Field shutter = SonyIso.Field.Shutter;
        // 2/250 and 2/320 are the same times as 1/125 and 1/160.
        var equivalent = new Session(All(manual, ExposureField(shutter, 0x000200FA, 2,
            new uint[] { 0, 0x000200FA, 0x00020140 })), All(manual, ExposureField(shutter, 0x00020140)));
        Check(SonyIso.Step(equivalent.Receive, equivalent.StepUp, shutter) == 0x00020140,
            "equivalent fractions confirm the actual raw value");
        foreach (var unavailable in new uint[] {0, 0x00010000, 0x0000007D})
        {
            var state = SonyIso.Preview(new Session(All(manual, ExposureField(shutter, unavailable))).Receive);
            Check(state.GetValue(shutter) == unavailable && state.GetStepBlock(shutter) == "value",
                "bulb or invalid fraction remains read only");
        }
        var missing = SonyIso.Preview(new Session(All(manual, Iso(400))).Receive);
        Check(!missing.GetValue(shutter).HasValue && missing.GetStepBlock(shutter) == "value", "missing control is unavailable");
        // A malformed optional type with a valid PTP layout must not prevent the established ISO read.
        byte[] otherType = Hex("07 50 06 00 00 01 00 00 00 00 20 03 00 00 00");
        Check(Read(All(Iso(400), otherType, manual)) == 400, "independent ISO read");
        var wrongType = SonyIso.Preview(new Session(All(otherType, manual)).Receive);
        Check(!wrongType.GetValue(SonyIso.Field.Aperture).HasValue, "aperture requires UINT16");
    }

    private static uint Read(byte[] properties)
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
        Func<bool> absent = () => false;
        Check(Wpd.SelectEndpoint(standard, privateIds, empty, resolve, model, absent) == "vendor-endpoint", "private opaque Sony endpoint");
        Check(Wpd.SelectEndpoint(standard, privateIds, empty, id => sony, model, absent) == "opaque", "two aliases of one USB camera");
        Check(Wpd.SelectEndpoint(new List<string> { sony }, empty, empty, id => null, model, absent) == sony, "direct ID fallback");
        Check(Wpd.SelectEndpoint(standard, privateIds, empty, id => sony, (id, usb) => id == "vendor-endpoint", absent)
            == "vendor-endpoint", "only the alias with confirmed model");

        // The Windows report for b10226a: both manager lists are empty, PnP registers GUID_DEVINTERFACE_WPD.
        var pnp = Wpd.DecodeInterfaces("other-interface\0sony-interface\0\0".ToCharArray());
        Func<string, string> ancestor = id => id == "sony-interface" ? sony : foreign;
        Check(Wpd.SelectEndpoint(empty, empty, pnp, ancestor, model, absent) == "sony-interface", "PnP-only α6400");
        Check(Wpd.SelectEndpoint(standard, empty, pnp, id => sony, model, absent) == "opaque", "same camera in manager and PnP");
        Check(Wpd.DecodeInterfaces(new char[1]).Count == 0, "empty MULTI_SZ");
        Invalid(() => Wpd.DecodeInterfaces("incomplete\0".ToCharArray()), "missing final terminator");
        try {
            Wpd.SelectEndpoint(empty, empty, empty, ancestor, model, () => true);
            throw new Exception("An inactive registration became selectable");
        } catch (InvalidOperationException error) {
            Check(error.Message.Contains("inaktive"), "registered but inactive WPD endpoint");
        }
        foreach (var probe in new Action[] {
            () => Wpd.SelectEndpoint(empty, empty, empty, resolve, model, absent),
            () => Wpd.SelectEndpoint(standard, privateIds, empty, id => null, model, absent),
            () => Wpd.SelectEndpoint(new List<string> { sony }, empty, empty, id => foreign, model, absent),
            () => Wpd.SelectEndpoint(standard, privateIds, empty, id => sony + id, model, absent),
            () => Wpd.SelectEndpoint(standard, privateIds, empty, resolve, (id, usb) => false, absent),
            () => Wpd.SelectEndpoint(empty, empty, pnp, id => sony + id, model, absent),
            () => Wpd.SelectEndpoint(empty, empty, pnp, id => foreign, model, absent),
            () => Wpd.SelectEndpoint(empty, empty, pnp, ancestor, (id, usb) => false, absent)
        }) {
            try { probe(); }
            catch (InvalidOperationException) { passed++; continue; }
            throw new Exception("WPD selected an unconfirmed endpoint");
        }
    }

    private static int Main()
    {
        var calls = new List<string>();
        uint value = SonyIso.Read(delegate(ushort code, uint[] args)
        {
            calls.Add(code.ToString("X4") + "/" + String.Join(",", args));
            if (code == 0x9202) return Extended;
            if (code == 0x9209) return All(Iso(400));
            return new byte[8];
        });
        Check(calls.SequenceEqual(new[] { "9201/1,0,0", "9201/2,0,0", "9202/300", "9201/3,0,0", "9209/0" }), "session order");
        Check(value == 400, "camera current, not factory default or available value");
        Check(Read(All(Iso(0xFFFFFF))) == 0xFFFFFF, "Auto ISO sentinel");
        Check(Read(All(Iso(1250))) == 1250, "dump's numeric ISO 1250");
        Check(Read(All(Iso(0x01000190))) == 0x01000190, "preserve MFNR mode byte");
        Check(Read(All(Iso(0))) == 0, "preserve unspecified value for diagnostics");
        Check(Read(All(Iso(204800))) == 204800, "preserve extended readout");
        Check(Read(All(Iso(UInt32.MaxValue))) == UInt32.MaxValue, "preserve all bits of an unknown response");

        // A string contains D21E and an array contains 400. Neither is ISO.
        byte[] str = Hex("01 d2 ff ff 00 00 00 02 1e d2 00 00 00");
        byte[] array = Hex("02 d2 04 40 00 02 00 00 00 00 01 00 00 00 90 01 00");
        byte[] range = Hex("03 d2 04 00 00 01 01 00 02 00 01 00 00 64 00 01 00");
        Check(Read(All(array, range, str, Iso(800))) == 800, "typed offsets before ISO");
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
        }) == 640 && extQueries == 2, "camera becoming ready");
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
        StepTests();
        ExposureStepTests();
        if (Environment.OSVersion.Platform == PlatformID.Win32NT)
            Console.WriteLine("Windows Configuration Manager: {0} active WPD interfaces.", Wpd.PnpInterfaces(false).Count);
        Console.WriteLine("WPD: 10 device ID checks passed.");
        Console.WriteLine("Sony ISO / WPD selection: {0} checks passed.", passed);
        return 0;
    }
}
