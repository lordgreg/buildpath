import { copyText } from '../download.ts';
import {
  PROTON_EXTRA_LIBRARY,
  PROTON_FILTER_PATH,
  PROTON_FIND_COMMAND,
  WINDOWS_FILTER_PATH,
  type Platform,
} from '../../sync/platform.ts';

function PathCode({ children }: { children: string }) {
  return (
    <code className="break-all rounded bg-ink-900 px-1 text-zinc-300">
      {children}
    </code>
  );
}

function WindowsGuidance() {
  return (
    <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
      Windows: filters live in <PathCode>{WINDOWS_FILTER_PATH}</PathCode>. Pick
      that folder. If it does not exist yet, launch Path of Exile once and
      change the filter in-game to create it.
    </p>
  );
}

function LinuxGuidance() {
  return (
    <>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
        Linux/Proton: <PathCode>steamapps</PathCode> lives inside a Steam
        library, not your home folder. The default is{' '}
        <PathCode>{PROTON_FILTER_PATH}</PathCode>. The game reads{' '}
        <PathCode>.filter</PathCode> files directly in this folder; there is no
        required <PathCode>filters</PathCode> subfolder.
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
        If PoE is on another drive, use <PathCode>{PROTON_EXTRA_LIBRARY}</PathCode>.
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
        Find it automatically, then pick the folder it prints.
      </p>
      <div className="mt-1 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void copyText(PROTON_FIND_COMMAND)}
          className="text-[10px] text-zinc-500 underline underline-offset-2 hover:text-zinc-300"
        >
          Copy find command
        </button>
        <button
          type="button"
          onClick={() => void copyText(PROTON_FILTER_PATH)}
          className="text-[10px] text-zinc-500 underline underline-offset-2 hover:text-zinc-300"
        >
          Copy default Proton path
        </button>
      </div>
    </>
  );
}

/** Platform-specific filter-folder paths. Rendered inside the install help. */
export default function FolderGuidance({ platform }: { platform: Platform }) {
  const showBoth = platform !== 'windows' && platform !== 'linux';
  return (
    <div className="mt-3 border-t border-ink-700 pt-3">
      <p className="text-[11px] leading-relaxed text-zinc-500">
        Any folder works; pick the one the game reads. The browser only learns
        the folder name, not its full path.
      </p>
      {showBoth ? (
        <>
          <WindowsGuidance />
          <LinuxGuidance />
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
            macOS/other: Path of Exile under Wine or CrossOver uses a prefix
            similar to the Proton path; choose that folder.
          </p>
        </>
      ) : (
        <>
          {platform === 'windows' ? <WindowsGuidance /> : <LinuxGuidance />}
          <details className="mt-2">
            <summary className="cursor-pointer text-[10px] uppercase tracking-wide text-zinc-600">
              Other platform
            </summary>
            {platform === 'windows' ? <LinuxGuidance /> : <WindowsGuidance />}
          </details>
        </>
      )}
    </div>
  );
}
