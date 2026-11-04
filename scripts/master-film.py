"""Two-pass measured loudness mastering, then mux and verify the decoded AAC in MP4."""
import subprocess,json,re,pathlib,imageio_ffmpeg
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe();folder=pathlib.Path('artifacts/film')
def run(args):
 r=subprocess.run([ffmpeg,'-y','-hide_banner']+args,capture_output=True,text=True,encoding='utf-8',errors='replace')
 if r.returncode:raise RuntimeError(r.stderr[-4000:])
 return r.stderr
settings='I=-14:TP=-1.5:LRA=7'
def measure(path):
 log=run(['-i',str(path),'-vn','-af','loudnorm='+settings+':print_format=json','-f','null','-'])
 return json.loads(re.findall(r'\{\s*"input_i"[\s\S]*?\}',log)[-1])
source=folder/'score-premaster.wav';initial=measure(source)
filt='loudnorm='+settings+':linear=true:measured_I='+initial['input_i']+':measured_TP='+initial['input_tp']+':measured_LRA='+initial['input_lra']+':measured_thresh='+initial['input_thresh']+':offset='+initial['target_offset']
master=folder/'score-master.wav'
run(['-i',str(source),'-af',filt,'-ar','48000','-c:a','pcm_s24le',str(master)])
master_stats=measure(master)
video=folder/'Pelagos_OC8_scored.mp4'
run(['-i',str(folder/'tour-silent.mp4'),'-i',str(master),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','320k','-ar','48000','-movflags','+faststart','-shortest',str(video)])
final=measure(video)
# Correct the small post-AAC loudness offset only when measured peak headroom permits.
trim=-14-float(final['input_i'])
if abs(trim)>.02 and float(final['input_tp'])+trim<-1.1:
 adjusted=folder/'score-master-adjusted.wav'
 run(['-i',str(master),'-af',f'volume={trim:.4f}dB','-c:a','pcm_s24le',str(adjusted)])
 adjusted.replace(master)
 run(['-i',str(folder/'tour-silent.mp4'),'-i',str(master),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','320k','-ar','48000','-movflags','+faststart','-shortest',str(video)])
 master_stats=measure(master);final=measure(video)
report={'targets':{'integratedLUFS':-14,'truePeakBelowDBTP':-1},'premaster':initial,'masterPCM':master_stats,'finalDecodedAAC':final,'postCodecTrimDB':trim,'method':'FFmpeg loudnorm, measured two-pass; decoded final MP4 measured again','source':'https://ffmpeg.org/ffmpeg-filters.html#loudnorm'}
(folder/'loudness-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
assert abs(float(final['input_i'])+14)<=.2, 'Final loudness outside ±0.2 LU tolerance'
assert float(final['input_tp'])<-1,'Final encoded true peak must be below -1 dBTP'
print('MASTER AND MUX VERIFIED:',video)
