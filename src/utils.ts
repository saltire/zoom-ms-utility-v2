export const addBytes = (low: number, high: number) => low | (high << 7);

export const pad = (str: string, len: number, char: string) => (
  char.repeat(Math.max(0, len - str.length)) + str);

export const formatBinary = (bytes: number[] | Uint8Array) => [...bytes]
  .map(byte => pad(byte.toString(2), 8, '0')).join(' ').toUpperCase();

export const formatHex = (bytes: number[] | Uint8Array) => [...bytes]
  .map(byte => pad(byte.toString(16), 2, '0')).join(' ').toUpperCase();

export const range = (length: number) => [...Array(length).keys()];
