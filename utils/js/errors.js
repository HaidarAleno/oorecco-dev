export const Code = Object.freeze({
    Timer: Object.freeze({
        'INFO_SUCCESS': 0,
        'ERR_INVALID_PARAMETERS': 1,
        'ERR_TIMER_NOT_FOUND': 2,
        'ERR_TIMER_ALREADY_EXIST': 3
    })
});

export class ModuleError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'ModuleError';
        this.code = code;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}