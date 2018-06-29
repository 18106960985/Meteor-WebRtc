
var iRecoreder = (function(){
    window.URL = window.URL || window.webkitURL;
    //my recorder Controller
    var iRecoreder = {
        //开始按钮
        record: document.getElementById("record"),
        //暂停按钮
        stop: document.getElementById("stop"),
        //语音列表
        audios: document.getElementById("audios"),
        //音波可视化
        canvas: document.getElementById("soundWave"),
        controller: document.getElementById("controller"),
        //画布上下文
        canvasCtx: document.getElementById("soundWave").getContext("2d"),
        recController: undefined,
        audioCtx:  new (window.AudioContext || webkitAudioContext)(),
        // get(){
        //   return new iRecoreder();
        // },
        init() {
            this.stop.disabled = true;
            this.record.disable = false;
            this.onRecord();
            this.onStop();
        },
        onRecord() {
            let _this = this;
            this.record.onclick = function () {
                console.info("录音开始!");
          
                //开始录入
                webRecorder.get(rec => {
                    _this.recController = rec;
                    _this.recController.start(
                        (audioCtx, stream) => {
                            iRecoreder.soundWave(audioCtx, stream);
                        }
                    );
                }, ArrayBuffer =>{
                    // 这里获取录音回调的流 将他发送给socket server
                    Service.biz.sendHub.send_AMR(ArrayBuffer);
                    // iRecoreder.addAudio(blob);

                });

                 //改变颜色
                 _this.record.style.background = 'red';
                 _this.record.value = "录制中……";
                //切换一波
                _this.stop.disabled = false;
                _this.record.disabled = true;
            };
        },
        onStop() {
            let _this = this;
         
            this.stop.onclick = () => {
                
                iRecoreder.end();
            }

        },
        end(){
            this.recController.stop();
            this.record.style.background = "";
            this.record.style.color = "";
            this.record.value = "开始录制";
            //切换一波
            this.stop.disabled = true;
            this.record.disabled = false;
        },
        /**
         *  该方法是展现可视化的语音文件
         * @param {*} blob amr媒体文件 
         */
        addAudio(blob) {
            let data = AMR.toWAV(blob);
            let wavblob =  new Blob([data], { type: 'audio/wav; codecs=opus'});
            // console.log(blob)
            let clipName = "录音文件";
            let clipContainer = document.createElement("article");
            let clipLabel = document.createElement("p");
            let audio = document.createElement("audio");
            let deleteButton = document.createElement("button");
            clipContainer.appendChild(audio);
            clipContainer.appendChild(clipLabel);
            clipContainer.appendChild(deleteButton);
            iRecoreder.audios.appendChild(clipContainer);

            clipContainer.classList.add("clip");
            audio.setAttribute("controls", "");
            deleteButton.textContent = "删除录音";
            deleteButton.className = "delete";

            audio.controls = true;
          
            let audioURL =window.URL.createObjectURL(wavblob);
            audio.src = audioURL;

            deleteButton.onclick = function (e) {
                evtTgt = e.target;
                evtTgt.parentNode.parentNode.removeChild(evtTgt.parentNode);
            };

            clipLabel.onclick = function () {
                let existingName = clipLabel.textContent;
                let newClipName = prompt("Enter a new name for your sound clip?");
                if (newClipName === null) {
                    clipLabel.textContent = existingName;
                } else {
                    clipLabel.textContent = newClipName;
                }
            };
        },
        /**
         * 直接播放 音频
         * @param {Uint8Array} array  
         */
        playAudio(array){
            let samples = AMR.decode(array);
            let ctx = this.getAudioContext();
            let src = ctx.createBufferSource();
            let buffer = ctx.createBuffer(1, samples.length, 8000);
            if (buffer.copyToChannel) {
                buffer.copyToChannel(samples, 0, 0)
            } else {
                var channelBuffer = buffer.getChannelData(0);
                channelBuffer.set(samples);
            }
    
            src.buffer = buffer;
            src.connect(ctx.destination);
            src.start();

        },

        //绘制声波图
        soundWave(audioCtx, source) {
            let analyser = audioCtx.createAnalyser();
            analyser.fftSize = 2048;
            let bufferLength = analyser.frequencyBinCount;
            let dataArray = new Uint8Array(bufferLength);
            source.connect(analyser);
            soundDraw();

            function soundDraw() {
                WIDTH = iRecoreder.canvas.width;
                HEIGHT = iRecoreder.canvas.height;
                requestAnimationFrame(soundDraw);
                analyser.getByteTimeDomainData(dataArray);
                iRecoreder.canvasCtx.fillStyle = "rgb(200, 200, 200)";
                iRecoreder.canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
                iRecoreder.canvasCtx.lineWidth = 2;
                iRecoreder.canvasCtx.strokeStyle = "rgb(0, 0, 0)";
                iRecoreder.canvasCtx.beginPath();
                let sliceWidth = (WIDTH * 1.0) / bufferLength;
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {
                    let v = dataArray[i] / 128.0;
                    let y = (v * HEIGHT) / 2;

                    if (i === 0) {
                        iRecoreder.canvasCtx.moveTo(x, y);
                    } else {
                        iRecoreder.canvasCtx.lineTo(x, y);
                    }

                    x += sliceWidth;
                }

                iRecoreder.canvasCtx.lineTo(
                    iRecoreder.canvas.width,
                    iRecoreder.canvas.height / 2
                );
                iRecoreder.canvasCtx.stroke();
            }
        },
    //获取audioContext 用来播放的
      getAudioContext(){
        if(!this.audioCtx){
            this.audioCtx  = new (window.AudioContext || webkitAudioContext)();
        }
        return this.audioCtx;
      }
    };
   
    
    iRecoreder.init();
    window.onresize = function () {
        iRecoreder.canvas.width = iRecoreder.controller.offsetWidth;
    };
    window.onresize();
    return iRecoreder;
}())