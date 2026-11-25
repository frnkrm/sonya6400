// Sony SDIO v200. Wpd.OpenSony must verify the ILCE-6400 model and its PC
// Remote USB VID/PID. The transport checks command/transfer response codes.
// Protocol: https://github.com/qkhanhpro/simplealphadroid/blob/197c206/docs/PROTOCOL.md
// ISO encoding: libgphoto2/camlibs/ptp2/config.c, _stringify_Sony_ISO.
using System;
using System.IO;
using System.Threading;

internal static class SonyIso
{
    private const ushort IsoProperty = 0xD21E;
    private const ushort UInt32Type = 0x0006;
    private const int MaxPayload = 4 * 1024 * 1024;

    private const uint ManualExposure = 1;
    private const uint InitialIso = 400;
    private const uint TargetIso = 500;

    internal sealed class Snapshot
    {
        public readonly uint Iso;
        public readonly uint ExposureMode;
        public readonly string StepBlock;
        public bool CanStep { get { return StepBlock == null; } }

        internal Snapshot(uint iso, uint mode, string isoBlock)
        {
            Iso = iso;
            ExposureMode = mode;
            if (iso != InitialIso) StepBlock = "iso";
            else if (mode != ManualExposure) StepBlock = "mode";
            else StepBlock = isoBlock;
        }
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

    // Null means the write was acknowledged and every read still showed the starting value.
    internal static uint? Step(Func<ushort, uint[], byte[]> receive, Action stepUp)
    {
        if (stepUp == null) throw new ArgumentNullException("stepUp");
        Snapshot before = Preview(receive);
        if (!before.CanStep)
            throw new InvalidOperationException("Schreibtest gesperrt. Die Kamera muss in M normales ISO 400 und die nächste freigegebene Stufe 500 melden.");

        stepUp();
        return PollStepResult(receive, ParseSnapshot(receive(0x9209, new uint[] { 0 })));
    }

    internal static uint ConfirmInFreshSession(Func<ushort, uint[], byte[]> receive)
    {
        uint? confirmed = PollStepResult(receive, Preview(receive));
        if (confirmed.HasValue) return confirmed.Value;
        throw new InvalidOperationException("Auch die neue Windows-Lesung meldet ISO 400. Bitte mit dem Kameradisplay vergleichen.");
    }

    private static uint? PollStepResult(Func<ushort, uint[], byte[]> receive, Snapshot actual)
    {
        for (int attempt = 0; attempt < 3; attempt++)
        {
            if (attempt > 0)
            {
                Thread.Sleep(250);
                actual = ParseSnapshot(receive(0x9209, new uint[] { 0 }));
            }
            if (actual.ExposureMode != ManualExposure)
                throw new InvalidOperationException("Der Modus M wurde beim Rücklesen nicht bestätigt. ISO an der Kamera prüfen.");
            if (actual.Iso == TargetIso) return actual.Iso;
            if (actual.Iso != InitialIso)
                throw new InvalidOperationException("Die Kamera meldet einen abweichenden ISO-Wert. ISO an der Kamera prüfen.");
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
        uint? iso = null;
        uint? mode = null;
        string isoBlock = null;
        for (uint index = 0; index < entries; index++)
        {
            ushort property = data.UInt16();
            ushort type = data.UInt16();
            byte access = data.Byte();
            byte enabled = data.Byte();
            data.SkipValue(type); // Factory default
            if (property == IsoProperty)
            {
                if (iso.HasValue || type != UInt32Type)
                    throw new InvalidDataException("Mehrdeutige ISO-Angabe oder unbekannter ISO-Datentyp.");
                iso = data.UInt32();
                bool hasPair = data.IsoStepChoices();
                // libgphoto2 ptp_unpack_Sony_DPD: in v200 a regular ISO
                // property can be adjustable with GetSet=0 and IsEnabled=1.
                // 0x82 denotes a notch control. Reject display-only, disabled
                // and unfamiliar states for this first hardware write.
                if (enabled != 1 || (access != 0 && access != 1 && access != 0x82)) isoBlock = "access";
                else if (!hasPair) isoBlock = "choices";
                continue; // IsoStepChoices consumed this descriptor's form.
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
        if (!iso.HasValue)
            throw new InvalidDataException("Die Kamera hat keinen aktuellen Sony-ISO-Wert gemeldet.");
        // Preserve the complete property. The Windows reader decodes its sensitivity
        // and mode byte separately, including values it can only report as raw.
        return new Snapshot(iso.Value, mode.GetValueOrDefault(), isoBlock);
    }

    // Advance only along the declared, length-checked PTP records. In
    // particular, bytes resembling D21E inside another property's choices
    // or string cannot be mistaken for the current ISO.
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

        internal bool IsoStepChoices()
        {
            byte form = Byte();
            if (form != 2)
            {
                SkipFormValues(UInt32Type, form);
                return false;
            }
            int count = UInt16();
            int initial = -1, target = -1;
            bool ambiguous = false;
            for (int i = 0; i < count; i++)
            {
                uint item = UInt32();
                if (item == InitialIso)
                {
                    if (initial >= 0) ambiguous = true;
                    initial = i;
                }
                else if (item == TargetIso)
                {
                    if (target >= 0) ambiguous = true;
                    target = i;
                }
                else if (item > InitialIso && item < TargetIso) ambiguous = true;
            }
            return !ambiguous && initial >= 0 && target == initial + 1;
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
