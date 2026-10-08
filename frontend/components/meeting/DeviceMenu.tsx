import { MenuItem } from "@/components/ui/Popover";
import type { DeviceLists } from "@/hooks/useMediaDevices";

interface DeviceSection {
  title: string;
  kind: keyof DeviceLists;
}

interface DeviceMenuProps {
  sections: DeviceSection[];
  devices: DeviceLists;
  selected: Record<keyof DeviceLists, string>;
  onSelect: (kind: keyof DeviceLists, deviceId: string) => void;
  footer?: React.ReactNode;
}

/** Device picker shown from the ^ next to Mute / Stop Video. */
export function DeviceMenu({ sections, devices, selected, onSelect, footer }: DeviceMenuProps) {
  return (
    <div className="max-h-[60vh] overflow-y-auto">
      {sections.map(({ title, kind }) => (
        <div key={kind} className="pb-1">
          <p className="px-3 pb-1 pt-2 text-xs font-semibold text-room-muted">{title}</p>
          {devices[kind].length === 0 ? (
            <p className="px-3 py-1.5 text-sm text-room-muted">{kind === "audiooutput" ? "System default" : "No devices found"}</p>
          ) : (
            devices[kind].map((device, index) => (
              <MenuItem
                key={device.deviceId}
                tone="dark"
                checked={(selected[kind] || devices[kind][0].deviceId) === device.deviceId}
                onSelect={() => onSelect(kind, device.deviceId)}
              >
                {device.label || `${title.replace("Select a ", "")} ${index + 1}`}
              </MenuItem>
            ))
          )}
        </div>
      ))}
      {footer && <div className="border-t border-room-border pt-1">{footer}</div>}
    </div>
  );
}
