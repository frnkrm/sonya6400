// Windows SDK: PortableDeviceApi.h, PortableDeviceTypes.h, PortableDevice.h,
// WpdMtpExtensions.h (microsoft/win32metadata, generation/WinSDK/RecompiledIdlHeaders/um).
// WPD owns the USB/PTP session. Writes are limited to one upward step in an allowlisted exposure field.
using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

internal sealed class Wpd : IDisposable
{
    private const int MaxReply = 4 * 1024 * 1024;
    private const uint MaxChunk = 64 * 1024;
    private const uint ExecuteRead = 13, ExecuteWrite = 14, ReadChunk = 15, WriteChunk = 16, EndTransfer = 17;
    private static readonly Guid Mtp = new Guid("4D545058-1A2E-4106-A357-771E0819FC56");
    private static readonly Guid Common = new Guid("F0422A9C-5DC8-4440-B5BD-5DF28835658A");
    private static readonly Guid Client = new Guid("204D9F0C-2292-4080-9F42-40664E70F859");
    private static readonly Guid ManagerClass = new Guid("0AF10CEC-2ECD-4B92-9581-34F6AE0637F3");
    private static readonly Guid DeviceFtmClass = new Guid("F7C0039A-4762-488A-B4B3-760EF9A1BA9B");
    private static readonly Guid ValuesClass = new Guid("0C15D503-D017-47CE-9016-7B3F978721CC");
    private static readonly Guid CollectionClass = new Guid("08A99E2F-6D6D-4B80-AF5A-BAF2BCBE4CB9");

    // Native methods require a pointer to each PROPERTYKEY (const REFPROPERTYKEY).
    private static Key ClientName = new Key(Client, 2);
    private static Key MajorVersion = new Key(Client, 3);
    private static Key MinorVersion = new Key(Client, 4);
    private static Key Revision = new Key(Client, 5);
    private static Key QualityOfService = new Key(Client, 8);
    private static Key CommandCategory = new Key(Common, 1001);
    private static Key CommandId = new Key(Common, 1002);
    private static Key CommandResult = new Key(Common, 1003);
    private static Key OperationCode = new Key(Mtp, 1001);
    private static Key OperationParameters = new Key(Mtp, 1002);
    private static Key ResponseCode = new Key(Mtp, 1003);
    private static Key Context = new Key(Mtp, 1006);
    private static Key TotalSize = new Key(Mtp, 1007);
    private static Key RequestedBytes = new Key(Mtp, 1008);
    private static Key ReturnedBytes = new Key(Mtp, 1009);
    private static Key BytesToWrite = new Key(Mtp, 1010);
    private static Key BytesWritten = new Key(Mtp, 1011);
    private static Key TransferData = new Key(Mtp, 1012);
    private static Key OptimalSize = new Key(Mtp, 1013);

    private IDevice device;
    internal string DeviceKey { get; private set; }

    private Wpd(IDevice opened, string endpoint)
    {
        // Windows endpoint names are case-insensitive. Never expose the raw path.
        using (var sha = SHA256.Create())
        {
            byte[] digest = sha.ComputeHash(Encoding.UTF8.GetBytes(endpoint.ToUpperInvariant()));
            DeviceKey = BitConverter.ToString(digest).Replace("-", "").ToLowerInvariant();
        }
        device = opened;
    }

    private static T Create<T>(Guid clsid)
    {
        return (T)Activator.CreateInstance(Type.GetTypeFromCLSID(clsid, true));
    }

    private static void Release(object value)
    {
        if (value != null) Marshal.ReleaseComObject(value);
    }

    private static InvalidOperationException Failure(string step, int hr)
    {
        return new InvalidOperationException(step + " fehlgeschlagen (WPD 0x" + hr.ToString("X8") +
            "). PC-Fernbedienung und USB-Verbindung prüfen, andere Kameraprogramme schließen.");
    }

    internal static Wpd OpenSony()
    {
        IManager manager = null;
        IDevice opened = null;
        IValues client = null;
        try
        {
            manager = Create<IManager>(ManagerClass);
            string id = FindSony(manager);
            opened = Create<IDevice>(DeviceFtmClass);
            client = Create<IValues>(ValuesClass);
            client.SetStringValue(ref ClientName, "Sony a6400 Spickzettel");
            client.SetUnsignedIntegerValue(ref MajorVersion, 1);
            client.SetUnsignedIntegerValue(ref MinorVersion, 0);
            client.SetUnsignedIntegerValue(ref Revision, 0);
            // Microsoft's PortableDeviceCOM sample sets SECURITY_IMPERSONATION for WPD drivers.
            client.SetUnsignedIntegerValue(ref QualityOfService, 0x00020000);
            // Vendor commands use the driver's standard WPD command channel.
            opened.Open(id, client);
            Wpd result = new Wpd(opened, id);
            opened = null;
            return result;
        }
        catch (COMException e) { throw Failure("WPD-Gerätezugriff", e.ErrorCode); }
        catch (UnauthorizedAccessException e) { throw Failure("WPD-Gerätezugriff", e.HResult); }
        finally
        {
            Release(opened);
            Release(client);
            Release(manager);
        }
    }

    internal static bool IsSonyUsbId(string id)
    {
        // WPD can enumerate a physical USB interface or its SWD/WPDBUSENUM child.
        return id != null && Regex.IsMatch(id,
            @"^(?:\\\\\?\\)?(?:SWD[\\#]WPDBUSENUM[\\#](?:_\?\?_)?)?USB[\\#]VID_054C&PID_0CAA(?:[&#\\]|$)",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    }

    // Windows can give WPD an opaque interface path. Resolve the interface to
    // its present devnode before inspecting the nearest USB peripheral.
    private static Key InstanceId = new Key(new Guid("78C34FC8-104A-4ACA-9EA4-524D52996E57"), 256);
    private static Key FriendlyName = new Key(new Guid("A45C254E-DF1C-4EFD-8020-67D146A850E0"), 14);

    private static Key DeviceDesc = new Key(FriendlyName.Format, 2);

    [DllImport("cfgmgr32.dll", ExactSpelling = true, CharSet = CharSet.Unicode)]
    private static extern uint CM_Get_Device_Interface_PropertyW(string path, ref Key key,
        out uint type, [Out] byte[] buffer, ref uint size, uint flags);
    [DllImport("cfgmgr32.dll", ExactSpelling = true, CharSet = CharSet.Unicode)]
    private static extern uint CM_Locate_DevNodeW(out uint node, string id, uint flags);
    [DllImport("cfgmgr32.dll", ExactSpelling = true, CharSet = CharSet.Unicode)]
    private static extern uint CM_Get_Device_IDW(uint node, StringBuilder id, uint chars, uint flags);
    [DllImport("cfgmgr32.dll", ExactSpelling = true)]
    private static extern uint CM_Get_Parent(out uint parent, uint node, uint flags);
    [DllImport("cfgmgr32.dll", ExactSpelling = true)]
    private static extern uint CM_Get_DevNode_PropertyW(uint node, ref Key key, out uint type,
        [Out] byte[] buffer, ref uint size, uint flags);

    // GUID_DEVINTERFACE_WPD, as returned by PnPUtil for the ILCE-6400.
    private static Guid WpdInterfaceClass = new Guid("6AC27878-A6FA-4155-BA85-F98F491D4F33");
    private const uint PresentInterfaces = 0, AllRegisteredInterfaces = 1;
    private const uint CrBufferSmall = 0x1A;

    [DllImport("cfgmgr32.dll", ExactSpelling = true, CharSet = CharSet.Unicode)]
    private static extern uint CM_Get_Device_Interface_List_SizeW(out uint chars, ref Guid category,
        string instance, uint flags);
    [DllImport("cfgmgr32.dll", ExactSpelling = true, CharSet = CharSet.Unicode)]
    private static extern uint CM_Get_Device_Interface_ListW(ref Guid category, string instance,
        [Out, MarshalAs(UnmanagedType.LPArray, ArraySubType = UnmanagedType.U2, SizeParamIndex = 3)]
        char[] paths, uint chars, uint flags);

    internal static List<string> PnpInterfaces(bool includeInactive)
    {
        uint flags = includeInactive ? AllRegisteredInterfaces : PresentInterfaces;
        // Size is in WCHARs, including the final terminator of the MULTI_SZ.
        for (int attempt = 0; attempt < 3; attempt++)
        {
            uint chars;
            uint result = CM_Get_Device_Interface_List_SizeW(out chars, ref WpdInterfaceClass, null, flags);
            if (result != 0) throw ConfigError(result);
            if (chars == 0 || chars > 1024 * 1024)
                throw new InvalidDataException("Ungültige Größe der Windows-WPD-Schnittstellenliste.");
            var paths = new char[chars];
            result = CM_Get_Device_Interface_ListW(ref WpdInterfaceClass, null, paths, chars, flags);
            if (result == CrBufferSmall) continue; // A device was added between the two calls.
            if (result != 0) throw ConfigError(result);
            return DecodeInterfaces(paths);
        }
        throw new InvalidOperationException("Die Windows-WPD-Schnittstellenliste hat sich während der Abfrage mehrfach geändert.");
    }

    private static InvalidOperationException ConfigError(uint code)
    {
        return new InvalidOperationException("Windows konnte die PnP-Liste der WPD-Schnittstellen nicht lesen (CM 0x" +
            code.ToString("X") + ").");
    }

    internal static List<string> DecodeInterfaces(char[] paths)
    {
        var ids = new List<string>();
        int start = 0;
        while (start < paths.Length)
        {
            int end = Array.IndexOf(paths, '\0', start);
            if (end == start) return ids;
            if (end < 0) break;
            ids.Add(new string(paths, start, end - start));
            start = end + 1;
        }
        throw new InvalidDataException("Windows hat eine unvollständige WPD-Schnittstellenliste geliefert.");
    }

    private static string PropertyString(uint result, byte[] buffer, uint type, uint size)
    {
        if (result != 0 || type != 18 || size < 2 || size > buffer.Length || size % 2 != 0) return null;
        return Encoding.Unicode.GetString(buffer, 0, (int)size).TrimEnd('\0');
    }

    private static string UsbAncestor(string endpoint)
    {
        var buffer = new byte[4096];
        uint size = (uint)buffer.Length, type;
        uint result = CM_Get_Device_Interface_PropertyW(endpoint, ref InstanceId, out type, buffer, ref size, 0);
        string instance = PropertyString(result, buffer, type, size) ?? endpoint;
        uint node;
        if (CM_Locate_DevNodeW(out node, instance, 0) != 0) return null;
        var id = new StringBuilder(512);
        for (int depth = 0; depth < 32; depth++)
        {
            id.Clear();
            if (CM_Get_Device_IDW(node, id, (uint)id.Capacity, 0) != 0) break;
            string current = id.ToString();
            if (current.StartsWith(@"USB\", StringComparison.OrdinalIgnoreCase))
                return current; // Never claim an unrelated device through an upstream hub.
            uint parent;
            if (CM_Get_Parent(out parent, node, 0) != 0) break;
            node = parent;
        }
        return null;
    }

    private static string NodeProperty(uint node, ref Key key)
    {
        var buffer = new byte[4096];
        uint size = (uint)buffer.Length, type;
        uint result = CM_Get_DevNode_PropertyW(node, ref key, out type, buffer, ref size, 0);
        return PropertyString(result, buffer, type, size);
    }

    private static bool UsbModelMatches(string instance)
    {
        uint node;
        if (instance == null || CM_Locate_DevNodeW(out node, instance, 0) != 0) return false;
        return IsModel(NodeProperty(node, ref FriendlyName)) || IsModel(NodeProperty(node, ref DeviceDesc));
    }

    private delegate void EnumerateIds(IntPtr ids, ref uint count);

    private static List<string> Endpoints(EnumerateIds enumerate)
    {
        uint count = 0;
        enumerate(IntPtr.Zero, ref count);
        if (count > 256) throw new InvalidOperationException("Zu viele WPD-Geräte gemeldet.");
        var ids = new List<string>();
        if (count == 0) return ids;
        int slots = (int)count;
        IntPtr list = Marshal.AllocCoTaskMem(slots * IntPtr.Size);
        try
        {
            for (int i = 0; i < slots; i++) Marshal.WriteIntPtr(list, i * IntPtr.Size, IntPtr.Zero);
            enumerate(list, ref count);
            if (count > slots) throw new InvalidOperationException("WPD-Geräteliste hat sich geändert. Erneut lesen.");
            for (int i = 0; i < count; i++)
            {
                string id = Marshal.PtrToStringUni(Marshal.ReadIntPtr(list, i * IntPtr.Size));
                if (!String.IsNullOrEmpty(id)) ids.Add(id);
            }
        }
        finally
        {
            for (int i = 0; i < slots; i++) Marshal.FreeCoTaskMem(Marshal.ReadIntPtr(list, i * IntPtr.Size));
            Marshal.FreeCoTaskMem(list);
        }
        return ids;
    }

    internal static string SelectEndpoint(List<string> standard, List<string> specialized, List<string> pnp,
        Func<string, string> usbAncestor, Func<string, string, bool> modelMatches, Func<bool> hasInactiveSony)
    {
        var checkedIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var cameras = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        bool wrongModel = false;
        foreach (var group in new[] { standard, specialized, pnp })
        {
            foreach (string id in group)
            {
                if (!checkedIds.Add(id)) continue;
                string usb = usbAncestor(id);
                string identity = usb ?? id;
                if (!IsSonyUsbId(identity)) continue;
                if (!modelMatches(id, usb)) { wrongModel = true; continue; }
                if (!cameras.ContainsKey(identity)) cameras.Add(identity, id);
            }
        }
        if (cameras.Count > 1) throw new InvalidOperationException("Mehrere passende Kameras gefunden. Genau eine ILCE-6400 anschließen.");
        foreach (string id in cameras.Values) return id;
        if (wrongModel) throw new InvalidOperationException("Sony-USB-Kennung gefunden. Der Modellname ILCE-6400 konnte nicht bestätigt werden.");
        if (hasInactiveSony())
            throw new InvalidOperationException("Windows führt eine inaktive WPD-Schnittstelle der α6400. Eine aktive passende Schnittstelle ist derzeit nicht verfügbar.");
        throw new InvalidOperationException(String.Format("Keine passende α6400. WPD-Einträge: {0} regulär, {1} privat, {2} aktive WPD-Schnittstellen über Plug & Play.", standard.Count, specialized.Count, pnp.Count));
    }

    private static bool IsModel(string name)
    {
        return name != null && Regex.IsMatch(name.Trim(), @"^(?:Sony\s+)?ILCE[\s-]?6400$",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    }

    private static string WpdName(IManager manager, string id)
    {
        uint chars = 0;
        if (manager.GetDeviceFriendlyName(id, null, ref chars) < 0 || chars == 0 || chars > 4096) return null;
        var name = new StringBuilder((int)chars);
        return manager.GetDeviceFriendlyName(id, name, ref chars) >= 0 ? name.ToString() : null;
    }

    private static string FindSony(IManager manager)
    {
        manager.RefreshDeviceList();
        var standard = Endpoints(manager.GetDevices);
        var specialized = Endpoints(manager.GetPrivateDevices);
        var pnp = PnpInterfaces(includeInactive: false);
        return SelectEndpoint(standard, specialized, pnp, UsbAncestor, delegate(string id, string usb)
        {
            // The model may be published on the USB devnode instead of the WPD endpoint.
            return UsbModelMatches(usb) || IsModel(WpdName(manager, id));
        }, delegate
        {
            // Registrations for disconnected devices may survive. They serve only as diagnostics.
            var live = new HashSet<string>(pnp, StringComparer.OrdinalIgnoreCase);
            return PnpInterfaces(includeInactive: true).Exists(id => !live.Contains(id) && IsSonyUsbId(UsbAncestor(id) ?? id));
        });
    }

    // The call sites supply only the documented Sony handshake and descriptor parameters.
    internal byte[] ReadData(ushort opcode, params uint[] parameters)
    {
        if (device == null) throw new ObjectDisposedException("Wpd");
        if (parameters == null) throw new ArgumentNullException("parameters");
        bool connect = opcode == 0x9201 && parameters.Length == 3 &&
            parameters[0] >= 1 && parameters[0] <= 3 && parameters[1] == 0 && parameters[2] == 0;
        bool extensions = opcode == 0x9202 && parameters.Length == 1 && parameters[0] == 300;
        bool descriptions = opcode == 0x9209 && parameters.Length == 1 && parameters[0] == 0;
        if (!(connect || extensions || descriptions))
            throw new InvalidOperationException("Unbekannter Sony-Leseauftrag oder unzulässige Parameter.");

        string operation = "Sony 0x" + opcode.ToString("X4") + (connect ? " Stufe " + parameters[0] : "");
        string context = null;
        bool endAttempted = false;
        IValues started = null;
        try
        {
            started = Command(ExecuteRead, delegate(IValues v)
            {
                v.SetUnsignedIntegerValue(ref OperationCode, opcode);
                SetArguments(v, parameters);
            });
            started.GetStringValue(ref Context, out context);
            if (String.IsNullOrEmpty(context)) throw new InvalidDataException("WPD lieferte keinen Transferkontext.");
            ulong total;
            uint optimal = MaxChunk;
            started.GetUnsignedLargeIntegerValue(ref TotalSize, out total);
            if (total != 0) started.GetUnsignedIntegerValue(ref OptimalSize, out optimal);
            bool unknown = total == UInt32.MaxValue;
            if ((!unknown && total > MaxReply) || optimal == 0)
                throw new InvalidDataException("Ungültige Größe der WPD-Antwort.");
            byte[] data = ReadChunks(context, total, unknown, Math.Min(optimal, MaxChunk));
            endAttempted = true;
            End(context);
            return data;
        }
        catch (COMException e) { throw Failure(operation, e.ErrorCode); }
        catch (UnauthorizedAccessException e) { throw Failure(operation, e.HResult); }
        catch (InvalidOperationException e) { throw new InvalidOperationException(operation + ": " + e.Message, e); }
        catch (InvalidDataException e) { throw new InvalidDataException(operation + ": " + e.Message, e); }
        finally
        {
            Release(started);
            if (!String.IsNullOrEmpty(context) && !endAttempted)
            {
                // Finish even a short or malformed transfer; preserve the original read error.
                try { End(context); } catch (COMException) { } catch (InvalidOperationException) { }
            }
        }
    }

    private static void SetArguments(IValues request, params uint[] parameters)
    {
        IParams args = Create<IParams>(CollectionClass);
        try
        {
            foreach (uint p in parameters)
            {
                var value = new UIntVariant { Type = 19, Value = p }; // VT_UI4
                args.Add(ref value);
            }
            request.SetIPortableDevicePropVariantCollectionValue(ref OperationParameters, args);
        }
        finally { Release(args); }
    }

    // ILCE-6400 capture: +1 means higher ISO, higher f-number or faster shutter.
    // https://github.com/qkhanhpro/simplealphadroid/blob/197c206/app/src/main/java/com/simplealphadroid/SonyCam.java#L769-L779
    internal void StepUp(SonyIso.Field field)
    {
        Step(field, 1);
    }

    internal static byte[] StepPayload(SonyIso.Field field, int direction, out uint property)
    {
        if (direction != 1 && direction != -1) throw new ArgumentOutOfRangeException("direction");
        byte[] step;
        switch (field)
        {
            case SonyIso.Field.Iso: property = 0xD21E; step = new byte[] { 1, 0, 0, 0 }; break;
            case SonyIso.Field.Aperture: property = 0x5007; step = new byte[] { 1, 0 }; break;
            case SonyIso.Field.Shutter: property = 0xD20D; step = new byte[] { 1, 0 }; break;
            default: throw new InvalidOperationException("Unbekannter Belichtungsschritt.");
        }
        // The captured command uses 0xFFFF for down, zero-extended for
        // the four-byte ISO payload (SonyCam.expoStep).
        if (direction < 0) step[0] = step[1] = 0xff;
        return step;
    }

    internal void Step(SonyIso.Field field, int direction)
    {
        if (device == null) throw new ObjectDisposedException("Wpd");
        uint property;
        byte[] step = StepPayload(field, direction, out property);
        string operation = "Sony-Belichtungsschritt (0x9207, 0x" + property.ToString("X4") + ")";
        string context = null;
        bool endAttempted = false;
        IValues started = null, written = null;
        try
        {
            started = Command(ExecuteWrite, delegate(IValues request)
            {
                request.SetUnsignedIntegerValue(ref OperationCode, 0x9207);
                SetArguments(request, property);
                request.SetUnsignedLargeIntegerValue(ref TotalSize, (ulong)step.Length);
            });
            started.GetStringValue(ref Context, out context);
            if (String.IsNullOrEmpty(context)) throw new InvalidDataException("WPD lieferte keinen Transferkontext.");
            uint blockSize;
            started.GetUnsignedIntegerValue(ref OptimalSize, out blockSize);
            if (blockSize < step.Length) throw new InvalidDataException("Der WPD-Schreibpuffer reicht für den Belichtungsschritt nicht aus.");
            written = Command(WriteChunk, delegate(IValues request)
            {
                request.SetStringValue(ref Context, context);
                request.SetUnsignedIntegerValue(ref BytesToWrite, (uint)step.Length);
                request.SetBufferValue(ref TransferData, step, (uint)step.Length);
            });
            uint count;
            written.GetUnsignedIntegerValue(ref BytesWritten, out count);
            if (count != step.Length) throw new InvalidDataException("WPD bestätigt die Datenbytes des Belichtungsschritts nicht vollständig.");
            endAttempted = true;
            End(context);
        }
        catch (COMException e) { throw Failure(operation, e.ErrorCode); }
        catch (UnauthorizedAccessException e) { throw Failure(operation, e.HResult); }
        catch (InvalidOperationException e) { throw new InvalidOperationException(operation + ": " + e.Message, e); }
        catch (InvalidDataException e) { throw new InvalidDataException(operation + ": " + e.Message, e); }
        finally
        {
            Release(written);
            Release(started);
            // Close the existing context on failure. Never resend the Sony command or its data.
            if (!String.IsNullOrEmpty(context) && !endAttempted)
            {
                try { End(context); } catch (COMException) { } catch (InvalidOperationException) { }
            }
        }
    }

    private byte[] ReadChunks(string context, ulong total, bool unknown, uint blockSize)
    {
        using (var data = new MemoryStream())
        {
            int chunks = 0;
            while (unknown || (ulong)data.Length < total)
            {
                if (++chunks > 4096) throw new InvalidDataException("Zu viele WPD-Datenblöcke.");
                uint request = unknown ? blockSize : (uint)Math.Min((ulong)blockSize, total - (ulong)data.Length);
                IValues reply = Command(ReadChunk, delegate(IValues v)
                {
                    v.SetStringValue(ref Context, context);
                    v.SetUnsignedIntegerValue(ref RequestedBytes, request);
                    v.SetBufferValue(ref TransferData, new byte[request], request);
                });
                uint read;
                IntPtr ptr = IntPtr.Zero;
                try
                {
                    reply.GetUnsignedIntegerValue(ref ReturnedBytes, out read);
                    if (read > request || data.Length + read > MaxReply)
                        throw new InvalidDataException("WPD-Antwort überschreitet die erwartete Größe.");
                    if (read == 0 && !unknown) throw new InvalidDataException("WPD-Antwort wurde vorzeitig beendet.");
                    if (read > 0)
                    {
                        uint length;
                        reply.GetBufferValue(ref TransferData, out ptr, out length);
                        if (ptr == IntPtr.Zero || read > length || length > request)
                            throw new InvalidDataException("Unvollständiger WPD-Datenblock.");
                        byte[] bytes = new byte[read];
                        Marshal.Copy(ptr, bytes, 0, bytes.Length);
                        data.Write(bytes, 0, bytes.Length);
                    }
                }
                finally { Marshal.FreeCoTaskMem(ptr); Release(reply); }
                if (unknown && read < request) break;
            }
            return data.ToArray();
        }
    }

    private void End(string context)
    {
        IValues reply = Command(EndTransfer, delegate(IValues v) { v.SetStringValue(ref Context, context); });
        try
        {
            uint code;
            reply.GetUnsignedIntegerValue(ref ResponseCode, out code);
            if (code != 0x2001) throw new InvalidOperationException("Sony-Kamera antwortet mit PTP-Code 0x" + code.ToString("X4") + ".");
        }
        finally { Release(reply); }
    }

    private IValues Command(uint command, Action<IValues> fill)
    {
        IValues request = Create<IValues>(ValuesClass);
        IValues reply = null;
        try
        {
            Guid category = Mtp;
            request.SetGuidValue(ref CommandCategory, ref category);
            request.SetUnsignedIntegerValue(ref CommandId, command);
            fill(request);
            // SendCommand's reserved flags must be zero. Both SendCommand's HRESULT
            // and WPD_PROPERTY_COMMON_HRESULT in the returned values must succeed.
            device.SendCommand(0, request, out reply);
            if (reply == null) throw new InvalidOperationException("WPD lieferte kein Befehlsergebnis.");
            int hr;
            reply.GetErrorValue(ref CommandResult, out hr);
            if (hr < 0) throw Failure("WPD-MTP-Kommando " + command, hr);
            IValues result = reply;
            reply = null;
            return result;
        }
        catch (COMException e) { throw Failure("WPD-MTP-Kommando " + command, e.ErrorCode); }
        catch (UnauthorizedAccessException e) { throw Failure("WPD-MTP-Kommando " + command, e.HResult); }
        finally { Release(reply); Release(request); }
    }

    public void Dispose()
    {
        if (device == null) return;
        try { device.Close(); }
        catch (COMException e) { throw Failure("WPD-Verbindung schließen", e.ErrorCode); }
        finally { Release(device); device = null; }
    }

    // The largest PROPVARIANT union is 16 bytes on Windows x64.
    [StructLayout(LayoutKind.Sequential)]
    private struct Key
    {
        internal Guid Format;
        internal uint Id;
        internal Key(Guid format, uint id) { Format = format; Id = id; }
    }

    [StructLayout(LayoutKind.Explicit, Size = 24)]
    private struct UIntVariant
    {
        [FieldOffset(0)] internal ushort Type;
        [FieldOffset(8)] internal uint Value;
    }

    // Unused slots retain the native IUnknown interface order from the SDK.
    [ComImport, Guid("A1567595-4C2F-4574-A6FA-ECEF917B9A40"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IManager
    {
        void GetDevices(IntPtr ids, ref uint count);
        void RefreshDeviceList();
        [PreserveSig] int GetDeviceFriendlyName([MarshalAs(UnmanagedType.LPWStr)] string id,
            [Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder name, ref uint chars);
        void GetDeviceDescription();
        void GetDeviceManufacturer();
        void GetDeviceProperty();
        void GetPrivateDevices(IntPtr ids, ref uint count);
    }

    [ComImport, Guid("625E2DF8-6392-4CF0-9AD1-3CFA5F17775C"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IDevice
    {
        void Open([MarshalAs(UnmanagedType.LPWStr)] string id, IValues client);
        void SendCommand(uint flags, IValues request, out IValues reply);
        void Content();
        void Capabilities();
        void Cancel();
        void Close();
    }

    [ComImport, Guid("89B2E422-4F1B-4316-BCEF-A44AFEA83EB3"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IParams
    {
        void GetCount();
        void GetAt();
        void Add([In] ref UIntVariant value);
    }

    [ComImport, Guid("6848F6F2-3155-4F86-B6F5-263EEEAB3143"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IValues
    {
        void GetCount();
        void GetAt();
        void SetValue();
        void GetValue();
        void SetStringValue([In] ref Key key, [MarshalAs(UnmanagedType.LPWStr)] string value);
        void GetStringValue([In] ref Key key, [MarshalAs(UnmanagedType.LPWStr)] out string value);
        void SetUnsignedIntegerValue([In] ref Key key, uint value);
        void GetUnsignedIntegerValue([In] ref Key key, out uint value);
        void SetSignedIntegerValue();
        void GetSignedIntegerValue();
        void SetUnsignedLargeIntegerValue([In] ref Key key, ulong value);
        void GetUnsignedLargeIntegerValue([In] ref Key key, out ulong value);
        void SetSignedLargeIntegerValue();
        void GetSignedLargeIntegerValue();
        void SetFloatValue();
        void GetFloatValue();
        void SetErrorValue();
        void GetErrorValue([In] ref Key key, out int value);
        void SetKeyValue();
        void GetKeyValue();
        void SetBoolValue();
        void GetBoolValue();
        void SetIUnknownValue();
        void GetIUnknownValue();
        void SetGuidValue([In] ref Key key, [In] ref Guid value);
        void GetGuidValue();
        void SetBufferValue([In] ref Key key, [In, MarshalAs(UnmanagedType.LPArray, SizeParamIndex = 2)] byte[] data, uint size);
        void GetBufferValue([In] ref Key key, out IntPtr data, out uint size);
        void SetIPortableDeviceValuesValue();
        void GetIPortableDeviceValuesValue();
        void SetIPortableDevicePropVariantCollectionValue([In] ref Key key, IParams args);
    }
}
