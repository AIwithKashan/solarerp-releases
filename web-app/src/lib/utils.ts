export const cls = (...args: (string | boolean | undefined | null)[]) => args.filter(Boolean).join(' ');
