/// <reference path="../../../utils/js/break_infinity.d.ts" />
import { Utils } from '../../../utils/js/utils.js';
import { TimerManager } from '../../../utils/js/timer_manager.js';
import { Code } from '../../../utils/js/errors.js';

// CONSTANTS
const VERSION = "v0.01";
const CLIENT_ID = '801470033464-c9fq6032rsa3qe2apa799ioebml39i9d.apps.googleusercontent.com';
const REDIRECT_URI = window.location.origin + "/auth/callback/index.html";

const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const SAVE_FILE_NAME = 'rock_incremental_save.txt';
const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

const COOKIE_PATH = window.location.pathname.replace(/[^/]*$/, '');

const realTimers = [];
let saveDebounce = false;
let isLoaded = false;
let secureTimeOrigin = null;
let inputLock = true;
let isSleeping = false;

const utils = new Utils();
const timerManager = new TimerManager();

// ELEMENTS
const rock_count = document.getElementById("rock-counter")
const bulk_count = document.getElementById("bulk-counter");
const loading_screen = document.getElementById("loading-screen");
const loading_text = document.getElementById("loading-text");
const loading_save = document.getElementById("loading-save");
const versionText = document.getElementById("version");
const statusText = document.getElementById("status-text");
const loginStatusText = document.getElementById("login-status");
const musicToggleText = document.getElementById("music-toggle")
const autoSaveIntrvlText = document.getElementById("autosave-interval-label");
const sleepModeScreen = document.getElementById("sleepmode-screen")
const sleepModeBtn = document.getElementById("sleepmode-toggle");

// OTHER THINGS
const heartbeatWorker = new Worker('js/worker.js');
const bgMusic = new Audio('../../assets/rockincremental/bgMusic.mp3');

const Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const randomSleep = (min, max) => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
};

bgMusic.volume = 0.8;
bgMusic.preload = 'auto';
bgMusic.loop = true;

class Game {
    constructor() {
        this.accessToken = null
        this.player = {
            name: "default",

            currencies: {
                dust: new Decimal(0),
                rock: new Decimal(0)
            },
            miners: {
                "miner1": {cost: new Decimal(100), level: new Decimal(1), sps: 1},
                "miner2": {cost: new Decimal(5000), level: new Decimal(0), sps: 1},
                "miner3": {cost: new Decimal(300000), level: new Decimal(0), sps: 1},
                "miner4": {cost: new Decimal(10000000), level: new Decimal(0), sps: 1},
                "miner5": {cost: new Decimal(1000000000), level: new Decimal(0), sps: 1}
            },

            achievements: [],
            stats: {
                playTime: new Decimal(0),
                unscaledPlayTime: new Decimal(0),
                gameSpeed: new Decimal(1)
            },
            settings: {
                notation: "Normal",
                musicEnabled: true,
                autoSaveInterval: 30,
                sleepMode: false
            },
        }

        this.achievementsRegistry = [
            {
                id: 1,
                name: "Test 1",
                desc: "literally just a test",
                auto: true,
                metricPath: ["player", "currencies", "rock"],
                targetValue: 10,
                rewardMetricPath: ["player", "currencies", "dust"],
                rewardValue: "add 50"
            },
            {
                id: 2,
                name: "Test 2",
                desc: "test 2 ig",
                auto: true,
                customCheck: function() {
                    const date = new Date();
                    let Hours = date.getHours();
                    return Hours >= 20 && Hours <= 23;
                },
                rewardMetricPath: ["player", "currencies", "dust"],
                rewardValue: "add 100"
            },
            {
                id: 3,
                name: "test 3",
                desc: "Get 50 miner1.",
                auto: true,
                metricPath: ["player", "miners", "miner1", "level"],
                targetValue: 50,
                rewardMetricPath: ["player", "stats", "gameSpeed"],
                rewardValue: "mult 1.5"
            },
            {
                id: 4,
                name: "test 4",
                desc: "Get 999,999,999 rocks",
                auto: true,
                metricPath: ["player", "currencies", "rock"],
                targetValue: 999999999,
                customReward: function() {
                    
                }
            },
            {
                id: 5,
                name: "literally p2w",
                desc: "Get 123,456 dust",
                auto: true,
                metricPath: ["player", "currencies", "dust"],
                targetValue: 123456,
                rewardMetricPath: ["player", "currencies", "dust"],
                rewardValue: 50
            }
        ]

        this.timeAccumulators = {
            miner1: new Decimal(0),
            miner2: new Decimal(0),
            miner3: new Decimal(0),
            miner4: new Decimal(0),
            miner5: new Decimal(0),
        }

        this.bulkCount = 1

        this.lastTick = performance.now()
    }

    loginWithGoogle() {
        const state = crypto.randomUUID();
        sessionStorage.setItem('expectedState', state);

        const params = new URLSearchParams({
            client_id: CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            response_type: 'token',
            scope: SCOPES,
            state: state,
            prompt: 'select_account'
        });

        const width = 500;
        const height = 600;

        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const authWindow = window.open('https://accounts.google.com/o/oauth2/v2/auth?' + params.toString(), 'GoogleAuthPopup', `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`)

        if (authWindow) authWindow.focus();
    }

    logoutWithGoogle() {
        if (this.accessToken) {
            fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(this.accessToken), { method: 'POST'})
            .catch(() => {});
        }

        deleteCookie('google_access_token');
        this.accessToken = null;
        loginStatusText.innerHTML = "isLogin = false;";
    }

    async driveFetch(url, options = {}) {
        if (!this.accessToken || !getCookie('google_access_token')) {
            this.logoutWithGoogle();
            throw new Error('Session expired');
        }

        const response = await fetch(url, {
            ...options,
            headers: { ...(options.headers || {}), 'Authorization': `Bearer ${this.accessToken}`}
        });

        if (response.status === 401) {
            this.logoutWithGoogle();
            throw new Error('Session expired');
        }

        return response;
    }

    async findSaveFileId() {
        const query = `name='${SAVE_FILE_NAME}'`;
        const listUrl = `${DRIVE_FILES}?spaces=appDataFolder&fields=files(id,name)&q=${encodeURIComponent(query)}`;
        const response = await this.driveFetch(listUrl);

        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();

        return data.files && data.files.length > 0 ? data.files[0].id : null;
    }

    async saveToCloud() {
        const textString = this.parseSaveFile();
        try {
            statusText.innerHTML = "Saving to cloud..."
            statusText.hidden = false;
            const fileId = await this.findSaveFileId();

            const metaData = { name: SAVE_FILE_NAME, mimeType: 'text/plain' };
            if (!fileId) metaData.parents = ['appDataFolder'];

            const boundary = 'cloud_save_boundary_marker';
            const delimiter = `\r\n--${boundary}\r\n`;
            const closeDelimiter = `\r\n--${boundary}--`;

            const body = 
                delimiter +
                'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metaData) +
                delimiter +
                'Content-Type: text/plain\r\n\r\n' +
                textString +
                closeDelimiter;

            const url = fileId
                ? `${DRIVE_UPLOAD}/${fileId}?uploadType=multipart`
                : `${DRIVE_UPLOAD}?uploadType=multipart`;

            const saveResponse = await this.driveFetch(url, {
                method: fileId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': `multipart/related; boundary=${boundary}`},

                body: body
            });

            if (!saveResponse.ok) {
                const err = await saveResponse.json().catch(() => ({}));
                const reason = err.error?.errors?.[0]?.reason;
                if (reason === 'storageQuotaExceeded') throw new Error('Drive full');
                throw new Error('Upload rejected');
            }

            console.log("Successfully save to cloud!");
            statusText.innerHTML = "Successfully save to cloud!";
            await Sleep(3000);
            statusText.hidden = true;
        } catch (err) {
            if (err.message === 'Drive full') {
                console.error("Failed to save to cloud because Google Drive is full!");
                return;
            }

            console.error(err);
        }
    }

    async loadFromCloud() {
        try {
            const fileId = await this.findSaveFileId();
            if (!fileId) {
                console.warn("No past data found in the google drive.")
                return;
            }

            const fileResponse = await this.driveFetch(`${DRIVE_FILES}/${fileId}?alt=media`);
            if (!fileResponse.ok) throw new Error(await fileResponse.text());

            const data = await fileResponse.text();
            console.log(data);
            this.initData(data);
            console.log("Succesfully load save file from cloud!");
        } catch (err) {
            console.error(err);
        }
    }

    parseSaveFile() {
        try {
            let time = getGameTime();
            let saveData = VERSION + "," + time + ";";

            const currenciesDataList = Object.values(this.player.currencies || []);
            const statsDataList = Object.values(this.player.stats || []);
            const minerDataList = Object.values(this.player.miners || []);
            const achievementDataList = Object.values(this.player.achievements || {}); 
            const settingsDataList = Object.values(this.player.settings || {});
            
            for (let i = 0; i < currenciesDataList.length; i++) {
                saveData += currenciesDataList[i].toExponential(3);
                saveData += i != currenciesDataList.length - 1 ? "," : "|";
            }

            for (let i = 0; i < statsDataList.length; i++) {
                if (statsDataList[i] instanceof Decimal) {
                    saveData += Decimal.floor(statsDataList[i].toExponential(3));
                } else {
                    saveData += Math.floor(statsDataList[i].toString(10));
                }

                saveData += i != statsDataList.length - 1 ? "," : "|";
            }

            for (let i = 0; i < minerDataList.length; i++) {
                saveData += minerDataList[i]?.level.toString();
                saveData += i != minerDataList.length - 1 ? "," : "|";
            }

            for (let i = 0; i <= achievementDataList.length; i++) {
                saveData += achievementDataList.includes(i + 1) === true ? 1 : 0;
                saveData += i != this.achievementsRegistry.length - 1 ? "" : "|" 
            }

            for (let i = 0; i < settingsDataList.length; i++) {
                switch (i) {
                    case 0:
                        if (this.player.settings.notation === "Normal") {
                            saveData += "1";
                        } else if (this.player.settings.notation === "Scientific") {
                            saveData += "2";
                        } else if (this.player.settings.notation === "Engineering") {
                            saveData += "3";
                        } else {
                            console.warn("undefined notation setting: ", this.player.settings.notation);
                            saveData += "1";
                        }
                        break;
                    case 1:
                        saveData += this.player.settings.musicEnabled === true ? 1 : 0;
                        break;
                    case 2:
                        saveData += this.player.settings.autoSaveInterval.toString(10);
                        break;
                    case 3:
                        saveData += this.player.settings.sleepMode === true ? 1 : 0;
                        break;
                }

                saveData += i != settingsDataList.length - 1 ? "," : "|";
            }

            return saveData;
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    async init() {
        this.accessToken = utils.getCookie('google_access_token');
        if (this.accessToken) {
            loginStatusText.innerHTML = "isLogin = true;";
        }

        versionText.innerHTML = VERSION;
        await this.syncServerWithDeviceTime(); // bottleneck, haven't implemented preload process yet.
        let timer = 0;
        let step = 0;

        while (document.readyState !== 'complete') {
            loading_text.innerHTML += ".";
            step = step % 3 != 0 ? step++ : 0;
            if (step === 0) { loading_text.innerHTML = "Loading"}

            if (timer === 20) {
                console.log("This takes a long time. Please wait, this maybe my fault on the front-end.");
            } else if (timer === 60) {
                console.log("Try reloading the page!");
            }
            
            await Sleep(1000);
            timer++;
        }

        await randomSleep(500, 3000);
        loading_screen.hidden = true;
        loading_save.hidden = false;
        
        const data = localStorage.getItem("gameState");

        if (data) {
            game.initData(data);
        } else if (this.accessToken) {
            this.loadFromCloud();
        } else {
            game.initData();
        }
        
        await randomSleep(1000, 2000);
        
        heartbeatWorker.postMessage('START_TICK')
        requestAnimationFrame(game.renderUI.bind(game));
        
        try {
            if (this.player.settings.sleepMode) {
                timerManager.createTimer('sleepMode', 30, this.sleepMode.bind(game))
            }

            timerManager.createTimer('autoLocalSave', this.player.settings.autoSaveInterval, this.save.bind(game));
            timerManager.createTimer('cloudSave', 600, this.saveToCloud.bind(game));
        } catch (err) {
            console.error(err.message);
        }

        loading_save.hidden = true;
        isLoaded = true;
    }

    sleepMode() {
        isSleeping = true;
        sleepModeScreen.hidden = false;
        timerManager.setTimerInterval('sleepMode', 999999999999999);
    }

    async syncServerWithDeviceTime() {
        try {
            const requestStart = performance.now();
            console.log("rt");
            const serverTime = await getTime() * 1000;
            console.log("sb")

            const requestEnd = performance.now();
            const latency = (requestEnd - requestStart) / 2
            const precisePerfTime = requestEnd - latency;

            Object.defineProperty(window, 'SECURE_CLOCK_ORIGIN', {
                value: serverTime - precisePerfTime,
                writable: false,
                configurable: false
            });

            secureTimeOrigin = window.SECURE_CLOCK_ORIGIN;
            console.log("Game clock succesfully sync with network!")
        } catch (error) {
            console.warn("Network sync failed. Returns to default value.");
            secureTimeOrigin = Date.now() - performance.now();
        }
    }

    initData(saveString) {
        const data = saveString;
        if (!saveString) {
            const time = getGameTime();
            const defaultSave = VERSION + "," + time + "," + "default0" + ";" + "0,0|0,1,1|1,0,0,0,0|00000|1,1,30,1";
            localStorage.setItem("gameState", defaultSave);
            console.log("created new storage data!");
        } else {
            console.log(`data: ${data}`);
            try {
                const segments = data.split("");
                let newData = [""];
                
                let step = 0;
                for (let i = 0; i < segments.length; i++) {
                    let whatever = segments[i].indexOf(";");
                    if (whatever != -1) {
                        newData[step] += segments[i].slice(0, whatever);
                        step += 1;
                        if (newData[step] === undefined) {
                            newData[step] = "";
                        }
                        newData[step] += segments[i].slice(whatever + 1);
                    } else {
                        newData[step] += segments[i]
                    }
                }

                const metaData = newData[0].split(",");
                const savedVersion = metaData[0];
                console.log(newData);

                if (savedVersion !== VERSION) {
                    console.log(`Migrating save file from ${savedVersion} to ${VERSION}!`);
                    const VERSION_TIMELINE = ["v0.1", "v0.11"];

                    const migrationSteps = {
                        "v0.1": function() {
                            // [PLACEHOLDER]
                        },
                        "v0.11": function() {
                            // [PLACEHOLDER]
                        }
                    };

                    let safeLoopCounter = 0;

                    while (savedVersion !== VERSION && safeLoopCounter < 10) {
                        if (migrationSteps[savedVersion]) {
                            migrationSteps[savedVersion]();
                        }

                        let currentIndex = VERSION_TIMELINE.indexOf(savedVersion);
                        
                        if (currentIndex != 1 && currentIndex < VERSION_TIMELINE.length - 1) {
                            savedVersion = VERSION_TIMELINE[currentIndex++];
                            console.log(`Stepping version tracker up to: ${savedVersion}`);
                        } else {
                            savedVersion = VERSION;
                            break;
                        }

                        safeLoopCounter++;
                    }

                    const updatedMeta = VERSION + "," + getGameTime();
                    const updatedData = `${currencies.join(",")}|${stats.join(",")}|${miners.join(",")}|${achievements.join("")}`;
                    localStorage.setItem("gameState", `${updatedMeta};${updatedData}`);
                }
                const coreGameStats = newData[1].split("|");

                const currencies = coreGameStats[0].split(",");
                const stats = coreGameStats[1].split(",");
                const miners = coreGameStats[2].split(",");
                const achievements = coreGameStats[3].split("");
                const settings = coreGameStats[4].split(",");

                console.log(settings, coreGameStats);

                this.player.currencies.rock = new Decimal(currencies[1] || 0);
                this.player.currencies.dust = new Decimal(currencies[0] || 0);
                
                const statsDataList = Object.keys(this.player.stats || {});

                for (let i = 0; i < stats.length; i++) {
                    if (this.player.stats[statsDataList[i]] instanceof Decimal) {
                        this.player.stats[statsDataList[i]] = new Decimal(stats[i]);
                    }
                }

                for (let i = 0; i < settings.length; i++) {
                    switch (i) {
                        case 0: // Notation
                            if (settings[i] === "1") {
                                this.player.settings.notation = "Normal";
                            } else if (settings[i] === "2") {
                                this.player.settings.notation = "Scientific";
                            } else if (settings[i] === "3") {
                                this.player.settings.notation = "Engineering";
                            } else {
                                console.error("undefined notation setting: ", settings[i]);
                                this.player.settings.notation = "Normal";
                            }

                            break;
                        case 1: // music_toggle
                            if (settings[i] === "0") {
                                this.player.settings.musicEnabled = false;
                            }
                            break;
                        case 2: // auto_save_interval
                            const num = Number.parseInt(settings[i], 10);
                            if (!num || Number.isNaN(num)) {
                                console.warn(`Autosave interval must be a valid number string! ["${settings[i]}"]`);
                                break;
                            }

                            this.player.settings.autoSaveInterval = num;
                            break;
                        case 3: // sleep_mode
                            if (settings[i] === "1") {
                                this.player.settings.sleepMode = true;
                            }
                            break;
                    }
                }

                for (let i = 1; i < 5 + 1; i++) {
                    const miner = this.player.miners[`miner${i}`];
                    miner.level = new Decimal(miners[i - 1])
                    if (miner.sps * miner.level) {
                        miner.sps = miner.level.mul(1);
                    };
                }

                for (let i = 0; i < this.achievementsRegistry.length; i++) {
                    if (achievements[i] === "1") {
                        this.player.achievements.push(i + 1);
                    }
                }

                // const dt = getTime() - Number.parseInt(metaData[1], 10) || 0;
            } catch (err) {
                console.error("Error while initializing data: ", err);
            }
        }
    }

    loop(timeStamp) {
        let deltaTime = timeStamp - this.lastTick;
        this.lastTick = timeStamp;

        if (deltaTime >= 1000) {
            deltaTime = 1000;
        }

        const dtCalculated = new Decimal(deltaTime).mul(this.player.stats.gameSpeed);

        for (const timeAccumulator in this.timeAccumulators) {
            if (!Object.hasOwn(this.timeAccumulators, timeAccumulator)) continue;

            if (timeAccumulator.startsWith("miner")) {
                const miner = this.player.miners[timeAccumulator];
                if (!miner || miner.level.lt(1)) { continue; }
                this.timeAccumulators[timeAccumulator] = this.timeAccumulators[timeAccumulator].add(dtCalculated.mul(miner.sps));
                continue;
            }
        }
        this.updateGameLogic();
        timerManager.updateTimer(deltaTime);
    }

    changeBulk() {
        const tier = [1, 5, 10, 25, 100, Infinity];
        const i = tier.indexOf(this.bulkCount);
        this.bulkCount = tier[(i + 1) % tier.length];
    }

    changeSetting(name, value = 0) {
        switch (name) {
            case "music_toggle":
                if (inputLock) return;
  
                if (!bgMusic.paused || !this.player.settings.musicEnabled) {
                    bgMusic.play();
                    console.log("0");
                    musicToggleText.innerHTML = "Music: off";
                } else {
                    musicToggleText.innerHTML = "Music: on";
                    bgMusic.pause();
                    console.log("1");
                }

                this.player.settings.musicEnabled = !this.player.settings.musicEnabled;

                break;
            case "autosave_interval":
                if (value < 10 || value > 60) return;

                this.player.settings.autoSaveInterval = value;
                changeTimerInterval('autoLocalSave', value);
                break;
            case "notations":
                if (typeof(value) != 'string') return;
                
                switch (value) {
                    case "normal":
                        this.player.settings.notation = "Normal";
                        break;
                    case "scientific":
                        this.player.settings.notation = "Scientific";
                        break;
                    case "engineering":
                        this.player.settings.notation = "Engineering";
                        break;
                }
            case "sleepmode_toggle":
                if (!this.player.settings.sleepMode && !timerManager.FindTimer("sleepMode")) {
                    timerManager.createTimer("sleepMode", 30, this.sleepMode.bind(game));
                    sleepModeBtn.innerHTML = "Sleep mode: on";
                } else {
                    timerManager.removeTimer("sleepMode");
                    sleepModeBtn.innerHTML = "Sleep mode: off";
                }

                this.player.settings.sleepMode = !this.player.settings.sleepMode;
                break;
        }
    }

    upgradeMiner(id, count) {
        const miner = this.player.miners[id];
        if (!miner) return;
        let tempLevel = miner.level;
        let cost = new Decimal(0);
        let tempCost = new Decimal(0);
        let addLevel = new Decimal(0);

        for (let i = 0; i < count; i++) {
            tempCost = miner.cost.mul(tempLevel.eq(0) ? 1 : tempLevel.pow(1.3));

            if (this.player.currencies.rock.lte(cost.add(tempCost))) break;
            cost = cost.add(tempCost);
            tempLevel = tempLevel.add(1);
            addLevel = addLevel.add(1);
        }

        if (this.player.currencies.rock.gte(cost)) {
            this.addMetric(["player", "miners", id, "level"], addLevel);
            this.addMetric(["player", "miners", id, "sps"], 5 * addLevel);
            this.addMetric(["player", "currencies", "rock"], -cost);
        }
    }

    buyAllMiners() {
        for (let i = 0; i < 5 + 1; i++) {
            this.upgradeMiner(`miner${i}`, this.bulkCount);
        }
    }

    resetLocalSave() {
        localStorage.clear();
        this.initData();
        this.initData();
    }

    addMetric(arrayPath, amount) {
        let current = this;

        for (let i = 0; i < arrayPath.length - 1; i++) {
            current = current[arrayPath[i]];
        }

        const finalProperty = arrayPath[arrayPath.length - 1];
        if (current[finalProperty] instanceof Decimal) {
            current[finalProperty] = current[finalProperty].add(amount);
        } else {
            current[finalProperty] += amount;
        }

        this.scanAutomatedAchievements();
    }

    scanAutomatedAchievements() {
        this.achievementsRegistry.forEach(ach => {
            if (!ach.auto || this.player.achievements.includes(ach.id)) return;

            let passStandardCheck = false;
            let passCustomCheck = true;
            
            if (ach.metricPath && ach.targetValue !== undefined) {
                let currentValue = this;
                for (const property of ach.metricPath) {
                    currentValue = currentValue[property];
                }

                if (currentValue instanceof Decimal) {
                    if (currentValue.lte(ach.targetValue)) {
                        passStandardCheck = true;
                    }
                } else {
                    if (currentValue >= ach.targetValue) {
                        passStandardCheck = true;
                    }
                }

                
            } else {
                passStandardCheck = true;  
            }

            if (typeof ach.customCheck === "function") {
                passCustomCheck = ach.customCheck();
            }

            if (passStandardCheck && passCustomCheck) {
                this.unlockAchievement(ach.id);
            }
        })
    }

    save() {
        let data = localStorage.getItem("gameState")
        let time = getGameTime();

        if (!data) {
            const defaultSave = VERSION + "," + time + "," + "default0" + ";" + "0,0|0,1,1|1,0,0,0,0|00000|1,1,30,1";
            localStorage.setItem("gameState", defaultSave);
            console.log("created new storage data!");
        } else {
            console.log("saving...");

            const saveData = this.parseSaveFile();
            if (!saveData) {
                console.error("something wrong when saving.");
                return;
            }

            localStorage.setItem("gameState", saveData);
        }
    }

    unlockAchievement(id) {
        const ach = this.player.achievements.includes(id);
        if (ach) return;

        this.player.achievements.push(id);
        const data = this.achievementsRegistry.find(achData => achData.id === id);
        console.log(`[ACHIEVEMENT]: Unlocked achievement ${data.name} [${data.desc}]`);
    }

    updateGameLogic() {
        for (const timeAccumulator in this.timeAccumulators) {
            if (!Object.hasOwn(this.timeAccumulators, timeAccumulator)) continue;
            let timeAcc = this.timeAccumulators[timeAccumulator];
            if (timeAcc.lt(1000)) continue;

            if (timeAccumulator.startsWith("miner")) {
                const miner = this.player.miners[timeAccumulator]
                if (!miner || miner.level.lt(1) ) return; 
                    this.addMetric(["player", "currencies", "rock"], miner.sps);

                    this.timeAccumulators[timeAccumulator] = new Decimal(0);
            }
        }
    }

    renderUI() {
        for (let i = 0; i < 5; i++) {
            const miner = this.player.miners[`miner${i + 1}`];
            const btn = document.getElementById(`miner${i + 1}` + "-upgrade");
            if (btn) {
                const nextCost =  miner.cost.mul(miner.level.eq(0) ? 1 : miner.level.pow(1.1)).floor();
                btn.innerHTML = `${utils.slopify(nextCost, game.player.settings.notation)} [${miner.level}, ${miner.sps.toFixed(2)} sps]`;
            }
        }
        
        rock_count.innerHTML = utils.slopify(this.player.currencies.rock.floor(), game.player.settings.notation);
        bulk_count.innerHTML = this.bulkCount === Infinity ? "Max" : this.bulkCount;

        requestAnimationFrame(this.renderUI.bind(this));
    }
};

const game = new Game();

function getGameTime() {
    if (secureTimeOrigin === null) {
        return Date.now();
    }

    return Math.floor(secureTimeOrigin / 1000 + (performance.now() / 1000));
}

function unlockMusic() {
    if (!isLoaded) { return; }
    
    inputLock = false;
    if (game.player.settings.musicEnabled) bgMusic.play().catch(() => {});
    ['pointerdown', 'keydown', 'touchstart'].forEach(e => window.removeEventListener(e, unlockMusic));
}

heartbeatWorker.onmessage = function(event) {
    if (event.data === 'TICK') {
        game.loop(event.timeStamp);
    }
}

sleepModeScreen.addEventListener("click", function(event) {
    isSleeping = false;
    sleepModeScreen.hidden = true;
    if (timerManager.FindTimer("sleepMode")) {
        timerManager.setTimerInterval('sleepMode', 15);
    }
})

window.addEventListener("keydown", async function(event) {
    if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() == 's')) {
        if (saveDebounce || !isLoaded) return;
        saveDebounce = true;

        event.preventDefault();
        game.save();

        await Sleep(1000);
        
        saveDebounce = false;
    }
    if (event.key.toLowerCase() === "b") {
        game.buyAllMiners();
    }
});

window.addEventListener('message', function(event) {
    if (event.origin != window.location.origin || !event.data) return;

    const { type, accessToken, state, error, expires_in } = event.data;

    if (error) {
        console.error("OAuth error:", error);
        return;
    }

    if (type == 'OAUTH_SUCCESS') {
        const savedState = this.sessionStorage.getItem('expectedState');

        this.sessionStorage.removeItem('expectedState');
        if (!savedState || savedState != state) {
            console.error("OAuth state mismatch. ignoring token.");
            return;
        }

        console.log("Success! Token verified: ", accessToken)
        game.accessToken = accessToken;

        const expiresIn = Number(expires_in || 3600);
        setCookie('google_access_token', accessToken, expiresIn - 60);
        loginStatusText.innerHTML = "isLogin = true;";
    }
})

document.addEventListener("contextmenu", function(event) {
    event.preventDefault();
});

document.addEventListener("visibilitychange", function() {
    console.log("hid?");
    if (isLoaded && document.visibilityState === "hidden") {
        game.save() // just incase.
    }
});

window.Game = game;
window.timerManager = timerManager;

game.init();
['pointerdown', 'keydown', 'touchstart'].forEach(e => window.addEventListener(e, unlockMusic, { once: true }));