from pathlib import Path

path = Path(__file__).resolve().parents[1] / 'src/i18n.ts'
text = path.read_text(encoding='utf-8')

# Add the Persian language label to the canonical EN key set so it becomes a valid I18nKey.
if "\t'option.persian': 'Persian'," not in text:
    needle = "\t'option.english': 'English',"
    if needle not in text:
        raise RuntimeError('Could not find EN option.english')
    text = text.replace(needle, needle + "\n\t'option.persian': 'Persian',", 1)

# Keep Vietnamese dictionary structurally compatible with EN.
if "\t'option.persian': 'Tiếng Ba Tư'," not in text:
    needle = "\t'option.english': 'Tiếng Anh',"
    if needle in text:
        text = text.replace(needle, needle + "\n\t'option.persian': 'Tiếng Ba Tư',", 1)

path.write_text(text, encoding='utf-8')
print('Persian i18n key compatibility fixed.')
