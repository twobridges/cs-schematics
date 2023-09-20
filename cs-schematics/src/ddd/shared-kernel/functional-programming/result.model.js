"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Result = void 0;
class Result {
    constructor(error) {
        if (error) {
            this.isFailure = true;
            this.isSuccess = false;
            this.error = error;
        }
        else {
            this.isFailure = false;
            this.isSuccess = true;
            this.error = '';
        }
    }
    get value() {
        if (this.isSuccess) {
            return this._data;
        }
        else {
            throw "Value is not set";
        }
    }
    static CreateFailure(error, _data) {
        let message = 'unknown_error';
        if (Object.prototype.toString.call(error) === "[object String]") {
            message = error;
        }
        else if (typeof error === 'object' && error !== null && !Array.isArray(error)) {
            if (Object.prototype.hasOwnProperty.call(error, 'message')) {
                message = error.message;
            }
        }
        const result = new Result(message);
        return result;
    }
    static CreateSuccess(data) {
        const result = new Result('');
        result._data = data;
        return result;
    }
}
exports.Result = Result;
//# sourceMappingURL=result.model.js.map