// 使用 MedisRecorder 进行音频录制

/**
 *  you config
 * @type {{}}
 */
/**
 * 这是一个录音控制器
 * 提供回调方法给使用类
 */
var audioRTC = {
    // myMedia: (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia),
    myMedia: navigator.mediaDevices.getUserMedia,
    // recoreder的约束
    constraints: {audio: true},
    //音频流
    stream: [],
    //录制创建成功
    onSuccess(mediaStream) {
        iRecoreder.soundWave(mediaStream);
        let mediaRecorder = new MediaRecorder(mediaStream);
        //给按钮创建事件
        // 开始录音
        iRecoreder.onRecord(mediaRecorder);
        iRecoreder.onStop(mediaRecorder);
        mediaRecorder.onstop = audioRTC.onstop;
        mediaRecorder.ondataavailable = function (e) {
            console.log(e)
            audioRTC.stream.push(e.data);
        }

    },
    onError(err) {
        console.error("错误信息{}", err);
    },
    onstop(e) {
        iRecoreder.addTrack();

    },
    init() {
        if (navigator.mediaDevices.getUserMedia) {
            iRecoreder.init();
            navigator.mediaDevices.getUserMedia(this.constraints).then(this.onSuccess, this.onError);
        } else {
            console.error("你的浏览器不兼容！！");
        }
    },

};

/**
 * 模拟录音机对象
 * @type {{record: Element | null, stop: Element | null, onRecord(*): void}}
 */
var iRecoreder = {
    //开始按钮
    record: document.getElementById("record"),
    //暂停按钮
    stop: document.getElementById('stop'),
    //语音列表
    audios: document.getElementById("audios"),
    //音波可视化
    canvas: document.getElementById("soundWave"),
    controller: document.getElementById("controller"),
    //音频上下文
    audioCtx: new (window.AudioContext || webkitAudioContext)(),
    //画布上下文
    canvasCtx: document.getElementById("soundWave").getContext("2d"),

    init() {
        iRecoreder.stop.disabled = true;
        iRecoreder.record.disable = false;
    },
    onRecord(mediaRecorder) {
        this.record.onclick = function () {
            console.info("录音开始!");
            //开始录入
            mediaRecorder.start();
            //改变颜色
            iRecoreder.record.style.background = 'red';
            iRecoreder.record.value = "录制中……";
            //切换一波
            iRecoreder.stop.disabled = false;
            iRecoreder.record.disabled = true;

        }

    },
    onStop(mediaRecorder) {
        let _this = this;
        this.stop.onclick = function () {
            console.info("录音停止!");
            mediaRecorder.stop();
            _this.record.style.background = "";
            _this.record.style.color = "";
            iRecoreder.record.value = "开始录制";
            //切换一波
            iRecoreder.stop.disabled = true;
            iRecoreder.record.disabled = false;
        }

    },
    //添加曲目
    addTrack() {
        let clipName = prompt('请给你的录音命名', 'My recored ');
        let clipContainer = document.createElement('article');
        let clipLabel = document.createElement('p');
        let audio = document.createElement('audio');
        let deleteButton = document.createElement('button');
        clipContainer.appendChild(audio);
        clipContainer.appendChild(clipLabel);
        clipContainer.appendChild(deleteButton);
        iRecoreder.audios.appendChild(clipContainer);

        clipContainer.classList.add('clip');
        audio.setAttribute('controls', '');
        deleteButton.textContent = '删除录音';
        deleteButton.className = 'delete';

        if (clipName === null) {
            clipLabel.textContent = '录音文件';
        } else {
            clipLabel.textContent = clipName;
        }
        audio.controls = true;
        let blob = new Blob(audioRTC.stream, {'type': 'audio/wav; codecs=opus'});
        //清空stream
        audioRTC.stream = [];
        let audioURL = window.URL.createObjectURL(blob);
        audio.src = audioURL;


        deleteButton.onclick = function (e) {
            evtTgt = e.target;
            evtTgt.parentNode.parentNode.removeChild(evtTgt.parentNode);
        }

        clipLabel.onclick = function () {
            let existingName = clipLabel.textContent;
            let newClipName = prompt('Enter a new name for your sound clip?');
            if (newClipName === null) {
                clipLabel.textContent = existingName;
            } else {
                clipLabel.textContent = newClipName;
            }
        }
    },
    //绘制声波图
    soundWave(mediastream) {
        let source = iRecoreder.audioCtx.createMediaStreamSource(mediastream);
        let analyser = iRecoreder.audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        let bufferLength = analyser.frequencyBinCount;
        let dataArray = new Uint8Array(bufferLength);
        source.connect(analyser);
        soundDraw();

        function soundDraw() {
            WIDTH = iRecoreder.canvas.width
            HEIGHT = iRecoreder.canvas.height;
            requestAnimationFrame(soundDraw);
            analyser.getByteTimeDomainData(dataArray);
            iRecoreder.canvasCtx.fillStyle = 'rgb(200, 200, 200)';
            iRecoreder.canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
            iRecoreder.canvasCtx.lineWidth = 2;
            iRecoreder.canvasCtx.strokeStyle = 'rgb(0, 0, 0)';
            iRecoreder.canvasCtx.beginPath();
            let sliceWidth = WIDTH * 1.0 / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {

                let v = dataArray[i] / 128.0;
                let y = v * HEIGHT / 2;

                if (i === 0) {
                    iRecoreder.canvasCtx.moveTo(x, y);
                } else {
                    iRecoreder.canvasCtx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            iRecoreder.canvasCtx.lineTo(iRecoreder.canvas.width, iRecoreder.canvas.height / 2);
            iRecoreder.canvasCtx.stroke();
        }

    }
}


audioRTC.init();
window.onresize = function () {
    iRecoreder.canvas.width = iRecoreder.controller.offsetWidth;
}

window.onresize();



