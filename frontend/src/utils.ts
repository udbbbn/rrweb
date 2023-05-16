/**
 * @param { Promise } promise
 * @param { Object= } errorExt - Additional Information you can pass to the err object
 * @return { Promise }
 */

export interface RecordResponse<T = unknown> {
  code: number;
  data?: T;
  message: string;
}

export function to<T extends RecordResponse, U = Error>(
  promise: Promise<Response>,
  errorExt?: object
): Promise<[U, undefined] | [null, T]> {
  return promise
    .then(async (data) => (await data).json())
    .then<[null, T]>((data: T) => [null, data]) // 执行成功，返回数组第一项为 null。第二个是结果。
    .catch<[U, undefined]>((err: U & {}) => {
      if (errorExt) {
        Object.assign(err, errorExt);
      }

      return [err, undefined]; // 执行失败，返回数组第一项为错误信息，第二项为 undefined
    });
}
