(function(window) {

    //兼容
    window.URL = window.URL || window.webkitURL;
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

    var audioContr = function (stream, config ={},callback) {

        config.sampleBits = config.sampleBits || 8;      //采样数位 8, 16
        config.sampleRate = config.sampleRate || (44100 / 6);   //采样率(1/6 44100)

        //音源上下文
        var audioCtx = new (window.AudioContext || webkitAudioContext)()
        //多媒体输入
        var audioInputStream = audioCtx.createMediaStreamSource(stream);
        //缓存管道
        var audioBufferChannel = audioCtx.createScriptProcessor(16384, 1, 1);

        var audioData = {
            size: 0          //录音文件长度
            , buffer: []     //录音缓存
            , inputSampleRate: audioCtx.sampleRate    //输入采样率
            , inputSampleBits: 16       //输入采样数位 8, 16
            , outputSampleRate: config.sampleRate    //输出采样率
            , oututSampleBits: config.sampleBits       //输出采样数位 8, 16
            , readData: function (data) {
                this.buffer.push(new Float32Array(data));
                this.size += data.length;
             return   this.encodeWAV(new Float32Array(data),data.length);
            }
            , compress: function (stream,size) { //合并压缩
                //合并
                var data = stream;
                //压缩
                var compression = parseInt(this.inputSampleRate / this.outputSampleRate);
                var length = data.length / compression;
                var result = new Float32Array(length);
                var index = 0, j = 0;
                while (index < length) {
                    result[index] = data[j];
                    j += compression;
                    index++;
                }
                return result;
            }
            , encodeWAV: function (stream,size) {
                var sampleRate = Math.min(this.inputSampleRate, this.outputSampleRate);
                var sampleBits = Math.min(this.inputSampleBits, this.oututSampleBits);
                var bytes = this.compress(stream,size);
                var dataLength = bytes.length * (sampleBits / 8);
                var buffer = new ArrayBuffer(44 + dataLength);
                var data = new DataView(buffer);

                var channelCount = 1;//单声道
                var offset = 0;

                var writeString = function (str) {
                    for (var i = 0; i < str.length; i++) {
                        data.setUint8(offset + i, str.charCodeAt(i));
                    }
                }

                // 资源交换文件标识符
                writeString('RIFF'); offset += 4;
                // 下个地址开始到文件尾总字节数,即文件大小-8
                data.setUint32(offset, 36 + dataLength, true); offset += 4;
                // WAV文件标志
                writeString('WAVE'); offset += 4;
                // 波形格式标志
                writeString('fmt '); offset += 4;
                // 过滤字节,一般为 0x10 = 16
                data.setUint32(offset, 16, true); offset += 4;
                // 格式类别 (PCM形式采样数据)
                data.setUint16(offset, 1, true); offset += 2;
                // 通道数
                data.setUint16(offset, channelCount, true); offset += 2;
                // 采样率,每秒样本数,表示每个通道的播放速度
                data.setUint32(offset, sampleRate, true); offset += 4;
                // 波形数据传输率 (每秒平均字节数) 单声道×每秒数据位数×每样本数据位/8
                data.setUint32(offset, channelCount * sampleRate * (sampleBits / 8), true); offset += 4;
                // 快数据调整数 采样一次占用字节数 单声道×每样本的数据位数/8
                data.setUint16(offset, channelCount * (sampleBits / 8), true); offset += 2;
                // 每样本数据位数
                data.setUint16(offset, sampleBits, true); offset += 2;
                // 数据标识符
                writeString('data'); offset += 4;
                // 采样数据总数,即数据总大小-44
                data.setUint32(offset, dataLength, true); offset += 4;
                // 写入采样数据
                if (sampleBits === 8) {
                    for (var i = 0; i < bytes.length; i++, offset++) {
                        var s = Math.max(-1, Math.min(1, bytes[i]));
                        var val = s < 0 ? s * 0x8000 : s * 0x7FFF;
                        val = parseInt(255 / (65535 / (val + 32768)));
                        data.setInt8(offset, val, true);
                    }
                } else {
                    for (var i = 0; i < bytes.length; i++, offset += 2) {
                        var s = Math.max(-1, Math.min(1, bytes[i]));
                        data.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                    }
                }


                return new Blob([data], { type: 'audio/wav' });
            }
        };

    //开始录音
    this.start = callback => {
      //将设备的获取的流写进 缓冲去
      audioInputStream.connect(audioBufferChannel);
      audioBufferChannel.connect(audioCtx.destination);
      callback(audioCtx, audioInputStream);
    };

    this.stop = () => {
      //关闭轨道链接
      audioBufferChannel.disconnect();
      console.info("录音停止!");

    };

      // //音频捕获
      audioBufferChannel.onaudioprocess = e => {

          let blob = audioData.readData(e.inputBuffer.getChannelData(0));
          if(blob){//如果有返回就添加
              let url = window.URL.createObjectURL(blob);
              callback(url);
          }

      };

  };

  //抛出异常
  audioContr.throwError = message => {
    alert(message);
    throw () => {
      this.toString = function() {
        return message;
      };
    };
  };
  //获取录音机
  audioContr.get = (callback, blolCallback, config) => {
    if (navigator.getUserMedia) {
      navigator.getUserMedia(
        { audio: true }, //只启用音频
        stream => {
          //返回对象

          callback(new audioContr(stream, config, blolCallback));
        },
        error => {
          switch (error.code || error.name) {
            case "PERMISSION_DENIED":
            case "PermissionDeniedError":
              audioContr.throwError("用户拒绝提供信息。");
              break;
            case "NOT_SUPPORTED_ERROR":
            case "NotSupportedError":
              audioContr.throwError("浏览器不支持硬件设备。");
              break;
            case "MANDATORY_UNSATISFIED_ERROR":
            case "MandatoryUnsatisfiedError":
              audioContr.throwError("无法发现指定的硬件设备。");
              break;
            default:
              audioContr.throwError(
                "无法打开麦克风。异常信息:" + (error.code || error.name)
              );
              break;
          }
        }
      );
    }
  };



  window.audioContr = audioContr;
  // iRecoreder.init();

})(window);
