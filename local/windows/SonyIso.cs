// Reader for Sony SDIO v200. Wpd.OpenSony must first verify the ILCE-6400
// model and its PC Remote USB VID/PID. The transport handles WPD sessions,
// response codes and reads only device-to-host payloads.
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

    internal static uint Read(Func<ushort, uint[], byte[]> receive)
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
        return CurrentIso(receive(0x9209, new uint[] { 0 }));
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

    private static uint CurrentIso(byte[] payload)
    {
        var data = new Packet(payload);
        uint entries = data.UInt32();
        uint reserved = data.UInt32();
        if (reserved != 0 || entries > MaxPayload / 9)
            throw new InvalidDataException("Ungültiger Kopf der Sony-Eigenschaftsliste.");
        uint? iso = null;
        for (uint index = 0; index < entries; index++)
        {
            ushort property = data.UInt16();
            ushort type = data.UInt16();
            data.Skip(2); // Access, enabled
            data.SkipValue(type); // Factory default
            if (property == IsoProperty)
            {
                if (iso.HasValue || type != UInt32Type)
                    throw new InvalidDataException("Mehrdeutige ISO-Angabe oder unbekannter ISO-Datentyp.");
                iso = data.UInt32();
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
        return iso.Value;
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

        private byte Byte()
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

        internal void SkipForm(ushort type)
        {
            byte form = Byte();
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
