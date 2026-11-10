export const Code = Object.freeze({
    // [0000 - 0099] USED FOR COMMON CODES

    SUCCESS: 0, // The operation completed successfully.
    ERR_INVALID_PARAMETER: 1, // One or more arguments passed are invalid.

    // [0100 - 0199] USED FOR TIMER CODES
    
    ERR_TIMER_NOT_FOUND: 100, // The specified timer does not exist.
    ERR_TIMER_ALREADY_EXIST: 101 // Cannot create timer because it is already created.

    // [0200 - 0299] USED FOR SAVE CODES

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