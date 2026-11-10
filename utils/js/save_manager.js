import { Code, ModuleError } from "./errors.js"
import { Utils } from "./utils.js";

const utils = new Utils();

export class SaveManager {
    constructor(saveName, fileName) {
        this.saveName = saveName;
        this.fileName = fileName;
        this.accessToken = utils.getCookie('google_access_token');
    }

    getAccessToken() { return this.accessToken; }
    saveToLocal(saveStr) {
        if (typeof(saveStr) != 'string') { throw new ModuleError(Code.ERR_INVALID_PARAMETER, `Invalid saveStr parameter. [string, instead of ${typeof(saveStr)}]`)}

        return Code.SUCCESS;
    }
}