export class Result<T> {
    private _data: T;
    error: string;
    readonly isFailure: boolean;
    readonly isSuccess: boolean;

    public get value(): T {
        if (this.isSuccess) {
            return this._data;
        } else {
            throw "Value is not set";
        }
    }

    constructor(error: string) {
        if (error) {
            this.isFailure = true;
            this.isSuccess = false;
            this.error = error;
        } else {
            this.isFailure = false;
            this.isSuccess = true;
            this.error = '';
        }
    }

    static CreateFailure<T>(error: string | object, _data: T) {
        let message = 'unknown_error';
        if (Object.prototype.toString.call(error) === "[object String]") {
            message = error as string;
        } else if (typeof error === 'object' && error !== null && !Array.isArray(error)) {
            if (Object.prototype.hasOwnProperty.call(error, 'message')) {
                message = (error as Error).message;
            }
        }

        const result = new Result<T>(message);
        return result;
    }

    static CreateSuccess<T>(data: T) {
        const result = new Result<T>('');
        result._data = data;
        return result;
    }
}
