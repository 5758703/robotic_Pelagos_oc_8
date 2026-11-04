from PIL import Image, ImageDraw
from pathlib import Path
paths=sorted(Path('artifacts').glob('beat-*.png'))
out=Image.new('RGB',(1600,510),'#e7ebe3');d=ImageDraw.Draw(out)
for i,p in enumerate(paths):
 im=Image.open(p);im.thumbnail((400,225));x=(i%4)*400;y=(i//4)*255;out.paste(im,(x,y+30));d.text((x+10,y+10),p.stem,fill='#344634')
out.save('artifacts/tour-contact-sheet.jpg',quality=95)
for beat in range(8):
 paths=sorted(Path('artifacts/transitions').glob(f'{beat}-*.png'))
 out=Image.new('RGB',(1400,250),'#e7ebe3');d=ImageDraw.Draw(out)
 for k,p in enumerate(paths):
  im=Image.open(p).crop((311,130,1297,750));im.thumbnail((200,220));out.paste(im,(k*200,30));d.text((k*200+8,8),f'{k*.2:.1f}s',fill='#344634')
 out.save(f'artifacts/transitions/strip-{beat}.jpg',quality=94)
