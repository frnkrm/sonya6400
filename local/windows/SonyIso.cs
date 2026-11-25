// Sony SDIO v200. Wpd.OpenSony must verify the ILCE-6400 model and its PC
// Remote USB VID/PID. The transport checks command/transfer response codes.
// Protocol: https://github.com/qkhanhpro/simplealphadroid/blob/197c206/docs/PROTOCOL.md
// ISO encoding: libgphoto2/camlibs/ptp2/config.c, _stringify_Sony_ISO.
using System;
using System.IO;
using System.Globalization;
using System.Threading;

internal static class SonyIso
{
    internal enum Field { Iso, Aperture, Shutter }

    private const int MaxPayload = 4 * 1024 * 1024;
    private const uint ManualExposure = 1;

    private sealed class StepRule
    {
        internal readonly Field Kind;
        internal readonly ushort Code, Type;
        internal readonly uint Start, Target;
        internal readonly string Label;

        internal StepRule(Field field, ushort code, ushort type, uint start, uint target, string label)
        {
            Kind = field;
            Code = code;
            Type = type;
            Start = start;
            Target = target;
            Label = label;
        }

        internal bool IsNumeric(uint raw)
        {
            if (Kind == Field.Shutter) return (raw >> 16) != 0 && (raw & 0xffff) != 0;
            return raw != 0;
        }

        internal int Compare(uint first, uint second)
        {
            if (Kind != Field.Shutter) return first.CompareTo(second);
            // Faster is the +1 direction. Equivalent fractions compare exactly.
            uint a = (first >> 16) * (second & 0xffff);
            uint b = (second >> 16) * (first & 0xffff);
            return b.CompareTo(a);
        }

        internal string FormatReading(uint? raw)
        {
            if (!raw.HasValue) return "kein eindeutiger Wert";
            uint value = raw.Value;
            if (Kind == Field.Aperture && value > 0 && value != ushort.MaxValue)
                return "f/" + (value / 100m).ToString("0.##", CultureInfo.GetCultureInfo("de-DE"));
            if (Kind == Field.Shutter && value == 0) return "BULB";
            if (Kind == Field.Shutter && IsNumeric(value) && value != uint.MaxValue)
                return (value >> 16) + "/" + (value & 0xffff) + " s";
            if (Kind == Field.Iso && value > 0 && value < 0xffffff) return "ISO " + value;
            return "Rohwert 0x" + value.ToString("X8");
        }

        internal bool EqualsValue(uint? raw, uint target)
        {
            return raw.HasValue && IsNumeric(raw.Value) && Compare(raw.Value, target) == 0;
        }
    }

    private static readonly StepRule[] Rules = {
        new StepRule(Field.Iso, 0xD21E, 6, 400, 500, "ISO 400 → 500"),
        new StepRule(Field.Aperture, 0x5007, 4, 800, 900, "Blende f/8 → f/9"),
        new StepRule(Field.Shutter, 0xD20D, 6, 0x10000 | 125, 0x10000 | 160, "Zeit 1/125 s → 1/160 s")
    };

    internal sealed class Snapshot
    {
        private readonly uint?[] values;
        private readonly string[] capabilityBlocks;
        public readonly uint ExposureMode;

        internal Snapshot(uint?[] values, string[] capabilityBlocks, uint mode)
        {
            this.values = values;
            this.capabilityBlocks = capabilityBlocks;
            ExposureMode = mode;
        }

        public uint? GetValue(Field field) { return values[(int)field]; }

        public string GetStepBlock(Field field)
        {
            StepRule rule = Rules[(int)field];
            if (!rule.EqualsValue(GetValue(field), rule.Start)) return "value";
            if (ExposureMode != ManualExposure) return "mode";
            return capabilityBlocks[(int)field];
        }

        public uint Iso
        {
            get
            {
                uint? value = GetValue(Field.Iso);
                if (!value.HasValue) throw new InvalidDataException("Die Kamera meldet keinen eindeutigen aktuellen Sony-ISO-Wert.");
                return value.Value;
            }
        }
        public string StepBlock { get { string block = GetStepBlock(Field.Iso); return block == "value" ? "iso" : block; } }
        public bool CanStep { get { return StepBlock == null; } }
    }

    internal static uint Read(Func<ushort, uint[], byte[]> receive)
    {
        return Preview(receive).Iso;
    }

    internal static Snapshot Preview(Func<ushort, uint[], byte[]> receive)
    {
        if (receive == null) throw new ArgumentNullException("receive");

        // Three session phases, with exactly one protocol-version argument
        // in the intervening query as used by the ILCE-6400 USB client.
        receive(0x9201, new uint[] { 1, 0, 0 });
        receive(0x9201, new uint[] { 2, 0, 0 });
        for (int attempt = 0; ; attempt++)
        {
            byte[] info = receive(0x9202, new uint[] { 300 });
            if (info != null && info.Length != 0 && HasDeviceInfo(info)) break;
            if (attempt == 2)
                throw new InvalidDataException("Die Kamera hat keine Sony-Protokollinformationen gemeldet.");
            Thread.Sleep(100);
        }
        receive(0x9201, new uint[] { 3, 0, 0 });
        return ParseSnapshot(receive(0x9209, new uint[] { 0 }));
    }

    // Null means the write was acknowledged but all reads still showed the starting value.
    internal static uint? Step(Func<ushort, uint[], byte[]> receive, Action stepUp, Field field = Field.Iso)
    {
        if (stepUp == null) throw new ArgumentNullException("stepUp");
        StepRule rule = Rules[(int)field];
        Snapshot before = Preview(receive);
        if (before.GetStepBlock(field) != null)
            throw new InvalidOperationException("Schreibtest gesperrt für " + rule.Label + ". Kameramodus, Istwert und Freigabe prüfen.");

        stepUp();
        return PollStepResult(receive, ParseSnapshot(receive(0x9209, new uint[] { 0 })), rule);
    }

    internal static uint ConfirmInFreshSession(Func<ushort, uint[], byte[]> receive, Field field = Field.Iso)
    {
        StepRule rule = Rules[(int)field];
        uint? confirmed = PollStepResult(receive, Preview(receive), rule);
        if (confirmed.HasValue) return confirmed.Value;
        throw new InvalidOperationException("Auch die neue Windows-Lesung meldet den Ausgangswert für " + rule.Label + ". Bitte mit dem Kameradisplay vergleichen.");
    }

    private static uint? PollStepResult(Func<ushort, uint[], byte[]> receive, Snapshot actual, StepRule rule)
    {
        for (int attempt = 0; attempt < 3; attempt++)
        {
            if (attempt > 0)
            {
                Thread.Sleep(250);
                actual = ParseSnapshot(receive(0x9209, new uint[] { 0 }));
            }
            if (actual.ExposureMode != ManualExposure)
                throw new InvalidOperationException("Der Modus M wurde beim Rücklesen nicht bestätigt. Kameraeinstellung prüfen.");
            uint? raw = actual.GetValue(rule.Kind);
            if (rule.EqualsValue(raw, rule.Target)) return raw;
            if (!rule.EqualsValue(raw, rule.Start))
                throw new InvalidOperationException("Die Rücklesung ergab " + rule.FormatReading(raw) + ". Erwartet war " +
                    rule.FormatReading(rule.Target) + ". Bitte mit dem Kameradisplay vergleichen.");
        }
        return null;
    }

    private static bool HasDeviceInfo(byte[] payload)
    {
        var data = new Packet(payload);
        if (data.UInt16() != 200)
            throw new InvalidDataException("Die Kamera meldet eine unbekannte Sony-Protokollversion.");
        uint properties = data.UInt32();
        data.Skip((ulong)properties * 2);
        uint controls = 0;
        if (!data.AtEnd)
        {
            controls = data.UInt32();
            data.Skip((ulong)controls * 2);
        }
        data.RequireEnd();
        return properties != 0 || controls != 0;
    }

    private static Snapshot ParseSnapshot(byte[] payload)
    {
        var data = new Packet(payload);
        uint entries = data.UInt32();
        uint reserved = data.UInt32();
        if (reserved != 0 || entries > MaxPayload / 9)
            throw new InvalidDataException("Ungültiger Kopf der Sony-Eigenschaftsliste.");
        var values = new uint?[Rules.Length];
        var seen = new bool[Rules.Length];
        var blocks = new string[Rules.Length];
        uint? mode = null;
        for (uint index = 0; index < entries; index++)
        {
            ushort property = data.UInt16();
            ushort type = data.UInt16();
            byte access = data.Byte();
            byte enabled = data.Byte();
            data.SkipValue(type); // Factory default
            StepRule rule = Array.Find(Rules, candidate => candidate.Code == property);
            if (rule != null)
            {
                int slot = (int)rule.Kind;
                if (seen[slot] || type != rule.Type)
                {
                    // Ambiguous or incorrectly typed fields are unavailable.
                    // This does not discard valid values for the other fields.
                    values[slot] = null;
                    data.SkipValue(type);
                    data.SkipForm(type);
                }
                else
                {
                    values[slot] = data.Unsigned(type);
                    bool canStep = data.StepForm(rule);
                    // libgphoto2 ptp_unpack_Sony_DPD: in v200 GetSet=0 can be
                    // adjustable when IsEnabled=1. 0x82 is a notch control.
                    if (enabled != 1 || (access != 0 && access != 1 && access != 0x82)) blocks[slot] = "access";
                    else if (!canStep) blocks[slot] = "choices";
                }
                seen[slot] = true;
                continue;
            }
            else if (property == 0x500E)
            {
                // Exposure Program Mode is UINT16 in the ILCE-6400 v200
                // dataset. A missing/ambiguous mode disables writing while
                // preserving the ISO readout from older snapshots.
                uint reported = 0;
                if (type == 0x0004) reported = data.UInt16();
                else data.SkipValue(type);
                mode = mode.HasValue ? 0 : reported;
            }
            else
            {
                data.SkipValue(type);
            }
            data.SkipForm(type);
        }
        data.RequireEnd();
        return new Snapshot(values, blocks, mode.GetValueOrDefault());
    }

    // Advance only along the declared, length-checked PTP records. In
    // particular, bytes resembling D21E inside another property's choices
    // or string cannot be mistaken for an exposure property.
    private sealed class Packet
    {
        private readonly byte[] bytes;
        private int offset;

        internal Packet(byte[] payload)
        {
            if (payload == null || payload.Length > MaxPayload)
                throw new InvalidDataException("Die USB-Antwort fehlt oder ist zu groß.");
            bytes = payload;
        }

        internal bool AtEnd { get { return offset == bytes.Length; } }

        internal void RequireEnd()
        {
            if (!AtEnd) throw new InvalidDataException("Unerwartete Zusatzdaten im Sony-Datensatz.");
        }

        internal void Skip(ulong length)
        {
            if (length > (ulong)(bytes.Length - offset))
                throw new InvalidDataException("Die Sony-USB-Antwort ist unvollständig.");
            offset += (int)length;
        }

        internal byte Byte()
        {
            Skip(1);
            return bytes[offset - 1];
        }

        internal ushort UInt16()
        {
            Skip(2);
            return (ushort)(bytes[offset - 2] | bytes[offset - 1] << 8);
        }

        internal uint UInt32()
        {
            uint low = UInt16();
            return low | ((uint)UInt16() << 16);
        }

        internal void SkipValue(ushort type)
        {
            if (type == 0xFFFF)
            {
                int chars = Byte();
                Skip((ulong)chars * 2);
                return;
            }
            bool array = type >= 0x4001 && type <= 0x400A;
            int scalar = array ? type - 0x4000 : type;
            if (scalar < 1 || scalar > 10)
                throw new InvalidDataException("Unbekannter PTP-Datentyp in der Sony-Antwort.");
            int width = 1 << ((scalar - 1) / 2);
            uint count = array ? UInt32() : 1;
            Skip((ulong)count * (uint)width);
        }

        internal uint Unsigned(ushort type)
        {
            return type == 4 ? UInt16() : UInt32();
        }

        internal bool StepForm(StepRule rule)
        {
            byte form = Byte();
            if (form == 0) return rule.Kind != Field.Iso;
            if (form == 1)
            {
                uint min = Unsigned(rule.Type), max = Unsigned(rule.Type), step = Unsigned(rule.Type);
                uint fullRange = rule.Type == 4 ? ushort.MaxValue : uint.MaxValue;
                // The ILCE-6400 dump uses these full storage ranges for 5007
                // and D20D. They do not enumerate lens/shutter settings. A
                // single relative notch lets the body choose its next stop.
                return rule.Kind != Field.Iso && min == 0 && max == fullRange && step == 1;
            }
            if (form != 2) throw new InvalidDataException("Unbekannte Eigenschaftsform im Sony-Protokoll.");

            int count = UInt16();
            int initial = -1, target = -1, order = 0;
            bool ambiguous = false;
            uint? previous = null;
            for (int i = 0; i < count; i++)
            {
                uint item = Unsigned(rule.Type);
                if (!rule.IsNumeric(item)) continue; // e.g. BULB
                if (rule.EqualsValue(item, rule.Start))
                {
                    if (initial >= 0) ambiguous = true;
                    initial = i;
                }
                else if (rule.EqualsValue(item, rule.Target))
                {
                    if (target >= 0) ambiguous = true;
                    target = i;
                }
                else if (rule.Compare(item, rule.Start) > 0 && rule.Compare(item, rule.Target) < 0) ambiguous = true;

                // Time and aperture lists can run in either direction. Check
                // their ordering. ISO lists also contain Auto and MFNR groups.
                if (rule.Kind != Field.Iso && previous.HasValue)
                {
                    int direction = rule.Compare(item, previous.Value);
                    if (direction != 0 && order != 0 && direction != order) ambiguous = true;
                    if (direction != 0) order = direction;
                }
                previous = item;
            }
            if (ambiguous || initial < 0 || target < 0) return false;
            return rule.Kind == Field.Iso ? target == initial + 1 : Math.Abs(target - initial) == 1;
        }

        internal void SkipForm(ushort type)
        {
            SkipFormValues(type, Byte());
        }

        private void SkipFormValues(ushort type, byte form)
        {
            int count;
            switch (form)
            {
                case 0: return;
                case 1: count = 3; break;          // min, max, increment
                case 2: count = UInt16(); break;   // v200: one enumeration
                default: throw new InvalidDataException("Unbekannte Eigenschaftsform im Sony-Protokoll.");
            }
            for (int i = 0; i < count; i++) SkipValue(type);
        }
    }
}
