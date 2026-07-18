export type OperationStatus = {
  fun: string;
  status: 'completed' | 'failed' | 'skipped';
  result: unknown;
  error: unknown;
};

export async function wrapOperation(label: string, promise: Promise<unknown>): Promise<OperationStatus> {
  try {
    const result = await promise;
    return { fun: label, status: 'completed', result, error: null };
  } catch (error) {
    console.error(`${label} failed:`, error);
    return { fun: label, status: 'failed', result: null, error };
  }
}

export function skipOperation(label: string): OperationStatus {
  return { fun: label, status: 'skipped', result: null, error: null };
}
