export const addBytes = (low: number, high: number) => low | (high << 7);

export const range = (length: number) => [...Array(length).keys()];
