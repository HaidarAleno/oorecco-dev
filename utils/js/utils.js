export class Utils {
    slopify(num, notation = "Normal", decimalFormatting = false) {
        const suffixes = [
        "", "K", "M", "B", "T", "Qd", "Qn", "Sx", "Sp", "Oc", "No",
        "Dc", "UDc", "DDc", "TDc", "QaDc", "QiDc", "SxDc", "SpDc", "OcDc", "NoDc",
        "Vg", "UVg", "DVg", "TVg", "QaVg", "QiVg", "SxVg", "SpVg", "OcVg", "NoVg",
        "Tg", "UTg", "DTg", "TTg", "QaTg", "QiTg", "SxTg", "SpTg", "OcTg", "NoTg",
        "Qa", "UQa", "DQa", "TQa", "QaQa", "QiQa", "SxQa", "SpQa", "OcQa", "NoQa",
        "Qi", "UQi", "DQi", "TQi", "QaQi", "QiQi", "SxQi", "SpQi", "OcQi", "NoQi",
        "Sx", "USx", "DSx", "TSx", "QaSx", "QiSx", "SxSx", "SpSx", "OcSx", "NoSx",
        "Sp", "USp", "DSp", "TSp", "QaSp", "QiSp", "SxSp", "SpSp", "OcSp", "NoSp",
        "Oc", "UOc", "DOc", "TOc", "QaOc", "QiOc", "SxOc", "SpOc", "OcOc", "NoOc",
        "No", "UNo", "DNo", "TNo", "QaNo", "QiNo", "SxNo", "SpNo", "OcNo", "NoNo",
        "Ce", "UCe"
        ];

        if (decimalFormatting) {
            const str = num instanceof Decimal
                ? num.floor().toString()
                : Math.floor(num).toString();

            return str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }

        if (num instanceof Decimal) {
            switch (notation) {
                case "Normal": {
                    if (num.lt(1000000) ) { return num.floor().toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
                    if (num.gte("1.78e308")) {
                        if (num.exponent >= 1e9) {
                            return "e" + slopify(num.exponent);
                        } else if (num.exponent >= 100000) {
                            return "e"+ num.exponent.toLocaleString('en-US');
                        } else {
                            return num.toStringWithDecimalPlaces(2).replace("+", "");
                        }
                    }

                    const tier = new Decimal(num.log10()).div(3).floor();

                    const i = Decimal.min(tier, suffixes.length - 1);

                    const scale = Decimal.pow(10, i.mul(3));
                    const formatted = num.div(scale);

                    return formatted.toFixed(2).replace("/\.0$/", "") + suffixes[i];
                }
                case "Scientific": {
                    if (num.lte(1000000)) { return num.toString(); } 
                    if (num.exponent >= 1e9) {
                        const expPower = new Decimal(Math.floor(num.exponent));
                        const expScale = Decimal.pow(10, expPower);
                        const expFormatted = num.div(expScale);

                        return "e" + expFormatted.toFixed(2) + "e" + expPower.toString();
                    } else if (num.exponent >= 100000) {
                        return "e"+ num.exponent.toLocaleString('en-US');
                    } else {
                        return num.toStringWithDecimalPlaces(2).replace("+", "");
                    }
                }
                case "Engineering": {
                    if (num.lt(1000)) { return num.toString(); }
                    if (num.exponent >= 1e9) {
                        const tier = new Decimal(num.log10()).div(3).floor();

                        const scale = Decimal.pow(10, tier.mul(3));
                        const formatted = num.div(scale);

                        const exponent = tier.mul(3).toString();
                        return `${formatted.toFixed(2)}e${exponent}`; 
                    }
                }
            }
        }
        else {
            if (num < 1000) return num.toString();
            const tier = Math.floor(Math.log10(num) / 3);
            const i = Math.min(tier, suffixes.length - 1);

            const scale = Math.pow(10, i * 3);
            const formatted = num / scale;

            return formatted.toFixed(2).replace("/\.0$/", "") + suffixes[i];
        }
    }

    async getTime() {
        try {
            console.log("bs");
            const response = await fetch('https://aisenseapi.com/services/v1/datetime', {
                signal: AbortSignal.timeout(5000)
            });
            if (!response.ok) { throw new Error('HTTP' + response.status); }

            console.log("get");
            const serverData = await response.json();

            const unixSeconds = Math.floor(new Date(serverData.datetime).getTime() / 1000);
            console.log(unixSeconds);
            return unixSeconds;
        }
        catch (err) {
            console.warn("Time fetch failed! Using device time. (", err, ")");
            return Math.floor(new Date().getTime() / 1000);
        }
    }

    decMod(a, b) {
        a = new Decimal(a); b = new Decimal(b);
        return a.sub(a.div(b).floor().mul(b));
    }

    unlockMusic() {
        if (!isLoaded) { return; }
        
        inputLock = false;
        if (game.player.settings.musicEnabled) bgMusic.play().catch(() => {});
        ['pointerdown', 'keydown', 'touchstart'].forEach(e => window.removeEventListener(e, unlockMusic));
    }

    setCookie(name, value, maxAgeSeconds) {
        document.cookie = name + '=' + encodeURIComponent(value) + 
            '; Max-Age=' + Math.max(0, Math.floor(maxAgeSeconds)) +
            '; Path=' + COOKIE_PATH +
            '; SameSite=Lax' + 
            'Secure';
    }

    getCookie(name) {
        const match = document.cookie.split('; ').find(c => c.startsWith(name + "="));
        return match ? decodeURIComponent(match.substring(name.length + 1)) : null;
    }

    deleteCookie(name) {
        document.cookie = name + '=; Max-Age=0; Path=' + COOKIE_PATH;
    }
};

