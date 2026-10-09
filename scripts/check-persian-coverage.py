from pathlib import Path
import re
import sys

path = Path(__file__).resolve().parents[1] / 'src' / 'i18n.ts'
text = path.read_text(encoding='utf-8')

try:
    en_block = text.split('const EN = {', 1)[1].split('const VI', 1)[0]
    fa_block = text.split('const FA:', 1)[1].split('const TRANSLATIONS', 1)[0]
except IndexError as exc:
    raise SystemExit(f'Could not locate EN/FA translation blocks: {exc}')

key_pattern = re.compile(r"^[\t ]*'([^']+)'\s*:", re.MULTILINE)
en_keys = set(key_pattern.findall(en_block))
fa_keys = set(key_pattern.findall(fa_block))
missing = sorted(en_keys - fa_keys)
extra = sorted(fa_keys - en_keys)

if extra:
    print('Persian translation contains unknown keys:')
    for key in extra:
        print(f'  {key}')
    sys.exit(1)

if missing:
    print(f'Persian translation is missing {len(missing)} key(s):')
    for key in missing:
        print(f'  {key}')
    sys.exit(1)

print(f'Persian translation coverage complete: {len(en_keys)} / {len(en_keys)} keys.')
