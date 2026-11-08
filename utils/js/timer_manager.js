import { Code, ModuleError } from './errors.js'

export class TimerManager {
    constructor() {
        this.realTimers = new Map();
    }

    FindTimer(id) {
        if (typeof(id) != 'string') {
            throw new ModuleError(Code.Timer.ERR_INVALID_PARAMETERS, `Invalid ID parameter. [string, instead of ${typeof(id)}]`);
        };

        return this.realTimers.get(id);
    }

    createTimer(id, interval, fn, options = { removeAfterCall: false}) {
        if (typeof(id) != 'string') {
            throw new ModuleError(Code.Timer.ERR_INVALID_PARAMETERS, `Invalid ID parameter. [string, instead of ${typeof(id)}]`);
        }
        if (typeof(interval) != 'number') {
            throw new ModuleError(Code.Timer.ERR_INVALID_PARAMETERS, `Invalid interval parameter. [number, instead of ${typeof(interval)}]`);
        }
        if (typeof(fn) != 'function') {
            throw new ModuleError(Code.Timer.ERR_INVALID_PARAMETERS, `Invalid fn parameter. [function, instead of ${typeof(fn)}]`);
        }
        
        if (this.FindTimer(id) != undefined) {
            throw new ModuleError(Code.Timer.ERR_TIMER_ALREADY_EXIST, `Timer with ID ${ID} already exists!`);
        }
        this.realTimers.set(id, {id: id, interval: interval === -1 ? Infinity : interval, elapsed: 0, fn: fn, options: options});

        return Code.Timer.INFO_SUCCESS;
    }

    removeTimer(id) {
        if (typeof(id) != 'string') throw new ModuleError(Code.Timer.ERR_INVALID_PARAMETERS, `Invalid ID parameter. [string, instead of ${typeof(id)}]`)

        if (this.FindTimer(id) === undefined) {
            throw new ModuleError(Code.Timer.ERR_TIMER_NOT_FOUND, `Timer with ID ${id} doesn't exist!`);
        }

        this.realTimers.delete(id);
        return Code.Timer.INFO_SUCCESS;
    }

    setTimerInterval(id, newInterval) {
        if (typeof(id != 'string')) throw new ModuleError(Code.Timer.ERR_INVALID_PARAMETERS, `Invalid ID parameter. [string, instead of ${typeof(id)}]`);
        if (typeof(newInterval != 'number')) throw new ModuleError(Code.Timer.ERR_INVALID_PARAMETERS, `Invalid newInterval parameter. [number, instead of ${typeof(newInterval)}]`)
            
        const t = this.FindTimer(id);
        if (t === undefined) {
            throw new ModuleError(Code.Timer.ERR_TIMER_NOT_FOUND, `Timer with ID ${id} doesn't exist!`);
        }

        this.realTimers.set(id, {...t, interval: newInterval === -1 ? Infinity : interval});
        return Code.Timer.INFO_SUCCESS;
    }

    updateTimer(dt) {
        for (let [, t] of this.realTimers) {
            t.elapsed += dt / 1000;
            if (t.elapsed >= t.interval) {
                t.elapsed -= t.interval;
                t.fn();
                if (t?.options && 'removeAfterCall' in t.options && t.options.removeAfterCall) {
                    removeTimer(t.id);
                }
            }
        }
    } 
}