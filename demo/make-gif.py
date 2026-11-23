import json
from PIL import Image, ImageDraw, ImageFont

frames = json.load(open('/tmp/truecase-frames.json'))

FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
FONT_B = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'
size = 15
font = ImageFont.truetype(FONT, size)
font_b = ImageFont.truetype(FONT_B, size)
adv = font.getlength('M')
line_h = 22

BG = '#1e1e1e'
FG = '#d4d4d4'
GUTTER = '#5a5a5a'
CARET = '#aeafad'
FIX_BG = '#1f4d3a'
FIX_FG = '#4ec9b0'
TITLE_BG = '#2d2d2d'
TITLE_FG = '#9d9d9d'

lines_n = max(f['text'].count('\n') for f in frames) + 1
width = 700
title_h = 30
pad_top = 8
height = title_h + pad_top + lines_n * line_h + 12

def offset_to_xy(text, offset):
    before = text[:offset]
    line = before.count('\n')
    col = len(before) - (before.rfind('\n') + 1)
    return line, col

def render(f):
    img = Image.new('RGB', (width, height), BG)
    d = ImageDraw.Draw(img)
    # title bar
    d.rectangle([0, 0, width, title_h], fill=TITLE_BG)
    d.text((12, 7), 'Main.java - TrueCase', fill=TITLE_FG, font=font)
    dot_y = title_h // 2
    for i, c in enumerate(['#ff5f56', '#ffbd2e', '#27c93f']):
        d.ellipse([width - 60 + i * 18, dot_y - 5, width - 48 + i * 18, dot_y + 5], fill=c)
    # text
    gutter_w = 34
    text = f['text']
    for ln, line in enumerate(text.split('\n')):
        y = title_h + pad_top + ln * line_h
        d.text((6, y + 3), str(ln + 1), fill=GUTTER, font=font)
        d.text((gutter_w, y + 3), line, fill=FG, font=font)
    # fix highlight
    if f['fix']:
        s_ln, s_col = offset_to_xy(text, f['fix']['start'])
        e_ln, e_col = offset_to_xy(text, f['fix']['end'])
        word = f['text'].split('\n')[s_ln][s_col:e_col]
        x0 = gutter_w + s_col * adv
        y0 = title_h + pad_top + s_ln * line_h
        x1 = gutter_w + e_col * adv
        d.rectangle([x0 - 1, y0, x1 + 1, y0 + line_h], fill=FIX_BG)
        d.text((x0, y0 + 3), word, fill=FIX_FG, font=font_b)
    # caret
    c_ln, c_col = offset_to_xy(text, f['cursor'])
    cx = gutter_w + c_col * adv
    cy = title_h + pad_top + c_ln * line_h
    d.line([cx, cy + 2, cx, cy + line_h - 2], fill=CARET, width=2)
    return img

imgs = []
durations = []
for i, f in enumerate(frames):
    img = render(f)
    if i == 0:
        imgs.append(img); durations.append(500)
    elif i == len(frames) - 1:
        imgs.append(img); durations.append(3000)
    elif f['fix']:
        imgs.append(img); durations.append(650)
    elif f['text'].endswith('\n'):
        imgs.append(img); durations.append(200)
    else:
        imgs.append(img); durations.append(70)

imgs[0].save(
    'demo/demo.gif', save_all=True, append_images=imgs[1:],
    duration=durations, loop=0, optimize=True,
)
print('gif written')
