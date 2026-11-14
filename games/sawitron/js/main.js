/// <reference path="../../../utils/js/break_infinity.d.ts" />
import { Utils } from '../../../utils/js/utils.js';

const utils = new Utils();

const VERSION = "v0.01";

const sawitButton = document.getElementById("main-sawit");
const sawitCounter = document.getElementById("sawit-counter");
const hpCounter = document.getElementById("progress-hp-label");
const progressHP = document.getElementById("progress-hp");
const sfxToggleBtn = document.getElementById("sfx-toggle");
const musicToggleBtn = document.getElementById("music-toggle");
const plusLevelBtn = document.getElementById('high-level');
const minusLevelBtn = document.getElementById("low-level");
const levelCounter = document.getElementById("level-label");

const workerThread = new Worker("js/worker.js");

let baseHP = 100;
let activeAudioPool = [];
const AudioCache = new Map();

let clickSfxList = {
    none: {
        src: new Audio(""),
        volume: 0
    },
    akan_saya_lawan: {
        src: new Audio("../../assets/sawitron/sawit-click/akan_saya_lawan.mp3"),
        volume: 0.2
    },
    bajingan_prabowo: {
        src: new Audio("../../assets/sawitron/sawit-click/bajingan-prabowo.mp3"),
        volume: 1
    },
    berpikir_secara_logika: {
        src: new Audio("../../assets/sawitron/sawit-click/berfikir-secara-logika.mp3"),
        volume: 1
    },
    diantaraku_dan_sawit: {
        src: new Audio("../../assets/sawitron/sawit-click/diantaraku-dan-sawit.mp3"),
        volume: 1
    },
    fahhhhhh: {
        src: new Audio("../../assets/sawitron/sawit-click/fahhhhhh.mp3"),
        volume: 0.5
    },
    get_out: {
        src: new Audio("../../assets/sawitron/sawit-click/get-out.mp3"),
        volume: 1
    },
    hey_antek2_aseng: {
        src: new Audio("../../assets/sawitron/sawit-click/hey_antek2_aseng.mp3"),
        volume: 0.5
    },
    hey_antek2_aseng_v2: {
        src: new Audio("../../assets/sawitron/sawit-click/hey-antek2-aseng-v2.mp3"),
        volume: 1
    },
    hidup_jokowi: {
        src: new Audio("../../assets/sawitron/sawit-click/hidup_jokowi.mp3"),
        volume: 0.6
    },
    iwak_tempe: {
        src: new Audio("../../assets/sawitron/sawit-click/iwak-tempe.mp3"),
        volume: 1
    },
    jokowi_kaget: {
        src: new Audio("../../assets/sawitron/sawit-click/jokowi-kaget.mp3"),
        volume: 1
    },
    jokowi_saya_akan_lawan: {
        src: new Audio("../../assets/sawitron/sawit-click/jokowi-saya-akan-lawan.mp3"),
        volume: 1
    },
    mas_anies2_prabowo: {
        src: new Audio("../../assets/sawitron/sawit-click/mas-anies-mas-anies-prabowo.mp3"),
        volume: 1
    },
    metal_pipe: {
        src: new Audio("../../assets/sawitron/sawit-click/metal-pipe-clang.mp3"),
        volume: 1
    },
    ndasmu: {
        src: new Audio("../../assets/sawitron/sawit-click/ndasmu.mp3"),
        volume: 1
    },
    prabowo_10_6: {
        src: new Audio("../../assets/sawitron/sawit-click/prabowo-10+6.mp3"),
        volume: 1
    },
    prabowo_emng_gw_pikirin: {
        src: new Audio("../../assets/sawitron/sawit-click/prabowo-emang-gue-pikirin.mp3"),
        volume: 1
    },
    prabowo_nyenye: {
        src: new Audio("../../assets/sawitron/sawit-click/prabowo-nyenye.mp3"),
        volume: 1
    },
    prabowo_sodara2: {
        src: new Audio("../../assets/sawitron/sawit-click/prabowo-sodara-sodara.mp3"),
        volume: 1
    },
    prabowo_sorryye: {
        src: new Audio("../../assets/sawitron/sawit-click/prabowo-sorry-ye.mp3"),
        volume: 1
    },
    rakyatdesa_gkpakedollar: {
        src: new Audio("../../assets/sawitron/sawit-click/rakyat-di-desa-gak-pake-dollar-kok.mp3"),
        volume: 1
    },
    saking_pintar_jadi_gblk: {
        src: new Audio("../../assets/sawitron/sawit-click/saking-pintarnya-jadi-gblk.mp3"),
        volume: 1
    },
    tidak_takut_mas_anies: {
        src: new Audio("../../assets/sawitron/sawit-click/tidak-takut-mas-anies-prabowo.mp3"),
        volume: 1
    },
    vine_boom: {
        src: new Audio("../../assets/sawitron/sawit-click/vine-boom.mp3"),
        volume: 1
    },
    woo_celeng_gufron: {
        src: new Audio("../../assets/sawitron/sawit-click/woo-celeng-gufron.mp3"),
        volume: 1
    }
    
};

class Game {
    constructor() {
        this.player = {
            mainData: {
                maxHP: new Decimal(100),
                maxEnemyLevel: new Decimal(1),
                enemyLevel: new Decimal(1),
                HP: new Decimal(100),
            },

            otherData: {
                prevEnemyLevel: new Decimal(1)
            },
            currencies: {
                konohaToken: new Decimal(0),
                sawit: new Decimal(0),
                crudePalmOil: new Decimal(0),
                cookingOil: new Decimal(0),
                money: new Decimal(0)
            },
            stats: {
                gameSpeed: new Decimal(1),
                unscaledTotalTimePlay: new Decimal(0),
                scaledTotalTimePlay: new Decimal(0)
            },

            inventory: {
                weapons: [
                    { id: "wpn_starter", dmg: new Decimal(1), dmgType: 0, defPenetrate: 0}
                ]
            },

            achievements: [],

            settings: {
                notation: "Normal",
                musicToggle: true,
                sfxToggle: true,
                sawitSFX: "none",
                sleepMode: false
            }
        }

        this.lastTick = performance.now();
    }

    changeSetting(name, value = 0) {
        if (typeof(name) != "string") return;
        switch (name) {
            case "notations":
                if (typeof(value) != "string") return;
                
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
                break;
            case "sawitSFX":
                if (typeof(value) != "string") return;

                try {
                    if (!clickSfxList[value.toLowerCase()]) return;

                    currentClickTemplate = clickSfxList[value.toLowerCase()].src;
                    this.player.settings.sawitSFX = value.toLowerCase();
                } catch (err) {
                    console.error("Error while changing settings: ", err);
                    return;
                }
                break;
            case "music_toggle":
                this.player.settings.musicToggle = !this.player.settings.musicToggle;
                break;
            case "sfx_toggle":
                if (!this.player.settings.sfxToggle) {
                    playSoundEffect();
                    sfxToggleBtn.innerHTML = 'SFX: on';
                } else {
                    // implement something
                    sfxToggleBtn.innerHTML = 'SFX: off';
                }

                this.player.settings.sfxToggle = !this.player.settings.sfxToggle;
                break;
        }
    }

    doClick() {
        const equippedWeapon = game.player.inventory.weapons[0];
        if (!equippedWeapon) {
            return;
        }
        if (this.player.settings.sawitSFX.toLowerCase() != "none")  playSoundEffect();

        switch (equippedWeapon.dmgType) {
            case 0: // Physical Damage
                this.player.mainData.HP = this.player.mainData.HP.sub(equippedWeapon.dmg);
            case 1: // Poison Damage
                // test
            case 2: // Fire Damage
                // test
            case 3: // Ice Damage
                // test
        }
        
    }

    async initData() {
        const data = localStorage.getItem("gameState2");
        if (!data) {
            const time = 0;
            const defSave = VERSION + "," + time + ",default0;0,0,0,0|0,1,1|1,0,0,0,0|00000|1,1,30,1";
            localStorage.setItem("gameState2", defSave);
            console.log("created new storage data!");
        }
    }

    async init() {
        await Promise.all(
            Object.entries(clickSfxList).map(async ([key, sfxConfig]) => {
                if (!sfxConfig.src.src || sfxConfig.src.src === window.location.href) {
                    return;
                }

                try {
                    const response = await fetch(sfxConfig.src.src);
                    if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);

                    const audioBlob = await response.blob();
                    const blobUrl = URL.createObjectURL(audioBlob);

                    AudioCache.set(key, blobUrl);
                    console.log(`[Audio Cache]: Loaded key "${key}" -> ${blobUrl}`);
                } catch (err) {
                    console.error(`Failed to preload audio asset "${key}":`, err);
                }
            })
        );
        await this.initData();

        workerThread.postMessage('START_TICK');
        requestAnimationFrame(game.updateUI.bind(game));
    }

    loop(timeStamp) {
        let deltaTime = timeStamp - this.lastTick;
        this.lastTick = timeStamp;

        if (deltaTime >= 1000) {
            deltaTime = 1000;
        }

        this.updateGameLogic();
    }

    updateGameLogic() {
        this.player.mainData.enemyLevel = Decimal.max(this.player.mainData.enemyLevel, 1);
        this.player.mainData.enemyLevel = Decimal.min(this.player.mainData.enemyLevel, this.player.mainData.maxEnemyLevel);
        this.player.mainData.HP = Decimal.min(this.player.mainData.HP, this.player.mainData.maxHP); 

        const levelChanged = !this.player.otherData.prevEnemyLevel.eq(this.player.mainData.enemyLevel);
        const enemyDead = this.player.mainData.HP.lt(1);

        if (levelChanged || enemyDead) {
            if (enemyDead) {
                if (this.player.mainData.enemyLevel.eq(this.player.mainData.maxEnemyLevel)) {
                    this.player.mainData.maxEnemyLevel = this.player.mainData.maxEnemyLevel.add(1);
                }

                const base = 1;
                const growthRate = 1.1;
                this.player.mainData.HP = this.player.mainData.maxHP;
                this.player.currencies.sawit = this.player.currencies.sawit.add(
                    Decimal.pow(growthRate, this.player.mainData.enemyLevel)
                    .mul(base)
                    .floor()
                );
            }

            if (levelChanged) {
                if (this.player.mainData.enemyLevel)
                    this.player.otherData.prevEnemyLevel = this.player.mainData.enemyLevel;
                    this.player.mainData.HP = this.player.mainData.maxHP = new Decimal(baseHP)
                        .mul(this.player.mainData.enemyLevel
                        .pow(new Decimal(1.02)
                        .add(this.player.mainData.enemyLevel
                        .div(100))))
                        .floor();
                }
        }
    }
    updateUI() {
        if (this.player.mainData.enemyLevel.eq(1) && !minusLevelBtn.disabled) {
            minusLevelBtn.disabled = true;
        } else if (!this.player.mainData.enemyLevel.eq(1) && minusLevelBtn.disabled) {
            minusLevelBtn.disabled = false;
        }

        if (this.player.mainData.enemyLevel.eq(this.player.mainData.maxEnemyLevel) && !plusLevelBtn.disabled) {
            plusLevelBtn.disabled = true;
        } else if (!this.player.mainData.enemyLevel.eq(this.player.mainData.maxEnemyLevel) && plusLevelBtn.disabled) {
            plusLevelBtn.disabled = false;
        }

        levelCounter.innerHTML = `${utils.slopify(this.player.mainData.enemyLevel, this.player.settings.notation, true)}`;
        sawitCounter.innerHTML = `${utils.slopify(this.player.currencies.sawit, this.player.settings.notation)}`;
        hpCounter.innerHTML = `${utils.slopify(this.player.mainData.HP, this.player.settings.notation)}`;
        progressHP.style.width = `${this.player.mainData.HP.div(this.player.mainData.maxHP).mul(100).toString()}%`;
        requestAnimationFrame(game.updateUI.bind(game));
    }
};

const game = new Game();

workerThread.onmessage = function(event) {
    if (event.data === 'TICK') {
        game.loop(event.timeStamp);
    }
};


function playSoundEffect() {
    if (!game.player.settings.sfxToggle || activeAudioPool.length > 99) return;
    const url = AudioCache.get(game.player.settings.sawitSFX);
    if (!url) return;

    const sound = new Audio(url);

    activeAudioPool.push(sound);

    sound.addEventListener('ended', () => {
        const index = activeAudioPool.indexOf(sound);
        if (index > -1) {
            activeAudioPool.splice(index, 1);
        }

        sound.remove();
    });

    sound.play().catch(err => {
        console.log("Audio playback blocked by browser security policy: ", err);
    });
}

document.querySelectorAll(".nav-tab").forEach(button => {
    button.addEventListener("click", () => {
        const target = button.dataset.tab;

        document.querySelectorAll(".game-tab").forEach(tab => {
            tab.hidden = tab.id != target;
        });

        document.querySelectorAll(".nav-tab").forEach(tab => {
            tab.classList.toggle("active", tab === button);
        });
    });
});

document.addEventListener("contextmenu", function(event) {
    event.preventDefault();
});

plusLevelBtn.addEventListener('click', function(event) {
    game.player.mainData.enemyLevel = game.player.mainData.enemyLevel.add(1);
});

minusLevelBtn.addEventListener('click', function(event) {
    game.player.mainData.enemyLevel = game.player.mainData.enemyLevel.sub(1);
});

sawitButton.addEventListener('click', function(event) {
    game.doClick();
});

window.Game = game;
window.audioCache = AudioCache;
window.audioPool = activeAudioPool;
game.init();