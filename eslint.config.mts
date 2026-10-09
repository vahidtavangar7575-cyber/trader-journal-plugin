import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig(
	globalIgnores([
		'node_modules',
		'dist',
		'esbuild.config.mjs',
		'validate-bundle.mjs',
		'validate-manifest.mjs',
		'version-bump.mjs',
		'scripts/run-tests.mjs',
		'scripts/run-benchmark.mjs',
		'benchmarks/performance.ts',
		'versions.json',
		'main.js',
		'package.json',
		'package-lock.json',
		'tsconfig.json',
	]),
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ['eslint.config.mts', 'manifest.json'],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json'],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		files: ['src/ui/KhanDecisionWizardModal.tsx'],
		rules: {
			// The cockpit prototype injects a scoped style element so it can be evaluated
			// independently before the final CSS is promoted into the root styles.css.
			'obsidianmd/no-forbidden-elements': 'off',
			'obsidianmd/prefer-create-el': 'off',
		},
	},
	{
		files: ['tests/**/*.ts'],
		rules: {
			'obsidianmd/no-global-this': 'off',
			'obsidianmd/no-nodejs-modules': 'off',
			'obsidianmd/no-tfile-tfolder-cast': 'off',
			'obsidianmd/prefer-window-timers': 'off',
		},
	},
);
