from pathlib import Path

root = Path(__file__).resolve().parents[1]

# Obsidian Workspace event typing does not expose arbitrary custom events cleanly.
# Keep initial RTL sync in main.ts and update RTL immediately from SettingsTab instead.
main_path = root / 'src/main.ts'
main = main_path.read_text(encoding='utf-8')
main = main.replace(
    "import { LANGUAGE_CHANGE_EVENT, normalizeSettings, TraderJournalSettings } from './settings';",
    "import { normalizeSettings, TraderJournalSettings } from './settings';",
)
main = main.replace(
    "\t\tthis.syncPersianDirection();\n\t\tthis.registerEvent(this.app.workspace.on(LANGUAGE_CHANGE_EVENT, () => this.syncPersianDirection()));",
    "\t\tthis.syncPersianDirection();",
)
main_path.write_text(main, encoding='utf-8')

settings_tab_path = root / 'src/ui/SettingsTab.tsx'
settings_tab = settings_tab_path.read_text(encoding='utf-8')
needle = "\t\tplugin.settings.language = value;\n\t\tvoid plugin.saveSettings();\n\t\tplugin.app.workspace.trigger(LANGUAGE_CHANGE_EVENT, value);"
replacement = "\t\tplugin.settings.language = value;\n\t\tdocument.body.classList.toggle('trader-journal-fa', value === 'fa');\n\t\tvoid plugin.saveSettings();\n\t\tplugin.app.workspace.trigger(LANGUAGE_CHANGE_EVENT, value);"
if needle in settings_tab and "document.body.classList.toggle('trader-journal-fa', value === 'fa');" not in settings_tab:
    settings_tab = settings_tab.replace(needle, replacement, 1)
settings_tab_path.write_text(settings_tab, encoding='utf-8')

format_path = root / 'src/trades/format.ts'
fmt = format_path.read_text(encoding='utf-8')
if "\tfa: {\n\t\tloss: 'ضرر'," not in fmt:
    vi_result_end = "\t\t'hoa von': 'Hòa vốn',\n\t},\n};"
    fa_result = "\t\t'hoa von': 'Hòa vốn',\n\t},\n\tfa: {\n\t\tloss: 'ضرر',\n\t\tthua: 'ضرر',\n\t\twin: 'برد',\n\t\t'thắng': 'برد',\n\t\tbreakeven: 'سر‌به‌سر',\n\t\t'hoà vốn': 'سر‌به‌سر',\n\t\t'hòa vốn': 'سر‌به‌سر',\n\t\t'hoa von': 'سر‌به‌سر',\n\t},\n};"
    if vi_result_end not in fmt:
        raise RuntimeError('Could not locate RESULT_LABELS end')
    fmt = fmt.replace(vi_result_end, fa_result, 1)

if "\tfa: {\n\t\tlong: 'خرید'," not in fmt:
    side_end = "\tvi: {\n\t\tlong: 'Long',\n\t\tshort: 'Short',\n\t},\n};"
    side_fa = "\tvi: {\n\t\tlong: 'Long',\n\t\tshort: 'Short',\n\t},\n\tfa: {\n\t\tlong: 'خرید',\n\t\tshort: 'فروش',\n\t},\n};"
    if side_end not in fmt:
        raise RuntimeError('Could not locate SIDE_LABELS end')
    fmt = fmt.replace(side_end, side_fa, 1)
format_path.write_text(fmt, encoding='utf-8')

print('Persian build compatibility fixes applied.')
