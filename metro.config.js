const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Supporto per WASM e Worker
config.resolver.assetExts.push('wasm');

module.exports = config;
