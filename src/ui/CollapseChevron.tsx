/** Collapse indicator for `<details>` sections: points right, rotates down. */
export default function CollapseChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={`size-3 shrink-0 text-zinc-500 transition-transform ${
        open ? 'rotate-90' : ''
      }`}
    >
      <path
        d="M4.5 2L8 6l-3.5 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
