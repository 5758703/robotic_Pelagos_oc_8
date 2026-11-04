import pathlib,subprocess,json,imageio_ffmpeg
folder=pathlib.Path('artifacts/film');video=folder/'Pelagos_OC8_scored.mp4'
r=subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-nostats','-i',str(video),'-progress','pipe:1','-f','null','-'],capture_output=True,text=True,encoding='utf8',errors='replace')
(folder/'decode-verification.log').write_text(r.stderr+'\n'+r.stdout,encoding='utf8')
assert r.returncode==0,r.stderr[-2000:]
last={}
for line in r.stdout.splitlines():
 if '=' in line:
  k,v=line.split('=',1);last[k]=v
assert int(last['frame'])==1200,last
report={'decodedFrames':int(last['frame']),'duration':last.get('out_time'),'decodeExitCode':r.returncode,'videoBytes':video.stat().st_size}
(folder/'video-validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
