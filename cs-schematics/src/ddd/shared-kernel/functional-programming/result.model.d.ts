export declare class Result<T> {
    private _data;
    error: string;
    readonly isFailure: boolean;
    readonly isSuccess: boolean;
    get value(): T;
    constructor(error: string);
    static CreateFailure<T>(error: string | object, _data: T): Result<T>;
    static CreateSuccess<T>(data: T): Result<T>;
}
