const Waterblume = {};

Waterblume.RAM = {
    'ts': 0,
    'isOver': false,
    'keydownQueueMap': {},
    'progress': 0
};

Waterblume.readConfigVer1 = function (configText) {
    let lines = configText.trim().split('\n');
    console.log(lines);
    if (lines[0].indexOf('WaterblumeTrackConfig:v1') !== 0) {
        console.log(`Error: Cannot find magic header at the initial line`);
        return 1;
    };
    let metadata = {};
    let trackBeatsArr = [];
    lines.slice(1).map(function (line) {
        if (line[0] === '#') {
            return 0;
        };
        if (line[0] === '@') {
            // let tline = line.slice(1)
            metadata[line.slice(1).split('=')[0]] = line.slice(1).split('=')[1]
            if (!isNaN(parseInt(line.slice(1).split('=')[1]))) {
                metadata[line.slice(1).split('=')[0]] = parseInt(line.slice(1).split('=')[1])
            };
            return 0;
        };
        // Actual key notes
        trackBeatsArr.push(line.replace(/[^wasdijkl]/g, ''));
    });
    return {
        bpm: metadata.bpm,
        keys: trackBeatsArr
    };
};

Waterblume.renderScreen = function (tickFrameData) {
    let listContent = 'wasdijkl'.split('').map(function (x) {
        let keyProgress = tickFrameData.keys[x];
        let myStyle = '';
        let myBoxShadow = `box-shadow: rgba(0, 0, 0, ${Math.min(1, Math.max(0.1, keyProgress * 1.15))}) 0 0 0 ${Math.max(0, 32*(1-keyProgress*1.13))}px;`;
        if (keyProgress > 0.01) {
            myStyle = `${myBoxShadow} background: #FFF;`
        }
        if (keyProgress > 0.75) {
            myStyle = `${myBoxShadow} background: #DDD;`
        }
        return `<div
            class="key-box"
            data-hit-state="${Waterblume.RAM.hitFeedbackAlert[x].feedback || 'none'}"
            data-progress="${keyProgress}"
            data-missed-114514="${(keyProgress > 0.99 && Waterblume.RAM.hitFeedbackAlert[x].feedback === 'none') ? 'true' : 'false'}"
            data-for-key="${x}"
            style="${myStyle}">${x.toUpperCase()}
        </div>`;
    }).join('');
    Waterblume.RAM.canvasContext.innerHTML = `<div class="main-canvas">
        <style>
        .main-canvas {
            position: fixed;
            top: 50vh;
            left: 50vw;
            width: 900px;
            height: 500px;
            transform: translate(-50%, -50%);
        }
        .main-canvas * {
            transition: all 50ms linear;
        }
        .key-box-container {
            position: absolute;
            top: 60px;
            left: 0px;
            width: 100%;
        }
        .key-box {
            font-size: 30px;
            line-height: 94px;
            text-align: center;
            box-sizing: border-box;
            border: 3px solid #000;
            border-radius: 300px;
            position: absolute;
            width: 100px;
            height: 100px;
        }
        .key-box[data-missed="true"] { background: #F00; }
        .key-box[data-hit-state="none"] { }
        .key-box[data-hit-state="miss"] { background: #F88 !important; }
        .key-box[data-hit-state="bad"] { background: #FA5 !important; }
        .key-box[data-hit-state="good"] { background: #19F !important; }
        .key-box[data-hit-state="perfect"] { background: #4F9 !important; }
        .key-box[data-for-key="w"] { top: 100px; left: 200px; }
        .key-box[data-for-key="a"] { top: 200px; left: 100px; }
        .key-box[data-for-key="s"] { top: 300px; left: 200px; }
        .key-box[data-for-key="d"] { top: 200px; left: 300px; }
        .key-box[data-for-key="i"] { top: 100px; left: 600px; }
        .key-box[data-for-key="j"] { top: 200px; left: 500px; }
        .key-box[data-for-key="k"] { top: 300px; left: 600px; }
        .key-box[data-for-key="l"] { top: 200px; left: 700px; }
        .progress-bar {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 3px;
            background: #999;
        }
        .progress-bar-inner {
            height: 3px;
            background: #19F;
            width: 0%;
            transition: all 50ms linear;
        }
        .metadata-item {
            font-size: 40px;
            font-weight: 600;
            text-align: center;
            position: absolute;
            top: 0px;
            width: 300px;
            padding: 35px 0 0 0;
        }
        .score-board { left: 100px; }
        .combo-count { right: 100px; }
        .metadata-item-header {
            font-size: 13px;
            font-weight: 400;
        }
        </style>
        <div class="key-box-container">
            ${listContent}
        </div>
        <div class="progress-bar">
            <div class="progress-bar-inner" style="width: ${Math.min(100, Math.ceil(Waterblume.RAM.progress * 100))}%">
            </div>
        </div>
        <div class="metadata-item score-board"><div class="metadata-item-header">Score</div>${Waterblume.RAM.score}</div>
        <div class="metadata-item combo-count"><div class="metadata-item-header">Combo</div>${Waterblume.RAM.combo}</div>
        <div class="hit-ratio"></div>
    </div>`;
};

Waterblume.addScore = function (scoreType) {
    Waterblume.RAM.score += ({
        'good': 10,
        'perfect': 15
    })[scoreType];
};

Waterblume.addCombo = function () {
    Waterblume.RAM.combo += 1;
};

Waterblume.breakCombo = function () {
    Waterblume.RAM.combo = 0;
};

Waterblume.parseBeats = function (gameConfig) {
    let myKeysObjList = {};
    let tickBeatMap = [];
    let beatTickMap = [];
    let trackTotalSeconds =  Waterblume.RAM.gameConfig.keys.length / Waterblume.RAM.gameConfig.bpm * 60;
    let trackTotalTicks = trackTotalSeconds * 20;
    let expectedHits = {};
    for (var i = 0; i < trackTotalTicks; i++) {
        tickBeatMap[i] = {
            forBeat: null
        };
    };
    gameConfig.keys.map(function (line, lineIndex) {
        line.split('').map(function (lineKey, lineKeyIndex) {
            expectedHits[lineIndex + '/' + lineKey] = 'wait';
        });
        myKeysObjList[lineIndex] = {
            perfectBeat: lineIndex,
            keys: line.split('')
        };
        let forTick = Math.floor((60*1000)/Waterblume.RAM.gameConfig.bpm * lineIndex / 50);
        beatTickMap[lineIndex] = forTick;
        tickBeatMap[forTick].forBeat = lineIndex;
    });
    console.log(`Ticks per Beat: ${Math.floor((60*1000)/Waterblume.RAM.gameConfig.bpm / 50)} tpb`);
    return {
        tpb: Math.floor((60*1000)/Waterblume.RAM.gameConfig.bpm / 50),
        keys: myKeysObjList,
        tickBeatMap: tickBeatMap,
        beatTickMap: beatTickMap,
        ehits: expectedHits
    };
};

Waterblume.mainLoop = function (argv) {
    // To be run every 50 ms
    if (Waterblume.RAM.isOver === true) {
        return 0;
    };

    // Bump timestamp by 1
    Waterblume.RAM.ts += 1;
    Waterblume.RAM.progress = Waterblume.RAM.ts / Waterblume.RAM.parsedBeats.tickBeatMap.length;
    if (Waterblume.RAM.ts === Waterblume.RAM.parsedBeats.tickBeatMap.length) {
        Waterblume.RAM.isOver = true;
    };

    // Log expected keys in the current tick
    let theIndex = Waterblume.RAM.parsedBeats.beatTickMap.indexOf(Waterblume.RAM.ts);
    if (theIndex != -1) {
        console.log(`>> ${Waterblume.RAM.ts} beat ${theIndex} | expect ${Waterblume.RAM.parsedBeats.keys[theIndex].keys.join(',')}`);
    };

    // Initialize tick frame data
    let tickFrameData = {
        keys: {
            w: -1,
            a: -1,
            s: -1,
            d: -1,
            i: -1,
            j: -1,
            k: -1,
            l: -1
        },
        hits: {}
    };

    // Get current beat
    let currentBeat = -114514;

    // Scan future min(18, tickPerBeat-1) ticks
    if (Waterblume.RAM.ts >= 0) {
        for (var i = 0; i < Waterblume.RAM.scanFutureLength; i++) {
            let tickItr = Waterblume.RAM.parsedBeats.tickBeatMap[i + Waterblume.RAM.ts];
            // console.log(tickItr);
            if (tickItr && tickItr.forBeat !== null) {
                let correspondingBeat = Waterblume.RAM.parsedBeats.keys[tickItr.forBeat];
                currentBeat = tickItr.forBeat;
                Waterblume.RAM.currentBeat = currentBeat;
                correspondingBeat.keys.map(function (xx) {
                    tickFrameData.keys[xx] = 1 - (i / Waterblume.RAM.scanFutureLength);
                });
            };
        };
    };

    // Reduce hit feedback remaining ticks
    'wasdijkl'.split('').map(function (x) {
        if (Waterblume.RAM.hitFeedbackAlert[x].ticksMore < 1) {
            Waterblume.RAM.hitFeedbackAlert[x].feedback = 'none'
        } else {
            Waterblume.RAM.hitFeedbackAlert[x].ticksMore += -1;
        };
    });

    // Consume keydown queue
    let currentQueue = Object.keys(Waterblume.RAM.keydownQueueMap);
    Waterblume.RAM.keydownQueueMap = {};
    currentQueue.map(function (keydownKey) {
        // Each ehit can only be consumed once
        console.log(`Ehit state: ${ Waterblume.RAM.parsedBeats.ehits[currentBeat + '/' + keydownKey] } for ahit (${currentBeat}, ${keydownKey})`);
        if (Waterblume.RAM.parsedBeats.ehits[currentBeat + '/' + keydownKey] === 'wait') {
            Waterblume.RAM.parsedBeats.ehits[currentBeat + '/' + keydownKey] = 'ahit';
            tickFrameData.hits[keydownKey] = 'bad';
            if (tickFrameData.keys[keydownKey] > 0.7) {
                tickFrameData.hits[keydownKey] = 'good';
                Waterblume.addScore('good');
                Waterblume.addCombo();
            } else if (tickFrameData.keys[keydownKey] > 0.82) {
                tickFrameData.hits[keydownKey] = 'perfect';
                Waterblume.addScore('perfect');
                Waterblume.addCombo();
            };
            // Create alert for the ahit
            Waterblume.RAM.hitFeedbackAlert[keydownKey] = {
                ticksMore: 5,
                feedback: tickFrameData.hits[keydownKey]
            };
        };
        if (Waterblume.RAM.parsedBeats.ehits[currentBeat + '/' + keydownKey] === undefined) {
            // Bad hit
            Waterblume.breakCombo();
            Waterblume.RAM.hitFeedbackAlert[keydownKey] = {
                ticksMore: 5,
                feedback: 'bad'
            };
        };
    });

    // Scan missed hits
    'wasdijkl'.split('').map(function (candidateKey) {
        // Each miss can only be consumed once
        if (Waterblume.RAM.parsedBeats.ehits[(currentBeat-1) + '/' + candidateKey] === 'wait') {
            Waterblume.RAM.parsedBeats.ehits[(currentBeat-1) + '/' + candidateKey] = 'miss';
            console.log(`!!! Missed hit: beat ${(currentBeat-1)}, key ${candidateKey}`);
            tickFrameData.hits[candidateKey] = 'miss';
            // Create alert for the ahit
            Waterblume.RAM.hitFeedbackAlert[candidateKey] = {
                ticksMore: 5,
                feedback: 'miss'
            };
            Waterblume.breakCombo();
        };
    });

    // Render screen
    Waterblume.renderScreen(tickFrameData);
};

Waterblume.resetGameStates = function () {
    Waterblume.RAM.isOver = false;
    Waterblume.RAM.ts = -80;
    Waterblume.RAM.combo = 0;
    Waterblume.RAM.score = 0;
    Waterblume.RAM.progress = 0;
    Waterblume.RAM.keydownQueueMap = {};
    Waterblume.RAM.hitFeedbackAlert = {
        w: { ticksMore: 0, feedback: 'none' },
        a: { ticksMore: 0, feedback: 'none' },
        s: { ticksMore: 0, feedback: 'none' },
        d: { ticksMore: 0, feedback: 'none' },
        i: { ticksMore: 0, feedback: 'none' },
        j: { ticksMore: 0, feedback: 'none' },
        k: { ticksMore: 0, feedback: 'none' },
        l: { ticksMore: 0, feedback: 'none' }
    };
    Waterblume.RAM.parsedBeats = Waterblume.parseBeats(Waterblume.RAM.gameConfig);
    Waterblume.RAM.currentBeat = -114514;
};
Waterblume.bootloadGame = function (gameConfig, canvasContext) {
    Waterblume.RAM.isOver = false;
    Waterblume.RAM.gameConfig = gameConfig;
    Waterblume.resetGameStates();
    Waterblume.RAM.parsedBeats = Waterblume.parseBeats(gameConfig);
    console.log('Waterblume.RAM.parsedBeats', Waterblume.RAM.parsedBeats);
    Waterblume.RAM.canvasContext = canvasContext;
    // Waterblume.RAM.ts = -80;
    Waterblume.RAM.scanFutureLength = Math.min(18, Waterblume.RAM.parsedBeats.tpb-1);
    window.addEventListener('keydown', function (e) {
        if ('wasdijkl'.indexOf(e.key) === -1) {
            return 0;
        };
        Waterblume.RAM.keydownQueueMap[e.key] = true;
        console.log(`Keydown event: ${e.key}`);
    });
    window.setInterval(Waterblume.mainLoop, 50);
};
